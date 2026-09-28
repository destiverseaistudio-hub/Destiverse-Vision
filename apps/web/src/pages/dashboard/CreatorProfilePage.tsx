import { Activity, ArrowLeft, Ban, Bookmark, Edit3, Eye, Film, Flag, Heart, Lock, Music2, Plus, Share2, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type Creator = { handle: string; display_name: string; bio: string; avatar_url: string | null };
type Reel = { id: string; title: string; caption: string; video_url: string; poster_url: string | null; status?: string; visibility?: 'public' | 'private'; audio_label?: string | null; created_at?: string };
type Notice = { id: string; title: string; message: string; action_url: string | null; created_at: string };
type Sound = { sound_key: string; sound_label: string; created_at: string };
type Engagement = { reel_id: string; likes: number | string; views: number | string };
type Tab = 'reels' | 'private' | 'saved' | 'sounds' | 'activity';

async function playable(reel: Reel) {
  if (/^https?:\/\//i.test(reel.video_url)) return reel;
  const { data } = await supabase.storage.from('creator-reels').createSignedUrl(reel.video_url, 3600);
  return { ...reel, video_url: data?.signedUrl ?? reel.video_url };
}

export default function CreatorProfilePage() {
  const { creatorId } = useParams();
  const [params] = useSearchParams();
  const { session } = useAuth();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [publicReels, setPublicReels] = useState<Reel[]>([]);
  const [myReels, setMyReels] = useState<Reel[]>([]);
  const [savedReels, setSavedReels] = useState<Reel[]>([]);
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [engagement, setEngagement] = useState<Record<string, { likes: number; views: number }>>({});
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<Tab>('reels');
  const [loading, setLoading] = useState(true);
  const isOwner = session?.user.id === creatorId;
  const canManage = isOwner && params.get('view') !== 'public';
  const shownReels = canManage ? myReels.filter((r) => r.status === 'approved' && r.visibility !== 'private') : publicReels;
  const privateReels = myReels.filter((r) => r.visibility === 'private' || r.status !== 'approved');
  const likes = useMemo(() => Object.values(engagement).reduce((sum, item) => sum + item.likes, 0), [engagement]);
  const views = useMemo(() => Object.values(engagement).reduce((sum, item) => sum + item.views, 0), [engagement]);

  useEffect(() => {
    if (!creatorId) return;
    let live = true;
    const load = async () => {
      setLoading(true);
      const [profile, published, followerCount, followingCount, follow, block] = await Promise.all([
        supabase.from('creator_profiles').select('handle,display_name,bio,avatar_url').eq('user_id', creatorId).maybeSingle(),
        supabase.from('reel_submissions').select('id,title,caption,video_url,poster_url,status,visibility,audio_label,created_at').eq('creator_id', creatorId).eq('status', 'approved').eq('visibility', 'public').order('published_at', { ascending: false }),
        supabase.from('reel_creator_follows').select('follower_id', { count: 'exact', head: true }).eq('creator_id', creatorId),
        supabase.from('reel_creator_follows').select('creator_id', { count: 'exact', head: true }).eq('follower_id', creatorId),
        session ? supabase.from('reel_creator_follows').select('creator_id').eq('follower_id', session.user.id).eq('creator_id', creatorId).maybeSingle() : Promise.resolve({ data: null }),
        session ? supabase.from('creator_blocks').select('creator_id').eq('blocker_id', session.user.id).eq('creator_id', creatorId).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      const own = isOwner ? await supabase.from('reel_submissions').select('id,title,caption,video_url,poster_url,status,visibility,audio_label,created_at').eq('creator_id', creatorId).order('created_at', { ascending: false }) : { data: [] as Reel[] };
      const [publicItems, ownItems] = await Promise.all([Promise.all(((published.data ?? []) as Reel[]).map(playable)), Promise.all(((own.data ?? []) as Reel[]).map(playable))]);
      const ids = (isOwner ? ownItems : publicItems).map((item) => item.id);
      const { data: countRows } = ids.length ? await supabase.rpc('get_public_reel_engagement', { reel_ids: ids }) : { data: [] };
      if (isOwner && session) {
        const [{ data: saves }, { data: soundRows }, { data: noticeRows }] = await Promise.all([
          supabase.from('reel_saves').select('reel_id').eq('user_id', session.user.id).order('created_at', { ascending: false }),
          supabase.from('reel_sound_saves').select('sound_key,sound_label,created_at').eq('user_id', session.user.id).order('created_at', { ascending: false }),
          supabase.from('user_notifications').select('id,title,message,action_url,created_at').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(30),
        ]);
        const savedIds = (saves ?? []).map((item) => item.reel_id);
        const saved = savedIds.length ? await supabase.from('reel_submissions').select('id,title,caption,video_url,poster_url,status,visibility,audio_label,created_at').in('id', savedIds) : { data: [] as Reel[] };
        if (!live) return;
        setSavedReels(await Promise.all(((saved.data ?? []) as Reel[]).map(playable)));
        setSounds((soundRows ?? []) as Sound[]);
        setNotices((noticeRows ?? []) as Notice[]);
      }
      if (!live) return;
      setCreator(profile.data as Creator | null); setPublicReels(publicItems); setMyReels(ownItems);
      setFollowers(followerCount.count ?? 0); setFollowing(followingCount.count ?? 0); setIsFollowing(Boolean(follow.data)); setIsBlocked(Boolean(block.data));
      setEngagement(((countRows ?? []) as Engagement[]).reduce<Record<string, { likes: number; views: number }>>((all, row) => ({ ...all, [row.reel_id]: { likes: Number(row.likes), views: Number(row.views) } }), {}));
      setLoading(false);
    };
    void load(); return () => { live = false; };
  }, [creatorId, isOwner, session]);

  const toggleFollow = async () => { if (!session || !creatorId || isOwner) return; const { error } = isFollowing ? await supabase.from('reel_creator_follows').delete().eq('follower_id', session.user.id).eq('creator_id', creatorId) : await supabase.from('reel_creator_follows').insert({ follower_id: session.user.id, creator_id: creatorId }); if (!error) { setIsFollowing((v) => !v); setFollowers((v) => v + (isFollowing ? -1 : 1)); } };
  const share = async () => { if (navigator.share) await navigator.share({ title: creator?.display_name || creator?.handle, url: window.location.href }).catch(() => undefined); else await navigator.clipboard?.writeText(window.location.href); };
  const report = async () => { if (!session || !creatorId) return; const reason = window.prompt('Why should this creator profile be reviewed?'); if (!reason?.trim()) return; const { error } = await supabase.from('creator_profile_reports').insert({ creator_id: creatorId, reporter_id: session.user.id, reason: reason.trim() }); setMessage(error ? 'Could not send your report.' : 'Creator report sent to moderation.'); };
  const toggleBlock = async () => { if (!session || !creatorId) return; const { error } = isBlocked ? await supabase.from('creator_blocks').delete().eq('blocker_id', session.user.id).eq('creator_id', creatorId) : await supabase.from('creator_blocks').insert({ blocker_id: session.user.id, creator_id: creatorId }); if (!error) { setIsBlocked(!isBlocked); setMessage(isBlocked ? 'Creator unblocked.' : 'Creator blocked.'); } };
  const togglePrivacy = async (reel: Reel) => { const visibility = reel.visibility === 'private' ? 'public' : 'private'; const { error } = await supabase.rpc('set_my_reel_visibility', { p_reel_id: reel.id, p_visibility: visibility }); if (error) { setMessage(error.message); return; } setMyReels((all) => all.map((item) => item.id === reel.id ? { ...item, visibility } : item)); setMessage(visibility === 'private' ? 'Reel moved to Private videos.' : 'Reel is public again.'); };
  const tiles = (items: Reel[], empty: string, allowPrivacy = false) => items.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{items.map((reel) => <article key={reel.id} className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-[var(--dv-surface)]"><Link to={`/dashboard/reels?reel=${reel.id}`}><div className="relative aspect-[9/14] bg-black"><video muted loop playsInline autoPlay preload="metadata" poster={reel.poster_url ?? undefined} src={reel.video_url} className="size-full object-cover" /><span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold text-white"><Eye className="mr-1 inline size-3" />{engagement[reel.id]?.views ?? 0}<Heart className="ml-2 mr-1 inline size-3" />{engagement[reel.id]?.likes ?? 0}</span></div><div className="p-3"><b className="line-clamp-1 block text-sm text-white">{reel.title}</b><p className="mt-1 line-clamp-2 text-xs text-slate-400">{reel.caption || 'Open this Reel.'}</p></div></Link>{allowPrivacy ? <button type="button" onClick={() => void togglePrivacy(reel)} className="mx-3 mb-3 inline-flex items-center gap-2 rounded-lg border border-white/15 px-2.5 py-2 text-xs font-bold text-white"><Lock className="size-3.5" />{reel.visibility === 'private' ? 'Make public' : 'Make private'}</button> : null}</article>)}</div> : <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-400">{empty}</div>;
  if (loading) return <main className="mx-auto max-w-5xl p-6 text-slate-400">Loading creator…</main>;
  if (!creator) return <main className="mx-auto max-w-5xl p-6"><h1 className="text-2xl font-black text-white">Creator not found</h1></main>;
  const tabs: { id: Tab; label: string; icon: typeof Film }[] = canManage ? [{ id: 'reels', label: 'Videos', icon: Film }, { id: 'private', label: 'Private', icon: Lock }, { id: 'saved', label: 'Saved', icon: Bookmark }, { id: 'sounds', label: 'Sounds', icon: Music2 }, { id: 'activity', label: 'Activity', icon: Activity }] : [{ id: 'reels', label: 'Videos', icon: Film }];
  return <main className="mx-auto max-w-5xl pb-10"><Link to="/dashboard/reels" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"><ArrowLeft className="size-4" />Back to Reels</Link><header className="mt-5 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(229,9,20,.3),transparent_32rem),var(--dv-surface)] p-5 sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-4"><div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-3xl border border-white/15 bg-[var(--dv-accent)] text-2xl font-black text-white">{creator.avatar_url ? <img src={creator.avatar_url} alt="" className="size-full object-cover" /> : creator.handle.slice(0, 1).toUpperCase()}</div><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--dv-accent)]">DestiVerse creator</p><h1 className="truncate text-2xl font-black text-white sm:text-3xl">{creator.display_name || creator.handle}</h1><p className="text-sm text-slate-400">@{creator.handle}</p></div></div>{canManage ? <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex"><Link to="/dashboard/creator/edit" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2.5 text-sm font-bold text-white"><Edit3 className="size-4" />Edit</Link><Link to="/dashboard/create-reel" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--dv-accent)] px-3 py-2.5 text-sm font-bold text-white"><Plus className="size-4" />Add Reel</Link><button type="button" onClick={() => void share()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2.5 text-sm font-bold text-white"><Share2 className="size-4" />Share</button><Link to={`/dashboard/creator/${creatorId}?view=public`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2.5 text-sm font-bold text-white"><Eye className="size-4" />Public</Link></div> : <div className="flex gap-2"><button type="button" onClick={() => void toggleFollow()} className={`rounded-xl px-5 py-3 text-sm font-bold ${isFollowing ? 'border border-white/15 bg-white/10 text-white' : 'bg-white text-black'}`}>{isFollowing ? 'Following' : 'Follow'}</button><button type="button" onClick={() => void share()} className="grid size-11 place-items-center rounded-xl border border-white/15 text-white"><Share2 className="size-4" /></button></div>}</div>{creator.bio ? <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-300">{creator.bio}</p> : null}<div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 text-center sm:flex sm:gap-7 sm:text-left"><span><b className="text-white">{shownReels.length}</b><small className="ml-1 text-xs text-slate-400">videos</small></span><span><b className="text-white">{followers}</b><small className="ml-1 text-xs text-slate-400">followers</small></span><span><b className="text-white">{following}</b><small className="ml-1 text-xs text-slate-400">following</small></span><span className="hidden sm:inline"><b className="text-white">{likes}</b><small className="ml-1 text-xs text-slate-400">likes</small></span><span className="hidden sm:inline"><b className="text-white">{views}</b><small className="ml-1 text-xs text-slate-400">views</small></span></div>{!isOwner && session ? <div className="mt-4 flex gap-4 text-sm"><button type="button" onClick={() => void report()} className="inline-flex items-center gap-1 text-slate-300"><Flag className="size-4" />Report</button><button type="button" onClick={() => void toggleBlock()} className="inline-flex items-center gap-1 text-slate-300"><Ban className="size-4" />{isBlocked ? 'Unblock' : 'Block'}</button></div> : null}{message ? <p className="mt-3 text-sm text-slate-300">{message}</p> : null}</header><section className="mt-7"><div className="flex gap-2 overflow-x-auto border-b border-white/10 pb-2 [scrollbar-width:none]">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setTab(id)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${tab === id ? 'bg-[var(--dv-accent)] text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><Icon className="size-4" />{label}</button>)}</div><div className="mt-5">{tab === 'reels' ? <><div className="mb-4 flex items-center gap-2"><Sparkles className="size-5 text-[var(--dv-accent)]" /><h2 className="text-xl font-black text-white">Published Reels</h2></div>{tiles(shownReels, 'No public Reels yet.', canManage)}</> : null}{tab === 'private' ? <><h2 className="mb-4 text-xl font-black text-white">Private videos</h2>{tiles(privateReels, 'Your private and pending videos will appear here.', true)}</> : null}{tab === 'saved' ? <><h2 className="mb-4 text-xl font-black text-white">Saved videos</h2>{tiles(savedReels, 'Save a Reel to find it here later.')}</> : null}{tab === 'sounds' ? <><h2 className="mb-4 text-xl font-black text-white">Saved sounds</h2>{sounds.length ? <div className="grid gap-3 sm:grid-cols-2">{sounds.map((sound) => <Link key={sound.sound_key} to={`/dashboard/sounds/${encodeURIComponent(sound.sound_key)}`} className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-[var(--dv-surface)] p-4"><Music2 className="size-5 shrink-0 text-[var(--dv-accent)]" /><span className="truncate text-sm font-bold text-white">{sound.sound_label}</span></Link>)}</div> : <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-400">Save a sound from its Sound page to find it here.</div>}</> : null}{tab === 'activity' ? <><h2 className="mb-4 text-xl font-black text-white">Creator activity</h2>{notices.length ? <div className="space-y-3">{notices.map((notice) => <Link key={notice.id} to={notice.action_url || '/dashboard/notifications'} className="block rounded-2xl border border-white/10 bg-[var(--dv-surface)] p-4"><b className="text-sm text-white">{notice.title}</b><p className="mt-1 text-sm text-slate-400">{notice.message}</p><small className="mt-2 block text-xs text-slate-500">{new Date(notice.created_at).toLocaleString()}</small></Link>)}</div> : <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-400">Your creator updates and moderation notices will appear here.</div>}</> : null}</div></section></main>;
}

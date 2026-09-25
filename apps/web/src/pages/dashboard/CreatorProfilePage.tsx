import { ArrowLeft, Ban, Edit3, Eye, Film, Flag, Play, Plus, Share2, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type Creator = { handle: string; display_name: string; bio: string; avatar_url: string | null };
type Reel = {
  id: string;
  title: string;
  caption: string;
  video_url: string;
  poster_url: string | null;
};

export default function CreatorProfilePage() {
  const { creatorId } = useParams();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [reels, setReels] = useState<Reel[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [likes, setLikes] = useState(0);
  const [views, setViews] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const isOwner = session?.user.id === creatorId;
  const isPublicPreview = isOwner && searchParams.get('view') === 'public';
  const canManage = isOwner && !isPublicPreview;
  useEffect(() => {
    if (!creatorId) return;
    let active = true;
    const load = async () => {
      const [
        { data: creatorData },
        { data: reelData },
        { count: followerCount },
        { count: followingCount },
        follow,
        block,
      ] = await Promise.all([
        supabase
          .from('creator_profiles')
          .select('handle,display_name,bio,avatar_url')
          .eq('user_id', creatorId)
          .maybeSingle(),
        supabase
          .from('reel_submissions')
          .select('id,title,caption,video_url,poster_url')
          .eq('creator_id', creatorId)
          .eq('status', 'approved')
          .order('published_at', { ascending: false }),
        supabase
          .from('reel_creator_follows')
          .select('follower_id', { count: 'exact', head: true })
          .eq('creator_id', creatorId),
        supabase
          .from('reel_creator_follows')
          .select('creator_id', { count: 'exact', head: true })
          .eq('follower_id', creatorId),
        session
          ? supabase
              .from('reel_creator_follows')
              .select('creator_id')
              .eq('follower_id', session.user.id)
              .eq('creator_id', creatorId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        session
          ? supabase.from('creator_blocks').select('creator_id').eq('blocker_id', session.user.id).eq('creator_id', creatorId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (!active) return;
      const signed = await Promise.all(
        (reelData ?? []).map(async (reel) => {
          const { data: url } = await supabase.storage
            .from('creator-reels')
            .createSignedUrl(reel.video_url, 3600);
          return { ...reel, video_url: url?.signedUrl ?? reel.video_url };
        }),
      );
      setCreator(creatorData as Creator | null);
      setReels(signed as Reel[]);
      setFollowers(followerCount ?? 0);
      setFollowing(followingCount ?? 0);
      if (reelData?.length) {
        const { count } = await supabase
          .from('reel_reactions')
          .select('reel_id', { count: 'exact', head: true })
          .in(
            'reel_id',
            reelData.map((reel) => reel.id),
          )
          .eq('reaction', 'love');
        if (active) setLikes(count ?? 0);
        if (isOwner) {
          const { count: viewCount } = await supabase
            .from('reel_view_events')
            .select('id', { count: 'exact', head: true })
            .in(
              'reel_id',
              reelData.map((reel) => reel.id),
            );
          if (active) setViews(viewCount ?? 0);
        } else if (active) setViews(0);
      } else {
        setLikes(0);
        setViews(0);
      }
      setIsFollowing(Boolean(follow.data));
      setIsBlocked(Boolean(block.data));
      setLoading(false);
    };
    void load();
    return () => {
      active = false;
    };
  }, [creatorId, isOwner, session]);
  const toggleFollow = async () => {
    if (!session || !creatorId || isOwner) return;
    const { error } = isFollowing
      ? await supabase
          .from('reel_creator_follows')
          .delete()
          .eq('follower_id', session.user.id)
          .eq('creator_id', creatorId)
      : await supabase
          .from('reel_creator_follows')
          .insert({ follower_id: session.user.id, creator_id: creatorId });
    if (!error) {
      setIsFollowing((value) => !value);
      setFollowers((value) => value + (isFollowing ? -1 : 1));
    }
  };
  const shareCreator = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: creator?.display_name || creator?.handle, text: 'Watch this DestiVerse creator', url }).catch(() => undefined);
    } else await navigator.clipboard?.writeText(url);
  };
  const reportCreator = async () => {
    if (!session || !creatorId) return;
    const reason = window.prompt('Why should this creator profile be reviewed?');
    if (!reason?.trim()) return;
    const { error } = await supabase.from('creator_profile_reports').insert({ creator_id: creatorId, reporter_id: session.user.id, reason: reason.trim() });
    setMessage(error ? (error.code === '23505' ? 'You have already reported this creator.' : 'Could not send your report.') : 'Creator report sent to moderation.');
  };
  const toggleBlock = async () => {
    if (!session || !creatorId) return;
    const { error } = isBlocked ? await supabase.from('creator_blocks').delete().eq('blocker_id', session.user.id).eq('creator_id', creatorId) : await supabase.from('creator_blocks').insert({ blocker_id: session.user.id, creator_id: creatorId });
    if (!error) { setIsBlocked(!isBlocked); setMessage(isBlocked ? 'Creator unblocked.' : 'Creator blocked. Their future Reels will be hidden from your feed.'); }
  };
  if (loading)
    return <main className="mx-auto max-w-5xl p-6 text-slate-400">Loading creator…</main>;
  if (!creator)
    return (
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="text-2xl font-black text-white">Creator not found</h1>
        <Link to="/dashboard/reels" className="mt-4 inline-flex text-sm text-[var(--dv-accent)]">
          Back to Reels
        </Link>
      </main>
    );
  return (
    <main className="mx-auto max-w-5xl pb-10">
      <Link
        to="/dashboard/reels"
        className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
      >
        <ArrowLeft className="size-4" /> Back to Reels
      </Link>
      <header className="mt-5 overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(229,9,20,.3),transparent_32rem),var(--dv-surface)] p-6 sm:p-9">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid size-20 place-items-center overflow-hidden rounded-3xl border border-white/15 bg-[var(--dv-accent)] text-3xl font-black text-white">
              {creator.avatar_url ? (
                <img src={creator.avatar_url} alt="" className="size-full object-cover" />
              ) : (
                creator.handle.slice(0, 1).toUpperCase()
              )}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--dv-accent)]">
                DestiVerse creator
              </p>
              <h1 className="mt-1 text-3xl font-black text-white">
                {creator.display_name || creator.handle}
              </h1>
              <p className="mt-1 text-sm text-slate-400">@{creator.handle}</p>
            </div>
          </div>
          {canManage ? (
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
              <Link
                to="/dashboard/creator/edit"
                className="inline-flex min-w-0 items-center justify-center gap-1 rounded-xl border border-white/15 px-2 py-3 text-sm font-bold text-white sm:gap-2 sm:px-4"
                title="Edit creator profile"
              >
                <Edit3 className="size-4 shrink-0" /> <span className="sm:hidden">Edit</span><span className="hidden sm:inline">Edit profile</span>
              </Link>
              <Link
                to="/dashboard/create-reel"
                className="inline-flex min-w-0 items-center justify-center gap-1 rounded-xl bg-[var(--dv-accent)] px-2 py-3 text-sm font-bold text-white sm:gap-2 sm:px-4"
                title="Add a Reel"
              >
                <Plus className="size-4 shrink-0" /> <span className="sm:hidden">Add</span><span className="hidden sm:inline">Add Reel</span>
              </Link>
              <button type="button" onClick={() => void shareCreator()} className="inline-flex min-w-0 items-center justify-center gap-1 rounded-xl border border-white/15 px-2 py-3 text-sm font-bold text-white sm:gap-2 sm:px-4" title="Share creator"><Share2 className="size-4 shrink-0" /> <span>Share</span></button>
              <Link to={`/dashboard/creator/${creatorId}?view=public`} className="inline-flex min-w-0 items-center justify-center gap-1 rounded-xl border border-white/15 px-2 py-3 text-sm font-bold text-white sm:gap-2 sm:px-4" title="View your public profile"><Eye className="size-4 shrink-0" /> <span>View as public</span></Link>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2"><button
                type="button"
                onClick={() => void toggleFollow()}
                className={`rounded-xl px-5 py-3 text-sm font-bold ${isFollowing ? 'border border-white/15 bg-white/10 text-white' : 'bg-white text-black'}`}
              >
                {isFollowing ? 'Following' : 'Follow creator'}
              </button><button type="button" onClick={() => void shareCreator()} className="grid size-11 place-items-center rounded-xl border border-white/15 text-white" aria-label="Share creator"><Share2 className="size-4" /></button></div>
          )}
        </div>
        {isPublicPreview ? <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5"><p className="text-sm text-slate-300">You are viewing your public creator profile.</p><Link to={`/dashboard/creator/${creatorId}`} className="text-sm font-bold text-[var(--dv-accent)]">Exit preview</Link></div> : null}
        {!isOwner && session ? <div className="mt-5 flex flex-wrap gap-3 border-t border-white/10 pt-5"><button type="button" onClick={() => void reportCreator()} className="inline-flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white"><Flag className="size-4" /> Report creator</button><button type="button" onClick={() => void toggleBlock()} className="inline-flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white"><Ban className="size-4" /> {isBlocked ? 'Unblock creator' : 'Block creator'}</button>{message ? <span className="text-sm text-slate-400">{message}</span> : null}</div> : null}
        {creator.bio ? (
          <p className="mt-7 max-w-2xl leading-7 text-slate-300">{creator.bio}</p>
        ) : null}
        <div className="mt-7 flex gap-6 border-t border-white/10 pt-5">
          <span>
            <b className="text-white">{reels.length}</b>
            <small className="ml-2 text-slate-400">published Reels</small>
          </span>
          <span>
            <b className="text-white">{followers}</b>
            <small className="ml-2 text-slate-400">followers</small>
          </span>
          <span>
            <b className="text-white">{following}</b>
            <small className="ml-2 text-slate-400">following</small>
          </span>
          <span>
            <b className="text-white">{likes}</b>
            <small className="ml-2 text-slate-400">likes</small>
          </span>
          {canManage ? (
            <span>
              <b className="text-white">{views}</b>
              <small className="ml-2 text-slate-400">unique daily views</small>
            </span>
          ) : null}
        </div>
      </header>
      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3"><div className="flex items-center gap-2"><Sparkles className="size-5 text-[var(--dv-accent)]" /><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500">Creator cuts</p><h2 className="text-xl font-black text-white">Published Reels</h2></div></div><span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-slate-400">Tap a tile to watch</span></div>
        {reels.length ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {reels.map((reel) => (
              <article
                key={reel.id}
                className="group overflow-hidden rounded-[1.4rem] border border-white/10 bg-[var(--dv-surface)] transition duration-300 hover:-translate-y-1 hover:border-[var(--dv-accent)]/60"
              >
                <Link to={`/dashboard/reels?reel=${reel.id}`} className="block"><div className="relative h-60 overflow-hidden bg-black sm:h-72"><video muted loop playsInline autoPlay preload="metadata" poster={reel.poster_url ?? undefined} src={reel.video_url} className="size-full object-cover transition duration-500 group-hover:scale-105" /><div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/20 to-transparent" /><span className="absolute left-3 top-3 rounded-full bg-black/55 px-2 py-1 text-[9px] font-black uppercase tracking-[.14em] text-white backdrop-blur">DestiVerse cut</span><span className="absolute bottom-3 right-3 grid size-9 place-items-center rounded-full bg-white text-black shadow-lg"><Play className="size-4 fill-current" /></span></div><div className="border-l-2 border-[var(--dv-accent)] p-3"><h3 className="line-clamp-1 text-sm font-black text-white">{reel.title}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{reel.caption || 'Open this creator cut.'}</p></div></Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-white/10 p-8 text-center text-slate-400">
            <Film className="mx-auto size-7 text-[var(--dv-accent)]" />
            <p className="mt-3">This creator has no published Reels yet.</p>
            {canManage ? (
              <Link
                to="/dashboard/create-reel"
                className="mt-4 inline-flex text-sm font-bold text-[var(--dv-accent)]"
              >
                Create your first Reel
              </Link>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}

import { FileVideo, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type Reel = { id: string; title: string; caption: string; status: 'pending' | 'approved' | 'rejected' | 'removed'; moderation_note: string; created_at: string };

export default function CreatorStudioPage() {
  const { session } = useAuth();
  const [approved, setApproved] = useState(false);
  const [accountStatus, setAccountStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [reels, setReels] = useState<Reel[]>([]);
  const [views, setViews] = useState(0);
  const [loves, setLoves] = useState(0);
  const [comments, setComments] = useState(0);
  const [followers, setFollowers] = useState(0);
  const [editing, setEditing] = useState<Reel | null>(null);
  const [message, setMessage] = useState('');
  const [appeal, setAppeal] = useState<{ reelId: string | null; type: 'reel_rejection' | 'account_suspension' } | null>(null);
  const [appealMessage, setAppealMessage] = useState('');

  const [refreshCount, setRefreshCount] = useState(0);
  const refresh = () => setRefreshCount((c) => c + 1);

  useEffect(() => {
    if (!session?.user?.id) return;
    let active = true;
    const fetchStudio = async () => {
      const [{ data: application }, { data: reelData }, { count: followerCount }] = await Promise.all([
        supabase.from('creator_applications').select('status').eq('user_id', session.user.id).maybeSingle(),
        supabase.from('reel_submissions').select('id,title,caption,status,moderation_note,created_at').eq('creator_id', session.user.id).order('created_at', { ascending: false }),
        supabase.from('reel_creator_follows').select('follower_id', { count: 'exact', head: true }).eq('creator_id', session.user.id),
      ]);
      const items = (reelData ?? []) as Reel[];
      const ids = items.map((item) => item.id);
      let viewCount = 0;
      let loveCount = 0;
      let commentCount = 0;
      if (ids.length) {
        const [viewRes, loveRes, commentRes] = await Promise.all([
          supabase.from('reel_view_events').select('id', { count: 'exact', head: true }).in('reel_id', ids),
          supabase.from('reel_reactions').select('reel_id', { count: 'exact', head: true }).in('reel_id', ids).eq('reaction', 'love'),
          supabase.from('reel_comments').select('id', { count: 'exact', head: true }).in('reel_id', ids).eq('hidden', false),
        ]);
        viewCount = viewRes.count ?? 0;
        loveCount = loveRes.count ?? 0;
        commentCount = commentRes.count ?? 0;
      }
      if (!active) return;
      setViews(viewCount);
      setLoves(loveCount);
      setComments(commentCount);
      setApproved(application?.status === 'approved');
      setAccountStatus(application?.status ?? 'missing');
      setFollowers(followerCount ?? 0);
      setReels(items);
      setLoading(false);
    };
    void fetchStudio();
    return () => { active = false };
  }, [session?.user?.id, refreshCount]);

  if (!session) return <Navigate to="/" replace />;
  if (!loading && !approved) return <Navigate to="/dashboard/creator-onboarding" replace />;
  const savePending = async () => {
    if (!editing) return;
    const { error } = await supabase.from('reel_submissions').update({ title: editing.title.trim(), caption: editing.caption.trim() }).eq('id', editing.id);
    if (error) setMessage(error.message); else { setEditing(null); setMessage('Pending Reel updated.'); refresh(); }
  };
  const removePending = async (reel: Reel) => {
    if (!window.confirm(`Delete “${reel.title}”? This cannot be undone.`)) return;
    const { error } = await supabase.from('reel_submissions').delete().eq('id', reel.id);
    if (error) setMessage(error.message); else { setMessage('Pending Reel deleted.'); refresh(); }
  };
  const submitAppeal = async () => {
    if (!appeal || appealMessage.trim().length < 20 || !session) return;
    const { error } = await supabase.from('creator_appeals').insert({ creator_id: session.user.id, reel_id: appeal.reelId, appeal_type: appeal.type, message: appealMessage.trim() });
    if (error) setMessage(error.message); else { setAppeal(null); setAppealMessage(''); setMessage('Appeal submitted for admin review.'); }
  };
  return <main className="mx-auto max-w-5xl pb-10"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--dv-accent)]">Creator studio</p><h1 className="mt-2 text-3xl font-black text-white">Your Reel workspace</h1><p className="mt-2 text-sm text-slate-400">Manage free Reels, review feedback, and see early performance.</p></div><div className="flex flex-wrap gap-2"><Link to="/dashboard/creator-film-studio" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-white"><FileVideo className="size-4" /> Film Studio</Link><Link to="/dashboard/create-reel" className="inline-flex items-center gap-2 rounded-xl bg-[var(--dv-accent)] px-4 py-3 text-sm font-bold text-white"><Plus className="size-4" /> Upload Reel</Link></div></div>{accountStatus === 'suspended' ? <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">Creator uploads are paused. <button type="button" onClick={() => setAppeal({ reelId: null, type: 'account_suspension' })} className="font-bold underline">Request a review</button></div> : null}<div className="mt-6 grid gap-3 sm:grid-cols-5">{[[reels.filter(r => r.status === 'approved').length, 'Published'], [views, 'Unique daily views'], [loves, 'Loves'], [comments, 'Comments'], [followers, 'Followers']].map(([value,label]) => <div className="rounded-2xl border border-white/10 bg-[var(--dv-surface)] p-4" key={String(label)}><b className="text-2xl text-white">{value}</b><p className="mt-1 text-xs text-slate-400">{label}</p></div>)}</div><section className="mt-7 rounded-3xl border border-white/10 bg-[var(--dv-surface)] p-5 sm:p-6"><div className="flex items-center gap-2"><FileVideo className="size-5 text-[var(--dv-accent)]" /><h2 className="text-xl font-black text-white">Your Reels</h2></div>{reels.length ? <div className="mt-4 grid gap-3">{reels.map(reel => <article className="rounded-2xl border border-white/10 bg-black/20 p-4" key={reel.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><strong className="text-white">{reel.title}</strong><p className="mt-1 text-sm text-slate-400">{reel.caption || 'No caption'}</p><span className="mt-3 inline-block rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold uppercase text-slate-300">{reel.status}</span>{reel.moderation_note ? <p className="mt-3 text-sm text-amber-200">Admin note: {reel.moderation_note}</p> : null}{reel.status === 'rejected' ? <button type="button" onClick={() => setAppeal({ reelId: reel.id, type: 'reel_rejection' })} className="mt-3 block text-sm font-bold text-[var(--dv-accent)]">Appeal this decision</button> : null}</div>{reel.status === 'pending' ? <div className="flex gap-2"><button type="button" onClick={() => setEditing(reel)} className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-white"><Pencil className="size-3" /> Edit</button><button type="button" onClick={() => void removePending(reel)} className="inline-flex items-center gap-1 rounded-lg bg-red-500/15 px-3 py-2 text-xs font-bold text-red-200"><Trash2 className="size-3" /> Delete</button></div> : null}</div></article>)}</div> : <p className="mt-6 text-sm text-slate-400">Your uploads will appear here.</p>}</section>{editing ? <div className="fixed inset-0 z-[90] grid place-items-center bg-black/80 p-5"><form onSubmit={(event) => { event.preventDefault(); void savePending(); }} className="w-full max-w-lg rounded-3xl border border-white/15 bg-[var(--dv-surface)] p-6"><h2 className="text-xl font-black text-white">Edit pending Reel</h2><label className="mt-5 grid gap-2 text-sm text-white">Title<input required maxLength={120} value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} className="rounded-xl border border-white/15 bg-black/20 p-3" /></label><label className="mt-4 grid gap-2 text-sm text-white">Caption<textarea maxLength={500} value={editing.caption} onChange={(event) => setEditing({ ...editing, caption: event.target.value })} className="rounded-xl border border-white/15 bg-black/20 p-3" /></label><div className="mt-5 flex gap-3"><button className="rounded-xl bg-[var(--dv-accent)] px-4 py-3 text-sm font-bold text-white">Save</button><button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-white">Cancel</button></div></form></div> : null}{appeal ? <div className="fixed inset-0 z-[90] grid place-items-center bg-black/80 p-5"><section className="w-full max-w-lg rounded-3xl border border-white/15 bg-[var(--dv-surface)] p-6"><h2 className="text-xl font-black text-white">Request admin review</h2><p className="mt-2 text-sm text-slate-400">Explain why this decision should be reviewed. Do not include private documents.</p><textarea minLength={20} maxLength={1000} value={appealMessage} onChange={(event) => setAppealMessage(event.target.value)} className="mt-5 min-h-32 w-full rounded-xl border border-white/15 bg-black/20 p-3 text-white" /><div className="mt-5 flex gap-3"><button type="button" disabled={appealMessage.trim().length < 20} onClick={() => void submitAppeal()} className="rounded-xl bg-[var(--dv-accent)] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">Submit appeal</button><button type="button" onClick={() => setAppeal(null)} className="rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-white">Cancel</button></div></section></div> : null}{message ? <p className="mt-4 text-sm text-slate-300">{message}</p> : null}</main>;
}

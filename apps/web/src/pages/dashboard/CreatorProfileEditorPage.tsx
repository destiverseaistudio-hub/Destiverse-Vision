import { ArrowLeft, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { uploadMyAvatar } from '@/services/profile';

type CreatorDraft = {
  handle: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  discoverable: boolean;
};

const emptyDraft: CreatorDraft = { handle: '', display_name: '', bio: '', avatar_url: '', discoverable: true };

export default function CreatorProfileEditorPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<CreatorDraft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isCreator, setIsCreator] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    if (!session) return;
    let active = true;
    void Promise.all([
      supabase.from('creator_applications').select('status').eq('user_id', session.user.id).maybeSingle(),
      supabase.from('creator_profiles').select('handle,display_name,bio,avatar_url,discoverable').eq('user_id', session.user.id).maybeSingle(),
    ]).then(([application, profile]) => {
      if (!active) return;
      const approved = application.data?.status === 'approved';
      setIsCreator(approved);
      if (profile.data) {
        setDraft({
          handle: profile.data.handle ?? '',
          display_name: profile.data.display_name ?? '',
          bio: profile.data.bio ?? '',
          avatar_url: profile.data.avatar_url ?? '',
          discoverable: profile.data.discoverable ?? true,
        });
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [session]);

  if (!session) return <Navigate to="/" replace />;
  if (!loading && !isCreator) return <Navigate to="/dashboard/creator-onboarding" replace />;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const handle = draft.handle.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(handle)) {
      setMessage('Handle must be 3–30 lowercase letters, numbers, or underscores.');
      return;
    }
    if (draft.display_name.trim().length < 2 || draft.bio.trim().length < 20) {
      setMessage('Add a display name and at least 20 characters about your creative work.');
      return;
    }
    setSaving(true);
    setMessage('');
    let avatarUrl = draft.avatar_url.trim() || null;
    if (avatarFile) {
      const upload = await uploadMyAvatar(avatarFile);
      if (upload.error || !upload.data) {
        setSaving(false);
        setMessage(upload.error?.message || 'Your profile image could not be uploaded.');
        return;
      }
      avatarUrl = upload.data;
    }
    const { error } = await supabase.from('creator_profiles').update({
      handle,
      display_name: draft.display_name.trim(),
      bio: draft.bio.trim(),
      avatar_url: avatarUrl,
      discoverable: draft.discoverable,
      updated_at: new Date().toISOString(),
    }).eq('user_id', session.user.id);
    setSaving(false);
    if (error) {
      setMessage(error.code === '23505' ? 'That creator handle is already taken.' : error.message);
      return;
    }
    navigate(`/dashboard/creator/${session.user.id}`);
  };

  return (
    <main className="mx-auto max-w-2xl pb-10">
      <Link to={`/dashboard/creator/${session.user.id}`} className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
        <ArrowLeft className="size-4" /> Back to creator profile
      </Link>
      <section className="mt-5 rounded-3xl border border-white/10 bg-[var(--dv-surface)] p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--dv-accent)]">Creator mode</p>
        <h1 className="mt-2 text-3xl font-black text-white">Edit creator profile</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">This is the public profile viewers see when they open your Reel creator page.</p>
        {loading ? <p className="mt-6 text-sm text-slate-400">Loading creator profile…</p> : (
          <form onSubmit={save} className="mt-6 grid gap-5">
            <label className="text-sm font-semibold text-white">Creator handle<input required minLength={3} maxLength={30} value={draft.handle} onChange={(event) => setDraft({ ...draft, handle: event.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() })} className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 p-3 text-white" /></label>
            <label className="text-sm font-semibold text-white">Display name<input required minLength={2} maxLength={80} value={draft.display_name} onChange={(event) => setDraft({ ...draft, display_name: event.target.value })} className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 p-3 text-white" /></label>
            <label className="text-sm font-semibold text-white">Bio<textarea required minLength={20} maxLength={500} rows={5} value={draft.bio} onChange={(event) => setDraft({ ...draft, bio: event.target.value })} className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 p-3 text-white" /></label>
            <label className="text-sm font-semibold text-white">Upload profile photo <span className="font-normal text-slate-500">(PNG, JPG, or WebP; up to 7 MB)</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0] ?? null; if (file && file.size > 7 * 1024 * 1024) { setAvatarFile(null); setMessage('Choose an image no larger than 7 MB.'); event.target.value = ''; return; } setAvatarFile(file); setMessage(''); }} className="mt-2 block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--dv-accent)]/15 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[var(--dv-accent)]" /></label>
            <label className="text-sm font-semibold text-white">Or profile image URL <span className="font-normal text-slate-500">(optional)</span><input type="url" value={draft.avatar_url} onChange={(event) => setDraft({ ...draft, avatar_url: event.target.value })} placeholder="https://example.com/photo.jpg" className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 p-3 text-white" /></label>
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white"><span><b className="block">Public creator profile</b><small className="mt-1 block text-slate-400">Turn off to hide your profile and published Reels from discovery.</small></span><input type="checkbox" checked={draft.discoverable} onChange={(event) => setDraft({ ...draft, discoverable: event.target.checked })} className="size-5 accent-[var(--dv-accent)]" /></label>
            <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--dv-accent)] px-5 py-3 font-bold text-white disabled:opacity-50"><Save className="size-4" /> {saving ? 'Saving…' : 'Save creator profile'}</button>
            {message ? <p className="text-sm text-red-300" role="status">{message}</p> : null}
          </form>
        )}
      </section>
    </main>
  );
}

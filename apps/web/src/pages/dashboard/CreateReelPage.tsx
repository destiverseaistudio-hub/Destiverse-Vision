import { Bot } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { uploadWithRetry } from '@/services/uploads';

const maxReelUploadBytes = 50 * 1024 * 1024;

export default function CreateReelPage() {
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [approval, setApproval] = useState<
    'loading' | 'missing' | 'pending' | 'declined' | 'suspended' | 'approved'
  >('loading');
  const [dailyCount, setDailyCount] = useState(0);
  const [tutorial, setTutorial] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadStage, setUploadStage] = useState<'idle' | 'uploading' | 'processing'>('idle');
  const [busy, setBusy] = useState(false);
  const [soundFile, setSoundFile] = useState<File | null>(null);
  const [soundPreviewUrl, setSoundPreviewUrl] = useState('');
  const [soundLabel, setSoundLabel] = useState(() => searchParams.get('sound') ?? '');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiRemaining, setAiRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!session) return;
    const load = async () => {
      const [{ data: application }, { count }, { data: profile }] = await Promise.all([
        supabase
          .from('creator_applications')
          .select('status')
          .eq('user_id', session.user.id)
          .maybeSingle(),
        supabase
          .from('reel_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('creator_id', session.user.id)
          .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
        supabase
          .from('creator_profiles')
          .select('creator_tutorial_seen_at')
          .eq('user_id', session.user.id)
          .maybeSingle(),
      ]);
      setApproval(application?.status ?? 'missing');
      setDailyCount(count ?? 0);
      setTutorial(application?.status === 'approved' && !profile?.creator_tutorial_seen_at);
    };
    void load();
  }, [session]);
  const finishTutorial = async () => {
    if (session)
      await supabase
        .from('creator_profiles')
        .update({ creator_tutorial_seen_at: new Date().toISOString() })
        .eq('user_id', session.user.id);
    setTutorial(false);
  };
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!session || !file || approval !== 'approved') return;
    const hasSoundSelection = Boolean(soundFile);
    const selectedSoundLabel = hasSoundSelection
      ? (soundFile?.name ?? 'selected-sound').replace(/\.[^/.]+$/, '')
      : soundLabel.trim();
    if (dailyCount >= 10) {
      setMessage('Your daily 10-Reel limit has been reached. Try again tomorrow.');
      return;
    }
    if (file.size > maxReelUploadBytes) {
      setMessage('Choose a video smaller than 50 MB. Compress or trim the video, then try again.');
      return;
    }
    setBusy(true);
    setUploadStage('uploading');
    setMessage('');
    if (hasSoundSelection) {
      setSoundLabel(selectedSoundLabel);
    }
    const path = `${session.user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
    setMessage('Uploading directly from your device to secure DestiVerse storage… Keep this page open until it completes.');
    const { error: uploadError } = await uploadWithRetry('creator-reels', path, file, { contentType: file.type || undefined, cacheControl: '31536000', upsert: false });
    if (uploadError) {
      const detail = uploadError.message || 'The storage service did not accept the upload.';
      const transient = /520|gateway|network|fetch|timeout|temporar/i.test(detail);
      setMessage(transient
        ? 'Upload was interrupted by the storage gateway. Check your connection and try again. Your video is still selected.'
        : `Upload failed: ${detail} Your video is still selected; you can try again.`);
      setUploadStage('idle');
      setBusy(false);
      return;
    }
    const { data: submission, error } = await supabase
      .from('reel_submissions')
      .insert({
        creator_id: session.user.id,
        title: title.trim(),
        caption: caption.trim(),
        video_url: path,
        audio_label: selectedSoundLabel || null,
      })
      .select('id,status')
      .single();
    if (error || !submission) {
      await supabase.storage.from('creator-reels').remove([path]);
      setMessage(error?.message || 'Could not submit your Reel.');
      setUploadStage('idle');
      setBusy(false);
      return;
    }
    setUploadStage('processing');
    const { data: review, error: reviewError } = await supabase.functions.invoke(
      'reel-auto-review',
      { body: { reelId: submission.id } },
    );
    setMessage(
      submission.status === 'removed'
        ? 'Your upload limit was exceeded. Creator access has been paused for admin review.'
        : reviewError
          ? 'Submitted for admin review. Automated triage is temporarily unavailable.'
          : `Submitted for review. ${review?.notice || 'An admin will review it before it appears in the feed.'}`,
    );
    setDailyCount((current) => current + 1);
    setTitle('');
    setCaption('');
    setFile(null);
    setSoundFile(null);
    setSoundPreviewUrl('');
    setSoundLabel('');
    setUploadStage('idle');
    setBusy(false);
  }
  async function fillWithAi() {
    if (!title.trim() && !caption.trim() && !file) { setMessage('Add a title, caption, or select a video so AI has context.'); return; }
    setAiBusy(true); setMessage('');
    const { data, error } = await supabase.functions.invoke('creator-reel-assist', { body: { title, description: caption, file_name: file?.name } });
    if (error || !data) setMessage(data?.error || 'Creator AI could not prepare a draft.');
    else {
      setTitle(data.title || title);
      setCaption(data.caption || caption);
      if (!soundFile) setSoundLabel(data.sound_label || soundLabel);
      setAiRemaining(typeof data.remaining === 'number' ? data.remaining : null);
      setMessage(`AI draft ready. Review it before submitting.${typeof data.remaining === 'number' ? ` ${data.remaining} free drafts remain this week.` : ''}`);
    }
    setAiBusy(false);
  }
  const access = {
    loading: 'Checking creator access…',
    missing: 'Finish your creator application before uploading.',
    pending: 'Your creator application is being reviewed.',
    declined: 'Your creator application needs an update before you can upload.',
    suspended: 'Uploads are paused. An admin is reviewing your account.',
    approved: `Creator access active · ${dailyCount}/10 uploads used today.`,
  }[approval];
  return (
    <main className="mx-auto max-w-xl pb-8">
      <Link to="/dashboard/reels" className="text-sm text-white/60 hover:text-white">
        ← Back to Reels
      </Link>
      <section className="mt-5 rounded-3xl border border-white/10 bg-[var(--dv-surface)] p-6">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--dv-accent)]">
          Creator studio
        </p>
        <h1 className="mt-2 text-3xl font-black text-white">Submit a Reel</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">{access}</p>
        {approval !== 'approved' && approval !== 'loading' ? (
          <Link
            to="/dashboard/creator-onboarding"
            className="mt-5 inline-flex rounded-xl bg-[var(--dv-accent)] px-4 py-3 text-sm font-bold text-white"
          >
            {approval === 'missing' || approval === 'declined'
              ? 'Open creator application'
              : 'View creator status'}
          </Link>
        ) : (
          <form onSubmit={submit} className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-white">
              Title
              <input
                required
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl border border-white/15 bg-black/20 p-3 text-white"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-white">
              Caption
              <textarea
                maxLength={500}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="rounded-xl border border-white/15 bg-black/20 p-3 text-white"
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
              <span>Use your title, caption, filename, and creator profile to draft a more personal title, caption, and original-sound label. Five free drafts weekly.</span>
              <button type="button" onClick={() => void fillWithAi()} disabled={aiBusy || (!title.trim() && !caption.trim() && !file)} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 font-bold text-white disabled:opacity-50"><Bot className="size-4" /> {aiBusy ? 'Drafting…' : 'AI fill'}</button>
              {aiRemaining !== null ? <span className="font-bold text-[var(--dv-accent)]">{aiRemaining} left</span> : null}
            </div>
            <label className="grid gap-2 text-sm font-semibold text-white">
              Vertical video
              <input
                required
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm text-slate-300"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-white">
              Add sound preview
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const nextFile = e.target.files?.[0] ?? null;
                  setSoundFile(nextFile);
                  setSoundLabel(nextFile ? nextFile.name.replace(/\.[^/.]+$/, '') : '');
                  if (nextFile) {
                    const preview = URL.createObjectURL(nextFile);
                    setSoundPreviewUrl(preview);
                  } else {
                    setSoundPreviewUrl('');
                  }
                }}
                className="text-sm text-slate-300"
              />
            </label>
            {soundPreviewUrl ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-xs font-bold uppercase tracking-[.18em] text-[var(--dv-accent)]">Sound preview</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSoundFile(null);
                      setSoundPreviewUrl('');
                      setSoundLabel('');
                    }}
                    className="text-xs font-bold text-slate-300"
                  >
                    Remove
                  </button>
                </div>
                <p className="mb-2 text-sm text-white">{soundLabel || 'Selected sound'}</p>
                <audio controls src={soundPreviewUrl} className="w-full" />
              </div>
            ) : null}
            <p className="text-xs leading-5 text-slate-500">
              MP4, WebM, or MOV; maximum 50 MB on the current Supabase Storage plan. Files upload directly from your device and are reviewed before publishing.
              Every Reel is reviewed before publishing.
            </p>
            <button
              disabled={busy || dailyCount >= 10}
              className="rounded-xl bg-[var(--dv-accent)] p-3 font-bold text-white disabled:opacity-60"
            >
              {busy ? uploadStage === 'processing' ? 'Checking submission…' : 'Uploading…' : 'Submit for approval'}
            </button>
          </form>
        )}
        {message ? (
          <p role="status" className="mt-4 text-sm text-slate-300">
            {message}
          </p>
        ) : null}
      </section>
      {tutorial ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-5">
          <section className="w-full max-w-md rounded-3xl border border-white/15 bg-[var(--dv-surface)] p-7">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--dv-accent)]">
              Creator Mode tutorial
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">Create safely and grow steadily</h2>
            <ol className="mt-5 grid gap-3 text-sm leading-6 text-slate-300">
              <li>1. Upload vertical videos you have the right to share.</li>
              <li>2. Keep titles and captions truthful and respectful.</li>
              <li>3. You can submit up to 10 Reels each day.</li>
              <li>4. Every Reel is reviewed before it reaches viewers.</li>
            </ol>
            <button
              type="button"
              onClick={() => void finishTutorial()}
              className="mt-6 w-full rounded-xl bg-[var(--dv-accent)] p-3 font-bold text-white"
            >
              Got it — open my studio
            </button>
          </section>
        </div>
      ) : null}
    </main>
  );
}

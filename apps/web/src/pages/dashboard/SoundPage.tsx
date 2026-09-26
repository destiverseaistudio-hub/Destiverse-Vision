import { ArrowLeft, Heart, Music2, Play, Share2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

type Reel = {
  id: string;
  title: string;
  caption: string;
  video_url: string;
  poster_url: string | null;
  creator_id?: string;
  creator_profiles?: { handle: string; display_name?: string | null; avatar_url?: string | null } | null;
  audio_label?: string | null;
};

export default function SoundPage() {
  const { soundKey } = useParams();
  const navigate = useNavigate();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  const soundLabel = useMemo(() => {
    const decoded = decodeURIComponent(soundKey ?? 'Original sound · DestiVerse');
    return decoded.replace(/\+/g, ' ');
  }, [soundKey]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('reel_submissions')
        .select('id,title,caption,video_url,poster_url,creator_id,creator_profiles(handle,display_name,avatar_url),audio_label')
        .eq('status', 'approved')
        .order('published_at', { ascending: false });

      const normalized = (data ?? []) as unknown as Reel[];
      const matches = normalized.filter((reel) => {
        const value = (reel.audio_label ?? 'Original sound · DestiVerse').toLowerCase();
        return value.includes(soundLabel.toLowerCase()) || soundLabel.toLowerCase().includes(value);
      });

      const withSignedUrls = await Promise.all(
        matches.map(async (reel) => {
          const { data: url } = await supabase.storage.from('creator-reels').createSignedUrl(reel.video_url, 3600);
          return { ...reel, video_url: url?.signedUrl ?? reel.video_url } as Reel;
        }),
      );

      setReels(withSignedUrls);
      setLoading(false);
    };

    void load();
  }, [soundLabel]);

  const toggleLike = (reelId: string) => {
    setLiked((current) => ({ ...current, [reelId]: !current[reelId] }));
  };

  return (
    <main className="mx-auto max-w-5xl pb-10 text-white">
      <div className="mb-5 flex items-center justify-between gap-3">
        <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:text-white">
          <ArrowLeft className="size-4" /> Back
        </button>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
          <Music2 className="size-4 text-[var(--dv-accent)]" /> {soundLabel}
        </div>
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-[var(--dv-surface)] p-4 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-[var(--dv-accent)]">Sound</p>
            <h1 className="mt-2 text-3xl font-black text-white">{soundLabel}</h1>
          </div>
          <button type="button" className="inline-flex items-center gap-2 rounded-full bg-[var(--dv-accent)] px-4 py-2.5 text-sm font-black text-white">
            <Play className="size-4 fill-current" /> Use sound
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-3">
            {loading ? (
              <div className="grid aspect-[9/13] place-items-center rounded-[1.25rem] border border-dashed border-white/10 bg-black/25">
                <div className="grid size-12 place-items-center rounded-full border border-white/15 bg-white/5">
                  <div className="size-7 animate-spin rounded-full border-2 border-white/20 border-t-[var(--dv-accent)]" />
                </div>
              </div>
            ) : reels[0] ? (
              <div className="relative overflow-hidden rounded-[1.25rem] bg-black">
                <video
                  key={reels[0].id}
                  src={reels[0].video_url}
                  className="aspect-[9/13] w-full object-cover"
                  controls
                  playsInline
                  muted={false}
                  autoPlay
                  poster={reels[0].poster_url ?? undefined}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
              </div>
            ) : (
              <div className="grid aspect-[9/13] place-items-center rounded-[1.25rem] border border-dashed border-white/10 bg-black/25 text-sm text-slate-400">
                No reels are using this sound yet.
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {reels.slice(0, 6).map((reel) => (
              <Link key={reel.id} to={`/dashboard/reels?reel=${reel.id}`} className="group flex items-center gap-3 rounded-[1.2rem] border border-white/10 bg-black/20 p-2 transition hover:border-white/20 hover:bg-white/5">
                <div className="relative h-20 w-16 overflow-hidden rounded-xl bg-black">
                  <img src={reel.poster_url ?? 'https://images.unsplash.com/...'} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{reel.title}</p>
                  <p className="mt-1 text-xs text-slate-400">@{reel.creator_profiles?.handle || 'creator'}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <button type="button" onClick={(event) => { event.preventDefault(); toggleLike(reel.id); }} className="grid size-8 place-items-center rounded-full bg-white/5">
                    <Heart className={`size-3.5 ${liked[reel.id] ? 'fill-[var(--dv-accent)] text-[var(--dv-accent)]' : ''}`} />
                  </button>
                  <button type="button" onClick={(event) => { event.preventDefault(); }} className="grid size-8 place-items-center rounded-full bg-white/5">
                    <Share2 className="size-3.5" />
                  </button>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 sm:bottom-6">
        <div className="flex w-full max-w-[420px] items-center justify-between rounded-full border border-white/10 bg-black/75 px-4 py-3 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2 text-sm text-white/80">
            <Music2 className="size-4 text-[var(--dv-accent)]" />
            <span className="truncate">{soundLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white">Preview</button>
            <button type="button" className="rounded-full bg-[var(--dv-accent)] px-4 py-2 text-xs font-black text-white">Use sound</button>
          </div>
        </div>
      </div>
    </main>
  );
}

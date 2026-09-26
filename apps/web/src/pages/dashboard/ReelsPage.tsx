import {
  ChevronDown,
  ChevronUp,
  Heart,
  EyeOff,
  Flag,
  MessageCircle,
  Music2,
  Pause,
  Play,
  Search,
  Share2,
  Sparkles,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getAdCampaigns, rememberAdImpression, recordAdEvent, viewerHasAdFreeAccess, type AdCampaign } from '@/services/ads';

type Reel = {
  id: string;
  title: string;
  caption: string;
  video_url: string;
  poster_url: string | null;
  creator_id?: string;
  creator_profiles?: { handle: string; display_name?: string | null; avatar_url?: string | null } | null;
  demo?: boolean;
  audio_label?: string | null;
};
type Comment = { id: string; body: string; created_at: string; user_id: string; profile_name?: string | null };
type CreatorSearchResult = { user_id: string; handle: string; display_name: string; avatar_url: string | null };
const recentReelSearchesKey = 'destiverse-reel-recent-searches';
const demos: Reel[] = [
  [
    'welcome',
    'Welcome to DestiVerse',
    'Stories, creators, and fresh perspectives—made for your next discovery.',
    'destiverse',
  ],
  [
    'feed',
    'Your Reels feed',
    'Scroll through original short videos, support creators, and join the conversation.',
    'destiverse',
  ],
  [
    'first-cut',
    'The First Cut',
    'A behind-the-scenes moment from a creator finding their visual voice.',
    'maya.creates',
  ],
  [
    'bright-idea',
    'One Bright Idea',
    'Small ideas can begin meaningful conversations. What will you make today?',
    'theopenframe',
  ],
  [
    'start',
    'Make your first Reel',
    'Create your trusted profile, unlock your studio, and share your story.',
    'destiverse',
  ],
].map(([id, title, caption, handle]) => ({
  id: `demo-${id}`,
  title,
  caption,
  video_url: '',
  poster_url: null,
  creator_profiles: { handle },
  demo: true,
}));

function DemoVisual({ reel }: { reel: Reel }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#100b1d]">
      <div className="absolute -left-20 top-12 size-80 animate-pulse rounded-full bg-fuchsia-600/50 blur-3xl" />
      <div className="absolute -right-20 bottom-10 size-80 animate-pulse rounded-full bg-red-600/60 blur-3xl [animation-delay:600ms]" />
      <div className="absolute inset-x-7 top-[22%] rounded-[2rem] border border-white/20 bg-black/20 p-7 text-center shadow-2xl backdrop-blur">
        <Sparkles className="mx-auto size-11 text-white" />
        <p className="mt-5 text-[10px] font-black uppercase tracking-[.32em] text-white/70">
          DestiVerse reminder
        </p>
        <h2 className="mt-3 text-4xl font-black leading-tight text-white">{reel.title}</h2>
        <p className="mt-4 text-sm leading-6 text-white/80">{reel.caption}</p>
      </div>
    </div>
  );
}

export default function ReelsPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [reels, setReels] = useState<Reel[]>([]);
  const [liked, setLiked] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [blockedCreators, setBlockedCreators] = useState<string[]>([]);
  const [notInterested, setNotInterested] = useState<string[]>([]);
  const [feedMode, setFeedMode] = useState<'for-you' | 'following'>('for-you');
  const [commentReel, setCommentReel] = useState<Reel | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [reportedCommentIds, setReportedCommentIds] = useState<string[]>([]);
  const [activeReelId, setActiveReelId] = useState<string | null>(null);
  const [videoMutedByReel, setVideoMutedByReel] = useState<Record<string, boolean>>({});
  const [reelBoosts, setReelBoosts] = useState<Record<string, number>>(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('destiverse-reel-boosts') ?? '{}');
      return saved && typeof saved === 'object' ? saved : {};
    } catch {
      return {};
    }
  });
  const [reelPlayback, setReelPlayback] = useState<Record<string, boolean>>({});
  const [reelLoading, setReelLoading] = useState<Record<string, boolean>>({});
  const [likedBurstId, setLikedBurstId] = useState<string | null>(null);
  const [shareReelTarget, setShareReelTarget] = useState<Reel | null>(null);
  const [commentDisplayNames, setCommentDisplayNames] = useState<Record<string, string>>({});
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(recentReelSearchesKey) ?? '[]');
      return Array.isArray(saved) ? saved.filter((item): item is string => typeof item === 'string').slice(0, 6) : [];
    } catch {
      return [];
    }
  });
  const [creatorSearchResults, setCreatorSearchResults] = useState<CreatorSearchResult[]>([]);
  const [reelAd, setReelAd] = useState<AdCampaign | null>(null);
  const normalizedSearch = searchQuery.trim().toLowerCase().replace(/^@/, '');
  const searchTerms = normalizedSearch.replace(/[^a-z0-9#@]+/g, ' ').split(/\s+/).map(term => term.replace(/^[@#]/, '')).filter(Boolean);
  const feedRef = useRef<HTMLDivElement>(null);
  const reelSwipeStart = useRef<{ y: number; x: number } | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const [prevSearch, setPrevSearch] = useState(normalizedSearch);
  if (normalizedSearch !== prevSearch) {
    setPrevSearch(normalizedSearch);
    if (!normalizedSearch) {
      setCreatorSearchResults([]);
    }
  }

  useEffect(() => {
    window.localStorage.setItem('destiverse-reel-boosts', JSON.stringify(reelBoosts));
  }, [reelBoosts]);
  useEffect(() => {
    if (!normalizedSearch) return;
    let active = true;
    void supabase.from('creator_profiles').select('user_id,handle,display_name,avatar_url').eq('discoverable', true).limit(50).then(({ data }) => {
      if (!active) return;
      setCreatorSearchResults(((data ?? []) as CreatorSearchResult[]).filter(creator => `${creator.handle} ${creator.display_name}`.toLowerCase().includes(normalizedSearch)).slice(0, 4));
    });
    return () => { active = false; };
  }, [normalizedSearch]);
  const rememberSearch = (value = searchQuery) => {
    const clean = value.trim();
    if (!clean) return;
    const next = [clean, ...recentSearches.filter(item => item.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
    setRecentSearches(next); window.localStorage.setItem(recentReelSearchesKey, JSON.stringify(next));
  };
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('reel_submissions')
        .select('id,title,caption,video_url,poster_url,creator_id,creator_profiles(handle,display_name,avatar_url)')
        .eq('status', 'approved')
        .order('published_at', { ascending: false });
      const signed = await Promise.all(
        (data ?? []).map(async (reel) => {
          const { data: url } = await supabase.storage
            .from('creator-reels')
            .createSignedUrl(reel.video_url, 3600);
          return { ...reel, video_url: url?.signedUrl ?? reel.video_url };
        }),
      );
      setReels(signed as unknown as Reel[]);
    };
    void load();
    const channel = supabase
      .channel(`reels-feed-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reel_submissions' }, load)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);
  useEffect(() => { let active = true; void (async () => { const ads = await getAdCampaigns('reels', 'reel_ad', await viewerHasAdFreeAccess()); if (active && ads[0]) setReelAd(ads[0]) })(); return () => { active = false } }, []);
  useEffect(() => {
    if (!session) return;
    void supabase
      .from('reel_creator_follows')
      .select('creator_id')
      .eq('follower_id', session.user.id)
      .then(({ data }) => setFollowing((data ?? []).map((row) => row.creator_id)));
  }, [session]);
  useEffect(() => {
    if (!session) return;
    void supabase
      .from('reel_reactions')
      .select('reel_id')
      .eq('user_id', session.user.id)
      .eq('reaction', 'love')
      .then(({ data }) => setLiked((data ?? []).map((row) => row.reel_id)));
  }, [session]);
  useEffect(() => {
    if (!session) return;
    void Promise.all([
      supabase.from('creator_blocks').select('creator_id').eq('blocker_id', session.user.id),
      supabase.from('reel_not_interested').select('reel_id').eq('user_id', session.user.id),
    ]).then(([blocks, hidden]) => { setBlockedCreators((blocks.data ?? []).map(row => row.creator_id)); setNotInterested((hidden.data ?? []).map(row => row.reel_id)); });
  }, [session]);
  const toggleFollow = async (creatorId: string) => {
    if (!session || creatorId === session.user.id) return;
    const isFollowing = following.includes(creatorId);
    const { error } = isFollowing
      ? await supabase
          .from('reel_creator_follows')
          .delete()
          .eq('follower_id', session.user.id)
          .eq('creator_id', creatorId)
      : await supabase
          .from('reel_creator_follows')
          .insert({ follower_id: session.user.id, creator_id: creatorId });
    if (!error)
      setFollowing((current) =>
        isFollowing ? current.filter((id) => id !== creatorId) : [...current, creatorId],
      );
  };
  const move = (direction: 1 | -1) => {
    if (!feedRef.current) return;
    const cards = Array.from(feedRef.current.querySelectorAll<HTMLElement>('[data-reel-id]'));
    const activeId = activeReelId ?? cards[0]?.dataset.reelId ?? null;
    const currentIndex = cards.findIndex((card) => card.dataset.reelId === activeId);
    const nextIndex = Math.min(cards.length - 1, Math.max(0, currentIndex + direction));
    const target = cards[nextIndex];
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const beginReelSwipe = (event: React.TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    if (touch) reelSwipeStart.current = { y: touch.clientY, x: touch.clientX };
  };
  const finishReelSwipe = (event: React.TouchEvent<HTMLElement>) => {
    const start = reelSwipeStart.current;
    const touch = event.changedTouches[0];
    reelSwipeStart.current = null;
    if (!start || !touch) return;
    const verticalDistance = touch.clientY - start.y;
    const horizontalDistance = touch.clientX - start.x;
    if (Math.abs(verticalDistance) < 56 || Math.abs(verticalDistance) <= Math.abs(horizontalDistance)) return;
    move(verticalDistance < 0 ? 1 : -1);
  };
  const toggleLove = async (reel: Reel, source: 'button' | 'double-tap' = 'button') => {
    if (!session || reel.demo) return;
    const loved = liked.includes(reel.id);
    if (source === 'double-tap' && loved) return;
    if (source === 'double-tap') {
      setLikedBurstId(reel.id);
      setTimeout(() => setLikedBurstId((current) => (current === reel.id ? null : current)), 500);
    }
    if (loved) return;
    const { error } = await supabase
      .from('reel_reactions')
      .insert({ reel_id: reel.id, user_id: session.user.id, reaction: 'love' })
      .select('id')
      .single();
    if (!error) setLiked((current) => [...new Set([...current, reel.id])]);
  };
  const trackView = async (reel: Reel) => {
    if (!session || reel.demo) return;
    await supabase
      .from('reel_view_events')
      .upsert(
        { reel_id: reel.id, viewer_id: session.user.id },
        { onConflict: 'reel_id,viewer_id,viewed_on', ignoreDuplicates: true },
      );
  };
  const markNotInterested = async (reel: Reel) => {
    if (!session || reel.demo) return;
    const { error } = await supabase.from('reel_not_interested').insert({ user_id: session.user.id, reel_id: reel.id });
    if (!error || error.code === '23505') setNotInterested(current => [...new Set([...current, reel.id])]);
  };
  const reportReel = async (reel: Reel) => {
    if (!session || reel.demo) return;
    const reason = window.prompt('Why should this Reel be reviewed?');
    if (!reason?.trim()) return;
    const { error } = await supabase.from('reel_reports').insert({ reel_id: reel.id, reporter_id: session.user.id, reason: reason.trim() });
    window.alert(error ? (error.code === '23505' ? 'You have already reported this Reel.' : `Report could not be sent: ${error.message}`) : 'Report sent to moderation.');
  };
  const weeklyDemo = new Date().getDay() === 1 ? demos[new Date().getDate() % demos.length] : null;
  const eligibleReels = reels.filter(reel => !notInterested.includes(reel.id) && !blockedCreators.includes(reel.creator_id ?? '') && (feedMode === 'for-you' || following.includes(reel.creator_id ?? '')));
  const defaultFeed = eligibleReels.length
    ? [...eligibleReels.slice(0, 3), ...(weeklyDemo && feedMode === 'for-you' ? [weeklyDemo] : []), ...eligibleReels.slice(3)]
    : demos;
  const requestedReelId = searchParams.get('reel');
  const requestedReel = requestedReelId ? defaultFeed.find(reel => reel.id === requestedReelId) : null;
  const focusedFeed = requestedReel ? [requestedReel, ...defaultFeed.filter(reel => reel.id !== requestedReel.id)] : defaultFeed;
  const matchedReels = [...eligibleReels, ...demos].filter(reel => {
    const keywords = [
      reel.title,
      reel.caption,
      reel.audio_label ?? '',
      reel.creator_profiles?.handle ?? '',
      reel.creator_profiles?.display_name ?? '',
    ].join(' ').toLowerCase().replace(/[^a-z0-9#@\s]+/g, ' ');
    return searchTerms.every(term => keywords.includes(term));
  }).sort((left, right) => {
    const score = (reel: Reel) => searchTerms.reduce((total, term) => {
      const haystack = `${reel.title} ${reel.caption} ${reel.audio_label ?? ''} ${reel.creator_profiles?.handle ?? ''} ${reel.creator_profiles?.display_name ?? ''}`.toLowerCase();
      return total + (haystack.startsWith(term) ? 4 : 0) + (haystack.includes(term) ? 1 : 0);
    }, 0);
    return score(right) - score(left);
  });
  const feed = normalizedSearch ? matchedReels : focusedFeed;
  const feedWithAds: Array<Reel | { ad: AdCampaign; id: string }> = reelAd && !normalizedSearch ? feed.flatMap((reel, index) => (index > 0 && index % reelAd.reel_interval === 0 ? [reel, { id: `ad-${reelAd.id}-${index}`, ad: reelAd }] : [reel])) : feed;
  useEffect(() => {
    if (!commentReel) return;
    void supabase
      .from('reel_comments')
      .select('id,body,created_at,user_id')
      .eq('reel_id', commentReel.id)
      .eq('hidden', false)
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        const nextComments = (data ?? []) as Comment[];
        setComments(nextComments);
        const userIds = [...new Set(nextComments.map(comment => comment.user_id).filter(Boolean))];
        if (!userIds.length) return;
        const { data: profileRows } = await supabase.from('profiles').select('id, display_name').in('id', userIds);
        const names = Object.fromEntries((profileRows ?? []).map((profile) => [profile.id, profile.display_name || 'User'])) as Record<string, string>;
        setCommentDisplayNames((current) => ({ ...current, ...names }));

        if (session?.user?.id) {
          const currentUserName = session.user.user_metadata?.display_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User';
          setCommentDisplayNames((current) => ({ ...current, [session.user.id]: currentUserName }));
        }
      });
  }, [commentReel]);
  const addComment = async () => {
    if (!session || !commentReel || !commentBody.trim()) return;
    const { data, error } = await supabase
      .from('reel_comments')
      .insert({ reel_id: commentReel.id, user_id: session.user.id, body: commentBody.trim() })
      .select('id,body,created_at,user_id')
      .single();
    if (!error && data) {
      const authorLabel = session.user.user_metadata?.display_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User';
      setCommentDisplayNames((current) => ({ ...current, [session.user.id]: authorLabel }));
      setComments((current) => [{ ...(data as Comment), profile_name: authorLabel }, ...current]);
      setCommentBody('');
    }
  };
  const reportComment = async (comment: Comment) => {
    if (!session || comment.user_id === session.user.id || reportedCommentIds.includes(comment.id)) return;
    const reason = window.prompt('Why should this comment be reviewed?');
    if (!reason?.trim()) return;
    const { error } = await supabase
      .from('reel_comment_reports')
      .insert({ comment_id: comment.id, reporter_id: session.user.id, reason: reason.trim() });
    if (!error) {
      setReportedCommentIds((current) => [...current, comment.id]);
      window.alert('Report sent to DestiVerse moderation. Thank you.');
    } else if (error.code === '23505') {
      setReportedCommentIds((current) => [...current, comment.id]);
      window.alert('You have already reported this comment.');
    } else window.alert('Your report could not be sent. Please try again.');
  };
  const shareReel = async (reel: Reel, type: 'native' | 'copy' | 'whatsapp' | 'download' = 'native') => {
    const url = reel.demo ? `${window.location.origin}/dashboard/reels` : `${window.location.origin}/dashboard/reels/${reel.id}`;
    if (type === 'copy') {
      await navigator.clipboard?.writeText(url);
      return;
    }
    if (type === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${reel.title} ${url}`)}`, '_blank', 'noopener,noreferrer');
      return;
    }
    if (type === 'download') {
      const link = document.createElement('a');
      link.href = reel.video_url;
      link.download = `${reel.title.replace(/\s+/g, '-').toLowerCase()}.mp4`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    if (navigator.share)
      await navigator.share({ title: reel.title, text: reel.caption, url }).catch(() => undefined);
    else await navigator.clipboard?.writeText(url);
  };
  const boostReelLikes = (reel: Reel) => {
    const currentBoosts = reelBoosts[reel.id] ?? 0;
    if (currentBoosts >= 2) return;
    setReelBoosts((current) => {
      const next = Math.min(2, (current[reel.id] ?? 0) + 1);
      return { ...current, [reel.id]: next };
    });
  };
  const totalLikesFor = (reel: Reel) => (liked.includes(reel.id) ? 1 : 0) + (reelBoosts[reel.id] ?? 0) * 5;
  const getCommentAuthorName = (comment: Comment) => {
    if (commentDisplayNames[comment.user_id]) return commentDisplayNames[comment.user_id];
    if (comment.profile_name) return comment.profile_name;
    const userLabel = session?.user.user_metadata?.display_name || session?.user.user_metadata?.full_name || session?.user.email?.split('@')[0];
    return userLabel || 'User';
  };
  const triggerSoundSearch = (reel: Reel) => {
    const sound = reel.audio_label || 'original sound';
    setSearchOpen(true);
    setSearchQuery(sound);
    rememberSearch(sound);
  };
  useEffect(() => {
    if (!feedRef.current || !feed.length) return;
    const container = feedRef.current;
    const nodes = Array.from(container.querySelectorAll<HTMLElement>('[data-reel-id]'));
    if (!nodes.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        if (visible) {
          const nextId = (visible.target as HTMLElement).dataset.reelId ?? null;
          if (nextId) setActiveReelId(nextId);
        }
      },
      { root: container, threshold: [0.6, 0.8] },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [feed]);
  useEffect(() => {
    if (!feed.length) return;
    const videoIds = new Set(feed.map((reel) => reel.id));
    Object.keys(videoRefs.current).forEach((id) => {
      if (!videoIds.has(id)) delete videoRefs.current[id];
    });
    feed.forEach((reel) => {
      const video = videoRefs.current[reel.id];
      if (!video) return;
      const isCurrent = reel.id === activeReelId;
      const shouldPlay = isCurrent && (reelPlayback[reel.id] ?? true);
      const muted = !isCurrent || (videoMutedByReel[reel.id] ?? false);
      video.muted = muted;
      if (shouldPlay) {
        void video.play().catch(() => undefined);
        video.setAttribute('data-play-state', 'active');
      } else {
        video.pause();
        video.setAttribute('data-play-state', 'paused');
      }
      if (!isCurrent) {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [feed, activeReelId, reelPlayback, videoMutedByReel]);
  return (
    <main className="relative mx-auto max-w-[520px] overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-2xl">
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-5 py-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.24em] text-[var(--dv-accent)]">
            DestiVerse
          </p>
          <h1 className="text-2xl font-black text-white">Reels</h1>
          <div className="mt-2 flex gap-3 text-xs font-bold"><button type="button" onClick={() => setFeedMode('for-you')} className={feedMode === 'for-you' ? 'text-white' : 'text-white/50'}>For you</button><button type="button" onClick={() => setFeedMode('following')} className={feedMode === 'following' ? 'text-white' : 'text-white/50'}>Following</button></div>
        </div>
        <div className="flex items-center gap-2"><button type="button" onClick={() => setSearchOpen(true)} className="grid size-10 place-items-center rounded-full bg-black/45 text-white backdrop-blur" aria-label="Search Reels"><Search className="size-5" /></button><Link to="/dashboard/create-reel" className="inline-flex items-center gap-2 rounded-full bg-[var(--dv-accent)] px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-[var(--dv-accent)]/30"><Upload className="size-4" /> Create</Link></div>
      </header>
      {searchOpen ? <div className="absolute inset-x-3 top-3 z-40 rounded-2xl border border-white/15 bg-zinc-950/95 p-2 shadow-2xl backdrop-blur"><div className="flex items-center gap-2"><Search className="ml-2 size-5 shrink-0 text-slate-400" /><input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') rememberSearch(); }} placeholder="Search creator, Reel, or #hashtag" className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white outline-none placeholder:text-slate-500" /><button type="button" onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-300 hover:bg-white/10" aria-label="Close Reel search"><X className="size-5" /></button></div>{normalizedSearch ? <div className="mt-2 border-t border-white/10 pt-2"><p className="px-2 pb-1 text-[10px] font-black uppercase tracking-[.16em] text-slate-500">Creator results</p>{creatorSearchResults.length ? creatorSearchResults.map(creator => <button type="button" key={creator.user_id} onClick={() => { rememberSearch(); navigate(`/dashboard/creator/${creator.user_id}`); }} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/10"><span className="grid size-9 place-items-center overflow-hidden rounded-full bg-[var(--dv-accent)]/20 text-xs font-black text-[var(--dv-accent)]">{creator.avatar_url ? <img src={creator.avatar_url} alt="" className="size-full object-cover" /> : (creator.display_name || creator.handle).slice(0, 1).toUpperCase()}</span><span className="min-w-0"><strong className="block truncate text-sm text-white">{creator.display_name || creator.handle}</strong><span className="block truncate text-xs text-[var(--dv-accent)]">@{creator.handle}</span></span></button>) : <p className="px-2 py-2 text-xs text-slate-500">No public creator matches.</p>}</div> : recentSearches.length ? <div className="mt-2 border-t border-white/10 pt-2"><p className="px-2 pb-1 text-[10px] font-black uppercase tracking-[.16em] text-slate-500">Recent searches</p><div className="flex flex-wrap gap-2 px-2 pb-1">{recentSearches.map(term => <button type="button" key={term} onClick={() => setSearchQuery(term)} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/15">{term}</button>)}</div></div> : null}</div> : null}
      <div
        ref={feedRef}
        className="h-[calc(100dvh-5rem)] min-h-[580px] snap-y snap-mandatory overflow-y-scroll scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {feedWithAds.map((entry) => "ad" in entry ? <article key={entry.id} className="relative grid h-full min-h-[580px] snap-start place-items-center overflow-hidden bg-gradient-to-br from-[#19030b] via-[#120c24] to-black p-7"><div className="absolute inset-0 opacity-25" style={entry.ad.media_url ? { backgroundImage: `url(${entry.ad.media_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} /><div className="relative w-full max-w-sm rounded-[2rem] border border-white/15 bg-black/55 p-6 text-center backdrop-blur-xl"><p className="text-[10px] font-black uppercase tracking-[.24em] text-white/55">Sponsored discovery</p>{entry.ad.video_url ? <video src={entry.ad.video_url} controls playsInline muted className="mt-4 aspect-[9/13] w-full rounded-2xl bg-black object-cover" onPlay={() => { rememberAdImpression(entry.ad); void recordAdEvent(entry.ad.id, 'impression') }} /> : null}<h2 className="mt-5 text-2xl font-black text-white">{entry.ad.headline}</h2><p className="mt-2 text-sm leading-6 text-white/75">{entry.ad.body}</p>{entry.ad.cta_url ? <a href={entry.ad.cta_url} target="_blank" rel="noreferrer" onClick={() => void recordAdEvent(entry.ad.id, 'click')} className="mt-5 inline-flex rounded-xl bg-white px-4 py-3 text-sm font-bold text-black">{entry.ad.cta_label}</a> : null}<p className="mt-5 text-[10px] text-white/45">Your next Reel is one swipe away.</p></div></article> : (() => { const reel = entry; return (
          <article key={reel.id} data-reel-id={reel.id} onTouchStart={beginReelSwipe} onTouchEnd={finishReelSwipe} className="relative h-full min-h-[580px] snap-start bg-zinc-950 touch-pan-y" onDoubleClick={() => void toggleLove(reel, 'double-tap')}>
            {reel.demo ? (
              <DemoVisual reel={reel} />
            ) : (
              <video
                ref={(node) => {
                  if (node) videoRefs.current[reel.id] = node;
                  else delete videoRefs.current[reel.id];
                }}
                className="absolute inset-0 h-full w-full object-cover"
                src={reel.video_url}
                playsInline
                loop
                muted={videoMutedByReel[reel.id] ?? false}
                preload="metadata"
                onLoadStart={() => setReelLoading((current) => ({ ...current, [reel.id]: true }))}
                onCanPlay={() => setReelLoading((current) => ({ ...current, [reel.id]: false }))}
                onError={() => setReelLoading((current) => ({ ...current, [reel.id]: false }))}
                onPlay={() => void trackView(reel)}
              />
            )}
            {!reel.demo ? (
              <div
                className="absolute inset-0 z-10"
                onClick={() => {
                  const video = videoRefs.current[reel.id];
                  if (!video) return;
                  const shouldPlay = video.paused;
                  setReelPlayback((current) => ({ ...current, [reel.id]: shouldPlay }));
                  if (shouldPlay) void video.play().catch(() => undefined);
                  else video.pause();
                }}
                onPointerDown={() => {
                  if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
                  holdTimerRef.current = window.setTimeout(() => setShareReelTarget(reel), 500);
                }}
                onPointerUp={() => {
                  if (holdTimerRef.current) {
                    window.clearTimeout(holdTimerRef.current);
                    holdTimerRef.current = null;
                  }
                }}
                onPointerLeave={() => {
                  if (holdTimerRef.current) {
                    window.clearTimeout(holdTimerRef.current);
                    holdTimerRef.current = null;
                  }
                }}
              />
            ) : null}
            {reelLoading[reel.id] ? (
              <div className="absolute inset-0 z-20 grid place-items-center bg-black/35">
                <div className="grid size-12 place-items-center rounded-full border border-white/25 bg-black/45 backdrop-blur-md">
                  <div className="size-6 animate-spin rounded-full border-2 border-white/25 border-t-[var(--dv-accent)]" />
                </div>
              </div>
            ) : null}
            {likedBurstId === reel.id ? (
              <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center">
                <div className="animate-[ping_0.7s_ease-out_forwards] text-6xl text-[var(--dv-accent)]">♥</div>
              </div>
            ) : null}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/35" />
            {!reel.demo ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const isPlaying = reelPlayback[reel.id] ?? true;
                    const next = !isPlaying;
                    setReelPlayback((current) => ({ ...current, [reel.id]: next }));
                    const video = videoRefs.current[reel.id];
                    if (video) {
                      if (next) void video.play().catch(() => undefined);
                      else video.pause();
                    }
                  }}
                  className="absolute left-5 top-24 z-10 grid size-10 place-items-center rounded-full border border-white/10 bg-black/45 text-white shadow-lg backdrop-blur"
                  aria-label={reelPlayback[reel.id] ?? true ? 'Pause video' : 'Play video'}
                >
                  {(reelPlayback[reel.id] ?? true) ? <Pause className="size-4" /> : <Play className="size-4 fill-current" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = !(videoMutedByReel[reel.id] ?? false);
                    setVideoMutedByReel((current) => ({ ...current, [reel.id]: next }));
                    const video = videoRefs.current[reel.id];
                    if (video) {
                      video.muted = next;
                      if (reel.id === activeReelId && !next) void video.play().catch(() => undefined);
                    }
                  }}
                  className="absolute bottom-28 right-5 z-10 grid size-10 place-items-center rounded-full border border-white/10 bg-black/45 text-white shadow-lg backdrop-blur"
                  aria-label={videoMutedByReel[reel.id] ?? false ? 'Unmute audio' : 'Mute audio'}
                >
                  {videoMutedByReel[reel.id] ?? false ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                </button>
              </>
            ) : null}
            <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-6">
              <div className="min-w-0 flex-1">
                {reel.creator_id ? (
                  <Link
                    to={`/dashboard/creator/${reel.creator_id}`}
                    className="inline-flex max-w-full items-center gap-2 rounded-full pr-2 text-sm font-bold text-white transition hover:bg-white/10 hover:text-[var(--dv-accent)]"
                    aria-label={`Open @${reel.creator_profiles?.handle || 'creator'} profile`}
                  >
                    {reel.creator_profiles?.avatar_url ? <img src={reel.creator_profiles.avatar_url} alt="" className="size-8 shrink-0 rounded-full border border-white/30 object-cover" /> : <span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/25 bg-[var(--dv-accent)]/30 text-xs font-black text-white">{(reel.creator_profiles?.handle || 'C').slice(0, 1).toUpperCase()}</span>}
                    <span className="max-w-36 truncate">@{reel.creator_profiles?.handle || 'creator'}</span>
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-white"><span className="grid size-8 place-items-center rounded-full border border-white/25 bg-[var(--dv-accent)]/30 text-xs font-black">{(reel.creator_profiles?.handle || 'D').slice(0, 1).toUpperCase()}</span>@{reel.creator_profiles?.handle || 'destiverse'}</span>
                )}
                {reel.creator_id && reel.creator_id !== session?.user.id ? (
                  <button
                    type="button"
                    onClick={() => void toggleFollow(reel.creator_id!)}
                    className={`ml-2 rounded-full px-2.5 py-1 text-[10px] font-black ${following.includes(reel.creator_id) ? 'bg-white/15 text-white' : 'bg-white text-black'}`}
                  >
                    {following.includes(reel.creator_id) ? 'Following' : 'Follow'}
                  </button>
                ) : null}
                <span className="ml-2 rounded-full bg-white/15 px-2 py-1 text-[10px] font-bold text-white">
                  {reel.demo ? 'DEMO' : 'CREATOR'}
                </span>
                <h2 className="mt-3 text-2xl font-black text-white">{reel.title}</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-white/80">{reel.caption}</p>
                <button type="button" onClick={() => triggerSoundSearch(reel)} className="mt-4 flex items-center gap-2 text-xs text-white/70 hover:text-white">
                  <Music2 className="size-4" /> {reel.audio_label || 'Original sound · DestiVerse'}
                </button>
              </div>
              <div className="grid gap-4">
                <button
                  type="button"
                  onClick={() => void toggleLove(reel, 'button')}
                  disabled={reel.demo || !session}
                  className="grid justify-items-center gap-1 text-white"
                >
                  <span className="grid size-10 place-items-center rounded-full bg-black/45 backdrop-blur transition-transform duration-200 hover:scale-105">
                    <Heart
                      className={`size-4 ${liked.includes(reel.id) ? 'fill-[var(--dv-accent)] text-[var(--dv-accent)] drop-shadow-[0_0_12px_rgba(255,90,140,0.9)]' : ''}`}
                    />
                  </span>
                  <span className="text-[10px] font-bold">{totalLikesFor(reel)} Like{totalLikesFor(reel) === 1 ? '' : 's'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCommentReel(reel)}
                  className="grid justify-items-center gap-1 text-white"
                >
                  <span className="grid size-10 place-items-center rounded-full bg-black/45 backdrop-blur">
                    <MessageCircle className="size-4" />
                  </span>
                  <span className="text-[10px] font-bold">Comment</span>
                </button>
                <button
                  type="button"
                  onClick={() => boostReelLikes(reel)}
                  disabled={(reelBoosts[reel.id] ?? 0) >= 2}
                  className="grid justify-items-center gap-1 text-white disabled:opacity-50"
                >
                  <span className="grid size-10 place-items-center rounded-full bg-black/45 backdrop-blur">
                    <Sparkles className="size-4" />
                  </span>
                  <span className="text-[10px] font-bold">{(reelBoosts[reel.id] ?? 0) >= 2 ? 'Boosted' : 'Boost +5'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void shareReel(reel)}
                  className="grid justify-items-center gap-1 text-white"
                >
                  <span className="grid size-10 place-items-center rounded-full bg-black/45 backdrop-blur">
                    <Share2 className="size-4" />
                  </span>
                  <span className="text-[10px] font-bold">Share</span>
                </button>
                {!reel.demo && session ? <><button type="button" onClick={() => void markNotInterested(reel)} className="grid justify-items-center gap-1 text-white"><span className="grid size-10 place-items-center rounded-full bg-black/45 backdrop-blur"><EyeOff className="size-4" /></span><span className="text-[10px] font-bold">Skip</span></button><button type="button" onClick={() => void reportReel(reel)} className="grid justify-items-center gap-1 text-white"><span className="grid size-10 place-items-center rounded-full bg-black/45 backdrop-blur"><Flag className="size-4" /></span><span className="text-[10px] font-bold">Report</span></button><button type="button" onClick={() => {
                        const next = !(videoMutedByReel[reel.id] ?? false);
                        setVideoMutedByReel((current) => ({ ...current, [reel.id]: next }));
                        const video = videoRefs.current[reel.id];
                        if (video) {
                          video.muted = next;
                          if (reel.id === activeReelId && !next) void video.play().catch(() => undefined);
                        }
                      }} className="grid justify-items-center gap-1 text-white"><span className="grid size-10 place-items-center rounded-full bg-black/45 backdrop-blur">{videoMutedByReel[reel.id] ?? false ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}</span><span className="text-[10px] font-bold">{videoMutedByReel[reel.id] ?? false ? 'Sound' : 'Mute'}</span></button></> : null}
                {!reel.demo ? (
                  <button type="button" onClick={() => { setSearchOpen(true); setSearchQuery(reel.audio_label || 'original sound'); rememberSearch(reel.audio_label || 'original sound'); }} className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-2.5 py-1.5 text-[10px] font-bold text-white">
                    <Music2 className="size-3.5" /> Use sound
                  </button>
                ) : null}
                {reel.demo ? (
                  <Link
                    to="/dashboard/create-reel"
                    className="grid justify-items-center gap-1 text-white"
                  >
                    <span className="grid size-12 place-items-center rounded-full bg-white text-black">
                      <Play className="size-5 fill-current" />
                    </span>
                    <span className="text-[10px] font-bold">Create</span>
                  </Link>
                ) : null}
              </div>
            </div>
          </article>
        ) })())}
        {normalizedSearch && !feed.length ? <div className="grid h-full min-h-[580px] place-items-center p-8 text-center"><div><Search className="mx-auto size-8 text-[var(--dv-accent)]" /><h2 className="mt-4 text-xl font-black text-white">No matching Reels</h2><p className="mt-2 text-sm text-slate-400">Try a creator handle, Reel title, caption word, or hashtag.</p></div></div> : null}
      </div>
      <div className="absolute right-4 top-1/2 z-30 hidden -translate-y-1/2 gap-2 md:grid">
        <button
          type="button"
          onClick={() => move(-1)}
          className="grid size-10 place-items-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur"
          aria-label="Previous Reel"
        >
          <ChevronUp className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => move(1)}
          className="grid size-10 place-items-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur"
          aria-label="Next Reel"
        >
          <ChevronDown className="size-5" />
        </button>
      </div>
      <Link to="/dashboard/create-reel" className="absolute right-4 top-20 z-[60] grid size-11 place-items-center rounded-full bg-[var(--dv-accent)] text-2xl font-black text-white shadow-lg shadow-[var(--dv-accent)]/30 md:hidden" aria-label="Create a Reel">+</Link>
      {shareReelTarget ? (
        <div className="fixed inset-0 z-[90] grid place-items-end bg-black/70 p-3 sm:place-items-center">
          <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-[var(--dv-surface)] p-3 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-[.18em] text-[var(--dv-accent)]">Share reel</p>
              <button type="button" onClick={() => setShareReelTarget(null)} className="rounded-full px-2 py-1 text-xs text-slate-300">Close</button>
            </div>
            <div className="grid gap-2">
              <button type="button" onClick={() => { void shareReel(shareReelTarget, 'whatsapp'); setShareReelTarget(null); }} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm text-white"><span>Share to WhatsApp</span><Share2 className="size-4" /></button>
              <button type="button" onClick={() => { void shareReel(shareReelTarget, 'copy'); setShareReelTarget(null); }} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm text-white"><span>Copy link</span><Search className="size-4" /></button>
              <button type="button" onClick={() => { void shareReel(shareReelTarget, 'download'); setShareReelTarget(null); }} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm text-white"><span>Save to device</span><Upload className="size-4" /></button>
            </div>
          </div>
        </div>
      ) : null}
      {commentReel ? (
        <div className="fixed inset-0 z-[80] flex items-end bg-black/70 p-0 sm:items-center sm:justify-center sm:p-5">
          <section className="max-h-[78dvh] w-full max-w-lg rounded-t-3xl border border-white/10 bg-[var(--dv-surface)] p-5 sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--dv-accent)]">
                  Reel replies
                </p>
                <h2 className="mt-1 text-lg font-black text-white">{commentReel.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setCommentReel(null)}
                className="rounded-full px-3 py-2 text-sm text-slate-300 hover:bg-white/10"
              >
                Close
              </button>
            </div>
            <div className="mt-4 max-h-72 space-y-3 overflow-y-auto">
              {comments.length ? (
                comments.map((comment) => (
                  <article
                    key={comment.id}
                    className="rounded-xl bg-black/20 p-3 text-sm text-slate-200"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <strong className="text-sm font-bold text-white">{getCommentAuthorName(comment)}</strong>
                      {session && comment.user_id !== session.user.id ? (
                        <button
                          type="button"
                          onClick={() => void reportComment(comment)}
                          disabled={reportedCommentIds.includes(comment.id)}
                          className="text-[10px] font-bold text-slate-400 disabled:opacity-50"
                        >
                          {reportedCommentIds.includes(comment.id) ? 'Reported' : 'Report'}
                        </button>
                      ) : null}
                    </div>
                    <p>{comment.body}</p>
                    <time className="mt-2 block text-xs text-slate-500">
                      {new Date(comment.created_at).toLocaleString()}
                    </time>
                  </article>
                ))
              ) : (
                <p className="py-6 text-center text-sm text-slate-400">Be the first to reply.</p>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <input
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
                maxLength={500}
                placeholder={session ? 'Add a reply' : 'Sign in to reply'}
                disabled={!session}
                className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/20 px-3 py-3 text-sm text-white"
              />
              <button
                type="button"
                onClick={() => void addComment()}
                disabled={!session || !commentBody.trim()}
                className="rounded-xl bg-[var(--dv-accent)] px-4 text-sm font-bold text-white disabled:opacity-50"
              >
                Post
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

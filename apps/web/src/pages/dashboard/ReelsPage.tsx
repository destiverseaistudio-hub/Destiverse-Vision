import {
  ChevronDown,
  ChevronUp,
  Bookmark,
  Heart,
  Keyboard,
  EyeOff,
  Flag,
  MessageCircle,
  MoreHorizontal,
  Music2,
  Pause,
  Play,
  Search,
  Share2,
  Smile,
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
type Comment = { id: string; body: string; created_at: string; user_id: string; author_name?: string | null; sticker?: string | null; parent_comment_id?: string | null };
type CreatorSearchResult = { user_id: string; handle: string; display_name: string; avatar_url: string | null };
const recentReelSearchesKey = 'destiverse-reel-recent-searches';
const commentEmojiPack = ['😡', '👍', '😎', '😒', '🚀', '🤗', '😍', '❤️', '🤣', '😂', '😊', '😉', '👌', '😘', '😁', '🙌', '🤦‍♀️', '🎶', '🤞', '✌️', '🤷‍♂️', '🤷‍♀️', '🤦‍♂️'];
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
  const [savedReels, setSavedReels] = useState<string[]>([]);
  const [mediaFitByReel, setMediaFitByReel] = useState<Record<string, 'cover' | 'contain'>>({});
  const [reelLikeCounts, setReelLikeCounts] = useState<Record<string, number>>({});
  const [loveRequests, setLoveRequests] = useState<string[]>([]);
  const [reelCommentCounts, setReelCommentCounts] = useState<Record<string, number>>({});
  const [following, setFollowing] = useState<string[]>([]);
  const [blockedCreators, setBlockedCreators] = useState<string[]>([]);
  const [notInterested, setNotInterested] = useState<string[]>([]);
  const [feedMode, setFeedMode] = useState<'for-you' | 'following'>('for-you');
  const [commentReel, setCommentReel] = useState<Reel | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [commentError, setCommentError] = useState('');
  const [commentLikeCounts, setCommentLikeCounts] = useState<Record<string, number>>({});
  const [likedCommentIds, setLikedCommentIds] = useState<string[]>([]);
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  const [commentSticker, setCommentSticker] = useState<string | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [expandedReplyThreads, setExpandedReplyThreads] = useState<string[]>([]);
  const [commentRefreshVersion, setCommentRefreshVersion] = useState(0);
  const [reportedCommentIds, setReportedCommentIds] = useState<string[]>([]);
  const [activeReelId, setActiveReelId] = useState<string | null>(null);
  const [videoMutedByReel, setVideoMutedByReel] = useState<Record<string, boolean>>({});
  const [reelPlayback, setReelPlayback] = useState<Record<string, boolean>>({});
  const [reelLoading, setReelLoading] = useState<Record<string, boolean>>({});
  const [likedBurstId, setLikedBurstId] = useState<string | null>(null);
  const [shareReelTarget, setShareReelTarget] = useState<Reel | null>(null);
  const [moreActionsReelId, setMoreActionsReelId] = useState<string | null>(null);
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const normalizedSearch = searchQuery.trim().toLowerCase().replace(/^@/, '');
  const searchTerms = normalizedSearch.replace(/[^a-z0-9#@]+/g, ' ').split(/\s+/).map(term => term.replace(/^[@#]/, '')).filter(Boolean);
  const feedRef = useRef<HTMLDivElement>(null);
  const refreshTouchStart = useRef<number | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const lastCenterTapRef = useRef<Record<string, number>>({});
  const centerTapTimeoutRef = useRef<Record<string, number | null>>({});
  const commentInputRef = useRef<HTMLInputElement>(null);

  const [prevSearch, setPrevSearch] = useState(normalizedSearch);
  if (normalizedSearch !== prevSearch) {
    setPrevSearch(normalizedSearch);
    if (!normalizedSearch) {
      setCreatorSearchResults([]);
    }
  }

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
        .select('id,title,caption,video_url,poster_url,audio_label,creator_id,creator_profiles(handle,display_name,avatar_url)')
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
      const ids = (data ?? []).map((reel) => reel.id);
      const { data: reactions } = ids.length
        ? await supabase.from('reel_reactions').select('reel_id').eq('reaction', 'love').in('reel_id', ids)
        : { data: [] };
      const counts = ((reactions ?? []) as Array<{ reel_id: string }>).reduce<Record<string, number>>((accumulator, row) => {
        accumulator[row.reel_id] = (accumulator[row.reel_id] ?? 0) + 1;
        return accumulator;
      }, {});
      const { data: commentRows } = ids.length
        ? await supabase.from('reel_comments').select('reel_id').eq('hidden', false).in('reel_id', ids)
        : { data: [] };
      const commentCounts = ((commentRows ?? []) as Array<{ reel_id: string }>).reduce<Record<string, number>>((accumulator, row) => {
        accumulator[row.reel_id] = (accumulator[row.reel_id] ?? 0) + 1;
        return accumulator;
      }, {});
      setReelLikeCounts(counts);
      setReelCommentCounts(commentCounts);
      setReels(signed as unknown as Reel[]);
    };
    void load();
    const channel = supabase
      .channel(`reels-feed-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reel_submissions' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reel_reactions' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reel_comments' }, load)
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
    void supabase
      .from('reel_saves')
      .select('reel_id')
      .eq('user_id', session.user.id)
      .then(({ data }) => setSavedReels((data ?? []).map((row) => row.reel_id)));
  }, [session]);
  useEffect(() => {
    if (!session) return;
    void Promise.all([
      supabase.from('creator_blocks').select('creator_id').eq('blocker_id', session.user.id),
      supabase.from('reel_not_interested').select('reel_id').eq('user_id', session.user.id),
    ]).then(([blocks, hidden]) => { setBlockedCreators((blocks.data ?? []).map(row => row.creator_id)); setNotInterested((hidden.data ?? []).map(row => row.reel_id)); });
  }, [session]);
  const toggleFollow = async (creatorId: string) => {
    if (!session) {
      navigate('/');
      return;
    }
    if (creatorId === session.user.id) return;
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
    feedRef.current.scrollBy({ top: feedRef.current.clientHeight * direction, behavior: 'smooth' });
  };
  const toggleLove = async (reel: Reel, source: 'button' | 'double-tap' = 'button') => {
    if (reel.demo) return;
    if (!session) {
      navigate('/');
      return;
    }
    if (source === 'double-tap') {
      setLikedBurstId(reel.id);
      window.setTimeout(() => setLikedBurstId((current) => (current === reel.id ? null : current)), 620);
    }
    if (loveRequests.includes(reel.id)) return;
    const loved = liked.includes(reel.id);
    if (loved) {
      // A double-tap on an already loved Reel is visual feedback only. It must
      // never remove the reaction or reduce its count.
      if (source === 'double-tap') return;
      setLoveRequests((current) => [...current, reel.id]);
      const { error } = await supabase.from('reel_reactions').delete().eq('reel_id', reel.id).eq('user_id', session.user.id);
      if (!error) {
        setLiked((current) => current.filter((id) => id !== reel.id));
        setReelLikeCounts((current) => ({ ...current, [reel.id]: Math.max(0, (current[reel.id] ?? 1) - 1) }));
      }
      setLoveRequests((current) => current.filter((id) => id !== reel.id));
      return;
    }
    setLoveRequests((current) => [...current, reel.id]);
    const { error } = await supabase
      .from('reel_reactions')
      .insert({ reel_id: reel.id, user_id: session.user.id, reaction: 'love' });
    if (!error || error.code === '23505') {
      setLiked((current) => [...new Set([...current, reel.id])]);
      if (error?.code !== '23505') setReelLikeCounts((current) => ({ ...current, [reel.id]: (current[reel.id] ?? 0) + 1 }));
    }
    setLoveRequests((current) => current.filter((id) => id !== reel.id));
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
      .select('id,body,created_at,user_id,author_name,sticker,parent_comment_id')
      .eq('reel_id', commentReel.id)
      .eq('hidden', false)
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        const nextComments = (data ?? []) as Comment[];
        setComments(nextComments);
        const commentIds = nextComments.map((comment) => comment.id);
        const { data: reactions } = commentIds.length
          ? await supabase.from('reel_comment_reactions').select('comment_id,user_id').in('comment_id', commentIds)
          : { data: [] };
        const counts = ((reactions ?? []) as Array<{ comment_id: string }>).reduce<Record<string, number>>((current, row) => {
          current[row.comment_id] = (current[row.comment_id] ?? 0) + 1;
          return current;
        }, {});
        setCommentLikeCounts(counts);
        setLikedCommentIds(((reactions ?? []) as Array<{ comment_id: string; user_id: string }>).filter((row) => row.user_id === session?.user.id).map((row) => row.comment_id));
      });
  }, [commentReel, session?.user.id, commentRefreshVersion]);
  useEffect(() => {
    if (!commentReel) return;
    const channel = supabase
      .channel(`reel-comments-${commentReel.id}-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reel_comments', filter: `reel_id=eq.${commentReel.id}` }, () => setCommentRefreshVersion((current) => current + 1))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reel_comment_reactions' }, () => setCommentRefreshVersion((current) => current + 1))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [commentReel?.id]);
  useEffect(() => {
    if (!replyTarget) return;
    const focus = window.setTimeout(() => commentInputRef.current?.focus(), 0);
    return () => window.clearTimeout(focus);
  }, [replyTarget]);
  const addComment = async () => {
    if (!commentReel || (!commentBody.trim() && !commentSticker)) return;
    if (!session) {
      navigate('/');
      return;
    }
    setCommentError('');
    const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', session.user.id).maybeSingle();
    const authorLabel = profile?.display_name?.trim() || session.user.user_metadata?.display_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User';
    const submittedBody = commentBody.trim() || (commentSticker ? 'Sticker' : '');
    if (!submittedBody) return;
    const { data, error } = await supabase
      .from('reel_comments')
      .insert({ reel_id: commentReel.id, user_id: session.user.id, body: submittedBody, author_name: authorLabel, sticker: commentSticker, parent_comment_id: replyTarget?.id ?? null })
      .select('id,body,created_at,user_id,author_name,sticker,parent_comment_id')
      .single();
    if (!error && data) {
      setCommentDisplayNames((current) => ({ ...current, [session.user.id]: authorLabel }));
      setComments((current) => [{ ...(data as Comment), author_name: authorLabel }, ...current]);
      setReelCommentCounts((current) => ({ ...current, [commentReel.id]: (current[commentReel.id] ?? 0) + 1 }));
      setCommentBody('');
      setCommentSticker(null);
      setReplyTarget(null);
    } else setCommentError('Your comment could not be posted. Please try again.');
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
  const toggleCommentLove = async (comment: Comment) => {
    if (!session) {
      navigate('/');
      return;
    }
    const loved = likedCommentIds.includes(comment.id);
    const { error } = loved
      ? await supabase.from('reel_comment_reactions').delete().eq('comment_id', comment.id).eq('user_id', session.user.id)
      : await supabase.from('reel_comment_reactions').insert({ comment_id: comment.id, user_id: session.user.id });
    if (error && error.code !== '23505') return;
    setLikedCommentIds((current) => loved ? current.filter((id) => id !== comment.id) : [...new Set([...current, comment.id])]);
    if (error?.code !== '23505') setCommentLikeCounts((current) => ({ ...current, [comment.id]: Math.max(0, (current[comment.id] ?? 0) + (loved ? -1 : 1)) }));
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
  const totalLikesFor = (reel: Reel) => reelLikeCounts[reel.id] ?? 0;
  const totalCommentsFor = (reel: Reel) => reelCommentCounts[reel.id] ?? 0;
  const getCommentAuthorName = (comment: Comment) => {
    if (commentDisplayNames[comment.user_id]) return commentDisplayNames[comment.user_id];
    if (comment.author_name) return comment.author_name;
    const userLabel = session?.user.user_metadata?.display_name || session?.user.user_metadata?.full_name || session?.user.email?.split('@')[0];
    return userLabel || 'User';
  };
  const rootComments = comments.filter((comment) => !comment.parent_comment_id);
  const repliesFor = (commentId: string) => comments.filter((comment) => comment.parent_comment_id === commentId);
  const CommentThread = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => {
    const replies = repliesFor(comment.id);
    const repliesExpanded = expandedReplyThreads.includes(comment.id);
    const selectReply = () => {
      setReplyTarget(comment);
      setCommentSticker(null);
      setEmojiPickerOpen(false);
      window.requestAnimationFrame(() => commentInputRef.current?.focus());
    };
    return (
      <article className={`rounded-2xl border border-white/[.07] bg-gradient-to-br from-white/[.07] to-black/10 p-3.5 text-sm text-slate-200 shadow-sm ${depth ? 'ml-2 border-l-2 border-l-[var(--dv-accent)]/45' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <strong className="block truncate text-sm font-bold text-white">{getCommentAuthorName(comment)}</strong>
            <time className="mt-0.5 block text-[10px] text-slate-500">{new Date(comment.created_at).toLocaleString()}</time>
          </div>
          {session && comment.user_id !== session.user.id ? <button type="button" onClick={() => void reportComment(comment)} disabled={reportedCommentIds.includes(comment.id)} className="shrink-0 text-[10px] font-bold text-slate-500 hover:text-slate-200 disabled:opacity-50">{reportedCommentIds.includes(comment.id) ? 'Reported' : 'Report'}</button> : null}
        </div>
        <div className="mt-2 leading-6 text-slate-100">
          {comment.sticker ? <span className="mr-1.5 inline-block rounded-lg bg-white/10 px-2 py-0.5 text-lg" aria-label="Comment sticker">{comment.sticker}</span> : null}
          {comment.body !== 'Sticker' ? <span>{comment.body}</span> : null}
        </div>
        <div className="mt-3 flex items-center gap-4 text-[11px] font-bold text-slate-400">
          <button type="button" onClick={() => void toggleCommentLove(comment)} className={likedCommentIds.includes(comment.id) ? 'text-red-400' : 'hover:text-white'}><Heart className={`mr-1 inline size-3 ${likedCommentIds.includes(comment.id) ? 'fill-current' : ''}`} />{commentLikeCounts[comment.id] ?? 0}</button>
          <button type="button" onClick={selectReply} className="hover:text-white">Reply</button>
        </div>
        {replies.length ? <button type="button" onClick={() => setExpandedReplyThreads((current) => repliesExpanded ? current.filter((id) => id !== comment.id) : [...current, comment.id])} aria-expanded={repliesExpanded} className="mt-3 rounded-full bg-[var(--dv-accent)]/10 px-2.5 py-1 text-[11px] font-bold text-[var(--dv-accent)] hover:bg-[var(--dv-accent)]/20">{repliesExpanded ? 'Hide' : 'View'} {replies.length} {replies.length === 1 ? 'reply' : 'replies'}</button> : null}
        {repliesExpanded ? <div className="mt-3 space-y-2 border-l border-white/10 pl-2">{replies.map((reply) => <CommentThread key={reply.id} comment={reply} depth={depth + 1} />)}</div> : null}
      </article>
    );
  };
  const normalizeSoundValue = (value?: string | null) => (value ?? 'Original sound · DestiVerse').trim().replace(/\s+/g, ' ');
  const soundPagePath = (reel: Reel) => `/dashboard/sounds/${encodeURIComponent(normalizeSoundValue(reel.audio_label))}`;
  const triggerSoundSearch = (reel: Reel) => {
    const sound = normalizeSoundValue(reel.audio_label);
    setSearchOpen(true);
    setSearchQuery(sound);
    rememberSearch(sound);
  };
  const handleCenterTap = (reel: Reel) => {
    const now = Date.now();
    const lastTap = lastCenterTapRef.current[reel.id] ?? 0;

    if (now - lastTap < 260) {
      const pendingTap = centerTapTimeoutRef.current[reel.id];
      if (pendingTap !== null && pendingTap !== undefined) window.clearTimeout(pendingTap);
      centerTapTimeoutRef.current[reel.id] = null;
      // Keep the gesture active so a rapid triple-tap (or longer burst) is
      // entirely a like animation and never falls through to playback.
      lastCenterTapRef.current[reel.id] = now;
      void toggleLove(reel, 'double-tap');
      return;
    }

    lastCenterTapRef.current[reel.id] = now;
    centerTapTimeoutRef.current[reel.id] = window.setTimeout(() => {
      const video = videoRefs.current[reel.id];
      if (!video) return;
      const shouldPlay = video.paused;
      setReelPlayback((current) => ({ ...current, [reel.id]: shouldPlay }));
      if (shouldPlay) void video.play().catch(() => undefined);
      else video.pause();
      centerTapTimeoutRef.current[reel.id] = null;
    }, 230);
  };
  const handleReelSurfaceTap = (event: React.MouseEvent<HTMLElement>, reel: Reel) => {
    const target = event.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select, [role="dialog"]')) return;
    handleCenterTap(reel);
  };
  const activateReel = (reelId: string) => {
    Object.entries(videoRefs.current).forEach(([id, video]) => {
      if (id !== reelId && video) {
        video.pause();
        video.currentTime = 0;
      }
    });
    setActiveReelId((current) => current === reelId ? current : reelId);
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
          if (nextId) activateReel(nextId);
        }
      },
      { root: container, rootMargin: '-5% 0px -5%', threshold: [0.51, 0.75] },
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
        void video.play().catch(() => {
          // Sound-on autoplay may be blocked by the browser. Retry muted so a swipe
          // never leaves the next Reel paused.
          if (!video.muted && isCurrent) {
            video.muted = true;
            setVideoMutedByReel((current) => current[reel.id] === true ? current : { ...current, [reel.id]: true });
            void video.play().catch(() => undefined);
          }
        });
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
  const beginPullToRefresh = (event: React.TouchEvent<HTMLDivElement>) => {
    if (feedRef.current?.scrollTop === 0) refreshTouchStart.current = event.touches[0]?.clientY ?? null;
  };
  const toggleSave = async (reel: Reel) => {
    if (reel.demo) return;
    if (!session) {
      navigate('/');
      return;
    }
    const isSaved = savedReels.includes(reel.id);
    const { error } = isSaved
      ? await supabase.from('reel_saves').delete().eq('user_id', session.user.id).eq('reel_id', reel.id)
      : await supabase.from('reel_saves').upsert({ user_id: session.user.id, reel_id: reel.id }, { onConflict: 'user_id,reel_id', ignoreDuplicates: true });
    if (!error) setSavedReels((current) => isSaved ? current.filter((id) => id !== reel.id) : [...new Set([...current, reel.id])]);
  };
  const finishPullToRefresh = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = refreshTouchStart.current;
    refreshTouchStart.current = null;
    const end = event.changedTouches[0]?.clientY;
    if (start === null || end === undefined || end - start < 84 || feedRef.current?.scrollTop !== 0 || isRefreshing) return;
    setIsRefreshing(true);
    window.setTimeout(() => window.location.reload(), 250);
  };
  return (
    <main className="relative mx-auto h-full min-h-[calc(100dvh-10rem)] max-w-[520px] overflow-hidden bg-black shadow-2xl sm:min-h-[calc(100dvh-9rem)] lg:min-h-0 sm:rounded-[2rem] sm:border sm:border-white/10">
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
        onTouchStart={beginPullToRefresh}
        onTouchEnd={finishPullToRefresh}
        className="h-full min-h-0 snap-y snap-mandatory overscroll-contain overflow-y-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {isRefreshing ? <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center"><span className="rounded-full bg-black/70 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">Refreshing Reels…</span></div> : null}
        {feedWithAds.map((entry) => "ad" in entry ? <article key={entry.id} data-reel-id={entry.id} className="relative grid h-full min-h-full snap-start snap-always place-items-center overflow-hidden bg-gradient-to-br from-[#19030b] via-[#120c24] to-black p-7"><div className="absolute inset-0 opacity-25" style={entry.ad.media_url ? { backgroundImage: `url(${entry.ad.media_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} /><div className="relative w-full max-w-sm rounded-[2rem] border border-white/15 bg-black/55 p-6 text-center backdrop-blur-xl"><p className="text-[10px] font-black uppercase tracking-[.24em] text-white/55">Sponsored discovery</p>{entry.ad.video_url ? <video src={entry.ad.video_url} controls playsInline muted className="mt-4 aspect-[9/13] w-full rounded-2xl bg-black object-cover" onPlay={() => { rememberAdImpression(entry.ad); void recordAdEvent(entry.ad.id, 'impression') }} /> : null}<h2 className="mt-5 text-2xl font-black text-white">{entry.ad.headline}</h2><p className="mt-2 text-sm leading-6 text-white/75">{entry.ad.body}</p>{entry.ad.cta_url ? <a href={entry.ad.cta_url} target="_blank" rel="noreferrer" onClick={() => void recordAdEvent(entry.ad.id, 'click')} className="mt-5 inline-flex rounded-xl bg-white px-4 py-3 text-sm font-bold text-black">{entry.ad.cta_label}</a> : null}<p className="mt-5 text-[10px] text-white/45">Your next Reel is one swipe away.</p></div></article> : (() => { const reel = entry; return (
          <article key={reel.id} data-reel-id={reel.id} onClick={(event) => handleReelSurfaceTap(event, reel)} className="relative h-full min-h-full snap-start snap-always bg-zinc-950 touch-pan-y">
            {reel.demo ? (
              <DemoVisual reel={reel} />
            ) : (
              <video
                ref={(node) => {
                  if (node) videoRefs.current[reel.id] = node;
                  else delete videoRefs.current[reel.id];
                }}
                className={`absolute inset-0 h-full w-full ${mediaFitByReel[reel.id] === 'contain' ? 'object-contain' : 'object-cover'}`}
                src={reel.video_url}
                playsInline
                loop
                muted={videoMutedByReel[reel.id] ?? false}
                preload={activeReelId === reel.id ? 'auto' : 'metadata'}
                onLoadStart={() => setReelLoading((current) => ({ ...current, [reel.id]: true }))}
                onCanPlay={() => setReelLoading((current) => ({ ...current, [reel.id]: false }))}
                onWaiting={() => setReelLoading((current) => ({ ...current, [reel.id]: true }))}
                onStalled={() => setReelLoading((current) => ({ ...current, [reel.id]: true }))}
                onPlaying={() => setReelLoading((current) => ({ ...current, [reel.id]: false }))}
                onLoadedMetadata={(event) => {
                  const video = event.currentTarget as HTMLVideoElement | null;
                  if (!video || !Number.isFinite(video.videoWidth) || !Number.isFinite(video.videoHeight)) return;
                  setMediaFitByReel((current) => ({
                    ...current,
                    [reel.id]: video.videoWidth > video.videoHeight ? 'contain' : 'cover',
                  }));
                }}
                onError={() => setReelLoading((current) => ({ ...current, [reel.id]: false }))}
                onPlay={() => void trackView(reel)}
              />
            )}
            {reelLoading[reel.id] && activeReelId === reel.id ? (
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
                className="absolute left-5 top-24 z-10 grid size-9 place-items-center rounded-full border border-white/10 bg-black/45 text-white shadow-lg backdrop-blur"
                aria-label={reelPlayback[reel.id] ?? true ? 'Pause video' : 'Play video'}
              >
                {(reelPlayback[reel.id] ?? true) ? <Pause className="size-4" /> : <Play className="size-4 fill-current" />}
              </button>
            ) : null}
            <div className="absolute inset-x-0 bottom-0 z-20 flex items-end gap-3 p-4 pb-3 sm:gap-4 sm:p-5 sm:pb-4">
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
                    className={`ml-1 inline-flex min-h-7 shrink-0 items-center rounded-full px-2.5 text-[10px] font-black shadow-lg ${following.includes(reel.creator_id) ? 'border border-white/25 bg-black/55 text-white' : 'bg-white text-black'}`}
                    aria-label={`${following.includes(reel.creator_id) ? 'Unfollow' : 'Follow'} @${reel.creator_profiles?.handle || 'creator'}`}
                  >
                    {following.includes(reel.creator_id) ? 'Following' : 'Follow'}
                  </button>
                ) : null}
                <span className="ml-2 rounded-full bg-white/15 px-2 py-1 text-[10px] font-bold text-white">
                  {reel.demo ? 'DEMO' : 'CREATOR'}
                </span>
                <h2 className="mt-2 line-clamp-2 text-lg font-black leading-tight text-white sm:text-xl">{reel.title}</h2>
                <p className="mt-1 max-w-sm line-clamp-2 text-xs leading-5 text-white/80 sm:text-sm sm:leading-6">{reel.caption}</p>
                <div className="mt-2 flex max-w-full items-center gap-2">
                  <Link to={soundPagePath(reel)} className="inline-flex min-w-0 max-w-[9rem] items-center gap-1.5 overflow-hidden text-[11px] text-white/75 hover:text-white sm:max-w-none sm:text-xs">
                    <Music2 className="size-3.5 shrink-0 sm:size-4" />
                    <span className="truncate">{reel.audio_label || 'Original sound · DestiVerse'}</span>
                  </Link>
                  <button type="button" onClick={() => triggerSoundSearch(reel)} className="shrink-0 rounded-full border border-white/15 bg-black/35 px-2 py-1 text-[9px] font-bold text-white/85 hover:text-white sm:px-2.5 sm:text-[10px]">
                    Use sound
                  </button>
                </div>
              </div>
              <div className="relative z-20 mb-12 flex flex-col items-center gap-1.5 pr-0.5 sm:mb-4 sm:gap-2">
                <button
                  type="button"
                  onClick={() => void toggleLove(reel, 'button')}
                  disabled={reel.demo || loveRequests.includes(reel.id)}
                  className="grid justify-items-center gap-1 text-white disabled:opacity-70"
                >
                  <span className="grid size-8 place-items-center rounded-full bg-black/55 backdrop-blur transition-transform duration-200 hover:scale-105">
                    <Heart
                      className={`size-3.5 transition-all duration-200 ${liked.includes(reel.id) ? 'fill-red-500 text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.9)]' : 'fill-transparent text-white'}`}
                    />
                  </span>
                  <span className="text-[9px] font-bold">{totalLikesFor(reel)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setCommentError(''); setCommentReel(reel); }}
                  className="grid justify-items-center gap-1 text-white"
                  aria-label={`Open comments (${totalCommentsFor(reel)})`}
                >
                  <span className="grid size-8 place-items-center rounded-full bg-black/55 backdrop-blur">
                    <MessageCircle className="size-3.5" />
                  </span>
                  <span className="text-[9px] font-bold">{totalCommentsFor(reel)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShareReelTarget(reel)}
                  className="grid justify-items-center gap-1 text-white"
                >
                  <span className="grid size-8 place-items-center rounded-full bg-black/55 backdrop-blur">
                    <Share2 className="size-3.5" />
                  </span>
                  <span className="text-[9px] font-bold">Share</span>
                </button>
                <button
                  type="button"
                  onClick={() => void toggleSave(reel)}
                  className="grid justify-items-center gap-1 text-white"
                  aria-label={savedReels.includes(reel.id) ? 'Remove Reel from saved' : 'Save Reel'}
                >
                  <span className="grid size-8 place-items-center rounded-full bg-black/55 backdrop-blur">
                    <Bookmark className={`size-3.5 ${savedReels.includes(reel.id) ? 'fill-white text-white' : ''}`} />
                  </span>
                  <span className="text-[9px] font-bold">{savedReels.includes(reel.id) ? 'Saved' : 'Save'}</span>
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
                  className="grid justify-items-center gap-1 text-white"
                  aria-label={videoMutedByReel[reel.id] ?? false ? 'Unmute audio' : 'Mute audio'}
                >
                  <span className="grid size-8 place-items-center rounded-full bg-black/55 backdrop-blur">
                    {videoMutedByReel[reel.id] ?? false ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
                  </span>
                  <span className="text-[9px] font-bold">{videoMutedByReel[reel.id] ?? false ? 'Sound' : 'Mute'}</span>
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMoreActionsReelId((current) => current === reel.id ? null : reel.id)}
                    className="grid size-8 place-items-center rounded-full bg-black/55 backdrop-blur text-white"
                    aria-label="More reel actions"
                  >
                    <MoreHorizontal className="size-3.5" />
                  </button>
                  {moreActionsReelId === reel.id ? (
                    <div className="absolute bottom-12 right-0 z-40 w-40 rounded-2xl border border-white/10 bg-black/85 p-2 shadow-2xl backdrop-blur">
                      {!reel.demo && session ? <><button type="button" onClick={() => { void markNotInterested(reel); setMoreActionsReelId(null); }} className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-xs text-white hover:bg-white/5"><span>Skip</span><EyeOff className="size-3.5" /></button><button type="button" onClick={() => { void reportReel(reel); setMoreActionsReelId(null); }} className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-xs text-white hover:bg-white/5"><span>Report</span><Flag className="size-3.5" /></button></> : null}
                      {!reel.demo ? <button type="button" onClick={() => { setMoreActionsReelId(null); window.location.href = soundPagePath(reel); }} className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-xs text-white hover:bg-white/5"><span>Open sound</span><Music2 className="size-3.5" /></button> : null}
                    </div>
                  ) : null}
                </div>
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
      <div className="absolute right-1 top-1/2 z-30 hidden -translate-y-1/2 gap-2 md:grid">
        <button
          type="button"
          onClick={() => move(-1)}
          className="grid size-9 place-items-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur"
          aria-label="Previous Reel"
        >
          <ChevronUp className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => move(1)}
          className="grid size-9 place-items-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur"
          aria-label="Next Reel"
        >
          <ChevronDown className="size-4" />
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
            <div className="mt-4 max-h-[45dvh] space-y-3 overflow-y-auto pr-1 [scrollbar-color:rgba(255,255,255,.25)_transparent]">
              {rootComments.length ? (
                rootComments.map((comment) => <CommentThread key={comment.id} comment={comment} />)
              ) : (
                <p className="py-6 text-center text-sm text-slate-400">Be the first to reply.</p>
              )}
            </div>
            {replyTarget ? <div className="mt-4 flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-300"><span>Replying to <strong>{getCommentAuthorName(replyTarget)}</strong></span><button type="button" onClick={() => setReplyTarget(null)} className="text-white">Cancel</button></div> : null}
            <div className="hidden" aria-hidden="true">
              {['✨', '🔥', '👏', '🎬', '❤️'].map((sticker) => <button key={sticker} type="button" onClick={() => setCommentSticker((current) => current === sticker ? null : sticker)} className={`grid size-8 place-items-center rounded-lg text-base ${commentSticker === sticker ? 'bg-[var(--dv-accent)]/30 ring-1 ring-[var(--dv-accent)]' : 'bg-white/5 hover:bg-white/10'}`} aria-label={`Add ${sticker} sticker`}>{sticker}</button>)}
            </div>
            {emojiPickerOpen ? <div className="mt-3 grid max-h-36 grid-cols-8 gap-1 overflow-y-auto rounded-xl border border-white/10 bg-black/35 p-2">{commentEmojiPack.map((emoji) => <button key={emoji} type="button" onClick={() => { setCommentSticker(emoji); setEmojiPickerOpen(false); commentInputRef.current?.focus(); }} className="grid size-8 place-items-center rounded-lg text-lg hover:bg-white/10" aria-label={`Add ${emoji} to comment`}>{emoji}</button>)}</div> : null}
            <div className="mt-2 flex gap-2">
              <input
                ref={commentInputRef}
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
                maxLength={500}
                placeholder={session ? (replyTarget ? `Reply to ${getCommentAuthorName(replyTarget)}` : 'Add a comment') : 'Sign in to comment'}
                disabled={!session}
                className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/20 px-3 py-3 text-sm text-white"
              />
              <button type="button" onClick={() => setEmojiPickerOpen((current) => !current)} disabled={!session} className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/15 bg-black/20 text-white disabled:opacity-50" aria-label={emojiPickerOpen ? 'Return to typing' : 'Open emoji picker'}>{emojiPickerOpen ? <Keyboard className="size-4" /> : <Smile className="size-5" />}</button>
              <button
                type="button"
                onClick={() => void addComment()}
                disabled={!session || (!commentBody.trim() && !commentSticker)}
                className="rounded-xl bg-[var(--dv-accent)] px-4 text-sm font-bold text-white disabled:opacity-50"
              >
                Post
              </button>
            </div>
            {commentError ? <p className="mt-2 text-xs text-red-300" role="alert">{commentError}</p> : null}
          </section>
        </div>
      ) : null}
    </main>
  );
}

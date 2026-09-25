import { useEffect, useMemo, useState } from "react"
import type { FormEvent } from "react"
import { ArrowLeft, Bot, BarChart3, CheckCircle2, Coins, Crown, ExternalLink, Film, Flag, LayoutDashboard, LogOut, Megaphone, MessageSquare, Plus, RefreshCw, Save, Search, Settings2, Tag, Trash2, TriangleAlert, Users } from "lucide-react"
import { supabase } from "./lib/supabase"

type ContentType = "Movie" | "Series" | "Short Film" | "Documentary" | "AI Video" | "Dancing AI Video" | "Podcast" | "CEO & Business" | "AI UGC" | "Interview" | "Music Video" | "Tutorial" | "Live Stream"
type HomeSection = "Trending Now" | "DestiVerse Reels" | "Originals" | "African Stories" | "AI Films" | "Documentaries" | "AI Video" | "Dancing AI Video" | "Podcast" | "CEO & Business" | "AI UGC" | "Creator Stories"

const contentTypes: ContentType[] = ["Movie", "Series", "Short Film", "Documentary", "AI Video", "Dancing AI Video", "Podcast", "CEO & Business", "AI UGC", "Interview", "Music Video", "Tutorial", "Live Stream"]
const homeSections: HomeSection[] = ["Trending Now", "DestiVerse Reels", "Originals", "African Stories", "AI Films", "Documentaries", "AI Video", "Dancing AI Video", "Podcast", "CEO & Business", "AI UGC", "Creator Stories"]
const categoryNames: HomeSection[] = homeSections.filter((section) => section !== "Trending Now")

type ContentItem = {
  id: string
  title: string
  description: string
  type: ContentType
  category: string
  meta: string
  badge: string | null
  artwork_class: string
  featured: boolean
  video_src: string | null
  published: boolean
  home_section: HomeSection
  section_order: number
  display_order: number
  updated_at: string
  poster_url: string | null
  hero_url: string | null
  publish_at: string | null
  unpublish_at: string | null
}

type ContentEvent = {
  event_type: "view" | "play_start"
  content_id: string | null
  occurred_at: string
}

type UserRecord = {
  user_id: string
  email: string
  display_name: string | null
  role: "admin" | "user"
  created_at: string
}

type WatchlistRecord = { content_id: string }
type WatchProgressRecord = { content_id: string; completed: boolean }
type FeatureFlag = { key: string; name: string; description: string; enabled: boolean; audience: "all" | "admins" | "testers" }
type AdminNotification = { id: string; title: string; message: string; action_url: string | null; audience: string; published: boolean; expires_at: string | null }
type SupportTicket = { id: string; subject: string; message: string; status: "open" | "in_progress" | "resolved"; admin_note: string; admin_reply: string; contact_email: string | null; created_at: string }
type AuditEntry = { id: number; action: string; entity_type: string; entity_id: string | null; created_at: string }
type ReelSubmission = { id: string; title: string; caption: string; video_url: string; source_video_path?: string; poster_url: string | null; status: "pending" | "approved" | "rejected" | "removed"; moderation_note: string; auto_review_status: string; auto_review_reason: string; created_at: string; published_at: string | null; creator_profiles: { handle: string; display_name: string } | null }
type CreatorApplication = { user_id: string; legal_name: string; contact_email: string; country: string; creator_statement: string; portfolio_url: string | null; social_url: string | null; status: "pending" | "approved" | "declined" | "suspended"; review_note: string; created_at: string }
type CommentReport = { id: string; comment_id: string; reason: string; status: "open" | "resolved" | "dismissed"; created_at: string; reel_comments: { body: string; hidden: boolean; reel_submissions: { title: string } | null } | null }
type ReelReport = { id: string; reel_id: string; reason: string; status: "open" | "resolved" | "dismissed"; created_at: string; reel_submissions: { title: string; creator_profiles: { handle: string } | null } | null }
type CreatorReport = { id: string; creator_id: string; reason: string; status: "open" | "resolved" | "dismissed"; created_at: string; creator_profiles: { handle: string; display_name: string } | null }
type CreatorAppeal = { id: string; creator_id: string; reel_id: string | null; appeal_type: string; message: string; status: "open" | "accepted" | "declined"; created_at: string }
type MembershipPlan = { id: string; name: string; active: boolean; price_cents: number | null; currency: string | null; features: string[]; coins_included: number; created_at: string }
type CreatorPlan = { id: string; name: string; active: boolean; price_cents: number; currency: string; duration_days: number; features: string[] }
type CreatorCatalogSubmission = { id: string; creator_id: string; title: string; submission_type: string; synopsis: string; external_video_url: string | null; storage_path: string | null; status: "pending" | "approved" | "rejected" | "changes_requested" | "removed"; moderation_note: string; created_at: string; playable_url?: string }
type CoinWallet = { user_id: string; balance: number; updated_at: string }
type CoinProduct = { id: string; name: string; coins: number; price_cents: number; currency: string; active: boolean }
type AccountDeletionRequest = { id: string; user_id: string; reason: string; status: "open" | "cancelled" | "completed"; created_at: string }
type AdCampaign = { id: string; name: string; format: "banner" | "ribbon" | "popup" | "pre_roll" | "mid_roll" | "end_card" | "reel_ad"; placement: "home" | "content" | "reels"; headline: string; body: string; media_url: string | null; video_url: string | null; cta_label: string; cta_url: string | null; skip_after_seconds: number; midroll_at_seconds: number; reel_interval: number; frequency_cap_per_day: number; priority: number; active: boolean; premium_visible: boolean; starts_at: string; ends_at: string | null }

type FormState = Omit<ContentItem, "updated_at">

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "destiverse-content"
}

async function uploadWithRetry(bucket: string, path: string, file: File, options: { upsert?: boolean; contentType?: string; cacheControl?: string } = {}) {
  let lastError: { message: string } | null = null
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { error } = await supabase.storage.from(bucket).upload(path, file, options)
    if (!error) return { error: null }
    lastError = error
    if (!/520|gateway|network|fetch|timeout|temporar/i.test(error.message) || attempt === 1) break
    await new Promise((resolve) => window.setTimeout(resolve, 800 * (attempt + 1)))
  }
  return { error: lastError ?? { message: "Upload could not be completed." } }
}

const emptyForm: FormState = {
  id: "",
  title: "",
  description: "",
  type: "Short Film",
  category: "DestiVerse Reels",
  meta: "",
  badge: "",
  artwork_class: "dv-art-river",
  featured: false,
  video_src: "",
  published: false,
  home_section: "DestiVerse Reels",
  section_order: 10,
  display_order: 0,
  poster_url: "",
  hero_url: "",
  publish_at: "",
  unpublish_at: "",
}

export default function App() {
  const [session, setSession] = useState<Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [roleLoading, setRoleLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [items, setItems] = useState<ContentItem[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)
  const [activeView, setActiveView] = useState<"overview" | "content" | "categories" | "settings" | "users" | "operations" | "reels" | "membership" | "ads">(() => {
    const savedView = window.sessionStorage.getItem("dv-admin-refresh-view")
    return ["overview", "content", "categories", "settings", "users", "operations", "reels", "membership", "ads"].includes(savedView ?? "")
      ? savedView as "overview" | "content" | "categories" | "settings" | "users" | "operations" | "reels" | "membership" | "ads"
      : "overview"
  })
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([])
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  const [reelSubmissions, setReelSubmissions] = useState<ReelSubmission[]>([])
  const [reelNotes, setReelNotes] = useState<Record<string, string>>({})
  const [creatorApplications, setCreatorApplications] = useState<CreatorApplication[]>([])
  const [commentReports, setCommentReports] = useState<CommentReport[]>([])
  const [reelReports, setReelReports] = useState<ReelReport[]>([])
  const [creatorReports, setCreatorReports] = useState<CreatorReport[]>([])
  const [creatorAppeals, setCreatorAppeals] = useState<CreatorAppeal[]>([])
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([])
  const [creatorPlans, setCreatorPlans] = useState<CreatorPlan[]>([])
  const [creatorCatalogSubmissions, setCreatorCatalogSubmissions] = useState<CreatorCatalogSubmission[]>([])
  const [creatorCatalogNotes, setCreatorCatalogNotes] = useState<Record<string, string>>({})
  const [coinWallets, setCoinWallets] = useState<CoinWallet[]>([])
  const [coinProducts, setCoinProducts] = useState<CoinProduct[]>([])
  const [deletionRequests, setDeletionRequests] = useState<AccountDeletionRequest[]>([])
  const [adCampaigns, setAdCampaigns] = useState<AdCampaign[]>([])
  const [adDraft, setAdDraft] = useState({ name: "", format: "banner" as AdCampaign["format"], placement: "home" as AdCampaign["placement"], headline: "", body: "", media_url: "", video_url: "", cta_label: "Learn more", cta_url: "", skip_after_seconds: "5", midroll_at_seconds: "30", reel_interval: "10", frequency_cap_per_day: "3", priority: "0", active: false, premium_visible: false, starts_at: "", ends_at: "" })
  const [editingAdId, setEditingAdId] = useState<string | null>(null)
  const [planDraft, setPlanDraft] = useState({ name: "", price_cents: "", currency: "NGN", features: "", coins_included: "0", active: true })
  const [creatorPlanDraft, setCreatorPlanDraft] = useState({ name: "Creator Pro", price_cents: "", currency: "NGN", duration_days: "30", features: "Long-form catalog submissions\nAdmin review and catalog publishing", active: true })
  const [coinDraft, setCoinDraft] = useState({ user_id: "", amount: "", reason: "" })
  const [coinProductDraft, setCoinProductDraft] = useState({ name: "", coins: "", price_cents: "", currency: "NGN", active: true })
  const [reelAnalytics, setReelAnalytics] = useState({ views: 0, loves: 0, comments: 0 })
  const [reelStatusFilter, setReelStatusFilter] = useState<"all" | ReelSubmission["status"]>("all")
  const [creatorStatusFilter, setCreatorStatusFilter] = useState<"all" | CreatorApplication["status"]>("pending")
  const [reelAdminSearch, setReelAdminSearch] = useState("")
  const [flagDraft, setFlagDraft] = useState({ key: "", name: "", description: "", audience: "all" as FeatureFlag["audience"] })
  const [notificationDraft, setNotificationDraft] = useState({ title: "", message: "", action_url: "", audience: "all", expires_at: "" })
  const [ticketReplies, setTicketReplies] = useState<Record<string, string>>({})
  const [notificationAiBusy, setNotificationAiBusy] = useState(false)
  const [flagAiBusy, setFlagAiBusy] = useState(false)
  const [settingsDraft, setSettingsDraft] = useState({
    hero_title: "",
    hero_description: "",
    announcement: "",
    app_version: "",
    minimum_required_version: "",
    update_enabled: "false",
    update_version: "",
    update_title: "",
    update_message: "",
    release_notes: "",
    update_link: "",
    support_email: "", support_phone: "", support_whatsapp_url: "", contact_cta_label: "Contact support", contact_cta_url: "", site_url: "", instagram_url: "", facebook_url: "", maintenance_enabled: "false", maintenance_message: "", about_page: "", privacy_policy: "", terms_of_service: "", help_center: "",
  })
  const [eventRecords, setEventRecords] = useState<ContentEvent[]>([])
  const [analyticsRange, setAnalyticsRange] = useState<"7" | "30" | "all">("7")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all")
  const [sectionFilter, setSectionFilter] = useState<"all" | HomeSection>("all")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [posterFile, setPosterFile] = useState<File | null>(null)
  const [heroFile, setHeroFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [watchlistRecords, setWatchlistRecords] = useState<WatchlistRecord[]>([])
  const [watchProgressRecords, setWatchProgressRecords] = useState<WatchProgressRecord[]>([])
  const [aiBusy, setAiBusy] = useState(false)
  const [releaseAiBusy, setReleaseAiBusy] = useState(false)
  const [siteSettingAiBusy, setSiteSettingAiBusy] = useState(false)
  const [siteSettingIdeasBusy, setSiteSettingIdeasBusy] = useState(false)
  const [siteSettingAiField, setSiteSettingAiField] = useState<"contact_cta_label" | "maintenance_message" | "about_page" | "privacy_policy" | "terms_of_service" | "help_center">("help_center")
  const [siteSettingAiNotes, setSiteSettingAiNotes] = useState("")
  const [siteSettingIdeas, setSiteSettingIdeas] = useState<string[]>([])

  const refreshCurrentAdminView = () => {
    window.sessionStorage.setItem("dv-admin-refresh-view", activeView)
    window.location.reload()
  }

  useEffect(() => {
    setSiteSettingAiNotes(settingsDraft[siteSettingAiField])
    setSiteSettingIdeas([])
  }, [siteSettingAiField])

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setIsAdmin(false)
      setRoleLoading(false)
      setItems([])
      return
    }

    let active = true
    setRoleLoading(true)
    void supabase.rpc("is_admin").then(({ data, error: roleError }) => {
      if (!active) return
      if (roleError) setError(roleError.message)
      setIsAdmin(data === true)
      setRoleLoading(false)
    })

    return () => {
      active = false
    }
  }, [session])

  useEffect(() => {
    if (!isAdmin) return

    const load = async () => {
      const [{ data, error: loadError }, { data: eventData, error: eventError }, { data: watchlistData }, { data: progressData }] = await Promise.all([
        supabase
        .from("content")
        .select("*")
        .order("updated_at", { ascending: false }),
        supabase
          .from("content_events")
          .select("event_type,content_id,occurred_at"),
        supabase.from("watchlist_items").select("content_id"),
        supabase.from("watch_progress").select("content_id,completed"),
      ])
      if (loadError) setError(loadError.message)
      else setItems((data ?? []) as ContentItem[])
      if (!eventError) {
        const events = (eventData ?? []) as ContentEvent[]
        setEventRecords(events)
      }
      setWatchlistRecords((watchlistData ?? []) as WatchlistRecord[])
      setWatchProgressRecords((progressData ?? []) as WatchProgressRecord[])
      const { data: settingsData, error: settingsError } = await supabase
        .from("app_settings")
        .select("key,value")
      if (!settingsError) {
        const settings = Object.fromEntries((settingsData ?? []).map((setting) => [setting.key, setting.value]))
        setSettingsDraft({
          hero_title: settings.hero_title ?? "",
          hero_description: settings.hero_description ?? "",
          announcement: settings.announcement ?? "",
          app_version: settings.app_version ?? "",
          minimum_required_version: settings.minimum_required_version ?? "",
          update_enabled: settings.update_enabled ?? "false",
          update_version: settings.update_version ?? settings.app_version ?? "",
          update_title: settings.update_title ?? "",
          update_message: settings.update_message ?? "",
          release_notes: settings.release_notes ?? "",
          update_link: settings.update_link ?? "",
          support_email: settings.support_email ?? "", support_phone: settings.support_phone ?? "", support_whatsapp_url: settings.support_whatsapp_url ?? "", contact_cta_label: settings.contact_cta_label ?? "Contact support", contact_cta_url: settings.contact_cta_url ?? "", site_url: settings.site_url ?? "", instagram_url: settings.instagram_url ?? "", facebook_url: settings.facebook_url ?? "", maintenance_enabled: settings.maintenance_enabled ?? "false", maintenance_message: settings.maintenance_message ?? "", about_page: settings.about_page ?? "", privacy_policy: settings.privacy_policy ?? "", terms_of_service: settings.terms_of_service ?? "", help_center: settings.help_center ?? "",
        })
      }
      const { data: userData, error: userError } = await supabase.rpc("admin_list_users")
      if (!userError) setUsers((userData ?? []) as UserRecord[])
      const [{ data: flags }, { data: notices }, { data: support }, { data: audit }, { data: reels, error: reelsError }, { data: applications }, { data: reports }, { data: flaggedReels }, { data: flaggedCreators }, { data: appeals }, { count: reelViewCount }, { count: loveCount }, { count: commentCount }] = await Promise.all([
        supabase.from("feature_flags").select("key,name,description,enabled,audience").order("name"),
        supabase.from("admin_notifications").select("id,title,message,action_url,audience,published,expires_at").order("created_at", { ascending: false }),
        supabase.from("support_tickets").select("id,subject,message,status,admin_note,admin_reply,contact_email,created_at").order("created_at", { ascending: false }),
        supabase.from("admin_audit_log").select("id,action,entity_type,entity_id,created_at").order("created_at", { ascending: false }).limit(20),
        supabase.from("reel_submissions").select("id,title,caption,video_url,poster_url,status,moderation_note,auto_review_status,auto_review_reason,created_at,published_at,creator_profiles(handle,display_name)").order("created_at", { ascending: false }),
        supabase.from("creator_applications").select("user_id,legal_name,contact_email,country,creator_statement,portfolio_url,social_url,status,review_note,created_at").order("created_at", { ascending: false }),
        supabase.from("reel_comment_reports").select("id,comment_id,reason,status,created_at,reel_comments(body,hidden,reel_submissions(title))").eq("status", "open").order("created_at", { ascending: false }),
        supabase.from("reel_reports").select("id,reel_id,reason,status,created_at,reel_submissions(title,creator_profiles(handle))").eq("status", "open").order("created_at", { ascending: false }),
        supabase.from("creator_profile_reports").select("id,creator_id,reason,status,created_at,creator_profiles(handle,display_name)").eq("status", "open").order("created_at", { ascending: false }),
        supabase.from("creator_appeals").select("id,creator_id,reel_id,appeal_type,message,status,created_at").eq("status", "open").order("created_at", { ascending: false }),
        supabase.from("reel_view_events").select("id", { count: "exact", head: true }),
        supabase.from("reel_reactions").select("reel_id", { count: "exact", head: true }).eq("reaction", "love"),
        supabase.from("reel_comments").select("id", { count: "exact", head: true }).eq("hidden", false),
      ])
      setFeatureFlags((flags ?? []) as FeatureFlag[]); setNotifications((notices ?? []) as AdminNotification[]); setTickets((support ?? []) as SupportTicket[]); setAuditEntries((audit ?? []) as AuditEntry[])
      if (reelsError) setError(reelsError.message)
      else {
        const signedReels = await Promise.all((reels ?? []).map(async (reel) => {
          const { data: url } = await supabase.storage.from("creator-reels").createSignedUrl(reel.video_url, 60 * 60)
          return { ...reel, source_video_path: reel.video_url, video_url: url?.signedUrl ?? reel.video_url }
        }))
        setReelSubmissions(signedReels as unknown as ReelSubmission[])
      }
      setCreatorApplications((applications ?? []) as CreatorApplication[])
      setCommentReports((reports ?? []) as unknown as CommentReport[])
      setReelReports((flaggedReels ?? []) as unknown as ReelReport[])
      setCreatorReports((flaggedCreators ?? []) as unknown as CreatorReport[])
      setCreatorAppeals((appeals ?? []) as CreatorAppeal[])
      setReelAnalytics({ views: reelViewCount ?? 0, loves: loveCount ?? 0, comments: commentCount ?? 0 })
      const { data: creatorCatalogData } = await supabase.from("creator_content_submissions").select("id,creator_id,title,submission_type,synopsis,external_video_url,storage_path,status,moderation_note,created_at").order("created_at", { ascending: false })
      const signedCreatorCatalog = await Promise.all((creatorCatalogData ?? []).map(async (submission) => {
        if (!submission.storage_path) return { ...submission, playable_url: submission.external_video_url }
        const { data: url } = await supabase.storage.from("creator-film-media").createSignedUrl(submission.storage_path, 60 * 60)
        return { ...submission, playable_url: url?.signedUrl }
      }))
      setCreatorCatalogSubmissions(signedCreatorCatalog as CreatorCatalogSubmission[])
      const [{ data: plans }, { data: creatorPlanData }, { data: wallets }, { data: products }, { data: ads }, { data: deletionRequestsData }] = await Promise.all([
        supabase.from("dv_subscription_plans").select("id,name,active,price_cents,currency,features,coins_included,created_at").order("created_at", { ascending: false }),
        supabase.from("dv_creator_plans").select("id,name,active,price_cents,currency,duration_days,features").order("created_at", { ascending: false }),
        supabase.from("user_coin_wallets").select("user_id,balance,updated_at").order("updated_at", { ascending: false }),
        supabase.from("dv_coin_products").select("id,name,coins,price_cents,currency,active").order("created_at", { ascending: false }),
        supabase.from("ad_campaigns").select("id,name,format,placement,headline,body,media_url,video_url,cta_label,cta_url,skip_after_seconds,midroll_at_seconds,reel_interval,frequency_cap_per_day,priority,active,premium_visible,starts_at,ends_at").order("created_at", { ascending: false }),
        supabase.from("account_deletion_requests").select("id,user_id,reason,status,created_at").eq("status", "open").order("created_at", { ascending: false }),
      ])
      setMembershipPlans((plans ?? []) as MembershipPlan[])
      setCreatorPlans((creatorPlanData ?? []) as CreatorPlan[])
      setCoinWallets((wallets ?? []) as CoinWallet[])
      setCoinProducts((products ?? []) as CoinProduct[])
      setAdCampaigns((ads ?? []) as AdCampaign[])
      setDeletionRequests((deletionRequestsData ?? []) as AccountDeletionRequest[])
    }

    void load()
    const channel = supabase
      .channel(`admin-content-live-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "content" }, () => {
        void load()
        setNotice("Content updated live")
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "content_events" }, () => {
        void load()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "watchlist_items" }, () => {
        void load()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "watch_progress" }, () => {
        void load()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, () => {
        void load()
        setNotice("Site settings updated live")
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reel_submissions" }, () => {
        void load()
        setNotice("Reel submissions updated live")
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reel_comment_reports" }, () => {
        void load()
        setNotice("Comment reports updated live")
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "ad_campaigns" }, () => {
        void load()
        setNotice("Ad campaigns updated live")
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "account_deletion_requests" }, () => {
        void load()
        setNotice("Account deletion requests updated")
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [isAdmin])

  const signIn = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError("")
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) setError(signInError.message)
    setBusy(false)
  }

  const assistWithContent = async () => {
    if (!form.title.trim()) {
      setError("Enter a title before using AI assist")
      return
    }
    setAiBusy(true)
    setError("")
    try {
      const { data, error: assistError } = await supabase.functions.invoke("admin-content-assist", {
        body: {
          title: form.title,
          description: form.description,
          videoUrl: form.video_src,
          fileName: videoFile?.name,
          currentType: form.type,
          currentCategory: form.category,
        },
      })
      if (assistError) {
        const context = "context" in assistError ? assistError.context : undefined
        if (context instanceof Response) {
          const body = await context.json().catch(() => null) as { error?: string } | null
          throw new Error(body?.error || assistError.message)
        }
        throw assistError
      }
      const suggestedId = slugify(data.id || form.title)
      const duplicateId = items.some((item) => item.id === suggestedId && item.id !== form.id)
      const nextId = duplicateId ? `${suggestedId}-${Date.now().toString().slice(-5)}` : suggestedId
      setForm((current) => ({
        ...current,
        id: current.id || nextId,
        description: data.description || current.description,
        meta: data.meta || current.meta,
        type: contentTypes.includes(data.type) ? data.type : current.type,
        category: homeSections.includes(data.category) ? data.category : current.category,
        badge: data.badge || current.badge,
        home_section: homeSections.includes(data.category) ? data.category : current.home_section,
      }))
      const confidenceNote = data.confidence ? ` Confidence: ${data.confidence}.` : ""
      const warningNote = Array.isArray(data.warnings) && data.warnings.length ? ` Review: ${data.warnings.join(" ")}` : ""
      setNotice(data.source === "fallback"
        ? `AI provider is busy. Starter suggestions were added; review them before saving.${confidenceNote}${warningNote}`
        : `AI prepared the content record. Review the ID, type, category, and description before saving.${confidenceNote}${warningNote}`)
    } catch (assistError) {
      setError(assistError instanceof Error ? assistError.message : "Could not generate AI suggestions")
    }
    setAiBusy(false)
  }

  const getAdminOrigin = () => {
    const configured = import.meta.env.VITE_ADMIN_APP_URL || import.meta.env.VITE_PUBLIC_APP_URL
    const value = configured?.trim()

    if (value && /^https?:\/\//.test(value)) {
      return value.replace(/\/$/, "")
    }

    return window.location.origin
  }

  const signInWithGoogle = async () => {
    setBusy(true)
    setError("")
    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${getAdminOrigin()}` },
    })
    if (googleError) { setError(googleError.message); setBusy(false) }
  }

  const assistWithRelease = async () => {
    if (!settingsDraft.update_title.trim()) {
      setError("Enter a short update title before using AI assist")
      return
    }
    setReleaseAiBusy(true)
    setError("")
    try {
      const { data, error: assistError } = await supabase.functions.invoke("admin-content-assist", {
        body: {
          mode: "release",
          title: settingsDraft.update_title,
          description: settingsDraft.update_message,
          version: settingsDraft.update_version,
        },
      })
      if (assistError) throw assistError
      setSettingsDraft((current) => ({
        ...current,
        update_title: data.title || current.update_title,
        update_message: data.message || current.update_message,
        release_notes: data.release_notes || data.notes || current.release_notes,
        app_version: data.version || current.app_version || current.update_version,
        announcement: data.announcement || current.announcement,
      }))
      setNotice("AI prepared update messaging. Review it before publishing.")
    } catch (assistError) {
      setError(assistError instanceof Error ? assistError.message : "Could not generate update messaging")
    }
    setReleaseAiBusy(false)
  }

  const assistWithSiteSetting = async () => {
    if (!siteSettingAiNotes.trim()) {
      setError("Write rough notes for the selected site setting before using AI draft")
      return
    }
    const labels = {
      contact_cta_label: "Contact CTA label",
      maintenance_message: "Maintenance message",
      about_page: "About page",
      privacy_policy: "Privacy policy",
      terms_of_service: "Terms of service",
      help_center: "Help center content",
    } as const
    setSiteSettingAiBusy(true)
    setError("")
    try {
      const { data, error: assistError } = await supabase.functions.invoke("admin-content-assist", {
        body: { mode: "site_setting", title: labels[siteSettingAiField], description: siteSettingAiNotes },
      })
      if (assistError) throw assistError
      setSettingsDraft((current) => ({ ...current, [siteSettingAiField]: data.content || current[siteSettingAiField] }))
      setNotice("Gemini prepared the site-setting text. Review it, then save site settings to publish it live.")
    } catch (assistError) {
      setError(assistError instanceof Error ? assistError.message : "Could not draft site-setting text")
    }
    setSiteSettingAiBusy(false)
  }

  const suggestSiteSettingIdeas = async () => {
    const labels = {
      contact_cta_label: "Contact CTA label",
      maintenance_message: "Maintenance message",
      about_page: "About page",
      privacy_policy: "Privacy policy",
      terms_of_service: "Terms of service",
      help_center: "Help center content",
    } as const
    setSiteSettingIdeasBusy(true)
    setError("")
    try {
      const { data, error: assistError } = await supabase.functions.invoke("admin-content-assist", {
        body: { mode: "site_setting_ideas", title: labels[siteSettingAiField] },
      })
      if (assistError) throw assistError
      setSiteSettingIdeas(Array.isArray(data.suggestions) ? data.suggestions : [])
      setNotice("Gemini suggested starting ideas. Choose one or write your own notes, then use AI draft.")
    } catch (assistError) {
      setError(assistError instanceof Error ? assistError.message : "Could not generate ideas")
    }
    setSiteSettingIdeasBusy(false)
  }

  const selectSiteSettingWriter = (field: typeof siteSettingAiField) => {
    setSiteSettingAiField(field)
    setSiteSettingIdeas([])
    setSiteSettingAiNotes(settingsDraft[field])
    setNotice("Gemini writer is ready for this setting. Choose Suggest ideas or AI draft above.")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const saveContent = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError("")
    try {
      const upload = async (file: File | null, folder: string) => {
        if (!file) return null
        const path = `${form.id}/${folder}-${Date.now()}-${file.name}`
        const { error: uploadError } = await uploadWithRetry("content-media", path, file, { upsert: true, contentType: file.type || undefined, cacheControl: "31536000" })
        if (uploadError) throw uploadError
        return supabase.storage.from("content-media").getPublicUrl(path).data.publicUrl
      }
      let posterUrl: string | null
      let heroUrl: string | null
      let videoUrl: string | null
      try {
        [posterUrl, heroUrl, videoUrl] = await Promise.all([
          upload(posterFile, "poster"),
          upload(heroFile, "hero"),
          upload(videoFile, "video"),
        ])
      } catch (uploadError) {
        const message = uploadError instanceof Error ? uploadError.message : "Media upload failed"
        throw new Error(message.toLowerCase().includes("row-level security")
          ? "Media upload was blocked by Storage permissions. Apply the content-media Storage policies in Supabase, then try again."
          : message)
      }
      const payload = {
        ...form,
        badge: form.badge || null,
        video_src: videoUrl ?? (form.video_src || null),
        poster_url: posterUrl ?? (form.poster_url || null),
        hero_url: heroUrl ?? (form.hero_url || null),
        publish_at: form.publish_at ? new Date(form.publish_at).toISOString() : null,
        unpublish_at: form.unpublish_at ? new Date(form.unpublish_at).toISOString() : null,
      }
      const { error: saveError } = await supabase.from("content").upsert(payload)
      if (saveError) {
        throw new Error(saveError.message.toLowerCase().includes("row-level security")
          ? "Content save was blocked by the content table policy. Confirm your account still has the admin role in Supabase."
          : saveError.message)
      }
      setNotice("Content saved and published to the app")
      setForm(emptyForm)
      setPosterFile(null)
      setHeroFile(null)
      setVideoFile(null)
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Could not save content"
      setError(message.toLowerCase().includes("bucket not found")
        ? "Media storage is not configured. Apply the Supabase content-media bucket migration, then try again."
        : message)
    }
    setBusy(false)
  }

  const deleteContent = async (id: string) => {
    if (!window.confirm("Delete this content?")) return
    const { error: deleteError } = await supabase.from("content").delete().eq("id", id)
    if (deleteError) setError(deleteError.message)
    else setNotice("Content deleted")
  }

  const editContent = (item: ContentItem) => {
    setForm({
      ...emptyForm,
      ...item,
      badge: item.badge ?? "",
      video_src: item.video_src ?? "",
      poster_url: item.poster_url ?? "",
      hero_url: item.hero_url ?? "",
      publish_at: item.publish_at ? item.publish_at.slice(0, 16) : "",
      unpublish_at: item.unpublish_at ? item.unpublish_at.slice(0, 16) : "",
      home_section: item.home_section ?? "DestiVerse Reels",
      section_order: Number.isFinite(item.section_order) ? item.section_order : 10,
      display_order: Number.isFinite(item.display_order) ? item.display_order : 0,
    })
  }

  const analytics = useMemo(() => {
    const cutoff = analyticsRange === "all" ? 0 : Date.now() - Number(analyticsRange) * 24 * 60 * 60 * 1000
    const events = eventRecords.filter((event) => new Date(event.occurred_at).getTime() >= cutoff)
    const daily = new Map<string, { views: number; plays: number }>()
    for (const event of events) {
      const day = event.occurred_at.slice(0, 10)
      const current = daily.get(day) ?? { views: 0, plays: 0 }
      if (event.event_type === "view") current.views += 1
      else current.plays += 1
      daily.set(day, current)
    }
    return {
      views: events.filter((event) => event.event_type === "view").length,
      playStarts: events.filter((event) => event.event_type === "play_start").length,
      daily: Array.from(daily, ([day, values]) => ({ day, ...values })).sort((left, right) => left.day.localeCompare(right.day)).slice(-14),
    }
  }, [analyticsRange, eventRecords])

  const titlePerformance = useMemo(() => items.map((item) => {
    const events = eventRecords.filter((event) => event.content_id === item.id)
    const views = events.filter((event) => event.event_type === "view").length
    const plays = events.filter((event) => event.event_type === "play_start").length
    const watchlistSaves = watchlistRecords.filter((entry) => entry.content_id === item.id).length
    const progress = watchProgressRecords.filter((entry) => entry.content_id === item.id)
    const completions = progress.filter((entry) => entry.completed).length
    return { id: item.id, title: item.title, views, plays, watchlistSaves, completionRate: progress.length ? Math.round(completions / progress.length * 100) : 0 }
  }).sort((left, right) => right.plays - left.plays || right.views - left.views), [items, eventRecords, watchlistRecords, watchProgressRecords])

  if (authLoading || (session && roleLoading)) {
    return <main className="auth-shell"><div className="auth-card"><img src="/brand/destiverse-vision-logo.png" alt="DestiVerse Vision" className="brand-logo auth-brand-logo" /><p className="eyebrow">DestiVerse control room</p><h1>Checking access...</h1><p className="muted">Restoring your secure admin session.</p></div></main>
  }

  if (!session) {
    return (
      <main className="auth-shell">
        <form className="auth-card" onSubmit={signIn}>
          <img src="/brand/destiverse-vision-logo.png" alt="DestiVerse Vision" className="brand-logo auth-brand-logo" />
          <p className="eyebrow">DestiVerse control room</p>
          <h1>Admin sign in</h1>
          <p className="muted">Use a Supabase user that has the admin role.</p>
          <button type="button" className="secondary" disabled={busy} onClick={() => void signInWithGoogle()}>Continue with Google</button>
          <p className="muted">or sign in with email</p>
          <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error && <p className="error">{error}</p>}
          <button className="primary" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
        </form>
      </main>
    )
  }

  if (!isAdmin) {
    return <main className="auth-shell"><div className="auth-card"><h1>Admin access required</h1><p className="muted">This account is authenticated but is not assigned the admin role.</p><button className="secondary" onClick={() => void supabase.auth.signOut()}>Sign out</button></div></main>
  }

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }))
  const publishedCount = items.filter((item) => item.published).length
  const draftCount = items.length - publishedCount
  const featuredCount = items.filter((item) => item.featured).length
  const videoReadyCount = items.filter((item) => item.video_src).length
  const sectionCounts = items.reduce<Record<string, number>>((counts, item) => {
    counts[item.home_section] = (counts[item.home_section] ?? 0) + 1
    return counts
  }, {})
  const categoryCounts = categoryNames.map((category) => ({
    name: category,
    total: items.filter((item) => item.category === category).length,
    published: items.filter((item) => item.category === category && item.published).length,
  }))
  const filteredItems = items.filter((item) => {
    const matchesQuery = `${item.title} ${item.category} ${item.home_section}`.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || (statusFilter === "published" ? item.published : !item.published)
    const matchesSection = sectionFilter === "all" || item.home_section === sectionFilter || item.category === sectionFilter
    return matchesQuery && matchesStatus && matchesSection
  })
  const publicAppUrl = (import.meta.env.VITE_PUBLIC_APP_URL || "http://localhost:5173").replace(/\/$/, "")
  const normalizedReelAdminSearch = reelAdminSearch.trim().toLowerCase()
  const visibleReels = reelSubmissions.filter((reel) => (reelStatusFilter === "all" || reel.status === reelStatusFilter) && (!normalizedReelAdminSearch || `${reel.title} ${reel.caption} ${reel.creator_profiles?.handle ?? ""}`.toLowerCase().includes(normalizedReelAdminSearch)))
  const visibleCreators = creatorApplications.filter((application) => (creatorStatusFilter === "all" || application.status === creatorStatusFilter) && (!normalizedReelAdminSearch || `${application.legal_name} ${application.contact_email} ${application.country}`.toLowerCase().includes(normalizedReelAdminSearch)))
  const catalogIssues = (item: ContentItem) => [
    item.published && item.publish_at && new Date(item.publish_at) > new Date() && "Scheduled, not live yet",
    item.published && item.unpublish_at && new Date(item.unpublish_at) <= new Date() && "Past unpublish time",
    !item.video_src && "Missing video",
    !item.poster_url && "Missing poster",
    !item.hero_url && "Missing hero image",
    !item.description.trim() && "Missing description",
    !item.meta.trim() && "Missing metadata",
    item.publish_at && item.unpublish_at && new Date(item.unpublish_at) <= new Date(item.publish_at) && "Invalid schedule",
  ].filter(Boolean) as string[]

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id])
  }

  const bulkPublish = async (published: boolean) => {
    if (selectedIds.length === 0) return
    setBusy(true)
    const { error: bulkError } = await supabase.from("content").update({ published }).in("id", selectedIds)
    if (bulkError) setError(bulkError.message)
    else {
      setNotice(`${selectedIds.length} title${selectedIds.length === 1 ? "" : "s"} ${published ? "published" : "moved to drafts"}`)
      setSelectedIds([])
    }
    setBusy(false)
  }

  const saveSettings = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    const { error: settingsError } = await supabase.from("app_settings").upsert(
      Object.entries(settingsDraft).map(([key, value]) => ({ key, value })),
    )
    if (settingsError) setError(settingsError.message)
    else setNotice("Site settings saved and published live")
    setBusy(false)
  }

  const changeUserRole = async (userId: string, role: "admin" | "user") => {
    const { error: roleError } = await supabase.rpc("admin_set_user_role", { target_user_id: userId, new_role: role })
    if (roleError) setError(roleError.message)
    else {
      setUsers((current) => current.map((user) => user.user_id === userId ? { ...user, role } : user))
      setNotice("User role updated")
    }
  }
  const saveFlag = async (event: FormEvent) => { event.preventDefault(); const key = flagDraft.key.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80); if (key.length < 2) { setError("Feature flag key needs at least two letters, numbers, or underscores"); return }; const { error: saveError } = await supabase.from("feature_flags").upsert({ ...flagDraft, key, enabled: false }); if (saveError) setError(saveError.message); else { setNotice("Feature flag saved. It remains off until you explicitly enable it."); setFlagDraft({ key: "", name: "", description: "", audience: "all" }); } }
  const assistWithFlag = async () => { if (!flagDraft.description.trim() && !flagDraft.name.trim()) { setError("Describe the feature idea first, then use AI draft"); return }; setFlagAiBusy(true); try { const { data, error: assistError } = await supabase.functions.invoke("admin-content-assist", { body: { mode: "feature_flag", title: flagDraft.name || flagDraft.description, description: flagDraft.description } }); if (assistError) throw assistError; setFlagDraft({ key: data.key || flagDraft.key, name: data.name || flagDraft.name, description: data.description || flagDraft.description, audience: ["all", "testers", "admins"].includes(data.audience) ? data.audience : "testers" }); setNotice("Gemini prepared the feature flag. Review it, then save and enable only when ready.") } catch (assistError) { setError(assistError instanceof Error ? assistError.message : "Could not draft feature flag") } setFlagAiBusy(false) }
  const toggleFlag = async (flag: FeatureFlag) => { const { error: saveError } = await supabase.from("feature_flags").update({ enabled: !flag.enabled }).eq("key", flag.key); if (saveError) setError(saveError.message); else { setFeatureFlags((current) => current.map((item) => item.key === flag.key ? { ...item, enabled: !item.enabled } : item)); setNotice(`${flag.name} ${flag.enabled ? "disabled" : "enabled"}`) } }
  const publishNotification = async (event: FormEvent) => { event.preventDefault(); const { error: saveError } = await supabase.from("admin_notifications").insert({ ...notificationDraft, action_url: notificationDraft.action_url || null, expires_at: notificationDraft.expires_at ? new Date(notificationDraft.expires_at).toISOString() : null, published: true }); if (saveError) setError(saveError.message); else { setNotice("In-app notification published"); setNotificationDraft({ title: "", message: "", action_url: "", audience: "all", expires_at: "" }) } }
  const assistWithNotification = async () => { if (!notificationDraft.message.trim() && !notificationDraft.title.trim()) { setError("Describe the notification first, then use AI draft"); return }; setNotificationAiBusy(true); try { const { data, error: assistError } = await supabase.functions.invoke("admin-content-assist", { body: { mode: "notification", title: notificationDraft.title || notificationDraft.message, description: notificationDraft.message } }); if (assistError) throw assistError; setNotificationDraft((current) => ({ ...current, title: data.title || current.title, message: data.message || current.message })); setNotice("Gemini prepared your notification. Review and publish it when ready.") } catch (assistError) { setError(assistError instanceof Error ? assistError.message : "Could not draft notification") } setNotificationAiBusy(false) }
  const unpublishNotification = async (notification: AdminNotification) => { const { error: saveError } = await supabase.from("admin_notifications").update({ published: false }).eq("id", notification.id); if (saveError) setError(saveError.message); else { setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, published: false } : item)); setNotice("Notification unpublished from the main app") } }
  const deleteNotification = async (notification: AdminNotification) => { if (!window.confirm(`Delete “${notification.title}”?`)) return; const { error: deleteError } = await supabase.from("admin_notifications").delete().eq("id", notification.id); if (deleteError) setError(deleteError.message); else { setNotifications((current) => current.filter((item) => item.id !== notification.id)); setNotice("Notification deleted") } }
  const updateTicket = async (ticket: SupportTicket, status: SupportTicket["status"], reply = ticketReplies[ticket.id] ?? ticket.admin_reply) => { const cleanReply = reply.trim(); const { error: saveError } = await supabase.from("support_tickets").update({ status, admin_reply: cleanReply, replied_at: cleanReply ? new Date().toISOString() : null }).eq("id", ticket.id); if (saveError) setError(saveError.message); else { setTickets((current) => current.map((item) => item.id === ticket.id ? { ...item, status, admin_reply: cleanReply } : item)); setNotice("Support ticket updated") } }

  const moderateReel = async (reel: ReelSubmission, status: "approved" | "rejected" | "removed") => {
    setBusy(true)
    setError("")
    const moderation_note = (reelNotes[reel.id] ?? reel.moderation_note).trim()
    const payload = { status, moderation_note, published_at: status === "approved" ? new Date().toISOString() : null }
    const { error: saveError } = await supabase.from("reel_submissions").update(payload).eq("id", reel.id)
    if (saveError) setError(saveError.message)
    else {
      setReelSubmissions((current) => current.map((item) => item.id === reel.id ? { ...item, ...payload } : item))
      setNotice(status === "approved" ? "Reel approved and now visible in the feed" : `Reel ${status}`)
    }
    setBusy(false)
  }

  const saveMembershipPlan = async (event: FormEvent) => {
    event.preventDefault()
    if (!planDraft.name.trim()) { setError("Enter a plan name"); return }
    setBusy(true); setError("")
    const features = planDraft.features.split("\n").map((item) => item.trim()).filter(Boolean)
    const { error: planError } = await supabase.from("dv_subscription_plans").insert({ name: planDraft.name.trim(), active: planDraft.active, price_cents: planDraft.price_cents ? Number(planDraft.price_cents) : null, currency: planDraft.currency.trim().toUpperCase() || null, features, coins_included: Number(planDraft.coins_included || 0) })
    if (planError) setError(planError.message)
    else { setPlanDraft({ name: "", price_cents: "", currency: "NGN", features: "", coins_included: "0", active: true }); setNotice("Membership plan saved") }
    setBusy(false)
  }

  const toggleMembershipPlan = async (plan: MembershipPlan) => {
    setBusy(true); setError("")
    const { error: planError } = await supabase.from("dv_subscription_plans").update({ active: !plan.active }).eq("id", plan.id)
    if (planError) setError(planError.message); else setMembershipPlans((current) => current.map((item) => item.id === plan.id ? { ...item, active: !item.active } : item))
    setBusy(false)
  }

  const editMembershipPlan = async (plan: MembershipPlan) => {
    const name = window.prompt("Plan name", plan.name); if (name === null) return
    const price = window.prompt("Price in NGN (example: 1500)", String((plan.price_cents ?? 0) / 100)); if (price === null) return
    const benefits = window.prompt("Benefits, separated with |", plan.features.join(" | ")); if (benefits === null) return
    const coins = window.prompt("Included Coins", String(plan.coins_included)); if (coins === null) return
    const amount = Math.round(Number(price) * 100); const includedCoins = Number(coins)
    if (!name.trim() || !Number.isFinite(amount) || amount < 1 || !Number.isInteger(includedCoins) || includedCoins < 0) { setError("Enter a valid name, NGN price, and non-negative Coin amount"); return }
    setBusy(true); setError("")
    const payload = { name: name.trim(), price_cents: amount, features: benefits.split("|").map((item) => item.trim()).filter(Boolean), coins_included: includedCoins }
    const { error: saveError } = await supabase.from("dv_subscription_plans").update(payload).eq("id", plan.id)
    if (saveError) setError(saveError.message); else { setMembershipPlans((current) => current.map((item) => item.id === plan.id ? { ...item, ...payload } : item)); setNotice("Membership plan updated") }
    setBusy(false)
  }

  const saveCreatorPlan = async (event: FormEvent) => {
    event.preventDefault()
    if (!creatorPlanDraft.name.trim() || !Number(creatorPlanDraft.price_cents)) { setError("Enter a Creator Pro plan name and price"); return }
    setBusy(true); setError("")
    const features = creatorPlanDraft.features.split("\n").map((item) => item.trim()).filter(Boolean)
    const { error: saveError } = await supabase.from("dv_creator_plans").insert({ name: creatorPlanDraft.name.trim(), price_cents: Number(creatorPlanDraft.price_cents), currency: creatorPlanDraft.currency.trim().toUpperCase(), duration_days: Number(creatorPlanDraft.duration_days || 30), features, active: creatorPlanDraft.active })
    if (saveError) setError(saveError.message)
    else { setCreatorPlanDraft({ name: "Creator Pro", price_cents: "", currency: "NGN", duration_days: "30", features: "Long-form catalog submissions\nAdmin review and catalog publishing", active: true }); setNotice("Creator Pro plan saved") }
    setBusy(false)
  }

  const toggleCreatorPlan = async (plan: CreatorPlan) => {
    setBusy(true); setError("")
    const { error: saveError } = await supabase.from("dv_creator_plans").update({ active: !plan.active }).eq("id", plan.id)
    if (saveError) setError(saveError.message); else setCreatorPlans((current) => current.map((item) => item.id === plan.id ? { ...item, active: !item.active } : item))
    setBusy(false)
  }

  const editCreatorPlan = async (plan: CreatorPlan) => {
    const name = window.prompt("Creator plan name", plan.name); if (name === null) return
    const price = window.prompt("Price in NGN (example: 2500)", String(plan.price_cents / 100)); if (price === null) return
    const days = window.prompt("Access days", String(plan.duration_days)); if (days === null) return
    const benefits = window.prompt("Benefits, separated with |", plan.features.join(" | ")); if (benefits === null) return
    const amount = Math.round(Number(price) * 100); const duration = Number(days)
    if (!name.trim() || !Number.isFinite(amount) || amount < 1 || !Number.isInteger(duration) || duration < 1 || duration > 366) { setError("Enter a valid plan name, NGN price, and 1–366 access days"); return }
    setBusy(true); setError("")
    const payload = { name: name.trim(), price_cents: amount, duration_days: duration, features: benefits.split("|").map((item) => item.trim()).filter(Boolean) }
    const { error: saveError } = await supabase.from("dv_creator_plans").update(payload).eq("id", plan.id)
    if (saveError) setError(saveError.message); else { setCreatorPlans((current) => current.map((item) => item.id === plan.id ? { ...item, ...payload } : item)); setNotice("Creator Pro plan updated") }
    setBusy(false)
  }

  const moderateCreatorCatalogSubmission = async (submission: CreatorCatalogSubmission, status: CreatorCatalogSubmission["status"]) => {
    setBusy(true); setError("")
    const moderation_note = (creatorCatalogNotes[submission.id] ?? submission.moderation_note).trim()
    const payload = { status, moderation_note }
    const { error: saveError } = await supabase.from("creator_content_submissions").update(payload).eq("id", submission.id)
    if (saveError) setError(saveError.message)
    else { setCreatorCatalogSubmissions((current) => current.map((item) => item.id === submission.id ? { ...item, ...payload } : item)); setNotice(status === "approved" ? "Creator film approved and published to the catalog" : `Creator submission ${status}`) }
    setBusy(false)
  }

  const adjustCoins = async (event: FormEvent) => {
    event.preventDefault()
    if (!coinDraft.user_id || !coinDraft.amount || coinDraft.reason.trim().length < 3) { setError("Choose a user, coin amount, and a reason of at least 3 characters"); return }
    setBusy(true); setError("")
    const { data, error: coinError } = await supabase.rpc("admin_adjust_coin_balance", { p_user_id: coinDraft.user_id, p_amount: Number(coinDraft.amount), p_reason: coinDraft.reason.trim() })
    if (coinError) setError(coinError.message)
    else { setCoinDraft({ user_id: "", amount: "", reason: "" }); setCoinWallets((current) => [{ user_id: coinDraft.user_id, balance: Number(data), updated_at: new Date().toISOString() }, ...current.filter((wallet) => wallet.user_id !== coinDraft.user_id)]); setNotice("Coin balance updated and recorded in the ledger") }
    setBusy(false)
  }

  const saveCoinProduct = async (event: FormEvent) => {
    event.preventDefault()
    if (!coinProductDraft.name.trim() || !Number(coinProductDraft.coins) || !Number(coinProductDraft.price_cents)) { setError("Enter a pack name, number of Coins, and price"); return }
    setBusy(true); setError("")
    const { error: productError } = await supabase.from("dv_coin_products").insert({ name: coinProductDraft.name.trim(), coins: Number(coinProductDraft.coins), price_cents: Number(coinProductDraft.price_cents), currency: coinProductDraft.currency.trim().toUpperCase(), active: coinProductDraft.active })
    if (productError) setError(productError.message); else { setCoinProductDraft({ name: "", coins: "", price_cents: "", currency: "NGN", active: true }); setNotice("Coin pack saved") }
    setBusy(false)
  }

  const toggleCoinProduct = async (product: CoinProduct) => {
    setBusy(true); const { error: productError } = await supabase.from("dv_coin_products").update({ active: !product.active }).eq("id", product.id)
    if (productError) setError(productError.message); else setCoinProducts((current) => current.map((item) => item.id === product.id ? { ...item, active: !item.active } : item))
    setBusy(false)
  }

  const editCoinProduct = async (product: CoinProduct) => {
    const name = window.prompt("Coin pack name", product.name); if (name === null) return
    const coins = window.prompt("Coins included", String(product.coins)); if (coins === null) return
    const price = window.prompt("Price in NGN (example: 500)", String(product.price_cents / 100)); if (price === null) return
    const quantity = Number(coins); const amount = Math.round(Number(price) * 100)
    if (!name.trim() || !Number.isInteger(quantity) || quantity < 1 || !Number.isFinite(amount) || amount < 1) { setError("Enter a valid pack name, Coin quantity, and NGN price"); return }
    setBusy(true); setError("")
    const payload = { name: name.trim(), coins: quantity, price_cents: amount }
    const { error: saveError } = await supabase.from("dv_coin_products").update(payload).eq("id", product.id)
    if (saveError) setError(saveError.message); else { setCoinProducts((current) => current.map((item) => item.id === product.id ? { ...item, ...payload } : item)); setNotice("Coin pack updated") }
    setBusy(false)
  }

  const saveAdCampaign = async (event: FormEvent) => {
    event.preventDefault()
    if (!adDraft.name.trim() || !adDraft.headline.trim()) { setError("Enter an ad campaign name and headline"); return }
    if (!adDraft.media_url.trim() && !adDraft.video_url.trim() && !adDraft.body.trim()) { setError("Add an image URL, video URL, or ad message"); return }
    setBusy(true); setError("")
    const payload = { name: adDraft.name.trim(), format: adDraft.format, placement: adDraft.placement, headline: adDraft.headline.trim(), body: adDraft.body.trim(), media_url: adDraft.media_url.trim() || null, video_url: adDraft.video_url.trim() || null, cta_label: adDraft.cta_label.trim() || "Learn more", cta_url: adDraft.cta_url.trim() || null, skip_after_seconds: Number(adDraft.skip_after_seconds || 0), midroll_at_seconds: Number(adDraft.midroll_at_seconds || 30), reel_interval: Number(adDraft.reel_interval || 10), frequency_cap_per_day: Number(adDraft.frequency_cap_per_day || 3), priority: Number(adDraft.priority || 0), active: adDraft.active, premium_visible: adDraft.premium_visible, starts_at: adDraft.starts_at ? new Date(adDraft.starts_at).toISOString() : new Date().toISOString(), ends_at: adDraft.ends_at ? new Date(adDraft.ends_at).toISOString() : null, updated_at: new Date().toISOString() }
    const { error: adError } = editingAdId ? await supabase.from("ad_campaigns").update(payload).eq("id", editingAdId) : await supabase.from("ad_campaigns").insert(payload)
    if (adError) setError(adError.message)
    else { setEditingAdId(null); setAdDraft({ name: "", format: "banner", placement: "home", headline: "", body: "", media_url: "", video_url: "", cta_label: "Learn more", cta_url: "", skip_after_seconds: "5", midroll_at_seconds: "30", reel_interval: "10", frequency_cap_per_day: "3", priority: "0", active: false, premium_visible: false, starts_at: "", ends_at: "" }); setNotice(editingAdId ? "Ad campaign updated." : "Ad campaign saved. Turn it on only when its media and destination are ready.") }
    setBusy(false)
  }

  const editAdCampaign = (campaign: AdCampaign) => {
    setEditingAdId(campaign.id)
    setAdDraft({ name: campaign.name, format: campaign.format, placement: campaign.placement, headline: campaign.headline, body: campaign.body, media_url: campaign.media_url ?? "", video_url: campaign.video_url ?? "", cta_label: campaign.cta_label, cta_url: campaign.cta_url ?? "", skip_after_seconds: String(campaign.skip_after_seconds), midroll_at_seconds: String(campaign.midroll_at_seconds), reel_interval: String(campaign.reel_interval ?? 10), frequency_cap_per_day: String(campaign.frequency_cap_per_day), priority: String(campaign.priority), active: campaign.active, premium_visible: campaign.premium_visible, starts_at: campaign.starts_at.slice(0, 16), ends_at: campaign.ends_at?.slice(0, 16) ?? "" })
    setActiveView("ads"); window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const uploadAdMedia = async (file: File, kind: "image" | "video") => {
    const extension = file.name.split(".").pop()?.toLowerCase() || (kind === "image" ? "jpg" : "mp4")
    const path = `${Date.now()}-${crypto.randomUUID()}.${extension}`
    setBusy(true); setError("")
    const { error: uploadError } = await uploadWithRetry("ad-media", path, file, { upsert: false, contentType: file.type || undefined, cacheControl: "31536000" })
    if (uploadError) setError(uploadError.message)
    else { const { data } = supabase.storage.from("ad-media").getPublicUrl(path); setAdDraft((current) => ({ ...current, [kind === "image" ? "media_url" : "video_url"]: data.publicUrl })); setNotice(`${kind === "image" ? "Image" : "Video"} uploaded. Save the campaign to use it.`) }
    setBusy(false)
  }

  const toggleAdCampaign = async (campaign: AdCampaign) => {
    setBusy(true); setError("")
    const { error: adError } = await supabase.from("ad_campaigns").update({ active: !campaign.active, updated_at: new Date().toISOString() }).eq("id", campaign.id)
    if (adError) setError(adError.message)
    else { setAdCampaigns((current) => current.map((item) => item.id === campaign.id ? { ...item, active: !item.active } : item)); setNotice(`Ad campaign ${campaign.active ? "paused" : "published"}`) }
    setBusy(false)
  }

  const reviewDeletionRequest = async (request: AccountDeletionRequest, status: "cancelled" | "completed") => {
    if (status === "completed" && !window.confirm("Mark this request completed only after you have performed the account deletion through a secure admin process. This button does not delete the Auth user.")) return
    setBusy(true); setError("")
    const { error: requestError } = await supabase.from("account_deletion_requests").update({ status, reviewed_at: new Date().toISOString(), reviewed_by: session?.user.id ?? null }).eq("id", request.id)
    if (requestError) setError(requestError.message)
    else { setDeletionRequests((current) => current.filter((item) => item.id !== request.id)); setNotice(status === "completed" ? "Request marked completed. Confirm the account was removed through the secure process." : "Deletion request cancelled.") }
    setBusy(false)
  }

  const reviewCreatorApplication = async (application: CreatorApplication, status: "approved" | "declined" | "suspended") => {
    setBusy(true)
    setError("")
    const { error: saveError } = await supabase.from("creator_applications").update({ status, reviewed_at: new Date().toISOString(), reviewed_by: session?.user.id ?? null }).eq("user_id", application.user_id)
    if (saveError) setError(saveError.message)
    else {
      setCreatorApplications(current => current.map(item => item.user_id === application.user_id ? { ...item, status } : item))
      if (status === "approved") {
        const { data, error: deliveryError } = await supabase.functions.invoke("deliver-creator-email", { body: { limit: 10 } })
        setNotice(deliveryError ? "Creator access approved. Email is queued; deploy/configure Resend delivery to send it." : `Creator application approved. ${data?.sent ?? 0} queued email(s) sent.`)
      } else setNotice(`Creator application ${status}`)
    }
    setBusy(false)
  }

  const sendQueuedCreatorEmails = async () => {
    setBusy(true)
    setError("")
    const { data, error: deliveryError } = await supabase.functions.invoke("deliver-creator-email", { body: { limit: 25 } })
    if (deliveryError) setError(deliveryError.message)
    else setNotice(`Email delivery complete: ${data?.sent ?? 0} sent, ${data?.failed ?? 0} failed.`)
    setBusy(false)
  }

  const removeCreatorAccess = async (application: CreatorApplication) => {
    if (!window.confirm(`Remove creator access for ${application.legal_name}? Their account remains a normal viewer account and their public creator profile is hidden.`)) return
    setBusy(true); setError("")
    const [{ error: applicationError }, { error: profileError }] = await Promise.all([
      supabase.from("creator_applications").update({ status: "declined", review_note: "Creator access removed by an administrator.", reviewed_at: new Date().toISOString(), reviewed_by: session?.user.id ?? null }).eq("user_id", application.user_id),
      supabase.from("creator_profiles").update({ discoverable: false }).eq("user_id", application.user_id),
    ])
    if (applicationError || profileError) setError(applicationError?.message || profileError?.message || "Could not remove creator access")
    else { setCreatorApplications(current => current.map(item => item.user_id === application.user_id ? { ...item, status: "declined", review_note: "Creator access removed by an administrator." } : item)); setNotice("Creator access removed. The account is now a normal viewer.") }
    setBusy(false)
  }

  const resolveCommentReport = async (report: CommentReport, hideComment: boolean) => {
    setBusy(true)
    setError("")
    const [{ error: commentError }, { error: reportError }] = await Promise.all([
      supabase.from("reel_comments").update({ hidden: hideComment }).eq("id", report.comment_id),
      supabase.from("reel_comment_reports").update({ status: hideComment ? "resolved" : "dismissed", reviewed_at: new Date().toISOString(), reviewed_by: session?.user.id ?? null }).eq("id", report.id),
    ])
    if (commentError || reportError) setError(commentError?.message || reportError?.message || "Could not update the report")
    else {
      setCommentReports((current) => current.filter((item) => item.id !== report.id))
      setNotice(hideComment ? "Comment hidden and report resolved" : "Report dismissed; comment remains visible")
    }
    setBusy(false)
  }
  const resolveSafetyCase = async (table: "reel_reports" | "creator_profile_reports" | "creator_appeals", id: string, status: "resolved" | "dismissed" | "accepted" | "declined") => {
    setBusy(true); setError("")
    const { error: saveError } = await supabase.from(table).update({ status, reviewed_at: new Date().toISOString(), reviewed_by: session?.user.id ?? null }).eq("id", id)
    if (saveError) setError(saveError.message)
    else { setReelReports(current => current.filter(item => item.id !== id)); setCreatorReports(current => current.filter(item => item.id !== id)); setCreatorAppeals(current => current.filter(item => item.id !== id)); setNotice("Safety case updated") }
    setBusy(false)
  }
  const reviewAppeal = async (appeal: CreatorAppeal, accepted: boolean) => {
    setBusy(true); setError("")
    const updates: PromiseLike<{ error: { message: string } | null }>[] = [supabase.from("creator_appeals").update({ status: accepted ? "accepted" : "declined", reviewed_at: new Date().toISOString(), reviewed_by: session?.user.id ?? null, admin_note: accepted ? "Appeal accepted. Access/content has been restored for review." : "Appeal declined after review." }).eq("id", appeal.id)]
    if (accepted && appeal.appeal_type === "account_suspension") updates.push(supabase.from("creator_applications").update({ status: "approved", review_note: "Creator access restored after an appeal.", reviewed_at: new Date().toISOString(), reviewed_by: session?.user.id ?? null }).eq("user_id", appeal.creator_id))
    if (accepted && appeal.appeal_type === "reel_rejection" && appeal.reel_id) updates.push(supabase.from("reel_submissions").update({ status: "pending", moderation_note: "Reopened for moderation after a creator appeal.", published_at: null }).eq("id", appeal.reel_id))
    const results = await Promise.all(updates)
    const error = results.find(result => result.error)?.error
    if (error) setError(error.message)
    else { setCreatorAppeals(current => current.filter(item => item.id !== appeal.id)); setNotice(accepted ? "Appeal accepted and the item was restored for review." : "Appeal declined.") }
    setBusy(false)
  }

  return (
    <main className="app-shell">
      <header className="topbar"><div className="topbar-brand">{activeView !== "overview" ? <button type="button" className="secondary icon-button" onClick={() => setActiveView("overview")} aria-label="Back to overview" title="Back to overview"><ArrowLeft size={16} /></button> : null}<img src="/brand/destiverse-vision-logo.png" alt="DestiVerse Vision" className="brand-logo" /><div><p className="eyebrow">DestiVerse control room</p><h1>{{ overview: "Overview", content: "Content library", categories: "Categories", settings: "Site settings", users: "Users", operations: "Operations", reels: "Reel moderation", membership: "Membership & Coins", ads: "Advertising" }[activeView]}</h1></div></div><div className="topbar-actions"><span className="live-indicator"><span /> Live sync</span><button className="secondary icon-button" onClick={() => window.open(publicAppUrl, "_blank", "noopener,noreferrer")}><ExternalLink size={16} /> View app</button><button className="secondary icon-button" onClick={refreshCurrentAdminView}><RefreshCw size={16} /> Refresh</button><button className="secondary icon-button" onClick={() => void supabase.auth.signOut()}><LogOut size={16} /> Sign out</button></div></header>
      {error && <p className="banner error">{error}</p>}
      {notice && <p className="banner success">{notice}</p>}
      <nav className="admin-nav" aria-label="Admin sections">
        <button className={activeView === "overview" ? "nav-item active" : "nav-item"} onClick={() => setActiveView("overview")}><LayoutDashboard size={17} /> Overview</button>
        <button className={activeView === "content" ? "nav-item active" : "nav-item"} onClick={() => setActiveView("content")}><Film size={17} /> Content</button>
        <button className={activeView === "categories" ? "nav-item active" : "nav-item"} onClick={() => setActiveView("categories")}><Tag size={17} /> Categories</button>
        <button className={activeView === "settings" ? "nav-item active" : "nav-item"} onClick={() => setActiveView("settings")}><Settings2 size={17} /> Site settings</button>
        <button className={activeView === "users" ? "nav-item active" : "nav-item"} onClick={() => setActiveView("users")}><Users size={17} /> Users</button>
        <button className={activeView === "reels" ? "nav-item active" : "nav-item"} onClick={() => setActiveView("reels")}><Film size={17} /> Reels{reelSubmissions.filter((reel) => reel.status === "pending").length ? ` (${reelSubmissions.filter((reel) => reel.status === "pending").length})` : ""}</button>
        <button className={activeView === "membership" ? "nav-item active" : "nav-item"} onClick={() => setActiveView("membership")}><Crown size={17} /> Membership</button>
        <button className={activeView === "ads" ? "nav-item active" : "nav-item"} onClick={() => setActiveView("ads")}><Megaphone size={17} /> Ads</button>
        <button className={activeView === "operations" ? "nav-item active" : "nav-item"} onClick={() => setActiveView("operations")}><Flag size={17} /> Operations</button>
        <span className="nav-spacer" />
        <span className="nav-note"><Settings2 size={15} /> Changes publish to the main app in realtime</span>
      </nav>
      {activeView === "ads" ? <section className="operations-grid"><section className="panel"><div className="section-heading"><div><p className="eyebrow">Media library</p><h2>{editingAdId ? "Edit campaign" : "Ad media upload"}</h2></div><Megaphone size={18} /></div><p className="muted">Upload a JPG, PNG, WebP, MP4, or WebM file. The public link is inserted into the campaign form; review it before saving.</p><div className="two-column"><label>Upload image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAdMedia(file, "image") }} /></label><label>Upload video<input type="file" accept="video/mp4,video/webm" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAdMedia(file, "video") }} /></label></div>{editingAdId ? <button type="button" className="secondary" onClick={() => { setEditingAdId(null); setAdDraft({ name: "", format: "banner", placement: "home", headline: "", body: "", media_url: "", video_url: "", cta_label: "Learn more", cta_url: "", skip_after_seconds: "5", midroll_at_seconds: "30", reel_interval: "10", frequency_cap_per_day: "3", priority: "0", active: false, premium_visible: false, starts_at: "", ends_at: "" }) }}>Create new campaign</button> : null}</section><section className="panel"><div className="section-heading"><div><p className="eyebrow">Edit published ads</p><h2>Campaign manager</h2></div></div><div className="operations-list">{adCampaigns.map((campaign) => <div className="recent-row" key={`manage-${campaign.id}`}><div><strong>{campaign.name}</strong><span>{campaign.format.replace("_", " ")} · {campaign.active ? "Live" : "Paused"} · every {campaign.reel_interval ?? 10} Reels where applicable</span></div><button type="button" className="secondary" onClick={() => editAdCampaign(campaign)}>Edit</button></div>)}</div></section></section> : null}
      {activeView === "overview" ? (
        <section className="overview-view">
          <div className="metric-grid">
            <article className="metric-card"><span className="metric-icon red"><Film size={18} /></span><div><span className="metric-label">Total titles</span><strong>{items.length}</strong></div></article>
            <article className="metric-card"><span className="metric-icon green"><CheckCircle2 size={18} /></span><div><span className="metric-label">Published</span><strong>{publishedCount}</strong></div></article>
            <article className="metric-card"><span className="metric-icon amber"><BarChart3 size={18} /></span><div><span className="metric-label">Video ready</span><strong>{videoReadyCount}</strong></div></article>
            <article className="metric-card"><span className="metric-icon blue"><LayoutDashboard size={18} /></span><div><span className="metric-label">Drafts</span><strong>{draftCount}</strong></div></article>
            <article className="metric-card"><span className="metric-icon blue"><BarChart3 size={18} /></span><div><span className="metric-label">Views</span><strong>{analytics.views}</strong></div></article>
            <article className="metric-card"><span className="metric-icon amber"><CheckCircle2 size={18} /></span><div><span className="metric-label">Play starts</span><strong>{analytics.playStarts}</strong></div></article>
          </div>
          <section className="panel analytics-panel"><div className="section-heading"><div><p className="eyebrow">Audience activity</p><h2>Views and play starts</h2></div><select className="range-select" value={analyticsRange} onChange={(event) => setAnalyticsRange(event.target.value as typeof analyticsRange)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="all">All time</option></select></div><div className="bar-chart">{analytics.daily.length === 0 ? <p className="muted">No audience activity recorded for this period.</p> : analytics.daily.map((day) => { const max = Math.max(...analytics.daily.map((entry) => Math.max(entry.views, entry.plays)), 1); return <div className="bar-day" key={day.day}><div className="bars"><span className="bar views" style={{ height: `${Math.max(4, day.views / max * 100)}%` }} title={`${day.views} views`} /><span className="bar plays" style={{ height: `${Math.max(4, day.plays / max * 100)}%` }} title={`${day.plays} plays`} /></div><span>{day.day.slice(5)}</span></div> })}</div><div className="chart-legend"><span><i className="legend-dot views" /> Views</span><span><i className="legend-dot plays" /> Play starts</span></div></section>
          <div className="overview-grid">
            <section className="panel"><div className="section-heading"><div><p className="eyebrow">Home structure</p><h2>Published sections</h2></div><button type="button" className="secondary" onClick={() => setActiveView("content")}>Manage content</button></div><div className="section-list">{Object.entries(sectionCounts).length === 0 ? <p className="muted">No content yet. Add your first title to start building the home screen.</p> : Object.entries(sectionCounts).map(([section, count]) => <div className="section-row" key={section}><span>{section}</span><strong>{count}</strong></div>)}</div></section>
            <section className="panel"><div className="section-heading"><div><p className="eyebrow">Operational status</p><h2>Catalog health</h2></div><span className="status live">Live</span></div><div className="health-list"><div><span>Realtime connection</span><strong className="health-good">Connected</strong></div><div><span>Published titles</span><strong>{publishedCount} / {items.length}</strong></div><div><span>Featured titles</span><strong>{featuredCount}</strong></div><div><span>Needs video URL</span><strong>{items.length - videoReadyCount}</strong></div><div><span>Play conversion</span><strong>{analytics.views ? `${Math.round((analytics.playStarts / analytics.views) * 100)}%` : "0%"}</strong></div></div></section>
          </div>
          <section className="panel recent-panel"><div className="section-heading"><div><p className="eyebrow">Latest changes</p><h2>Recently updated</h2></div><button type="button" className="secondary" onClick={() => setActiveView("content")}>Open library</button></div><div className="recent-list">{items.slice(0, 5).map((item) => <div className="recent-row" key={item.id}><div><strong>{item.title}</strong><span>{item.home_section} · {item.type}</span></div><span className={item.published ? "status live" : "status"}>{item.published ? "Published" : "Draft"}</span></div>)}</div></section>
          <section className="panel recent-panel"><div className="section-heading"><div><p className="eyebrow">Title performance</p><h2>Audience engagement</h2></div><span className="muted">All time</span></div><div className="performance-list">{titlePerformance.slice(0, 8).map((item) => <div className="recent-row" key={item.id}><strong>{item.title}</strong><span>{item.views} views · {item.plays} starts · {item.watchlistSaves} saves · {item.completionRate}% completed</span></div>)}{titlePerformance.length === 0 && <p className="muted">Performance will appear after audience activity is recorded.</p>}</div></section>
        </section>
      ) : activeView === "categories" ? (
        <section className="panel categories-panel">
          <div className="section-heading"><div><p className="eyebrow">Catalog taxonomy</p><h2>Categories</h2></div><span className="status live">Synced with the app</span></div>
          <p className="muted settings-intro">These are the categories currently supported by the public app. Manage titles assigned to a category from the content library; counts include drafts so nothing is hidden from your editorial view.</p>
          <div className="category-grid">{categoryCounts.map((category) => <article className="category-card" key={category.name}><div className="category-card-heading"><span className="metric-icon red"><Tag size={17} /></span><div><h3>{category.name}</h3><p className="muted">{category.published} published · {category.total - category.published} drafts</p></div></div><button type="button" className="secondary" onClick={() => { setSectionFilter(category.name); setActiveView("content") }}>Manage titles</button></article>)}</div>
        </section>
      ) : activeView === "settings" ? (
        <form className="settings-panel" onSubmit={saveSettings}>
          <div className="section-heading"><div><p className="eyebrow">Live experience</p><h2>Site settings</h2></div><span className="status live">Publishes live</span></div>
          <p className="muted settings-intro">Control the live app experience without editing code. Changes are sent to the user app through Supabase Realtime. Code changes and bug fixes still require a reviewed deployment.</p>
          <div className="release-settings"><div className="section-heading"><div><p className="eyebrow">Gemini writer</p><h2>Draft site text with AI</h2></div><div className="item-actions"><button type="button" className="secondary" onClick={() => void suggestSiteSettingIdeas()} disabled={siteSettingIdeasBusy}><Bot size={16} /> {siteSettingIdeasBusy ? "Thinking..." : "Suggest ideas"}</button><button type="button" className="secondary" onClick={() => void assistWithSiteSetting()} disabled={siteSettingAiBusy}><Bot size={16} /> {siteSettingAiBusy ? "Writing..." : "AI draft"}</button></div></div><p className="muted">Choose a public text field. Ask Gemini for ideas with no notes, or write rough notes and let it prepare publishable text.</p><div className="two-column"><label>Write for<select value={siteSettingAiField} onChange={(event) => { setSiteSettingAiField(event.target.value as typeof siteSettingAiField); setSiteSettingIdeas([]) }}><option value="contact_cta_label">Contact button label</option><option value="maintenance_message">Maintenance message</option><option value="about_page">About page</option><option value="privacy_policy">Privacy policy</option><option value="terms_of_service">Terms of service</option><option value="help_center">Help center</option></select></label><label>Rough notes<textarea rows={3} value={siteSettingAiNotes} onChange={(event) => setSiteSettingAiNotes(event.target.value)} placeholder="Example: Tell viewers where to get help with their account or video playback." /></label></div>{siteSettingIdeas.length ? <div className="operations-list">{siteSettingIdeas.map((idea) => <button type="button" className="recent-row" key={idea} onClick={() => setSiteSettingAiNotes(idea)}><span>{idea}</span><strong>Use idea</strong></button>)}</div> : null}</div>
          <label htmlFor="settings-hero-title">Home hero title<input id="settings-hero-title" name="hero_title" value={settingsDraft.hero_title} onChange={(event) => setSettingsDraft((current) => ({ ...current, hero_title: event.target.value }))} /></label>
          <label htmlFor="settings-hero-description">Home hero description<textarea id="settings-hero-description" name="hero_description" rows={5} value={settingsDraft.hero_description} onChange={(event) => setSettingsDraft((current) => ({ ...current, hero_description: event.target.value }))} /></label>
          <label htmlFor="settings-announcement">Announcement banner<textarea id="settings-announcement" name="announcement" rows={3} value={settingsDraft.announcement} onChange={(event) => setSettingsDraft((current) => ({ ...current, announcement: event.target.value }))} placeholder="Optional message for users" /></label>
          <div className="release-settings">
            <div className="section-heading"><div><p className="eyebrow">Release management</p><h2>App update ribbon</h2></div><button type="button" className="secondary" onClick={() => void assistWithRelease()} disabled={releaseAiBusy}><Bot size={16} /> {releaseAiBusy ? "Writing..." : "AI draft"}</button></div>
            <p className="muted">Publish a visible, versioned update notice throughout the main app. Use the link for an app store, download page, or release notes.</p>
            <label className="toggle-setting" htmlFor="settings-update-enabled"><input id="settings-update-enabled" name="update_enabled" type="checkbox" checked={settingsDraft.update_enabled === "true"} onChange={(event) => setSettingsDraft((current) => ({ ...current, update_enabled: String(event.target.checked) }))} /> Show update ribbon in the main app</label>
            <div className="two-column"><label htmlFor="settings-app-version">Current app version<input id="settings-app-version" name="app_version" value={settingsDraft.app_version} onChange={(event) => setSettingsDraft((current) => ({ ...current, app_version: event.target.value, update_version: current.update_version || event.target.value }))} placeholder="e.g. 1.3.0" /></label><label htmlFor="settings-minimum-version">Minimum compatible version<input id="settings-minimum-version" name="minimum_required_version" value={settingsDraft.minimum_required_version} onChange={(event) => setSettingsDraft((current) => ({ ...current, minimum_required_version: event.target.value }))} placeholder="Leave blank if none" /></label></div>
            <div className="two-column"><label htmlFor="settings-update-version">Release version<input id="settings-update-version" name="update_version" value={settingsDraft.update_version} onChange={(event) => setSettingsDraft((current) => ({ ...current, update_version: event.target.value }))} placeholder="Example: v1.2.0" /></label><label htmlFor="settings-update-title">Update title<input id="settings-update-title" name="update_title" value={settingsDraft.update_title} onChange={(event) => setSettingsDraft((current) => ({ ...current, update_title: event.target.value }))} placeholder="What's new?" /></label></div>
            <label htmlFor="settings-update-message">Update message<textarea id="settings-update-message" name="update_message" rows={3} value={settingsDraft.update_message} onChange={(event) => setSettingsDraft((current) => ({ ...current, update_message: event.target.value }))} placeholder="Tell viewers about the new feature or improvement" /></label>
            <label htmlFor="settings-release-notes">Release notes<textarea id="settings-release-notes" name="release_notes" rows={4} value={settingsDraft.release_notes} onChange={(event) => setSettingsDraft((current) => ({ ...current, release_notes: event.target.value }))} placeholder="Add a clear changelog or feature list for the live app update." /></label>
            <label htmlFor="settings-update-link">Update link<input id="settings-update-link" name="update_link" type="url" value={settingsDraft.update_link} onChange={(event) => setSettingsDraft((current) => ({ ...current, update_link: event.target.value }))} placeholder="https://your-site.com/release-notes" /></label>
          </div>
          <div className="release-settings"><div className="section-heading"><div><p className="eyebrow">Contact and CTA</p><h2>Viewer contact details</h2></div><button type="button" className="secondary" onClick={() => selectSiteSettingWriter("contact_cta_label")}><Bot size={16} /> AI for CTA</button></div><div className="two-column"><label>Support email<input type="email" value={settingsDraft.support_email} onChange={(event) => setSettingsDraft({ ...settingsDraft, support_email: event.target.value })} /></label><label>Support phone<input value={settingsDraft.support_phone} onChange={(event) => setSettingsDraft({ ...settingsDraft, support_phone: event.target.value })} placeholder="2348012345678" /></label></div><div className="two-column"><label>WhatsApp number or URL<input value={settingsDraft.support_whatsapp_url} onChange={(event) => setSettingsDraft({ ...settingsDraft, support_whatsapp_url: event.target.value })} placeholder="2348012345678 or https://wa.me/2348012345678" /></label><label>CTA label<input value={settingsDraft.contact_cta_label} onChange={(event) => setSettingsDraft({ ...settingsDraft, contact_cta_label: event.target.value })} /></label></div><label>CTA URL<input type="url" value={settingsDraft.contact_cta_url} onChange={(event) => setSettingsDraft({ ...settingsDraft, contact_cta_url: event.target.value })} /></label></div>
          <div className="release-settings"><div className="section-heading"><div><p className="eyebrow">App availability</p><h2>Maintenance mode</h2></div><button type="button" className="secondary" onClick={() => selectSiteSettingWriter("maintenance_message")}><Bot size={16} /> AI for message</button></div><label className="toggle-setting"><input type="checkbox" checked={settingsDraft.maintenance_enabled === "true"} onChange={(event) => setSettingsDraft({ ...settingsDraft, maintenance_enabled: String(event.target.checked) })} /> Show maintenance screen to viewers</label><label>Maintenance message<textarea rows={2} value={settingsDraft.maintenance_message} onChange={(event) => setSettingsDraft({ ...settingsDraft, maintenance_message: event.target.value })} /></label></div>
          <div className="release-settings"><div className="section-heading"><div><p className="eyebrow">Public information</p><h2>About and legal pages</h2></div><div className="item-actions"><button type="button" className="secondary" onClick={() => selectSiteSettingWriter("about_page")}><Bot size={16} /> AI for About</button><button type="button" className="secondary" onClick={() => selectSiteSettingWriter("help_center")}><Bot size={16} /> AI for Help</button></div></div><label>About page<textarea rows={4} value={settingsDraft.about_page} onChange={(event) => setSettingsDraft({ ...settingsDraft, about_page: event.target.value })} placeholder="About DestiVerse Vision" /></label><label>Privacy policy<textarea rows={4} value={settingsDraft.privacy_policy} onChange={(event) => setSettingsDraft({ ...settingsDraft, privacy_policy: event.target.value })} placeholder="Privacy policy" /></label><label>Terms of service<textarea rows={4} value={settingsDraft.terms_of_service} onChange={(event) => setSettingsDraft({ ...settingsDraft, terms_of_service: event.target.value })} placeholder="Terms of service" /></label><label>Help Center content<textarea rows={4} value={settingsDraft.help_center} onChange={(event) => setSettingsDraft({ ...settingsDraft, help_center: event.target.value })} placeholder="Help information for viewers" /></label><div className="item-actions"><button type="button" className="secondary" onClick={() => selectSiteSettingWriter("privacy_policy")}><Bot size={16} /> AI for Privacy</button><button type="button" className="secondary" onClick={() => selectSiteSettingWriter("terms_of_service")}><Bot size={16} /> AI for Terms</button></div></div>
          <button className="primary" disabled={busy}><Save size={16} /> Save site settings</button>
        </form>
      ) : activeView === "membership" ? (
        <section className="settings-panel">
          <div className="section-heading"><div><p className="eyebrow">Optional upgrades</p><h2>Membership plans and Coins</h2></div><span className="status">Core viewing remains free</span></div>
          <p className="muted settings-intro">Publish optional plans, then manage Coin balances with an auditable reason. Do not mark a subscription active manually unless a verified payment provider webhook has confirmed payment.</p>
          <div className="two-column">
            <form className="panel" onSubmit={saveMembershipPlan}><div className="section-heading"><div><p className="eyebrow">Plan editor</p><h2>Add a membership plan</h2></div><Crown size={18} /></div><label>Plan name<input value={planDraft.name} onChange={(event) => setPlanDraft({ ...planDraft, name: event.target.value })} placeholder="Vision Plus" required /></label><div className="two-column"><label>Price in smallest unit<input type="number" min="0" value={planDraft.price_cents} onChange={(event) => setPlanDraft({ ...planDraft, price_cents: event.target.value })} placeholder="Example: 150000" /></label><label>Currency<input value={planDraft.currency} maxLength={3} onChange={(event) => setPlanDraft({ ...planDraft, currency: event.target.value })} placeholder="NGN" /></label></div><label>Benefits, one per line<textarea rows={4} value={planDraft.features} onChange={(event) => setPlanDraft({ ...planDraft, features: event.target.value })} placeholder="Optional badge\nEarly-access feature" /></label><label>Included Coins<input type="number" min="0" value={planDraft.coins_included} onChange={(event) => setPlanDraft({ ...planDraft, coins_included: event.target.value })} /></label><label className="toggle-setting"><input type="checkbox" checked={planDraft.active} onChange={(event) => setPlanDraft({ ...planDraft, active: event.target.checked })} /> Show plan in the main app</label><button className="primary" disabled={busy}><Save size={16} /> Save plan</button></form>
            <form className="panel" onSubmit={adjustCoins}><div className="section-heading"><div><p className="eyebrow">Audited adjustment</p><h2>Grant or remove Coins</h2></div><Coins size={18} /></div><label>Viewer<select value={coinDraft.user_id} onChange={(event) => setCoinDraft({ ...coinDraft, user_id: event.target.value })} required><option value="">Choose a viewer</option>{users.map((user) => <option key={user.user_id} value={user.user_id}>{user.email}</option>)}</select></label><label>Coin amount<input type="number" value={coinDraft.amount} onChange={(event) => setCoinDraft({ ...coinDraft, amount: event.target.value })} placeholder="Use a negative number to remove" required /></label><label>Reason<textarea rows={3} value={coinDraft.reason} onChange={(event) => setCoinDraft({ ...coinDraft, reason: event.target.value })} placeholder="Example: Promotional reward" required /></label><button className="primary" disabled={busy}><Coins size={16} /> Record adjustment</button></form>
            <form className="panel" onSubmit={saveCoinProduct}><div className="section-heading"><div><p className="eyebrow">Paystack product</p><h2>Add a Coin pack</h2></div><Coins size={18} /></div><label>Pack name<input value={coinProductDraft.name} onChange={(event) => setCoinProductDraft({ ...coinProductDraft, name: event.target.value })} placeholder="Starter Coins" required /></label><div className="two-column"><label>Coins<input type="number" min="1" value={coinProductDraft.coins} onChange={(event) => setCoinProductDraft({ ...coinProductDraft, coins: event.target.value })} required /></label><label>Price in kobo<input type="number" min="1" value={coinProductDraft.price_cents} onChange={(event) => setCoinProductDraft({ ...coinProductDraft, price_cents: event.target.value })} placeholder="Example: 100000" required /></label></div><label>Currency<input value={coinProductDraft.currency} maxLength={3} onChange={(event) => setCoinProductDraft({ ...coinProductDraft, currency: event.target.value })} /></label><label className="toggle-setting"><input type="checkbox" checked={coinProductDraft.active} onChange={(event) => setCoinProductDraft({ ...coinProductDraft, active: event.target.checked })} /> Show pack in the app</label><button className="primary" disabled={busy}><Save size={16} /> Save Coin pack</button></form>
          </div>
          <section className="panel"><div className="section-heading"><div><p className="eyebrow">Published controls</p><h2>Plans</h2></div></div><div className="operations-list">{membershipPlans.length ? membershipPlans.map((plan) => <div className="recent-row" key={plan.id}><div><strong>{plan.name}</strong><span>{plan.active ? "Visible in app" : "Hidden"} · {plan.currency && plan.price_cents != null ? `${plan.currency} ${plan.price_cents / 100}` : "Price set at checkout"} · {plan.coins_included} Coins</span></div><div className="item-actions"><button type="button" className="secondary" disabled={busy} onClick={() => void editMembershipPlan(plan)}>Edit</button><button type="button" className={plan.active ? "secondary" : "primary"} disabled={busy} onClick={() => void toggleMembershipPlan(plan)}>{plan.active ? "Hide plan" : "Publish plan"}</button></div></div>) : <p className="muted">No membership plans yet.</p>}</div></section>
          <section className="panel"><div className="section-heading"><div><p className="eyebrow">Viewer balances</p><h2>Coin wallets</h2></div></div><div className="operations-list">{coinWallets.length ? coinWallets.map((wallet) => <div className="recent-row" key={wallet.user_id}><div><strong>{users.find((user) => user.user_id === wallet.user_id)?.email || wallet.user_id}</strong><span>Balance: {wallet.balance} Coins · updated {new Date(wallet.updated_at).toLocaleString()}</span></div></div>) : <p className="muted">No Coin wallets yet.</p>}</div></section>
          <section className="panel"><div className="section-heading"><div><p className="eyebrow">Published controls</p><h2>Coin packs</h2></div></div><div className="operations-list">{coinProducts.length ? coinProducts.map((product) => <div className="recent-row" key={product.id}><div><strong>{product.name}</strong><span>{product.coins} Coins · {product.currency} {product.price_cents / 100} · {product.active ? "Visible in app" : "Hidden"}</span></div><div className="item-actions"><button type="button" className="secondary" disabled={busy} onClick={() => void editCoinProduct(product)}>Edit</button><button type="button" className={product.active ? "secondary" : "primary"} disabled={busy} onClick={() => void toggleCoinProduct(product)}>{product.active ? "Hide pack" : "Publish pack"}</button></div></div>) : <p className="muted">No Coin packs yet.</p>}</div></section>
          <form className="panel" onSubmit={saveCreatorPlan}><div className="section-heading"><div><p className="eyebrow">Creator access</p><h2>Add a Creator Pro plan</h2></div><Film size={18} /></div><p className="muted">Creator Pro unlocks long-form catalog submissions. Free Reel uploads remain available to approved creators.</p><label>Plan name<input value={creatorPlanDraft.name} onChange={(event) => setCreatorPlanDraft({ ...creatorPlanDraft, name: event.target.value })} required /></label><div className="two-column"><label>Price in smallest unit<input type="number" min="1" value={creatorPlanDraft.price_cents} onChange={(event) => setCreatorPlanDraft({ ...creatorPlanDraft, price_cents: event.target.value })} required /></label><label>Currency<input value={creatorPlanDraft.currency} maxLength={3} onChange={(event) => setCreatorPlanDraft({ ...creatorPlanDraft, currency: event.target.value })} required /></label><label>Access days<input type="number" min="1" max="366" value={creatorPlanDraft.duration_days} onChange={(event) => setCreatorPlanDraft({ ...creatorPlanDraft, duration_days: event.target.value })} required /></label></div><label>Benefits, one per line<textarea rows={3} value={creatorPlanDraft.features} onChange={(event) => setCreatorPlanDraft({ ...creatorPlanDraft, features: event.target.value })} /></label><label className="toggle-setting"><input type="checkbox" checked={creatorPlanDraft.active} onChange={(event) => setCreatorPlanDraft({ ...creatorPlanDraft, active: event.target.checked })} /> Publish in Film Studio</label><button className="primary" disabled={busy}><Save size={16} /> Save Creator Pro plan</button></form>
          <section className="panel"><div className="section-heading"><div><p className="eyebrow">Creator access</p><h2>Creator Pro plans</h2></div></div><div className="operations-list">{creatorPlans.length ? creatorPlans.map((plan) => <div className="recent-row" key={plan.id}><div><strong>{plan.name}</strong><span>{plan.currency} {plan.price_cents / 100} · {plan.duration_days} days · {plan.active ? "Visible in Film Studio" : "Hidden"}</span></div><div className="item-actions"><button type="button" className="secondary" disabled={busy} onClick={() => void editCreatorPlan(plan)}>Edit</button><button type="button" className={plan.active ? "secondary" : "primary"} disabled={busy} onClick={() => void toggleCreatorPlan(plan)}>{plan.active ? "Hide plan" : "Publish plan"}</button></div></div>) : <p className="muted">No Creator Pro plans yet.</p>}</div></section>
        </section>
      ) : activeView === "ads" ? (
        <section className="operations-grid">
          <form className="panel" onSubmit={saveAdCampaign}><div className="section-heading"><div><p className="eyebrow">Campaign builder</p><h2>Create an ad</h2></div><Megaphone size={18} /></div><p className="muted">Use only trusted public image/video URLs and a clear destination link. Ads stay off until you publish them.</p><label>Campaign name<input value={adDraft.name} onChange={(event) => setAdDraft({ ...adDraft, name: event.target.value })} placeholder="September cinema partner" required /></label><div className="two-column"><label>Ad type<select value={adDraft.format} onChange={(event) => setAdDraft({ ...adDraft, format: event.target.value as AdCampaign["format"] })}><option value="banner">Home banner</option><option value="popup">Home popup</option><option value="pre_roll">Film pre-roll</option><option value="mid_roll">Film mid-roll</option><option value="end_card">End card</option></select></label><label>Placement<select value={adDraft.placement} onChange={(event) => setAdDraft({ ...adDraft, placement: event.target.value as AdCampaign["placement"] })}><option value="home">Home</option><option value="content">Films</option><option value="reels">Reels</option></select></label></div><label>Headline<input value={adDraft.headline} onChange={(event) => setAdDraft({ ...adDraft, headline: event.target.value })} placeholder="Discover something new" required /></label><label>Message<textarea rows={3} value={adDraft.body} onChange={(event) => setAdDraft({ ...adDraft, body: event.target.value })} placeholder="Short, clear sponsored message" /></label><label>Image URL (optional)<input type="url" value={adDraft.media_url} onChange={(event) => setAdDraft({ ...adDraft, media_url: event.target.value })} placeholder="https://…" /></label><label>Video URL (for video ads)<input type="url" value={adDraft.video_url} onChange={(event) => setAdDraft({ ...adDraft, video_url: event.target.value })} placeholder="https://…/advert.mp4" /></label><div className="two-column"><label>Button label<input value={adDraft.cta_label} onChange={(event) => setAdDraft({ ...adDraft, cta_label: event.target.value })} /></label><label>Button destination<input type="url" value={adDraft.cta_url} onChange={(event) => setAdDraft({ ...adDraft, cta_url: event.target.value })} placeholder="https://partner.example" /></label></div><div className="two-column"><label>Skip after seconds<input type="number" min="0" max="120" value={adDraft.skip_after_seconds} onChange={(event) => setAdDraft({ ...adDraft, skip_after_seconds: event.target.value })} /></label><label>Mid-roll time (seconds)<input type="number" min="5" value={adDraft.midroll_at_seconds} onChange={(event) => setAdDraft({ ...adDraft, midroll_at_seconds: event.target.value })} /></label><label>Daily cap per person<input type="number" min="1" max="20" value={adDraft.frequency_cap_per_day} onChange={(event) => setAdDraft({ ...adDraft, frequency_cap_per_day: event.target.value })} /></label><label>Priority<input type="number" value={adDraft.priority} onChange={(event) => setAdDraft({ ...adDraft, priority: event.target.value })} /></label></div><div className="two-column"><label>Starts at<input type="datetime-local" value={adDraft.starts_at} onChange={(event) => setAdDraft({ ...adDraft, starts_at: event.target.value })} /></label><label>Ends at (optional)<input type="datetime-local" value={adDraft.ends_at} onChange={(event) => setAdDraft({ ...adDraft, ends_at: event.target.value })} /></label></div><label className="toggle-setting"><input type="checkbox" checked={adDraft.premium_visible} onChange={(event) => setAdDraft({ ...adDraft, premium_visible: event.target.checked })} /> Also show this ad to Premium members</label><label className="toggle-setting"><input type="checkbox" checked={adDraft.active} onChange={(event) => setAdDraft({ ...adDraft, active: event.target.checked })} /> Publish immediately</label><button className="primary" disabled={busy}><Save size={16} /> Save campaign</button></form>
          <section className="panel"><div className="section-heading"><div><p className="eyebrow">Delivery controls</p><h2>Campaigns</h2></div><Megaphone size={18} /></div><p className="muted">A campaign is shown only within its schedule and its per-person daily cap. Premium users are excluded unless explicitly enabled.</p><div className="operations-list">{adCampaigns.length ? adCampaigns.map((campaign) => <article className="recent-row" key={campaign.id}><div><strong>{campaign.name}</strong><span>{campaign.format.replace("_", " ")} · {campaign.placement} · {campaign.active ? "Live" : "Paused"}</span><span>{campaign.headline} · cap {campaign.frequency_cap_per_day}/day · {campaign.premium_visible ? "Premium included" : "Premium excluded"}</span><span>Starts {new Date(campaign.starts_at).toLocaleString()}{campaign.ends_at ? ` · ends ${new Date(campaign.ends_at).toLocaleString()}` : ""}</span></div><button type="button" className={campaign.active ? "secondary" : "primary"} disabled={busy} onClick={() => void toggleAdCampaign(campaign)}>{campaign.active ? "Pause" : "Publish"}</button></article>) : <p className="muted">No campaigns yet. Create one as a draft and review the URL before publishing.</p>}</div></section>
        </section>
      ) : activeView === "reels" ? (
        <section className="panel reels-admin-panel">
          <div className="reels-section"><div className="reels-toolbar"><h3>Creator Film Studio moderation</h3><span className="status">{creatorCatalogSubmissions.filter((item) => item.status === "pending").length} pending</span></div><p className="muted">Approve only licensed work. Approval publishes the title to the main catalog; rejection keeps it private.</p><div className="operations-list">{creatorCatalogSubmissions.length ? creatorCatalogSubmissions.map((submission) => <article className="recent-row ticket-row" key={submission.id}><div><strong>{submission.title}</strong><span>{submission.submission_type.replaceAll("_", " ")} · {submission.status}</span><span>{submission.synopsis}</span>{submission.playable_url ? <details><summary>Preview video</summary><video controls preload="metadata" src={submission.playable_url} className="mt-2 max-h-52 w-full rounded-lg bg-black" /></details> : null}<textarea rows={2} value={creatorCatalogNotes[submission.id] ?? submission.moderation_note} onChange={(event) => setCreatorCatalogNotes((current) => ({ ...current, [submission.id]: event.target.value }))} placeholder="Admin review note" /></div><div className="item-actions">{submission.status !== "approved" ? <button type="button" className="primary" disabled={busy} onClick={() => void moderateCreatorCatalogSubmission(submission, "approved")}>Approve & publish</button> : null}{submission.status !== "rejected" ? <button type="button" className="secondary" disabled={busy} onClick={() => void moderateCreatorCatalogSubmission(submission, "rejected")}>Reject</button> : null}{submission.status !== "removed" ? <button type="button" className="danger" disabled={busy} onClick={() => void moderateCreatorCatalogSubmission(submission, "removed")}>Remove</button> : null}</div></article>) : <p className="muted">No Creator Film Studio submissions yet.</p>}</div></div>
          <div className="section-heading"><div><p className="eyebrow">Creator safety</p><h2>{reelSubmissions.filter((reel) => reel.status === "pending").length} pending Reels · {creatorApplications.filter((application) => application.status === "pending").length} creator applications</h2></div><div className="item-actions"><button type="button" className="secondary" disabled={busy} onClick={() => void sendQueuedCreatorEmails()}>Send queued emails</button><button type="button" className="secondary" onClick={() => window.open(`${publicAppUrl}/dashboard/reels`, "_blank", "noopener,noreferrer")}><ExternalLink size={16} /> Open feed</button></div></div>
          <p className="muted settings-intro">Review each video before publishing. Approval makes a Reel discoverable; rejection keeps it private to its creator.</p>
          <label className="search-field"><Search size={16} /><input value={reelAdminSearch} onChange={(event) => setReelAdminSearch(event.target.value)} placeholder="Search creators, Reels, captions, or email" aria-label="Search Reel moderation" /></label>
          <div className="reels-summary"><span><b>{creatorApplications.length}</b> creators</span><span><b>{reelSubmissions.filter((reel) => reel.status === "approved").length}</b> published</span><span><b>{reelAnalytics.views}</b> unique daily views</span><span><b>{reelAnalytics.loves}</b> loves</span><span><b>{reelAnalytics.comments}</b> visible comments</span><span><b>{commentReports.length}</b> open reports</span></div>
          <div className="reels-section"><div className="reels-toolbar"><h3>Creator accounts</h3><div className="reels-filter">{(["pending", "approved", "suspended", "declined", "all"] as const).map(status => <button type="button" key={status} className={creatorStatusFilter === status ? "active" : ""} onClick={() => setCreatorStatusFilter(status)}>{status === "all" ? "All" : `${status[0].toUpperCase()}${status.slice(1)}`} {status === "all" ? creatorApplications.length : creatorApplications.filter(item => item.status === status).length}</button>)}</div></div><div className="operations-list">{visibleCreators.length ? visibleCreators.map(application => <article className="recent-row ticket-row" key={application.user_id}><div><strong>{application.legal_name}</strong><span>{application.contact_email} · {application.country} · <b>{application.status}</b></span><span>{application.creator_statement}</span>{application.portfolio_url ? <a href={application.portfolio_url} target="_blank" rel="noreferrer">Portfolio</a> : null}</div><div className="item-actions">{application.status !== "approved" ? <button type="button" className="primary" disabled={busy} onClick={() => void reviewCreatorApplication(application, "approved")}>Allow uploads</button> : null}{application.status === "approved" ? <button type="button" className="secondary" disabled={busy} onClick={() => void reviewCreatorApplication(application, "suspended")}>Pause</button> : null}<button type="button" className="danger" disabled={busy} onClick={() => void removeCreatorAccess(application)}>Remove creator</button></div></article>) : <p className="muted">No creators in this category.</p>}</div></div>
          <div className="reels-section"><div className="reels-toolbar"><h3>Reel moderation</h3><div className="reels-filter">{(["pending", "approved", "rejected", "removed", "all"] as const).map(status => <button type="button" key={status} className={reelStatusFilter === status ? "active" : ""} onClick={() => setReelStatusFilter(status)}>{status === "all" ? "All" : status === "approved" ? "Published" : `${status[0].toUpperCase()}${status.slice(1)}`} {status === "all" ? reelSubmissions.length : reelSubmissions.filter(item => item.status === status).length}</button>)}</div></div><div className="operations-list">{visibleReels.length ? visibleReels.map((reel) => <article className="recent-row ticket-row" key={reel.id}><div><strong>{reel.title}</strong><span>{reel.source_video_path?.split("/").pop() || "video file"} · @{reel.creator_profiles?.handle || "creator"} · <b>{reel.status === "approved" ? "published" : reel.status}</b></span>{reel.caption ? <span>{reel.caption}</span> : null}<span>AI triage: <b>{reel.auto_review_status}</b>{reel.auto_review_reason ? ` — ${reel.auto_review_reason}` : ""}</span><details><summary>Preview video</summary><video controls preload="metadata" poster={reel.poster_url ?? undefined} src={reel.video_url} className="mt-2 max-h-52 w-full rounded-lg bg-black" /></details><textarea rows={2} value={reelNotes[reel.id] ?? reel.moderation_note} onChange={(event) => setReelNotes((current) => ({ ...current, [reel.id]: event.target.value }))} placeholder="Moderation note" /></div><div className="item-actions">{reel.status !== "approved" ? <button type="button" className="primary" disabled={busy} onClick={() => void moderateReel(reel, "approved")}>Approve</button> : null}{reel.status !== "rejected" ? <button type="button" className="secondary" disabled={busy} onClick={() => void moderateReel(reel, "rejected")}>Reject</button> : null}{reel.status !== "removed" ? <button type="button" className="danger" disabled={busy} onClick={() => void moderateReel(reel, "removed")}>Remove Reel</button> : null}</div></article>) : <p className="muted">No Reels in this category.</p>}</div></div>
          <div className="reels-section"><div className="reels-toolbar"><h3>Comment reports</h3><span className="status">{commentReports.length} open</span></div><p className="muted">Hide removes the comment from every viewer immediately. Dismiss leaves it visible.</p><div className="operations-list">{commentReports.length ? commentReports.map((report) => <article className="recent-row ticket-row" key={report.id}><div><strong>{report.reel_comments?.reel_submissions?.title || "Reel comment"}</strong><span>{report.reel_comments?.body || "Comment is no longer available"}</span><span>Report: {report.reason} · {new Date(report.created_at).toLocaleString()}</span></div><div className="item-actions"><button type="button" className="danger" disabled={busy || !report.reel_comments} onClick={() => void resolveCommentReport(report, true)}>Hide comment</button><button type="button" className="secondary" disabled={busy} onClick={() => void resolveCommentReport(report, false)}>Dismiss report</button></div></article>) : <p className="muted">No open comment reports.</p>}</div></div>
          <div className="reels-section"><div className="reels-toolbar"><h3>Reel & creator reports</h3><span className="status">{reelReports.length + creatorReports.length} open</span></div><div className="operations-list">{[...reelReports.map(report => ({ ...report, kind: "Reel" as const, title: report.reel_submissions?.title || "Removed Reel" })), ...creatorReports.map(report => ({ ...report, kind: "Creator" as const, title: report.creator_profiles?.display_name || report.creator_profiles?.handle || "Creator" }))].length ? [...reelReports.map(report => ({ ...report, kind: "Reel" as const, title: report.reel_submissions?.title || "Removed Reel" })), ...creatorReports.map(report => ({ ...report, kind: "Creator" as const, title: report.creator_profiles?.display_name || report.creator_profiles?.handle || "Creator" }))].map(report => <article className="recent-row ticket-row" key={`${report.kind}-${report.id}`}><div><strong>{report.kind}: {report.title}</strong><span>Report: {report.reason}</span><span>{new Date(report.created_at).toLocaleString()}</span></div><div className="item-actions"><button type="button" className="secondary" disabled={busy} onClick={() => void resolveSafetyCase(report.kind === "Reel" ? "reel_reports" : "creator_profile_reports", report.id, "dismissed")}>Dismiss</button><button type="button" className="danger" disabled={busy} onClick={() => void resolveSafetyCase(report.kind === "Reel" ? "reel_reports" : "creator_profile_reports", report.id, "resolved")}>Resolve</button></div></article>) : <p className="muted">No open Reel or creator reports.</p>}</div></div>
          <div className="reels-section"><div className="reels-toolbar"><h3>Creator appeals</h3><span className="status">{creatorAppeals.length} open</span></div><p className="muted">Accepting a suspension restores creator access. Accepting a Reel appeal returns it to pending moderation; it does not auto-publish.</p><div className="operations-list">{creatorAppeals.length ? creatorAppeals.map(appeal => <article className="recent-row ticket-row" key={appeal.id}><div><strong>{appeal.appeal_type === "account_suspension" ? "Account suspension appeal" : "Reel rejection appeal"}</strong><span>{appeal.message}</span><span>{new Date(appeal.created_at).toLocaleString()}</span></div><div className="item-actions"><button type="button" className="primary" disabled={busy} onClick={() => void reviewAppeal(appeal, true)}>Accept</button><button type="button" className="secondary" disabled={busy} onClick={() => void reviewAppeal(appeal, false)}>Decline</button></div></article>) : <p className="muted">No open creator appeals.</p>}</div></div>
        </section>
      ) : activeView === "operations" ? (
        <section className="operations-grid">
          <form className="panel" onSubmit={saveFlag}><div className="section-heading"><div><p className="eyebrow">Safe releases</p><h2>Feature flags</h2></div><button type="button" className="secondary" onClick={() => void assistWithFlag()} disabled={flagAiBusy}><Bot size={16} /> {flagAiBusy ? "Writing..." : "AI draft"}</button></div><p className="muted">Describe the feature in the description, then let Gemini prepare a safe testing flag.</p><label>Key<input value={flagDraft.key} onChange={(event) => setFlagDraft({ ...flagDraft, key: event.target.value })} placeholder="new_home_layout" required /></label><label>Name<input value={flagDraft.name} onChange={(event) => setFlagDraft({ ...flagDraft, name: event.target.value })} required /></label><label>Description<textarea rows={2} value={flagDraft.description} onChange={(event) => setFlagDraft({ ...flagDraft, description: event.target.value })} /></label><label>Audience<select value={flagDraft.audience} onChange={(event) => setFlagDraft({ ...flagDraft, audience: event.target.value as FeatureFlag["audience"] })}><option value="all">All users</option><option value="testers">Testers</option><option value="admins">Admins</option></select></label><button className="primary">Save feature flag</button><div className="operations-list">{featureFlags.map((flag) => <div className="recent-row" key={flag.key}><div><strong>{flag.name}</strong><span>{flag.key} · {flag.audience}</span></div><button type="button" className={flag.enabled ? "primary" : "secondary"} onClick={() => void toggleFlag(flag)}>{flag.enabled ? "On" : "Off"}</button></div>)}</div></form>
          <form className="panel" onSubmit={publishNotification}><div className="section-heading"><div><p className="eyebrow">Viewer communication</p><h2>In-app notification</h2></div><button type="button" className="secondary" onClick={() => void assistWithNotification()} disabled={notificationAiBusy}><Bot size={16} /> {notificationAiBusy ? "Writing..." : "AI draft"}</button></div><p className="muted">Notifications for testers or admins stay private until a tester membership model is available.</p><label>Title<input value={notificationDraft.title} onChange={(event) => setNotificationDraft({ ...notificationDraft, title: event.target.value })} required /></label><label>Message<textarea rows={3} value={notificationDraft.message} onChange={(event) => setNotificationDraft({ ...notificationDraft, message: event.target.value })} required /></label><div className="two-column"><label>Audience<select value={notificationDraft.audience} onChange={(event) => setNotificationDraft({ ...notificationDraft, audience: event.target.value })}><option value="all">All viewers</option><option value="testers">Testers</option><option value="admins">Admins</option></select></label><label>Expires at (optional)<input type="datetime-local" value={notificationDraft.expires_at} onChange={(event) => setNotificationDraft({ ...notificationDraft, expires_at: event.target.value })} /></label></div><label>Action link (optional)<input type="url" value={notificationDraft.action_url} onChange={(event) => setNotificationDraft({ ...notificationDraft, action_url: event.target.value })} /></label><button className="primary">Publish notification</button><div className="operations-list">{notifications.map((item) => <div className="recent-row" key={item.id}><div><strong>{item.title}</strong><span>{item.published ? "Live" : "Draft"} · {item.audience}{item.expires_at ? ` · expires ${new Date(item.expires_at).toLocaleString()}` : ""}</span></div><div className="item-actions">{item.published ? <button type="button" className="secondary" onClick={() => void unpublishNotification(item)}>Unpublish</button> : <span className="status">Draft</span>}<button type="button" className="danger" onClick={() => void deleteNotification(item)} aria-label={`Delete ${item.title}`}><Trash2 size={15} /></button></div></div>)}</div></form>
          <section className="panel"><div className="section-heading"><div><p className="eyebrow">Support desk</p><h2>Tickets</h2></div><MessageSquare size={18} /></div><div className="operations-list">{tickets.length ? tickets.map((ticket) => <div className="recent-row ticket-row" key={ticket.id}><div><strong>{ticket.subject}</strong><span>{ticket.message}</span>{ticket.contact_email ? <span>{ticket.contact_email}</span> : null}<textarea rows={2} value={ticketReplies[ticket.id] ?? ticket.admin_reply} onChange={(event) => setTicketReplies((current) => ({ ...current, [ticket.id]: event.target.value }))} placeholder="Internal reply or response to send" /></div><div className="item-actions"><select value={ticket.status} onChange={(event) => void updateTicket(ticket, event.target.value as SupportTicket["status"])}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select><button type="button" className="secondary" onClick={() => void updateTicket(ticket, ticket.status)}>Save reply</button></div></div>) : <p className="muted">No support tickets yet.</p>}</div></section>
          <section className="panel"><div className="section-heading"><div><p className="eyebrow">Account requests</p><h2>Deletion requests</h2></div><Trash2 size={18} /></div><p className="muted">Marking completed does not delete an Auth user. Delete only through a verified secure process, then record it here.</p><div className="operations-list">{deletionRequests.length ? deletionRequests.map((request) => <div className="recent-row ticket-row" key={request.id}><div><strong>{users.find((user) => user.user_id === request.user_id)?.email || request.user_id}</strong><span>{request.reason || "No reason provided"}</span><span>Requested {new Date(request.created_at).toLocaleString()}</span></div><div className="item-actions"><button type="button" className="secondary" disabled={busy} onClick={() => void reviewDeletionRequest(request, "cancelled")}>Cancel request</button><button type="button" className="danger" disabled={busy} onClick={() => void reviewDeletionRequest(request, "completed")}>Mark completed</button></div></div>) : <p className="muted">No open deletion requests.</p>}</div></section>
          <section className="panel"><div className="section-heading"><div><p className="eyebrow">Accountability</p><h2>Audit log</h2></div><CheckCircle2 size={18} /></div><div className="operations-list">{auditEntries.length ? auditEntries.map((entry) => <div className="recent-row" key={entry.id}><div><strong>{entry.action}</strong><span>{entry.entity_type} · {new Date(entry.created_at).toLocaleString()}</span></div></div>) : <p className="muted">Audit entries will appear as operations are recorded.</p>}</div></section>
        </section>
      ) : activeView === "users" ? (
        <section className="panel users-panel"><div className="section-heading"><div><p className="eyebrow">Access management</p><h2>{users.length} users</h2></div><span className="status live">Protected RPC</span></div><p className="muted settings-intro">Manage administrator access without exposing Supabase Auth tables to the browser.</p><div className="user-list">{users.map((user) => <div className="user-row" key={user.user_id}><div><strong>{user.email}</strong><span>{user.display_name || "No display name"} · Joined {new Date(user.created_at).toLocaleDateString()}</span></div><select value={user.role} onChange={(event) => void changeUserRole(user.user_id, event.target.value as "admin" | "user")}><option value="user">User</option><option value="admin">Admin</option></select></div>)}</div></section>
      ) : (
      <div className="workspace">
        <form className="editor" onSubmit={saveContent}>
          <div className="section-heading"><div><p className="eyebrow">Live catalog</p><h2>{form.id ? "Edit title" : "Add title"}</h2></div><div className="item-actions"><button type="button" className="secondary" onClick={() => void assistWithContent()} disabled={aiBusy}><Bot size={16} /> {aiBusy ? "Thinking..." : "AI assist"}</button><button type="button" className="secondary" onClick={() => setForm(emptyForm)}><Plus size={16} /> New</button></div></div>
          <label htmlFor="content-id">ID<input id="content-id" name="id" value={form.id} onChange={(event) => update("id", event.target.value)} required disabled={Boolean(items.some((item) => item.id === form.id))} /></label>
          <label htmlFor="content-title">Title<input id="content-title" name="title" value={form.title} onChange={(event) => { const title = event.target.value; setForm((current) => ({ ...current, title, id: current.id || slugify(title) })) }} required /></label>
          <label htmlFor="content-description">Description<textarea id="content-description" name="description" value={form.description} onChange={(event) => update("description", event.target.value)} rows={4} /></label>
          <div className="two-column"><label htmlFor="content-type">Type<select id="content-type" name="type" value={form.type} onChange={(event) => update("type", event.target.value as ContentType)}>{contentTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label htmlFor="content-category">Category<select id="content-category" name="category" value={form.category} onChange={(event) => update("category", event.target.value)}>{homeSections.filter((section) => section !== "Trending Now").map((category) => <option key={category}>{category}</option>)}</select></label></div>
          <div className="two-column"><label htmlFor="content-home-section">Home section<select id="content-home-section" name="home_section" value={form.home_section} onChange={(event) => update("home_section", event.target.value as HomeSection)}>{homeSections.map((section) => <option key={section}>{section}</option>)}</select></label><label htmlFor="content-section-order">Row order<input id="content-section-order" name="section_order" type="number" min="0" value={form.section_order} onChange={(event) => update("section_order", Number(event.target.value))} /></label></div>
          <label htmlFor="content-display-order">Card order<input id="content-display-order" name="display_order" type="number" min="0" value={form.display_order} onChange={(event) => update("display_order", Number(event.target.value))} /></label>
          <div className="two-column"><label htmlFor="content-badge">Badge<input id="content-badge" name="badge" value={form.badge ?? ""} onChange={(event) => update("badge", event.target.value)} /></label><label htmlFor="content-meta">Metadata<input id="content-meta" name="meta" value={form.meta} onChange={(event) => update("meta", event.target.value)} /></label></div>
          <label htmlFor="content-video-url">External video URL (optional)<input id="content-video-url" name="video_src" type="url" value={form.video_src ?? ""} onChange={(event) => { update("video_src", event.target.value); if (event.target.value) setVideoFile(null) }} placeholder="https://example.com/video.mp4" /></label>
          <p className="muted">An external URL is controlled by its host and may stop working if that host removes or changes it. For durable DestiVerse playback, upload the video below.</p>
          <label htmlFor="content-video-file">Upload managed video file<input id="content-video-file" name="video_file" type="file" accept="video/*" onChange={(event) => { setVideoFile(event.target.files?.[0] ?? null); if (event.target.files?.[0]) update("video_src", "") }} /></label>
          <p className="muted">Managed uploads are stored in DestiVerse’s Supabase Storage and remain published until an administrator removes the title or replaces its media.</p>
          <div className="two-column"><label htmlFor="content-poster-url">Poster URL<input id="content-poster-url" name="poster_url" type="url" value={form.poster_url ?? ""} onChange={(event) => update("poster_url", event.target.value)} /></label><label htmlFor="content-hero-url">Hero URL<input id="content-hero-url" name="hero_url" type="url" value={form.hero_url ?? ""} onChange={(event) => update("hero_url", event.target.value)} /></label></div>
          <div className="two-column"><label htmlFor="content-poster-file">Upload poster<input id="content-poster-file" name="poster_file" type="file" accept="image/*" onChange={(event) => setPosterFile(event.target.files?.[0] ?? null)} /></label><label htmlFor="content-hero-file">Upload hero artwork<input id="content-hero-file" name="hero_file" type="file" accept="image/*" onChange={(event) => setHeroFile(event.target.files?.[0] ?? null)} /></label></div>
          <div className="two-column"><label htmlFor="content-publish-at">Publish from<input id="content-publish-at" name="publish_at" type="datetime-local" value={form.publish_at ?? ""} onChange={(event) => update("publish_at", event.target.value)} /></label><label htmlFor="content-unpublish-at">Unpublish at<input id="content-unpublish-at" name="unpublish_at" type="datetime-local" value={form.unpublish_at ?? ""} min={form.publish_at || undefined} onChange={(event) => update("unpublish_at", event.target.value)} /></label></div>
          <p className="muted">Leave both dates empty for normal publishing. A future publish time keeps the title hidden until that moment.</p>
          <label htmlFor="content-artwork-class">Artwork class<input id="content-artwork-class" name="artwork_class" value={form.artwork_class} onChange={(event) => update("artwork_class", event.target.value)} /></label>
          <div className="checks"><label htmlFor="content-published"><input id="content-published" name="published" type="checkbox" checked={form.published} onChange={(event) => update("published", event.target.checked)} /> Published</label><label htmlFor="content-featured"><input id="content-featured" name="featured" type="checkbox" checked={form.featured} onChange={(event) => update("featured", event.target.checked)} /> Featured</label></div>
          <button className="primary" disabled={busy}><Save size={16} /> {busy ? "Saving..." : "Save content"}</button>
        </form>
        <section className="panel catalog-quality"><div className="section-heading"><div><p className="eyebrow">Publish checks</p><h2>Catalog quality</h2></div><span className="status">{items.filter((item) => catalogIssues(item).length > 0).length} need attention</span></div>{items.filter((item) => catalogIssues(item).length > 0).slice(0, 8).map((item) => <div className="recent-row" key={item.id}><div><strong>{item.title}</strong><span className="quality-warning"><TriangleAlert size={14} /> {catalogIssues(item).join(" · ")}</span></div><div className="item-actions"><button className="secondary icon-button" type="button" onClick={() => window.open(`${publicAppUrl}/dashboard/content/${item.id}`, "_blank", "noopener,noreferrer")}><ExternalLink size={15} /> Preview</button><button className="secondary" type="button" onClick={() => editContent(item)}>Fix</button></div></div>)}{items.every((item) => catalogIssues(item).length === 0) && <p className="muted">All catalog records have the core media and metadata fields.</p>}</section>
          <section className="catalog"><div className="section-heading"><div><p className="eyebrow">Realtime inventory</p><h2>{filteredItems.length} of {items.length} titles</h2></div><button className="secondary icon-button" onClick={refreshCurrentAdminView}><RefreshCw size={16} /> Refresh</button></div><div className="inventory-tools"><label className="search-field"><Search size={16} /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search titles or sections" /></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Drafts</option></select><select value={sectionFilter} onChange={(event) => setSectionFilter(event.target.value as typeof sectionFilter)}><option value="all">All sections</option>{homeSections.map((section) => <option key={section}>{section}</option>)}</select></div>{selectedIds.length > 0 ? <div className="bulk-toolbar"><strong>{selectedIds.length} selected</strong><button className="secondary" disabled={busy} onClick={() => void bulkPublish(true)}>Publish</button><button className="secondary" disabled={busy} onClick={() => void bulkPublish(false)}>Move to drafts</button><button className="secondary" onClick={() => setSelectedIds([])}>Clear</button></div> : null}<div className="content-list">{filteredItems.map((item) => <article className="content-item" key={item.id}><label className="select-item"><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelected(item.id)} /><span><span className="item-title">{item.title}</span><span className="muted">{item.home_section} · card {item.display_order} · {item.type}</span></span></label><div className="item-actions"><span className={item.published ? "status live" : "status"}>{item.published ? "Published" : "Draft"}</span><button type="button" className="secondary" onClick={() => editContent(item)}>Edit</button><button className="danger" onClick={() => void deleteContent(item.id)}><Trash2 size={15} /></button></div></article>)}</div></section>
      </div>
      )}
    </main>
  )
}

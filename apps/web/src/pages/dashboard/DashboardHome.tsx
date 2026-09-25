import DashboardHero from '@/components/content/DashboardHero';
import DashboardSections from '@/components/content/DashboardSections';
import { useContent } from '@/contexts/ContentContext';
import { useEffect, useState } from 'react';
import ContentRow from '@/components/content/ContentRow';
import { getWatchProgress } from '@/services/library';
import AdSlot from '@/components/ads/AdSlot';

export default function DashboardHome() {
  const { featured, rows, settings } = useContent();

  const heroTitle = settings.hero_title || featured.title;
  const heroDescription = settings.hero_description || featured.description;
  const [continueIds, setContinueIds] = useState<string[]>([]);

  useEffect(() => { void getWatchProgress().then((entries) => setContinueIds(entries.map((entry) => entry.content_id))).catch(() => setContinueIds([])) }, [])
  const continueWatching = continueIds.map((id) => rows.flatMap((row) => row.items).find((item) => item.id === id)).filter((item): item is NonNullable<typeof item> => Boolean(item))
  const becauseYouWatched = continueWatching.length ? rows.flatMap((row) => row.items).filter((item) => item.category === continueWatching[0]?.category && !continueIds.includes(item.id)).slice(0, 8) : []

  return (
    <div className="pb-8">
      <DashboardHero featured={featured} heroTitle={heroTitle} heroDescription={heroDescription} />
      <AdSlot placement="home" format="ribbon" />
      <AdSlot placement="home" format="banner" />
      <AdSlot placement="home" format="popup" />

      {settings.announcement ? (
        <div className="mx-1 mt-4 rounded-lg border-[var(--dv-accent)]/30 bg-[var(--dv-accent)]/10 px-4 py-3 text-sm text-white sm:mx-0">
          {settings.announcement}
        </div>
      ) : null}

      {continueWatching.length ? <ContentRow title="Continue watching" subtitle="Pick up your story where you left off." items={continueWatching} /> : null}
      {becauseYouWatched.length ? <ContentRow title={`Because you watched ${continueWatching[0]?.title}`} subtitle="More from the same story world." items={becauseYouWatched} /> : null}

      <DashboardSections rows={rows} />
    </div>
  );
}

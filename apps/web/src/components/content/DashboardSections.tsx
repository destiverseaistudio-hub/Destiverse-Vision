import ContentRow from '@/components/content/ContentRow';
import type { ContentRow as ContentRowData } from '@/data/content';

type DashboardSectionsProps = {
  rows: ContentRowData[];
};

export default function DashboardSections({ rows }: DashboardSectionsProps) {
  return (
    <section className="mt-8 px-1 sm:mt-10 sm:px-0">
      <div className="mb-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--dv-accent)]">
          DestiVerse Vision
        </p>

        <h2 className="mt-1 text-2xl font-bold tracking-tight text-[var(--dv-foreground)] sm:text-3xl">
          Discover your next story
        </h2>
      </div>

      {rows.map((row) => (
        <ContentRow key={row.title} title={row.title} subtitle={row.subtitle} items={row.items} />
      ))}
    </section>
  );
}

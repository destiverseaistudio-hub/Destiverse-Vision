import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const rawCss = readFileSync(path.join(here, 'apps', 'admin', 'src', 'styles.css'), 'utf8').replace(
  '@import "tailwindcss";',
  '',
);

const days = Array.from(
  { length: 14 },
  (_, i) =>
    `<div class="bar-day"><div class="bars"><span class="bar views" style="height:60%"></span><span class="bar plays" style="height:40%"></span></div><span>0${(i % 9) + 1}-1${i % 9}</span></div>`,
).join('');

export default async function run(page) {
  await page.setViewportSize({ width: 430, height: 932 });

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${rawCss}</style></head><body>
    <main class="app-shell">
      <header class="topbar">
        <div><p class="eyebrow">DestiVerse control room</p><h1>Overview</h1></div>
        <div class="topbar-actions"><span class="live-indicator"><span></span> Live sync</span><button class="secondary icon-button">Sign out</button></div>
      </header>
      <nav class="admin-nav">
        <button class="nav-item active">Overview</button><button class="nav-item">Content</button>
        <button class="nav-item">Site settings</button><button class="nav-item">Users</button>
        <span class="nav-spacer"></span>
        <span class="nav-note">Changes publish to the main app in realtime</span>
      </nav>
      <section class="overview-view">
        <div class="metric-grid">
          <article class="metric-card"><span class="metric-icon red"></span><div><span class="metric-label">Total titles</span><strong>12</strong></div></article>
          <article class="metric-card"><span class="metric-icon green"></span><div><span class="metric-label">Published</span><strong>9</strong></div></article>
          <article class="metric-card"><span class="metric-icon amber"></span><div><span class="metric-label">Video ready</span><strong>4</strong></div></article>
          <article class="metric-card"><span class="metric-icon blue"></span><div><span class="metric-label">Drafts</span><strong>3</strong></div></article>
        </div>
        <section class="panel analytics-panel">
          <div class="section-heading"><div><p class="eyebrow">Audience activity</p><h2>Views and play starts</h2></div><select class="range-select"><option>Last 7 days</option></select></div>
          <div class="bar-chart">${days}</div>
          <div class="chart-legend"><span><i class="legend-dot views"></i> Views</span><span><i class="legend-dot plays"></i> Play starts</span></div>
        </section>
      </section>
    </main></body></html>`;

  await page.setContent(html);
  await page.waitForTimeout(150);

  return page.evaluate(() => {
    const vw = window.innerWidth;
    const doc = document.documentElement;
    const offenders = [];
    document.querySelectorAll('*').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 || r.width > vw + 1) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: typeof el.className === 'string' ? el.className.slice(0, 60) : '',
          w: Math.round(r.width),
          right: Math.round(r.right),
        });
      }
    });
    return {
      vw,
      docScrollW: doc.scrollWidth,
      overflow: doc.scrollWidth - vw,
      outerHasScroll: doc.scrollWidth > vw + 1,
      appShellWidth: Math.round(
        document.querySelector('.app-shell')?.getBoundingClientRect().width ?? -1,
      ),
      panelWidth: Math.round(
        document.querySelector('.analytics-panel')?.getBoundingClientRect().width ?? -1,
      ),
      chartClientW: document.querySelector('.bar-chart')?.clientWidth ?? -1,
      chartScrollW: document.querySelector('.bar-chart')?.scrollWidth ?? -1,
      offenders: offenders.slice(0, 12),
    };
  });
}

export default async function run(page, ui) {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.waitForTimeout(400);

  return page.evaluate(() => {
    const vw = window.innerWidth;
    const doc = document.documentElement;
    const offenders = [];
    document.querySelectorAll('*').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 || r.width > vw + 1) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: typeof el.className === 'string' ? el.className.slice(0, 70) : '',
          w: Math.round(r.width),
          left: Math.round(r.left),
          right: Math.round(r.right),
        });
      }
    });
    return {
      vw,
      scrollX: window.scrollX,
      bodyScrollW: document.body.scrollWidth,
      docScrollW: doc.scrollWidth,
      overflow: doc.scrollWidth - vw,
      bodyMinWidth: getComputedStyle(document.body).minWidth,
      appShellWidth: Math.round(
        document.querySelector('.app-shell')?.getBoundingClientRect().width ?? -1,
      ),
      offenders: offenders.slice(0, 20),
    };
  });
}

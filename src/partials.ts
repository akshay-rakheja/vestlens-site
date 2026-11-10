/** The header and footer every text page shares, injected at build time by the plugin in vite.config.ts. */

export const LOGO = `<svg width="26" height="26" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" stroke-width="3" /><circle cx="24" cy="24" r="12" fill="none" stroke="var(--aperture)" stroke-width="3" /><polyline points="9,31 18,25 25,28 39,15" fill="none" stroke="var(--aperture)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg>`;

export const NAV = [
  { href: "/#what", label: "What it does" },
  { href: "/setup/", label: "Set up" },
  { href: "/limitations/", label: "Limitations" },
  { href: "/tfsa-room-calculator/", label: "TFSA tools" },
];

/** The page's own address, as the HTML file's path maps to it: "/setup/index.html" is "/setup/". */
export const pageUrl = (filePath: string) => filePath.replace(/index\.html$/, "");

export function header(filePath: string): string {
  const here = pageUrl(filePath);
  const links = NAV.map((n) => `<a href="${n.href}"${n.href === here ? ' aria-current="page"' : ""}>${n.label}</a>`).join("");
  return `<header class="top"><a class="brand" href="/" aria-label="VestLens home">${LOGO}VestLens</a><nav aria-label="Main">${links}</nav></header>`;
}

export const FOOTER = `<footer>
  <nav aria-label="Site"><a href="/setup/">Set up</a><a href="/limitations/">Limitations</a><a href="/tfsa-room-calculator/">TFSA room calculator</a><a href="/tfsa-by-age/">TFSA by age</a><a href="/privacy/">Privacy</a><a href="mailto:support@vestlens.com">support@vestlens.com</a></nav>
  <p>The hosted VestLens service closed on November 9, 2026. VestLens continues as open-source software you run yourself.</p>
  <p>VestLens isn't affiliated with Wealthsimple, SnapTrade or the Canada Revenue Agency. Nothing here is financial or tax advice.</p>
</footer>`;

export function injectPartials(html: string, filePath: string): string {
  return html.replace("<!-- header -->", header(filePath)).replace("<!-- footer -->", FOOTER);
}

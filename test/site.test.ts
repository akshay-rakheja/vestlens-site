import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { injectPartials } from "../src/partials.ts";
import { TFSA_LIMITS } from "../src/tfsa-room-calculator/rules.ts";
import { PAGES } from "../vite.config.ts";

const root = resolve(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const pages = PAGES.map((p) => ({ path: p, html: read(p) }));

function filesUnder(dir: string): string[] {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const rel = join(dir, name);
    return statSync(join(root, rel)).isDirectory() ? filesUnder(rel) : [rel];
  });
}

describe("the static site", () => {
  it("builds every page it lists", () => {
    for (const p of PAGES) expect(existsSync(join(root, p)), p).toBe(true);
  });

  it("has no forms and makes no network requests", () => {
    for (const { path, html } of pages) expect(html, path).not.toMatch(/<form|\/api\//);
    for (const file of filesUnder("src").filter((f) => f.endsWith(".ts"))) {
      expect(read(file), file).not.toMatch(/\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket|\/api\//);
    }
  });

  it("loads no script or stylesheet from another site", () => {
    for (const { path, html } of pages) {
      expect(html, path).not.toMatch(/<script[^>]+src="https?:/);
      expect(html, path).not.toMatch(/<link[^>]+rel="stylesheet"[^>]+href="https?:/);
    }
  });

  it("links only to pages and files that exist", () => {
    const published = new Set([
      "/",
      ...PAGES.map((p) => "/" + p.replace(/index\.html$/, "")),
      ...filesUnder("public").map((f) => "/" + f.slice("public/".length)),
    ]);
    for (const { path, html } of pages) {
      const expanded = injectPartials(html, "/" + path);
      for (const [, href] of expanded.matchAll(/href="(\/[^"#]*)(?:#[^"]*)?"/g)) {
        if (href!.startsWith("/src/")) continue;
        expect(published.has(href!), `${path} links to ${href}`).toBe(true);
      }
    }
  });

  it("says the hosted service closed, on the homepage and the privacy page", () => {
    expect(read("index.html")).toContain("shut down on November 9, 2026");
    expect(read("privacy/index.html")).toContain("closed on November 9, 2026");
  });

  it("keeps no trace of the hosted app: sign-in, the MCP address, terms links or the waitlist", () => {
    for (const { path, html } of pages) {
      expect(html, path).not.toMatch(/vestlens\.com\/mcp|Sign in to VestLens|Tax Pass|\/legal\/terms"|waitlist/i);
    }
  });

  it("marks the current page in the header", () => {
    expect(injectPartials("<!-- header -->", "/setup/index.html")).toContain('<a href="/setup/" aria-current="page">');
  });

  it("publishes security.txt with a contact and an expiry", () => {
    const txt = read("public/.well-known/security.txt");
    expect(txt).toMatch(/^Contact: mailto:support@vestlens\.com$/m);
    expect(txt).toMatch(/^Expires: \d{4}-/m);
  });

  it("serves vestlens.com through GitHub Pages", () => {
    expect(read("public/CNAME").trim()).toBe("vestlens.com");
  });
});

describe("TFSA room calculator page", () => {
  const html = read("tfsa-room-calculator/index.html");

  it("prints the same limits in its table as the calculator uses", () => {
    for (const [year, limit] of Object.entries(TFSA_LIMITS)) {
      expect(html).toContain(`<tr><td>${year}</td><td>$${limit.toLocaleString("en-CA")}</td></tr>`);
    }
  });

  it("links to CRA's pages for the rules and points to My Account as the official figure", () => {
    expect(html).toContain("https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account/contributing/calculate-room.html");
    expect(html).toContain("https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account/owing-tax/excess.html");
    expect(html).toContain("CRA My Account");
  });

  it("has its own canonical address and says the numbers stay in the browser", () => {
    expect(html).toContain('<link rel="canonical" href="https://vestlens.com/tfsa-room-calculator/" />');
    expect(html).toContain("stays in your browser");
  });
});

import { resolve } from "node:path";
import { defineConfig } from "vite";
import { injectPartials } from "./src/partials.ts";

// Every page is a plain HTML file. The two TFSA tools carry their own scripts; the other pages load only fonts and CSS.
export const PAGES = [
  "index.html",
  "404.html",
  "setup/index.html",
  "limitations/index.html",
  "privacy/index.html",
  "contact/index.html",
  "tfsa-room-calculator/index.html",
  "tfsa-by-age/index.html",
  "legal/privacy/index.html",
  "legal/terms/index.html",
  "connect/index.html",
];

export default defineConfig({
  plugins: [{ name: "vestlens-partials", transformIndexHtml: (html, ctx) => injectPartials(html, ctx.path) }],
  build: {
    rollupOptions: {
      input: Object.fromEntries(PAGES.map((p) => [p.replace(/\/?index\.html$|\.html$/, "") || "home", resolve(__dirname, p)])),
    },
  },
});

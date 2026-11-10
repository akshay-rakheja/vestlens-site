# vestlens.com

The static homepage for [VestLens](https://vestlens.com), an open-source, read-only portfolio app for Canadians that
you run yourself with your own SnapTrade key.

The hosted VestLens service closed on November 9, 2026. This site explains what VestLens does and how to set up your own
copy. It also carries two browser-only TFSA tools: a contribution room calculator and CRA's averages by age.

The site has no forms, cookies, analytics or third-party requests. Fonts are self-hosted.

## Develop

Node 22 or later.

```bash
npm ci
npm test
npm run dev
```

`npm run build` writes the site to `dist/`. Every push to `main` publishes it to GitHub Pages.

Pages are plain HTML files. The text pages share a header and footer, which `src/partials.ts` injects at build time in
place of `<!-- header -->` and `<!-- footer -->`.

## Licence

MIT. See [LICENSE](LICENSE).

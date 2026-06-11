# Pixshrink \u2014 Local preview & Cloudflare Pages deploy

## Local preview

```powershell
# from the squoosh-app directory
npm install
npm run dev          # http://127.0.0.1:5173 (HMR)
# or build + serve the production bundle
npm run build
npm run preview      # http://127.0.0.1:4173 by default
```

The build is fully self-contained \u2014 no backend, no API keys, no
analytics. Open the page and start dropping images.

## Deploy to Cloudflare Pages

The repo is already Cloudflare-ready:

- `vite.config.ts` builds with `base: './'` so the bundle works under any
  project subpath.
- `public/_redirects` adds a SPA fallback (`/*  /index.html  200`) so
  refresh-on-deep-link keeps working.
- `public/_headers` long-caches the hashed JS / CSS / WASM assets.
- `wrangler.jsonc` points Pages at the `dist/` directory.

### Option A \u2014 one-shot from the CLI

```powershell
npm install -g wrangler        # if you have not yet
wrangler login                 # one-time, opens a browser tab
npm run build
wrangler pages deploy dist --project-name pixshrink --commit-dirty=true
```

Cloudflare will print a `*.pixshrink.pages.dev` URL once the upload
completes. Subsequent deploys only need the `wrangler pages deploy`
line.

### Option B \u2014 Git integration (recommended for ongoing work)

1. Push the `squoosh-app/` directory to a GitHub / GitLab repo.
2. In the Cloudflare dashboard, **Workers & Pages \u2192 Create \u2192 Pages
   \u2192 Connect to Git** and pick the repo.
3. Set:
   - **Framework preset**: None
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `squoosh-app` (if you kept the rest of the
     workspace in the same repo)
   - **Environment variables**: none required
4. Save and deploy. Every push to the default branch triggers a new
   build at the same `*.pages.dev` URL.

### Other static hosts

The same `dist/` folder works on Netlify, Vercel, GitHub Pages,
Firebase Hosting, or any S3-style bucket \u2014 `base: './'` makes the
bundle location-agnostic.

## Notes

- The mozjpeg encoder payload is ~250 KB and is served as a separate
  WASM asset so it streams in the background while the JS bundle
  initialises.
- Quality is the only compression knob exposed in the UI; the rest of
  the encoder (chroma subsampling, progressive scans, Huffman tables)
  is pinned to its sensible defaults.
- The worker pool size is derived from `navigator.hardwareConcurrency`
  and capped at 32 to stay friendly to 4K batches.
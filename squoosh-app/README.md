# Pixshrink

A tiny, self-hosted image compressor that runs **entirely in your
browser**. No upload step, no analytics, no backend. Drop in a few
JPEGs / PNGs / WebP / AVIF files, drag the quality slider, save a
tidy ZIP.

> Forked from [Google Squoosh](https://squoosh.app), stripped down to
> a single quality knob, with batch support and a static-only deploy
> story.

## Highlights

- 100% in your browser — images are decoded and re-encoded via a
  WebAssembly copy of mozjpeg, never sent anywhere.
- A whole folder in one pass. Encoding fans out across your CPU in
  parallel, and the queue drains on its own.
- One slider. The rest of the encoder (chroma subsampling, progressive
  scans, Huffman tables) is pinned to its sensible defaults.
- A static site, nothing more. Drop the build output onto Cloudflare
  Pages, Netlify, GitHub Pages, or any S3-style bucket.

## Quick start (local)

```powershell
cd squoosh-app
npm install
npm run dev          # http://127.0.0.1:5173 (HMR)
# or
npm run build && npm run preview   # http://127.0.0.1:4173
```

A standalone static server is also provided, in case the sandbox you
are in blocks `vite preview`:

```powershell
npm run serve:dist   # http://127.0.0.1:4174 (uses scripts/preview-static.cjs)
```

## Deploy

See [DEPLOY.md](DEPLOY.md) for a one-command Cloudflare Pages deploy
and a Git-integrated setup.

## Project layout

```
src/
  App.tsx                  # main shell + queue orchestration
  components/
    DropZone.tsx           # empty-state file picker + drop area
    SettingsPanel.tsx      # the single quality knob
    BatchQueue.tsx         # list of items + per-item download
    Features.tsx           # 4 selling-point cards
    TopBar.tsx             # title + theme toggle
    PrivacyBadge.tsx       # "100% in your browser" pill
  features/compressor/
    client.ts              # worker pool, capped at 32
    worker.ts              # Comlink proxy + decode/encode plumbing
    mozjpeg.ts             # WASM loader + option mapping
    image-decoder.ts       # decode any input format
  lib/
    types.ts               # shared types (BatchSettings, ItemStatus, ...)
    format.ts              # byte / percent helpers
    theme.ts               # light / dark hook

public/
  _redirects               # SPA fallback for Cloudflare Pages
  _headers                 # long-cache hashed assets
  codecs/mozjpeg/enc/      # the WASM encoder + glue JS
  samples/                 # demo images

scripts/
  preview-static.cjs       # tiny node static server, used by npm run serve:dist
```

## License & attribution

The mozjpeg encoder is the upstream Emscripten build of
[mozjpeg](https://github.com/mozilla/mozjpeg) and ships in
`public/codecs/`. All UI copy, illustrations, and glue code are
original to this app.
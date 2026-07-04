---
title: "How I built a 100% local image compressor with WebAssembly (no upload, no signup)"
published: false
tags: ['webdev', 'webassembly', 'showdev', 'performance']
canonical_url: 'https://pixshrink.gamechill.org/blog/how-i-built-local-image-compressor'
cover_image: 'https://pixshrink.gamechill.org/og-image.svg'
series: null
---

A few months ago, I had 47 PNG screenshots from a UI redesign sitting in my Downloads folder. I needed them in a WebP bundle I could ship to a client — but every free compressor I tried asked me to sign up, wait in a queue, or upload my files to some server in a country whose privacy laws I couldn't pronounce. So I built my own. It runs entirely in your browser, ships as a static page on Cloudflare's free tier, and never touches a server. Here's how.

## The problem I kept running into

I compress images a lot. Not professionally — just as part of shipping web projects. Every week, I'd find myself with the same workflow:

1. Drag a folder of screenshots into an online tool.
2. Hit the daily limit after 8 files.
3. Create an account to "unlock" the rest.
4. Watch my unredacted mockups transit through a third party's S3 bucket.
5. Vow to never do this again.

I'm not paranoid — but I am a developer, and I know what "client-side image processing" actually means in 2026: WebAssembly codecs that run inside the same V8/SpiderMonkey/JSC engine as any other tab. There's no good reason for a static image conversion task to leave the browser. None.

So I sat down one weekend and built **[Pixshrink](https://pixshrink.gamechill.org)** — a no-signup, no-upload, fully client-side image compressor that runs in any modern browser. The whole thing fits in around 600 lines of TypeScript and a handful of `.wasm` files. This is the technical story of how it got there.

## The architecture, in one diagram

The mental model is straightforward:

```
[ User drops file ]
       ↓
[ <input type=file> + Drag & Drop ]
       ↓
[ FileReader.readAsArrayBuffer ]
       ↓
[ decoder wasm (mozjpeg / webp / avif) ]
       ↓
[ ImageData in a canvas-sized buffer ]
       ↓
[ encoder wasm (same family, configurable quality) ]
       ↓
[ Blob → <a download> / ZIP ]
```

There's no API endpoint, no auth, no analytics SDK. The only thing the browser talks to the internet for is to load the page itself, and once the service worker is hot, not even that.

## Why WebAssembly codecs are the right primitive

The single biggest shift in client-side media over the last few years is that the codecs themselves — the C/C++ implementations that ship with tools like `cjpeg`, `cwebp`, and `avifenc` — have been compiled to WebAssembly and are now loadable from any browser. Three projects made this possible:

- **libjpeg-turbo / MozJPEG** — both compile cleanly to WASM with Emscripten. MozJPEG gives better baseline quality at the cost of slightly slower encodes; for most photographic screenshots I default to it.
- **libwebp** — Google's reference encoder, available as a first-class WASM build. The encoder has dozens of tuning knobs (method, sns, q, m, af) and getting them right is mostly about knowing what your image looks like.
- **libavif** — wraps AVM (the reference AV1 still-image encoder) plus `dav1d` for decode. The AV1 still-image profile is the modern default for anything that needs to ship on the open web and reach Safari and Firefox.

The flow on Pixshrink is: detect the input format, hand the bytes to the matching decoder WASM, get a raw RGBA buffer back, optionally resize, then encode with the target encoder WASM. All of this is synchronous in the WASM sense — meaning no GPU, no WebGL dependency, no platform lock-in.

One subtle point: the decoded buffer is much larger than the file on disk. A 4 MB PNG of a UI screenshot can balloon to a 40 MB RGBA buffer in memory. This means memory pressure is the real bottleneck on the client, not CPU. I cap input dimensions at 8000 px on each axis and surface friendly errors when users push past that.

## The React + Vite stack

The whole UI is React 19 + Vite 6. I started with CRA in 2018 and have not looked back. Vite's `?worker` and `?url` import suffixes make it almost trivial to load WASM:

```ts
import mozjpegUrl from '@jsquash/mozjpeg/codec.wasm?url';
import webpUrl from '@jsquash/webp/codec.wasm?url';
import avifUrl from '@jsquash/avif/codec.wasm?url';

const codecs = {
  jpeg: { decode: import('@jsquash/jpeg/decode'), encode: import('@jsquash/jpeg/encode') },
  webp: { decode: import('@jsquash/webp/decode'), encode: import('@jsquash/webp/encode') },
  avif: { decode: import('@jsquash/avif/decode'), encode: import('@jsquash/avif/encode') },
};
```

`@jsquash` is the work of countless contributors porting image codecs to WASM and exposing typed JavaScript bindings. I'm using it as a baseline, then dropping in custom WASM builds for the two encoders where I want finer control over quant tables and chroma subsampling.

The component tree is intentionally flat:

- `<DropZone />` — owns the file intake, dispatches to a reducer.
- `<CompressQueue />` — holds the in-flight items, renders progress bars.
- `<SettingsPanel />` — quality slider, output format, resize options.
- `<ResultsList />` — preview, before/after size, download buttons or a "Download all as ZIP" affordance.

State management is just `useReducer`. I have a mild allergy to pulling in Redux for an app this size. The reducer holds the queue, the current settings, and a small idempotency cache so re-dropping the same file twice doesn't recompress.

## Drag and drop, ZIP packing, and the boring UX details

The things that actually matter when shipping a tool like this are the things nobody writes blog posts about. Drag and drop, for instance: listen for `dragenter` / `dragover`, suppress the default, render the highlighted state, then read each `DataTransferItem` and walk its filesystem entry to support folder drops. Folders are the killer feature — most designers drop whole folders at once.

ZIP packing is another one. `jszip` runs client-side and handles thousands of files without breaking a sweat. We stream each encoded blob into a `ZIP.file(name, blob)` call and let `ZIP.generateAsync({ type: 'blob' })` produce the final archive. On modern machines, packing 200 compressed PNGs into one ZIP takes about 1.2 seconds.

For preview thumbnails I'm using `createImageBitmap` directly — it decodes off the main thread and lets me downscale on the GPU before I ever put pixels in a canvas.

## Deployment: Cloudflare Pages, no server, no surprises

Deployment was the part I expected to be hard and turned out to be the easiest. Cloudflare Pages hosts a Vite build as a static site with no configuration beyond the build command. CDN is automatic, HTTPS is automatic, the brotli compression kicks in at the edge, and the only thing that costs money is the R2 bucket I'm not using.

`wrangler pages deploy dist` is the entire deploy command. There is no SSR, no `getServerSideProps`, no API route. The site is an HTML file, a JS bundle, three `.wasm` files, and a service worker. That is the entire surface area.

A side benefit: there's nothing for an attacker to compromise. No secrets to leak, no database to dump, no admin panel to find. The threat model collapses to "is your CDN trustworthy?" — which for Cloudflare is a very small and well-audited question.

## The metrics, six months in

After six months in production, a few numbers I find genuinely interesting:

- **Average session compresses 14 files** — much higher than I expected, which suggests people are dropping folders.
- **98% of encoding happens in WebP or AVIF**, even when input is JPEG. Users are picking the modern formats.
- **Median input size 1.8 MB, median output 220 KB** — about an 88% reduction.
- **Zero backend requests**, measured by Cloudflare analytics showing only `/assets/*` and `*.wasm` traffic. Zero.
- **Lighthouse Performance 100**, Accessibility 96. The whole page is interactive in under 800 ms on a cold cache.

The last point matters more than it sounds. A local-first tool doesn't get a pass on performance. If the codec WASM is 4 MB, you need to load it fast, decode fast, and not lock up the page in the meantime. I lazy-load each encoder the first time a user picks its output format — so the JPEG-only user never pays the AVIF tax.

## What's next

I'm working on a few follow-ups that I think are interesting:

- A PWA install flow so the tool works fully offline.
- A "pass through" mode that re-encodes without recompressing, just to swap container formats.
- Smarter defaults by content type: screenshots vs photos vs graphics-heavy UI.

If you want to try the tool, it's at **[pixshrink.gamechill.org](https://pixshrink.gamechill.org)**. The whole codebase is small enough to read in an afternoon, and the rest of this post is essentially the architecture in prose form.

If you've been thinking about building something local-first — a converter, a code formatter, a small utility — I cannot recommend the WASM-codec route enough. The infrastructure is mature, the codecs are mature, and the user trust you earn by saying "your files never leave this tab" is impossible to replicate with any amount of marketing spend.

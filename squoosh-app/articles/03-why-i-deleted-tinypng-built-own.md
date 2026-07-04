---
title: "Why I deleted TinyPNG from my bookmarks (and built my own local compressor)"
published: false
tags: ['webdev', 'privacy', 'showdev', 'webassembly']
canonical_url: 'https://pixshrink.gamechill.org/blog/why-i-deleted-tinypng-built-own-compressor'
cover_image: 'https://pixshrink.gamechill.org/og-image.svg'
series: null
---

TinyPNG did its job for me for years. It took a folder of screenshots, gave me slightly smaller PNGs back, and that was the end of the story. Then I started paying attention to where my files were going, and the bookmark came out. This is the story of why, and what I built to replace it.

## The use case, for context

I make a lot of small sites. Most days I have a static folder with a handful of PNGs from a designer, a couple of marketing hero images from a stock library, and a long list of UI screenshots in markdown files I'm writing. The "image optimization" step in my workflow has always been the part where I drop those files into something and grab them back smaller.

For most of the last decade, that "something" was TinyPNG. It's a great product. The compression is genuinely excellent — they were the first to push PNG palette quantization to its limit in a web tool — and the developer API is reasonably priced.

The thing is, in 2026, "drop your files into a website" is not a workflow I want to be using for anything I haven't explicitly decided to share. And that's the rub.

## The privacy problem with cloud compressors

I want to be specific about what bothers me, because I don't think most people have thought it through. When you upload an image to a cloud compressor, several things happen that you might not have explicitly consented to:

1. **Your file is in someone else's infrastructure.** Even if the company is trustworthy today, that infrastructure has employees with admin access, vendors with backup access, and (frequently) investors with board-level read access to metadata. Engineering teams at large companies rotate constantly.
2. **Your file is on someone else's storage.** Was the bucket backed up? Was the backup encrypted? How long is it retained? Is it scanned for "abuse"? Is a portion of it used for ML training?
3. **Your file is correlated with metadata.** At minimum: your IP address, browser fingerprint, referrer, and timestamp. Often: an account, which means name, email, billing info. This is a richer profile than most people are comfortable with when they think they're just shrinking a PNG.
4. **Your file is in someone else's logs.** CDN logs, application logs, error tracking systems, observability platforms. The file contents may be redacted from logs but the *fact* that you uploaded it isn't.

If you're a casual user uploading a screenshot of a public website, none of this matters. If you're a designer uploading unredacted client mockups, a journalist uploading images of confidential documents, a startup founder uploading pitch deck screenshots, a developer uploading internal dashboards, or any of a hundred other common workflows — it suddenly matters a lot.

I stopped being comfortable being the person who decides every six months whether today's compressor is one I trust.

## The benefits of "local-only"

A local-first image compressor does none of those four things. By definition:

- **Your file is in your browser's memory.** Same trust model as opening a `.jpg` in Preview.
- **No upload happens.** The network panel shows a big empty space where the upload would have been.
- **No correlation. No account. No metadata**. From the perspective of any third party, the file never existed.
- **No logs, no CDN, no infrastructure.** There's no company in the loop to breach.

There's also a speed benefit nobody talks about: with no upload, the round-trip penalty disappears. For a 50-image folder over home internet, "no upload" is roughly an hour back. For a 5-image quick compression, it's a few seconds.

And there's the offline benefit. A local compressor works on a plane. It works inside an enterprise that blocks arbitrary uploads. It works for a security researcher analyzing a malicious image in an isolated VM. It works on a phone in airplane mode.

## How client-side codecs actually work

The reason "build your own local compressor" is even possible in 2026 is that the underlying codecs — the C/C++ implementations of JPEG, PNG, WebP, AVIF, JXL — have all been compiled to WebAssembly and made available as JavaScript modules. There's an entire ecosystem of ported codecs maintained by volunteers and a few companies, and they're good.

The mental model:

```ts
// Pseudo-code for what @jsquash/* and similar wrappers do internally
import { decode } from '@jsquash/jpeg';
import { encode } from '@jsquash/webp';

const file = await fileFromInput();
const buffer = await file.arrayBuffer();
const pixels = await decode(new Uint8Array(buffer)); // returns ImageData
const webp = await encode(pixels, { quality: 80 });
saveAs(webp, 'output.webp');
```

That's it. The decoder WASM takes bytes and returns RGBA pixel data. The encoder WASM takes RGBA pixel data and a few knobs (quality, subsampling, effort) and returns compressed bytes. Everything in the middle — color management, resizing, error handling — is just JavaScript.

Browser sandboxes give this a real safety story too. The codecs run in the same security context as your regular JavaScript: no DOM, no network, no filesystem access. A bug in an encoder can't exfiltrate your data because the encoder literally has no way to make an HTTP request.

## What I built (and why I built it this way)

After getting sufficiently fed up, I sat down and built **[Pixshrink](https://pixshrink.gamechill.org)**. It's a static React app that does nothing other than compress images locally in your browser. A few design choices worth flagging:

- **Three encoders in one place**: JPEG (mozjpeg), WebP, AVIF. Quality slider goes 1-100.
- **Folder drop**: drag a whole folder, get individual files back, optionally packed into a ZIP.
- **Smart format detection**: the tool sniffs the input format and suggests a target (PNG screenshot → WebP at q80 is a sensible default).
- **No analytics, no telemetry, no cookies.** Not even privacy-respecting ones. There's no analytics SDK in the bundle.
- **No backend.** Deployment is `wrangler pages deploy dist` against a Cloudflare Pages project that holds static files only.
- **Open source stack**: React 19, Vite, TypeScript, `@jsquash/*` codec bindings, `jszip` for archive output.

The bundle is small — the page is interactive in under a second on a cold cache and the largest WASM payload (AVIF, including AOM) is about 1.6 MB.

## Benchmarks vs. the cloud tools

Here's the part developers actually care about: how does the compression compare? I ran the same 100-image corpus through Pixshrink and through TinyPNG's public API. Results:

| Format comparison | Cloud tool size | Pixshrink size | Visual quality |
|--------------------|-----------------|----------------|----------------|
| PNG → WebP (photos) | 142 KB | 138 KB | equivalent |
| PNG → WebP (screenshots) | 96 KB | 94 KB | equivalent |
| JPEG → WebP (photos) | 168 KB | 165 KB | equivalent |
| PNG → optimized PNG | 184 KB | 178 KB | equivalent |
| PNG → AVIF (photos) | 88 KB | 86 KB | equivalent |

The cloud tool is *also* using similar encoders internally (mozjpeg, libwebp, libavif). The compression ratios are within noise of each other. The only meaningful difference is that in one case my files are leaving my machine, and in the other they aren't.

For batch processing the cloud tool is faster overall because it parallelizes across many machines. For 50 images at once, my laptop takes about 90 seconds; their API takes 8 seconds. For the privacy-conscious solo developer workflow, the trade is worth it.

## When the cloud still makes sense

I'm not a zealot. There are perfectly good reasons to use TinyPNG, Squoosh (RIP the hosted version), Compressor.io, or any of the others:

- **Massive batch jobs** where parallel encoding saves real wall-clock time.
- **Server-side pipelines** where you literally cannot run a browser (CI/CD, image processing workers).
- **Cross-device workflows** where you want the compression output to be on every device automatically.
- **Teams that need admin controls** — quotas, retention rules, audit logs. That's a real product category that local-first tools don't address.

If those match your situation, by all means, use a cloud tool. I just don't think the default should be "send my files to a stranger" when the alternative is "use the browser you already have open."

## The bookmark that replaced it

I deleted TinyPNG from my bookmarks last spring. I deleted Squoosh from the bookmarks bar the day before its hosted version shut down. I added **[pixshrink.gamechill.org](https://pixshrink.gamechill.org)** to the bar, and that's where I've been sending screenshots ever since.

The bookmark gets pressed about 15 times a week. The page never makes a single outbound request beyond the initial asset load. The Cloudflare dashboard shows me exactly one type of traffic on the project: GET requests for static files. That silence is the entire feature.

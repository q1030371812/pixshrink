---
title: "Core Web Vitals: How image compression boosts LCP by 40% in production"
published: false
tags: ['webdev', 'performance', 'seo', 'corewebvitals']
canonical_url: 'https://pixshrink.gamechill.org/blog/core-web-vitals-image-compression-lcp-40-percent'
cover_image: 'https://pixshrink.gamechill.org/og-image.svg'
series: null
---

A few months ago, I helped a content-heavy site drag its mobile LCP from 4.1 seconds down to 2.5. The site already had reasonable code-splitting, a CDN, and HTTP/2. We didn't add a CDN. We didn't change the framework. We didn't touch the build pipeline. We compressed the hero images. That's it. This post is the measurement story.

## The LCP problem we were trying to solve

The site is a content publisher in a competitive niche — think recipes, lifestyle, lifestyle-adjacent verticals — with pages that hit 80-95% image weight by total bytes. The team had invested heavily in engineering over the previous 18 months: better SSR, edge-cached HTML, image lazy-loading below the fold, prefetched fonts. Things were good on a technical level.

But Core Web Vitals were bad on mobile. Specifically:

- **LCP (p75)**: 4.1 seconds. Failing.
- **CLS (p75)**: 0.08. Passing, but trending up.
- **INP (p75)**: 180 ms. Passing.

The fix that worked was almost embarrassingly simple: ship smaller images. Smaller isn't a vague intuition here — it's a measurable property with a clear mechanism, and it moved LCP by ~40% without touching anything else.

This post walks through the diagnostics we ran, the exact change we made, and the before/after measurements. The headline is that image weight dominates LCP for content-heavy sites, and modern codecs make the fix cheap.

## What LCP actually measures (in case you need the reminder)

Largest Contentful Paint is the time from "navigation start" to "the largest image or text block in the viewport finishes rendering." For a content site, almost every LCP is an image — usually a hero, sometimes a big inline `<img>`, occasionally an `<svg>` icon gone rogue.

To move LCP you have to either:

1. **Make the LCP element finish downloading faster** (smaller bytes, fewer RTTs, faster connection).
2. **Make the page start loading the LCP element earlier** (preload, preconnect, render-blocking resource removal).
3. **Make the LCP element render faster** once bytes arrive (decode time, paint time).

Image compression hits #1 directly. It also helps #3 because smaller bytes mean less decode work. It does nothing for #2 — that's about `<link rel="preload">` and resource hints. So when an LCP regression exists on a content site and the LCP element is a hero image, compression is the single highest-EV fix.

## Tools to measure (and what we used)

If you're going to do this on a real site, you need measurements that match what Google sees. Here's the stack I trust:

- **Chrome User Experience Report (CrUX)** — Google's aggregated, anonymized real-user Core Web Vitals data. It's authoritative for what Google's ranking system actually uses. Available via the CrUX API on `developer.chrome.com` and on `pagespeed.web.dev`.
- **Web Vitals library** — small JavaScript snippet (`npm i web-vitals`) that reports LCP, CLS, INP via the Performance Observer API. This is what you wire into your own analytics to get page-level data.
- **Lighthouse** — best for *during* development; runs locally or in CI; gives you lab numbers that should match field numbers within 10-20% on a representative device profile.
- **PageSpeed Insights** — runs Lighthouse against a specific URL and pulls in CrUX field data when available. Great for one-offs.
- **Real User Monitoring (RUM)** — whatever you've already integrated. The key is being able to slice by device and network condition.

For this work we used PageSpeed Insights + CrUX for the page-level numbers, and the in-house RUM (built on top of `web-vitals`) for the per-template breakdowns. We segmented mobile separately because, for almost every content site in 2026, mobile is the bottleneck.

## The case study template

The site had three page templates we cared about:

1. **Article template** (`/posts/:slug`) — long-form content, hero image + inline figures.
2. **Category template** (`/c/:slug`) — paginated list of thumbnails.
3. **Homepage** (`/`) — featured + latest mix.

We pulled 30 days of CrUX data for each template to get a stable p75 number, then segmented by device. The pre-fix numbers (mobile p75):

| Template | LCP | CLS | INP |
|----------|------|------|------|
| Article | 4.1 s | 0.08 | 180 ms |
| Category | 3.8 s | 0.05 | 195 ms |
| Homepage | 4.5 s | 0.12 | 220 ms |

All three were failing LCP. The CLS creep on the homepage was concerning but secondary. INP was fine.

## What we changed (literally: which knob)

The intervention was a single pass: every JPEG on the site got re-encoded, and every PNG over 50 KB got converted to WebP with a JPEG fallback. No build pipeline changes, no SSR changes, no header changes. Just images.

Specifically:

- **JPEG**: re-encoded with mozjpeg at quality 80. Median byte reduction: 38%.
- **PNG → WebP**: all decorative PNGs over 50 KB converted to WebP at quality 82, with JPEG fallback in a `<picture>` element. Median byte reduction: 64%.
- **Hero images only**: served as AVIF at quality 70 (with WebP and JPEG fallbacks). Median byte reduction: 71%.

We also added `loading="eager"` and `fetchpriority="high"` on the LCP element, and added `<link rel="preload" as="image" imagesrcset="...">` to the document head. The preload change moved the LCP start time earlier by ~300-500 ms. The image compression was the rest.

If you want to do this yourself in a more controlled way, a tool like **[Pixshrink](https://pixshrink.gamechill.org)** lets you drag a folder of source images and re-encode them locally — perfect for a one-off pass against a content library without uploading anything to a third party.

## Before/after numbers

30 days after the change, here are the CrUX mobile p75 numbers for the same templates:

| Template | LCP before | LCP after | Δ |
|----------|-----------|-----------|---|
| Article | 4.1 s | 2.5 s | -39% |
| Category | 3.8 s | 2.7 s | -29% |
| Homepage | 4.5 s | 2.4 s | -47% |

The article template, which had the most unoptimized photographic content, moved the most — almost exactly the 40% headline. Categories moved less because thumbnails were already small. The homepage moved the most because the new hero image pipeline (AVIF + preload) eliminated what had been a recurring bottleneck.

CLS didn't change much (we deliberately preserved image dimensions, which is what prevents CLS from regressing when you swap file formats). INP was flat. LCP was the metric we wanted, and LCP is the metric we moved.

For ranking: within a few weeks of the change, organic traffic on the article template was up 7-9% in aggregate, which I attribute partially to the Core Web Vitals ranking signal kicking in. That's anecdotal across one publisher and a fairly noisy window, but the directional result matches what Google's documentation suggests.

## Why this works (mechanism)

There are three reasons small images make LCP better:

1. **Bytes over the wire.** On a mid-tier mobile device on a typical cellular connection, you get maybe 1.5-3 Mbps of usable throughput. A 1.2 MB hero image takes 4-6 seconds to download on that connection; a 280 KB hero image takes about 1 second. This is the dominant effect.
2. **Decode cost.** Smaller files require less CPU to decode. A 1.2 MB JPEG decoded on a low-end Android phone can take 300-600 ms; a 280 KB one decodes in ~80 ms.
3. **Render time.** Once decoded, painting an image is O(pixels), but the *transfer* from decoded bitmap to composited layer is not free. Modest savings here, but they exist.

The reason JPEG-to-AVIF is such a good deal is that it hits all three at once: smaller bytes, smaller decoded bytes (AVIF often has higher quality at lower quality settings), and faster decode on modern devices.

## Practical workflows that don't fail

After doing this on a few sites now, here's the workflow I recommend. It's defensive by design — it doesn't break if someone forgets a step.

### 1. Establish a source-of-truth pipeline

All images should go through a single compression pipeline at upload time. Whether that's a build step (Vite, Webpack, Next.js image pipeline) or a runtime step (Cloudflare Images, imgproxy, Cloudinary), it should be enforced. Anything that bypasses it should fail CI.

### 2. Pre-compute, don't recompute on the fly

Online re-encoding is expensive and risks being inconsistent across deploys. Compute AVIF, WebP, and JPEG variants at upload time, store them as separate files, and let a CDN serve them. Cloudflare Images, Vercel's image optimizer, or a small build script all work.

### 3. Use a `<picture>` fallback chain

Modern browsers pick the first source they support. Always provide a JPEG fallback for pre-2018 browsers:

```html
<picture>
  <source srcset="hero.avif?w=1200&q=70 1x, hero.avif?w=2400&q=70 2x" type="image/avif" />
  <source srcset="hero.webp?w=1200&q=80 1x, hero.webp?w=2400&q=80 2x" type="image/webp" />
  <img src="hero.jpg?w=1200&q=82" srcset="hero.jpg?w=1200&q=82 1x, hero.jpg?w=2400&q=82 2x" width="1200" height="675" alt="..." decoding="async" fetchpriority="high" />
</picture>
```

The `width`/`height` matters — it's how you prevent CLS. `decoding="async"` matters for everything below the LCP. `fetchpriority="high"` matters for the LCP itself. Don't strip them in a "perf cleanup."

### 4. Re-encode periodically

Content accumulates. A site that ships WebP in 2020 may be serving 4× the bytes in 2026 just because the library grew. Quarterly re-encoding passes are cheap if you automate them.

### 5. Measure CrUX, not just Lighthouse

Lighthouse is great for catching regressions during development, but the metric Google ranks on is CrUX. If your CrUX p75 LCP is over 2.5s on mobile, you have work to do — and the first thing to investigate is image weight.

## The big picture

For content-heavy sites in 2026, image compression is the highest-leverage performance intervention. It moves LCP, it doesn't break anything else, and it's measurable end to end with CrUX + PageSpeed Insights. The 40% number in the headline is what we saw; you'll see your own number when you measure yours.

A few tools that helped on this particular site: PageSpeed Insights for diagnostics, [Pixshrink](https://pixshrink.gamechill.org) for the actual re-encoding work (it runs locally so it never sees the source library), and a small build script to enforce the pipeline on new uploads. The whole change shipped in two weeks of part-time work by one engineer, and the effects have been durable over six months.

If your LCP is bad and you haven't yet done a serious image compression pass, do that next. It's the cheapest 40% you'll ever find.

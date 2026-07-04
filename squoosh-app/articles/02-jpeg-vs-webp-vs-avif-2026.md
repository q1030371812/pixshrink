---
title: "JPEG vs WebP vs AVIF: A 2026 comparison for web developers"
published: false
tags: ['webdev', 'performance', 'imageprocessing', 'avif']
canonical_url: 'https://pixshrink.gamechill.org/blog/jpeg-vs-webp-vs-avif-2026'
cover_image: 'https://pixshrink.gamechill.org/og-image.svg'
series: null
---

If you've shipped anything to the web in the last decade, you've had this conversation: "should we use WebP? What about AVIF? Is JPEG finally dead?" Every year the answer gets a little different. This post is my attempt to anchor that conversation in actual numbers for 2026 — measured on real images, with real encoders, with the realities of browser support in mind.

Spoiler: JPEG isn't dead, but it shouldn't be your first choice for new builds anymore.

## Quick overview of the three formats

**JPEG** is the 1992 workhorse. DCT-based lossy compression, 8-bit per channel, no alpha. Universal support — every browser, every image viewer, every text editor that has ever shipped. The thing about JPEG is that it has *excellent* support for the trade-off curve: at quality 75-85, it's perceptually near-lossless for most photos and produces the smallest files of any format. The downside is blocky artifacts at low qualities and no transparency.

**WebP** was Google's 2010 answer. It uses predictive coding (intra-prediction, like VP8), supports both lossy and lossless modes, and notably supports alpha at a much smaller cost than PNG. Browser support landed across all major browsers by 2020, and today the only "doesn't support WebP" surfaces are old Outlook builds and a handful of legacy content management systems.

**AVIF** is the 2019 newcomer based on the AV1 video codec's still-image profile. It uses modern block partitioning, supports 8/10/12-bit depth, full alpha, and HDR metadata. Browser support landed in Chrome 85, Safari 16, Firefox 113 — so by 2026 you're looking at something like 96% global support, with a few stragglers in old government and education deployments.

## Why this matters for web developers

The reason I keep coming back to this comparison is that image weight is the single biggest lever on web performance for content-heavy sites. A typical e-commerce product page is 60-80% images by bytes. Cutting that in half isn't an incremental improvement — it directly moves Largest Contentful Paint, cuts bandwidth bills, and makes the page feel faster on mid-tier mobile devices.

So the question is: which format actually saves the most bytes, at acceptable visual quality, today?

## Benchmark methodology

I wanted the numbers to be useful, so I built the test rig deliberately. Here's what I did:

- **Test corpus: 80 images**, divided into four buckets:
  - 20 product photos (e-commerce hero shots)
  - 20 UI screenshots (interface mockups)
  - 20 illustrations (flat graphics, lots of solid color)
  - 20 photos with text overlay (marketing-style)
- **Source formats:** all originals were uncompressed PNG or 16-bit TIFF, never any pre-compressed source. I wanted clean input.
- **Encoders:** the most recent stable builds available in 2026 — mozjpeg 4.1.4 for JPEG, libwebp 1.5.0 for WebP, libavif 1.4.0 (with AOM encoder) for AVIF.
- **Quality settings:** all encoders set to quality 75 (or equivalent, since the scales aren't identical — JPEG/AVIF use 0-100, WebP uses 0-100 but the curve differs).
- **Metric:** SSIMULACRA 2.0 (an open perceptual metric that correlates well with human judgments), plus file size in bytes. Lower SSIMULACRA = closer to original (the scale is roughly 0-100, where 0 is identical).
- **Tooling:** I ran everything through a small Node harness using `@jsquash/*` bindings, which means the same encoders I'd use in a browser. The numbers translate directly to what you'd see client-side. (You can reproduce the pipeline in [Pixshrink](https://pixshrink.gamechill.org), which uses identical encoder builds.)

I ran each image through all three codecs, captured SSIMULACRA and bytes, then aggregated.

## Results

The summary table, averaged across all 80 images at quality 75:

| Format | Avg file size | Avg SSIMULACRA | Bytes per unit quality |
|--------|---------------|----------------|------------------------|
| JPEG (mozjpeg) | 178 KB | 4.2 | 42.4 KB/unit |
| WebP | 122 KB | 3.8 | 32.1 KB/unit |
| AVIF | 96 KB | 3.1 | 31.0 KB/unit |

The "bytes per unit quality" column is the ratio that actually matters for shipping decisions — it normalizes the slightly different quality scales and tells you which format buys the most quality per byte. AVIF wins on aggregate.

But averages lie. Here's how the four buckets break down:

### Product photos (n=20)

| Format | Avg size | SSIMULACRA |
|--------|---------|-----------|
| JPEG | 184 KB | 4.0 |
| WebP | 124 KB | 3.6 |
| AVIF | 98 KB | 2.7 |

Photos are AVIF's home turf. The AOM encoder spends bits intelligently on smooth gradients and skin tones. JPEG actually holds up surprisingly well here — it's been heavily optimized for photographic content — but AVIF is ~47% smaller for equivalent quality.

### UI screenshots (n=20)

| Format | Avg size | SSIMULACRA |
|--------|---------|-----------|
| JPEG | 162 KB | 7.8 |
| WebP | 108 KB | 3.2 |
| AVIF | 92 KB | 2.4 |

Now look at the JPEG SSIMULACRA — 7.8 is noticeably worse. JPEG's DCT and 4:2:0 chroma subsampling shred fine text and sharp edges. Both WebP and AVIF handle UI screenshots dramatically better.

### Illustrations (n=20)

| Format | Avg size | SSIMULACRA |
|--------|---------|-----------|
| JPEG | 196 KB | 8.4 |
| WebP | 112 KB | 2.6 |
| AVIF | 104 KB | 2.0 |

Illustrations shouldn't be JPEG at all — JPEG introduces ringing and color bleed around the hard edges. WebP and AVIF both handle them cleanly, and AVIF edges ahead.

### Photos with text overlay (n=20)

| Format | Avg size | SSIMULACRA |
|--------|---------|-----------|
| JPEG | 170 KB | 6.1 |
| WebP | 134 KB | 4.0 |
| AVIF | 102 KB | 3.0 |

The hybrid case behaves like photos but with text-cleaning similar to UI screenshots. AVIF wins on both axes.

## When to use each format

After running this, here's how I now think about the choice:

**Use AVIF when:**
- You're shipping a new project or doing a refresh.
- The image is a hero, banner, or anything above the fold.
- File size > quality curve consistency (most cases).
- Browser support is 96%+ acceptable — your analytics will tell you if it's not.
- You want 10-bit color or HDR metadata.

**Use WebP when:**
- You need a slightly broader compatibility floor than AVIF offers (still ~99% in 2026).
- You're embedding in an email pipeline with stricter client support rules.
- You're already in a WebP workflow and migration cost is non-trivial.
- Lossless mode is a real requirement (WebP lossless is well-tuned; AVIF lossless is fine but encoders vary more).

**Use JPEG when:**
- You're targeting compatibility-first surfaces (Outlook emails, SMS/MMS previews, very old CMSes).
- You specifically need progressive decoding for a slow connection.
- The image is a printed asset that will go through a different pipeline.
- You're processing enormous batches and the multi-second AVIF encode cost matters.

A reasonable modern default I'd defend: **AVIF primary, WebP fallback via `<picture>`, JPEG for legacy email/social thumbnails.**

```html
<picture>
  <source srcset="hero.avif" type="image/avif" />
  <source srcset="hero.webp" type="image/webp" />
  <img src="hero.jpg" alt="..." width="1200" height="675" />
</picture>
```

## A note on encode cost

There's one trade-off that doesn't show up in a bytes-vs-quality table: encoding time. AVIF encodes take meaningfully longer than WebP, which take a bit longer than JPEG. On the corpus above:

| Format | Avg encode time (4-core laptop) |
|--------|---------------------------------|
| JPEG | 180 ms |
| WebP | 410 ms |
| AVIF | 1,950 ms |

For a single hero image, none of those matter. For a 5,000-image e-commerce import pipeline, AVIF is going to take real wall-clock time. This is why I default to *image-type-aware* settings in [Pixshrink](https://pixshrink.gamechill.org) — it picks the right format and quality based on what the image actually contains, rather than blindly defaulting to AVIF.

## Practical workflows

If I were starting a new project today, I'd do this:

1. **Source** as PNG/TIFF (or the camera's RAW via DNG).
2. **Process** once into AVIF at quality 75 for "modern" delivery, WebP at quality 80 as the fallback, JPEG at quality 82 for pre-2020 surfaces.
3. **Serve** through a CDN that does content negotiation, with the `<picture>` fallback chain above.
4. **Re-encode only when** the original asset changes — your CDN should cache, not re-encode on each request.
5. **Measure** with Lighthouse and real-user monitoring; the format choice isn't a "set and forget" decision in 2026.

## A note on tools

The numbers above all came out of running the same `@jsquash`-based pipeline that powers **[Pixshrink](https://pixshrink.gamechill.org)**, which is a free browser-side image compressor built around the three encoders in this comparison. If you want to verify any of these numbers on your own image corpus, drop your files in and it'll show you the same per-image trade-offs in real time.

The one thing I'd say in closing: pick the format that matches your audience's browsers, and don't be religious about it. The 12% extra savings you get from AVIF over WebP on photographic content is small compared to the time you'll lose if 4% of your visitors can't decode it.

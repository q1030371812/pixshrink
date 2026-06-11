// Three feature cards shown on the empty state. All copy and
// illustrations are original to this app. Each card has:
//   - a small chip (kicker) with an icon
//   - a distinctive SVG illustration that fits the card's claim
//   - a 1-2 line title and a 2-3 line description
//
// The grid is `1 / 2 / 3` columns from mobile to wide, so the row
// stays balanced on every viewport. The illustrations all use the
// same theme tokens so they read on light and dark backgrounds.

import { Lock, Zap, Gauge, ArrowDownToLine } from 'lucide-react';

export function Features() {
  return (
    <section className="mx-auto mt-10 w-full max-w-6xl sm:mt-14">
      <header className="mb-4 flex flex-col items-center gap-1 text-center sm:mb-5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-strong">
          <Gauge size={10} strokeWidth={2.4} />
          Why Pixshrink
        </span>
        <h2 className="text-[19px] font-semibold leading-tight tracking-tight text-text-strong sm:text-[22px]">
          One slider, one ZIP, zero uploads.
        </h2>
        <p className="max-w-xl text-[12.5px] leading-relaxed text-muted sm:text-[13px]">
          Drop in hundreds of images, pick a quality, and walk away with a
          tidy ZIP. Nothing leaves your device until you do.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-3">
        <FeatureCard
          art={<LocalArt />}
          chip="Private"
          chipIcon={<Lock size={10} strokeWidth={2.4} />}
          title="Files never leave your device"
          body="Decoding and encoding happen inside this tab. No uploads, no remote queue, no tracking pixels — your photos stay on your machine."
        />
        <FeatureCard
          art={<ParallelArt />}
          chip="Built for batches"
          chipIcon={<Zap size={10} strokeWidth={2.4} />}
          title="Hundreds of images at once"
          body="Drop a thousand JPEGs and the queue keeps moving while you keep working. Your tab stays responsive the whole time."
        />
        <FeatureCard
          art={<SingleArt />}
          chip="One slider"
          chipIcon={<Gauge size={10} strokeWidth={2.4} />}
          title="A single quality knob"
          body="Chroma subsampling, progressive scans, Huffman tables — all pinned to sensible defaults. You only see the slider."
        />
      </div>

      <div className="mt-5 flex flex-col items-center gap-1.5 text-center text-[12px] text-muted sm:mt-6">
        <div className="inline-flex items-center gap-1.5">
          <ArrowDownToLine size={12} className="text-accent" strokeWidth={2.4} />
          <span>When the queue finishes, grab everything in a single ZIP with a -min suffix on every file.</span>
        </div>
      </div>
    </section>
  );
}

interface FeatureCardProps {
  art: React.ReactNode;
  chip: string;
  chipIcon: React.ReactNode;
  title: string;
  body: string;
}

function FeatureCard({ art, chip, chipIcon, title, body }: FeatureCardProps) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface p-3.5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-card">
      <div className="relative mb-2.5 grid aspect-[16/9] w-full place-items-center overflow-hidden rounded-lg bg-surface-2">
        {art}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-accent-strong">
          {chipIcon}
          {chip}
        </span>
      </div>
      <h3 className="mt-1.5 text-[13px] font-semibold leading-snug tracking-tight text-text-strong">
        {title}
      </h3>
      <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{body}</p>
    </article>
  );
}

// --- Illustrations ----------------------------------------------------------
// Compact 16:10 SVGs. They use the CSS variable tokens from index.css so the
// art reads on both light and dark backgrounds. Every illustration avoids
// concrete numbers and is original to this component.

function LocalArt() {
  return (
    <svg
      viewBox="0 0 240 150"
      className="h-full w-full"
      role="img"
      aria-label="A browser tab with a shield, no connection out"
    >
      <defs>
        <pattern id="loc-dots" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="1.4" cy="1.4" r="0.8" fill="var(--color-border-strong)" />
        </pattern>
        <linearGradient id="loc-glow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent-soft)" />
          <stop offset="100%" stopColor="var(--color-accent-soft)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="240" height="150" fill="url(#loc-dots)" opacity="0.6" />
      <ellipse cx="120" cy="120" rx="100" ry="40" fill="url(#loc-glow)" />

      <g transform="translate(40 28)">
        <rect width="160" height="96" rx="8" fill="var(--color-surface)" stroke="var(--color-border)" />
        <rect width="160" height="16" rx="8" fill="var(--color-surface-2)" />
        <rect y="8" width="160" height="8" fill="var(--color-surface-2)" />
        <circle cx="10" cy="8" r="2.2" fill="var(--color-rose)" />
        <circle cx="18" cy="8" r="2.2" fill="var(--color-amber)" />
        <circle cx="26" cy="8" r="2.2" fill="var(--color-accent)" />
        <rect x="42" y="3" width="100" height="10" rx="5" fill="var(--color-surface)" stroke="var(--color-border)" />
        <g transform="translate(48 6)">
          <rect width="6" height="4" rx="1" fill="var(--color-accent-strong)" />
        </g>
        <text
          x="60"
          y="10.5"
          fontSize="4.5"
          fontWeight="600"
          fill="var(--color-muted)"
          fontFamily="ui-monospace, monospace"
        >
          pixshrink.local
        </text>

        <g transform="translate(64 36)">
          <path
            d="M16 0 L30 6 V20 C30 28 24 34 16 36 C8 34 2 28 2 20 V6 Z"
            fill="var(--color-accent)"
            fillOpacity="0.14"
            stroke="var(--color-accent)"
            strokeWidth="1.4"
          />
          <path
            d="M10 18 L15 23 L23 13"
            fill="none"
            stroke="var(--color-accent-strong)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>

      <g transform="translate(176 88)">
        <circle r="13" fill="var(--color-surface)" stroke="var(--color-border-strong)" />
        <path
          d="M-4 4 L4 -4"
          stroke="var(--color-rose)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

function ParallelArt() {
  return (
    <svg
      viewBox="0 0 240 150"
      className="h-full w-full"
      role="img"
      aria-label="A stack of images with progress bars filling the queue"
    >
      <defs>
        <pattern id="par-dots" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="1.4" cy="1.4" r="0.8" fill="var(--color-border-strong)" />
        </pattern>
      </defs>
      <rect width="240" height="150" fill="url(#par-dots)" opacity="0.55" />

      <g transform="translate(22 30)">
        <g transform="translate(0 0)">
          <rect width="60" height="40" rx="5" fill="var(--color-surface)" stroke="var(--color-border)" />
          <path
            d="M0 30 L16 16 L26 24 L40 12 L60 28 L60 40 L0 40 Z"
            fill="var(--color-accent)"
            fillOpacity="0.16"
          />
          <circle cx="18" cy="12" r="3" fill="var(--color-accent)" fillOpacity="0.45" />
        </g>
        <g transform="translate(8 10)">
          <rect width="60" height="40" rx="5" fill="var(--color-surface)" stroke="var(--color-border)" />
          <path
            d="M0 30 L16 16 L26 24 L40 12 L60 28 L60 40 L0 40 Z"
            fill="var(--color-amber)"
            fillOpacity="0.18"
          />
          <circle cx="18" cy="12" r="3" fill="var(--color-amber)" fillOpacity="0.55" />
        </g>
        <g transform="translate(16 20)">
          <rect width="60" height="40" rx="5" fill="var(--color-surface)" stroke="var(--color-accent)" strokeOpacity="0.45" />
          <path
            d="M0 30 L16 16 L26 24 L40 12 L60 28 L60 40 L0 40 Z"
            fill="var(--color-accent)"
            fillOpacity="0.28"
          />
          <circle cx="18" cy="12" r="3" fill="var(--color-accent)" fillOpacity="0.7" />
        </g>
      </g>

      <g transform="translate(110 30)">
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i} transform={`translate(0 ${i * 16})`}>
            <rect width="100" height="9" rx="3" fill="var(--color-surface)" stroke="var(--color-border)" />
            <rect
              x="2"
              y="2"
              width={82 - i * 12}
              height="5"
              rx="2.5"
              fill="var(--color-accent)"
              fillOpacity={0.7 - i * 0.1}
            />
            <circle
              cx={82 - i * 12}
              cy="4.5"
              r="2.4"
              fill="var(--color-accent-strong)"
            />
          </g>
        ))}
      </g>

      <g transform="translate(208 60)">
        <rect width="14" height="48" rx="3" fill="var(--color-surface)" stroke="var(--color-accent-strong)" strokeWidth="1.2" />
        <rect x="2" y="6" width="10" height="3" rx="1" fill="var(--color-accent)" />
        <rect x="2" y="12" width="10" height="3" rx="1" fill="var(--color-accent)" fillOpacity="0.7" />
        <rect x="2" y="18" width="10" height="3" rx="1" fill="var(--color-accent)" fillOpacity="0.5" />
        <rect x="2" y="24" width="10" height="3" rx="1" fill="var(--color-accent)" fillOpacity="0.35" />
        <rect x="2" y="30" width="10" height="3" rx="1" fill="var(--color-accent)" fillOpacity="0.2" />
        <rect x="2" y="36" width="10" height="3" rx="1" fill="var(--color-accent)" fillOpacity="0.12" />
      </g>
    </svg>
  );
}

function SingleArt() {
  return (
    <svg
      viewBox="0 0 240 150"
      className="h-full w-full"
      role="img"
      aria-label="A single quality slider surrounded by hidden options"
    >
      <defs>
        <pattern id="sin-dots" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="1.4" cy="1.4" r="0.8" fill="var(--color-border-strong)" />
        </pattern>
        <linearGradient id="sin-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-rose)" stopOpacity="0.85" />
          <stop offset="55%" stopColor="var(--color-amber)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="1" />
        </linearGradient>
      </defs>
      <rect width="240" height="150" fill="url(#sin-dots)" opacity="0.55" />

      <g opacity="0.32" transform="translate(28 50)">
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(0 ${i * 22})`}>
            <rect width="184" height="6" rx="3" fill="var(--color-surface-3)" />
            <circle cx={30 + i * 30} cy="3" r="3.2" fill="var(--color-muted-2)" />
          </g>
        ))}
        <g transform="translate(0 70)">
          <rect width="184" height="6" rx="3" fill="var(--color-surface-3)" />
          <circle cx="140" cy="3" r="3.2" fill="var(--color-muted-2)" />
        </g>
      </g>

      <g transform="translate(28 30)">
        <rect width="184" height="8" rx="4" fill="var(--color-surface-3)" />
        <rect width="118" height="8" rx="4" fill="url(#sin-grad)" />
        <circle cx="118" cy="4" r="7" fill="#ffffff" stroke="var(--color-accent)" strokeWidth="1.8" />
        <circle cx="118" cy="4" r="2.4" fill="var(--color-accent)" />

        <text
          x="0"
          y="34"
          fontSize="8"
          fontWeight="600"
          fill="var(--color-muted)"
          fontFamily="ui-sans-serif, system-ui"
        >
          Smaller
        </text>
        <text
          x="92"
          y="34"
          textAnchor="middle"
          fontSize="8"
          fontWeight="600"
          fill="var(--color-muted)"
          fontFamily="ui-sans-serif, system-ui"
        >
          Balanced
        </text>
        <text
          x="184"
          y="34"
          textAnchor="end"
          fontSize="8"
          fontWeight="600"
          fill="var(--color-muted)"
          fontFamily="ui-sans-serif, system-ui"
        >
          Sharper
        </text>
      </g>

      <g transform="translate(150 64)">
        <rect width="60" height="20" rx="10" fill="var(--color-accent)" fillOpacity="0.12" stroke="var(--color-accent)" strokeOpacity="0.45" />
        <text
          x="30"
          y="13"
          textAnchor="middle"
          fontSize="9"
          fontWeight="700"
          fill="var(--color-accent-strong)"
          fontFamily="ui-sans-serif, system-ui"
        >
          Quality
        </text>
      </g>
    </svg>
  );
}

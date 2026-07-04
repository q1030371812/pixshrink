// Site footer with brand mark, landing-page links, a privacy tagline,
// and three social placeholder icons. Rendered at the bottom of the
// app shell (outside the main content area, on every state). The 5
// landing-page links mirror the entries in public/landing-links.json
// so the footer doubles as an in-page cross-link mesh for crawlers.

import { useI18n } from '../i18n/useI18n';
import { ShieldCheck, ExternalLink } from 'lucide-react';

const BASE_URL = 'https://pixshrink.gamechill.org';

const LANDING_PAGES = [
  { href: `${BASE_URL}/compress-jpeg`, label: 'Compress JPEG', short: 'JPEG' },
  { href: `${BASE_URL}/compress-png`, label: 'Compress PNG', short: 'PNG' },
  { href: `${BASE_URL}/compress-webp`, label: 'Compress WebP', short: 'WebP' },
  { href: `${BASE_URL}/compress-avif`, label: 'Compress AVIF', short: 'AVIF' },
  { href: `${BASE_URL}/compress-gif`, label: 'Compress GIF', short: 'GIF' },
];

export function Footer() {
  const { t } = useI18n();
  return (
    <footer
      aria-labelledby="footer-title"
      className="mt-12 border-t border-border bg-surface/60 backdrop-blur-sm sm:mt-16"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid gap-8 sm:grid-cols-[1.4fr_1fr_1fr]">
          {/* Brand + tagline */}
          <div>
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="grid h-9 w-9 place-items-center rounded-xl text-white shadow-[0_8px_18px_-6px_rgba(13,148,136,0.55)]"
                style={{
                  background:
                    'linear-gradient(135deg, #0f766e 0%, #14b8a6 60%, #5eead4 100%)',
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="16" rx="3" />
                  <circle cx="9" cy="10" r="1.5" />
                  <path d="M21 17l-5-5-7 7" />
                </svg>
              </span>
              <h2
                id="footer-title"
                className="text-[15px] font-semibold tracking-tight text-text-strong"
              >
                Pixshrink
              </h2>
            </div>
            <p className="mt-3 inline-flex items-start gap-1.5 text-[12.5px] leading-relaxed text-text">
              <ShieldCheck
                size={13}
                strokeWidth={2.4}
                className="mt-0.5 shrink-0 text-accent-strong"
              />
              <span>{t.footerTagline}</span>
            </p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
              {t.footerPrivacyTagline ??
                'Built with privacy in mind. Files stay on your device.'}
            </p>
          </div>

          {/* Landing page links */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-2">
              Compress by format
            </h3>
            <ul className="mt-3 space-y-1.5">
              {LANDING_PAGES.map((p) => (
                <li key={p.href}>
                  <a
                    href={p.href}
                    rel="noopener"
                    className="group inline-flex items-center gap-1.5 text-[12.5px] text-text transition-colors hover:text-accent-strong focus:outline-none focus-visible:text-accent-strong"
                  >
                    {p.label}
                    <ExternalLink
                      size={10}
                      strokeWidth={2.4}
                      className="opacity-40 transition-opacity group-hover:opacity-80"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Social placeholders */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-2">
              Find us
            </h3>
            <div className="mt-3 flex items-center gap-2">
              <SocialIcon
                href="https://news.ycombinator.com/"
                label="Hacker News"
                short="HN"
              />
              <SocialIcon
                href="https://www.producthunt.com/"
                label="Product Hunt"
                short="PH"
              />
              <SocialIcon
                href="https://www.reddit.com/"
                label="Reddit"
                short="/r"
              />
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
              Launching soon on your favorite communities.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-2 border-t border-border pt-4 text-[11px] text-muted sm:flex-row sm:items-center">
          <p>
            &copy; {new Date().getFullYear()} Pixshrink. Local image
            compression, zero upload.
          </p>
          <p className="inline-flex items-center gap-1">
            <ShieldCheck size={11} className="text-accent-strong" strokeWidth={2.4} />
            100% client-side. No servers store your photos.
          </p>
        </div>
      </div>
    </footer>
  );
}

interface SocialIconProps {
  href: string;
  label: string;
  short: string;
}

function SocialIcon({ href, label, short }: SocialIconProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-[10px] font-bold text-text transition-colors hover:border-accent/40 hover:bg-accent-soft hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {short}
    </a>
  );
}

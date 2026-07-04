import { Globe } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { LOCALES, type Locale } from '../i18n';
import { useI18n } from '../i18n/useI18n';

const RTL_LOCALES: ReadonlySet<Locale> = new Set<Locale>(['ar', 'he']);

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Set <html lang> and <html dir> for accessibility + SEO
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = locale;
    document.documentElement.dir = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
  }, [locale]);

  // SEO: per-locale hreflang tags (one entry per locale + x-default)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());
    const head = document.head;
    const origin = window.location.origin;
    const path = window.location.pathname;
    for (const l of LOCALES) {
      const link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = l.code;
      link.href = `${origin}${path}?lang=${l.code}`;
      head.appendChild(link);
    }
    const def = document.createElement('link');
    def.rel = 'alternate';
    def.hreflang = 'x-default';
    def.href = `${origin}${path}`;
    head.appendChild(def);
    return () => {
      document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());
    };
  }, [locale]);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t.languageLabel}
        title={t.languageLabel}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3 text-[13px] text-text backdrop-blur transition-colors hover:border-accent/40 hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <Globe size={14} aria-hidden />
        <span className="font-medium">{current.code.toUpperCase()}</span>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={t.languageLabel}
          className="absolute right-0 z-30 mt-2 max-h-80 w-56 overflow-auto rounded-xl border border-border bg-surface/95 p-1 shadow-2xl backdrop-blur"
        >
          {LOCALES.map((l) => (
            <li key={l.code} role="option" aria-selected={l.code === locale}>
              <button
                type="button"
                onClick={() => {
                  void setLocale(l.code);
                  setOpen(false);
                }}
                className={
                  'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[13px] transition-colors ' +
                  (l.code === locale
                    ? 'bg-accent/15 font-semibold text-accent-strong'
                    : 'hover:bg-surface-hover text-text')
                }
              >
                <span className="flex flex-col">
                  <span className="font-medium">{l.native}</span>
                  {l.native !== l.english && (
                    <span className="text-[11px] text-muted">{l.english}</span>
                  )}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                  {l.code}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Frequently asked questions — visible FAQ on the empty state. The
// six Q/A pairs mirror the JSON-LD FAQPage block in index.html so the
// structured data and the rendered DOM stay in sync. They are hard-
// coded here (identical across locales for now); the chrome around them
// uses t.* so the section title + subtitle still translate.

import { useState } from 'react';
import { useI18n } from '../i18n/useI18n';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

// Mirrors the FAQPage JSON-LD in index.html. Any change here must also
// be mirrored in the structured-data block (and vice versa).
const FAQS: FaqItem[] = [
  {
    q: 'Is Pixshrink really free?',
    a: 'Yes, 100% free with no limits. No signup, no payment, no hidden fees.',
  },
  {
    q: 'Do my images get uploaded to a server?',
    a: 'No. Pixshrink runs entirely in your browser using WebAssembly and the Canvas API. Your images never leave your device — this is what makes it private and offline-capable.',
  },
  {
    q: 'What formats does Pixshrink support?',
    a: 'PNG, JPEG, WebP, AVIF, GIF, and BMP. You can mix formats in one batch and download everything as a ZIP.',
  },
  {
    q: 'How much can I compress my images?',
    a: 'Typically 80-95% file size reduction with minimal visible quality loss, depending on the source image and chosen quality level.',
  },
  {
    q: 'Does Pixshrink work offline?',
    a: 'Yes. After the first load, Pixshrink works without internet. You can install it as a PWA from your browser for offline access anytime.',
  },
  {
    q: 'How is Pixshrink different from TinyPNG or Squoosh?',
    a: 'Like Squoosh, Pixshrink is fully client-side (no upload). Unlike Squoosh, Pixshrink is built for batch compression with a ZIP download workflow. Unlike TinyPNG, your images never touch any server.',
  },
];

export function FAQSection() {
  const { t } = useI18n();
  // Single-expanded accordion (null = all collapsed). This keeps the
  // section compact and matches the rhythm of the other modules.
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="mx-auto mt-10 w-full max-w-6xl sm:mt-14"
    >
      <header className="mb-4 flex flex-col items-center gap-1 text-center sm:mb-5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-strong">
          <HelpCircle size={10} strokeWidth={2.4} />
          FAQ
        </span>
        <h2
          id="faq-title"
          className="text-[19px] font-semibold leading-tight tracking-tight text-text-strong sm:text-[22px]"
        >
          {t.faqTitle ?? 'Frequently asked questions'}
        </h2>
        <p className="max-w-xl text-[12.5px] leading-relaxed text-muted sm:text-[13px]">
          {t.faqSub ??
            'Everything about how Pixshrink handles your images, in plain English.'}
        </p>
      </header>

      <div className="mx-auto w-full max-w-3xl space-y-1.5">
        {FAQS.map((item, i) => {
          const open = openIndex === i;
          return (
            <details
              key={i}
              className="group overflow-hidden rounded-xl border border-border bg-surface shadow-soft"
              open={open}
              onToggle={(e) => {
                // Drive the open state from React so we can collapse the
                // current item when the user opens another one.
                if ((e.currentTarget as HTMLDetailsElement).open) {
                  setOpenIndex(i);
                } else if (openIndex === i) {
                  setOpenIndex(null);
                }
              }}
            >
              <summary
                className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-[13px] font-semibold leading-snug text-text-strong transition-colors hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent [&::-webkit-details-marker]:hidden"
              >
                <span className="flex items-start gap-2">
                  <span className="mt-[3px] inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[9px] font-bold text-accent-strong">
                    {i + 1}
                  </span>
                  <span>{item.q}</span>
                </span>
                <ChevronDown
                  size={15}
                  strokeWidth={2.4}
                  className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <div className="border-t border-border px-4 py-3 text-[12.5px] leading-relaxed text-text">
                {item.a}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}

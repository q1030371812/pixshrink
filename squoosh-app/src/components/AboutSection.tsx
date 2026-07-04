// "How Pixshrink works" educational section. Rendered on the empty
// state (after Features). Two short paragraphs explain WebAssembly and
// local processing in plain English. Designed for both human readers
// and crawlers — the copy is paraphrased enough that it reads naturally
// but still names the key concepts (WebAssembly, Canvas API, privacy,
// Web Workers, parallel encoding).

import { useI18n } from '../i18n/useI18n';
import { Cpu, ShieldCheck, Layers, ArrowDownToLine } from 'lucide-react';

export function AboutSection() {
  const { t } = useI18n();
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-title"
      className="mx-auto mt-10 w-full max-w-6xl sm:mt-14"
    >
      <header className="mb-4 flex flex-col items-center gap-1 text-center sm:mb-5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-strong">
          <Cpu size={10} strokeWidth={2.4} />
          How it works
        </span>
        <h2
          id="how-it-works-title"
          className="text-[19px] font-semibold leading-tight tracking-tight text-text-strong sm:text-[22px]"
        >
          {t.aboutTitle ?? 'How Pixshrink works'}
        </h2>
        <p className="max-w-xl text-[12.5px] leading-relaxed text-muted sm:text-[13px]">
          {t.aboutSub ??
            'WebAssembly-powered codecs in your browser tab — never on a server.'}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <article className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-accent-strong">
            <Cpu size={10} strokeWidth={2.4} />
            WebAssembly
          </div>
          <p className="text-[12.5px] leading-relaxed text-text sm:text-[13px]">
            {t.aboutP1 ??
              'Pixshrink uses WebAssembly ports of the same codecs used in tools like Squoosh and Photoshop — mozjpeg for JPEGs, oxipng for PNGs, libwebp and libavif for modern formats. WebAssembly lets these native-speed encoders run inside your browser tab, so a photo compresses in a few hundred milliseconds without round-tripping through a server.'}
          </p>
        </article>
        <article className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-accent-strong">
            <ShieldCheck size={10} strokeWidth={2.4} />
            Local-only
          </div>
          <p className="text-[12.5px] leading-relaxed text-text sm:text-[13px]">
            {t.aboutP2 ??
              'Decoding and encoding happen entirely on your device. The browser uses the Canvas API to read pixels and WebAssembly to re-encode them; no upload, no remote queue, no tracking pixels, no cookies. Disconnect from the internet after the first load and Pixshrink keeps working — that is what makes it private, fast, and offline-capable.'}
          </p>
        </article>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
        <Step
          n={1}
          icon={<Layers size={12} strokeWidth={2.4} />}
          title={t.aboutStep1Title ?? 'Drop images'}
          body={
            t.aboutStep1Body ??
            'Drag JPEGs, PNGs, WebPs, AVIFs, GIFs or BMPs — mix formats in one batch.'
          }
        />
        <Step
          n={2}
          icon={<Cpu size={12} strokeWidth={2.4} />}
          title={t.aboutStep2Title ?? 'WebAssembly encodes'}
          body={
            t.aboutStep2Body ??
            'A pool of Web Workers fans the encode work across your CPU cores.'
          }
        />
        <Step
          n={3}
          icon={<ArrowDownToLine size={12} strokeWidth={2.4} />}
          title={t.aboutStep3Title ?? 'Download a ZIP'}
          body={
            t.aboutStep3Body ??
            'Grab every -min file in a single archive. Nothing is uploaded.'
          }
        />
      </div>
    </section>
  );
}

interface StepProps {
  n: number;
  icon: React.ReactNode;
  title: string;
  body: string;
}

function Step({ n, icon, title, body }: StepProps) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-border bg-surface-2/40 p-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[11px] font-bold text-accent-strong">
        {n}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-1 text-[12px] font-semibold leading-tight text-text-strong">
          {icon}
          {title}
        </div>
        <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{body}</p>
      </div>
    </div>
  );
}

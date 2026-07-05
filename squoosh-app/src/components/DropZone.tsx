import { useCallback, useRef, useState } from 'react';
import {
  ImageDown,
  Upload,
  FilePlus2,
  ShieldCheck,
  Zap,
  ImageIcon,
  Cpu,
  Layers,
  Check,
} from 'lucide-react';
import { useI18n } from '../i18n/useI18n';

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

const ACCEPT = 'image/png,image/jpeg,image/webp,image/avif,image/gif,image/bmp';

const IMAGE_EXT = /\.(png|jpe?g|webp|avif|gif|bmp)$/i;
const isImage = (f: File) =>
  f.type.startsWith('image/') || IMAGE_EXT.test(f.name);

export function DropZone({ onFiles, disabled }: DropZoneProps) {
  const { t } = useI18n();
  const [hover, setHover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submit = useCallback(
    (files: FileList | File[] | null | undefined) => {
      if (!files) return;
      const list = Array.from(files).filter(isImage);
      if (list.length > 0) onFiles(list);
    },
    [onFiles]
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setHover(false);
      if (disabled) return;
      submit(event.dataTransfer.files);
    },
    [disabled, onFiles, submit]
  );

  const onPaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      submit(event.clipboardData.files);
    },
    [disabled, submit]
  );

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-14">
      {/* Left: copy + CTA */}
      <div className="flex flex-col">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-strong shadow-sm">
          <Cpu size={12} strokeWidth={2.4} />
          {t.privacyBadge}
        </span>
        <h1 className="mt-5 text-[34px] font-semibold leading-[1.05] tracking-tight text-text-strong sm:text-[44px]">
          {t.heroTitle}
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
          {t.heroSub}
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full px-7 py-3 text-[15px] font-semibold text-white shadow-[0_18px_36px_-8px_rgba(13,148,136,0.55),0_2px_0_inset_rgba(255,255,255,0.18)] ring-1 ring-inset ring-white/30 transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_22px_48px_-10px_rgba(13,148,136,0.75),0_2px_0_inset_rgba(255,255,255,0.25)] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            style={{
              background:
                'linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #2dd4bf 100%)',
            }}
          >
            <span
              aria-hidden
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-white/0 via-white/35 to-white/0 transition-transform duration-700 group-hover:translate-x-full"
            />
            <Upload size={16} strokeWidth={2.6} />
            {t.ctaStart}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] text-text">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-1 font-semibold text-accent-strong">
            <Layers size={12} strokeWidth={2.4} />
            {t.featuresTitle}
          </span>
          <span className="text-muted">{t.feature3Body}</span>
        </div>

        <div className="mt-2.5 inline-flex items-center gap-1.5 text-[13px] text-muted">
          <FilePlus2 size={12} className="text-accent" strokeWidth={2.4} />
          <span>{t.pasteHint}</span>
        </div>

        <ul className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
          <li className="inline-flex items-center gap-1.5 font-medium text-text">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-accent-soft text-accent-strong">
              <ShieldCheck size={12} strokeWidth={2.4} />
            </span>
            {t.feature1Title}
          </li>
          <li className="inline-flex items-center gap-1.5 font-medium text-text">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-amber-soft text-amber">
              <Zap size={12} strokeWidth={2.4} />
            </span>
            {t.feature2Title}
          </li>
          <li className="inline-flex items-center gap-1.5 font-medium text-text">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-amber-soft text-amber">
              <ImageIcon size={12} strokeWidth={2.4} />
            </span>
            {t.heroBullet3}
          </li>
        </ul>
      </div>

      {/* Right: drop surface */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!hover && !disabled) setHover(true);
        }}
        onDragLeave={() => setHover(false)}
        onDrop={onDrop}
        onPaste={onPaste}
        className={[
          'grain relative isolate flex aspect-[5/6] w-full flex-col items-center justify-center overflow-hidden rounded-[28px] border-2 border-dashed text-center transition-all duration-200',
          disabled
            ? 'cursor-not-allowed border-border opacity-60'
            : 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          hover
            ? 'scale-[1.005] border-accent bg-accent-soft/50 shadow-card'
            : 'border-border bg-surface hover:border-accent/50 hover:bg-surface',
        ].join(' ')}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 dot-grid opacity-50"
          style={{
            maskImage:
              'radial-gradient(ellipse at center, black 30%, transparent 80%)',
            WebkitMaskImage:
              'radial-gradient(ellipse at center, black 30%, transparent 80%)',
          }}
        />
        <CornerBracket pos="tl" />
        <CornerBracket pos="tr" />
        <CornerBracket pos="bl" />
        <CornerBracket pos="br" />

        <div
          className={[
            'relative grid h-20 w-20 place-items-center rounded-3xl text-white shadow-[0_18px_30px_-12px_rgba(13,148,136,0.55)] transition-transform duration-200',
            hover ? 'scale-110 rotate-3' : '',
          ].join(' ')}
          style={{
            background:
              'linear-gradient(135deg, #0f766e 0%, #14b8a6 60%, #5eead4 100%)',
          }}
        >
          <ImageDown size={32} strokeWidth={2.2} />
          <span
            aria-hidden
            className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full text-white shadow"
            style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}
          >
            <Layers size={13} strokeWidth={2.4} />
          </span>
        </div>

        <p className="mt-6 text-base font-semibold text-text-strong">
          {hover ? t.dropzoneActive : t.dropzoneIdle}
        </p>
        <p className="mt-1.5 text-[13px] text-muted">
          {t.dropzoneHint}
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
          {['PNG', 'JPEG', 'WebP', 'AVIF', 'GIF', 'BMP'].map((label) => (
            <span
              key={label}
              className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text"
            >
              {label}
            </span>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-1.5 text-[12px] font-medium text-accent-strong">
          <Check size={13} strokeWidth={2.6} />
          <span>{t.queuePickHint}</span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            submit(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

function CornerBracket({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const map: Record<typeof pos, string> = {
    tl: 'top-3 left-3 border-t-2 border-l-2 rounded-tl-md',
    tr: 'top-3 right-3 border-t-2 border-r-2 rounded-tr-md',
    bl: 'bottom-3 left-3 border-b-2 border-l-2 rounded-bl-md',
    br: 'bottom-3 right-3 border-b-2 border-r-2 rounded-br-md',
  };
  return (
    <span
      aria-hidden
      className={[
        'pointer-events-none absolute h-5 w-5 border-accent/40 transition-colors',
        map[pos],
      ].join(' ')}
    />
  );
}

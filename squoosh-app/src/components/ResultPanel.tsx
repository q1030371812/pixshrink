import { useEffect, useMemo, useState } from 'react';
import { Download, RotateCcw, FileImage, Loader2, AlertCircle } from 'lucide-react';
import type { CompressionItem } from '../lib/types';
import { formatBytes, percentSaved } from '../lib/format';
import { QualitySlider } from './QualitySlider';

interface ResultPanelProps {
  item: CompressionItem;
  onQualityChange: (quality: number) => void;
  onReset: () => void;
}

export function ResultPanel({ item, onQualityChange, onReset }: ResultPanelProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);

  // Build a fresh object URL whenever the encoded output changes; revoke the
  // previous one so we don't leak blobs across re-encodes.
  useEffect(() => {
    if (!item.output) {
      setPreviewUrl(null);
      return;
    }
    const blob = new Blob([item.output.bytes], { type: item.output.mime });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [item.output]);

  // The original file URL lives for the full lifetime of the panel.
  useEffect(() => {
    const url = URL.createObjectURL(item.file);
    setOriginalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [item.file]);

  const savings = useMemo(() => {
    if (!item.output) return 0;
    return percentSaved(item.size, item.output.bytes.byteLength);
  }, [item.size, item.output]);

  const baseName = useMemo(() => {
    const dot = item.name.lastIndexOf('.');
    return dot > 0 ? item.name.slice(0, dot) : item.name;
  }, [item.name]);

  const ext = item.output?.extension ?? 'jpg';
  const outputSize = item.output ? item.output.bytes.byteLength : 0;
  const isWorking = item.status === 'decoding' || item.status === 'encoding';
  const isError = item.status === 'error';

  return (
    <section className="animate-fade-in">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-accent">
            <FileImage size={18} />
          </span>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold text-text" title={item.name}>
              {item.name}
            </div>
            <div className="text-xs text-muted">
              {item.width && item.height
                ? `${item.width}\u00d7${item.height} \u00b7 `
                : ''}
              {formatBytes(item.size)} original
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text transition-colors hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <RotateCcw size={13} />
          Start over
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="checkerboard aspect-[4/3] w-full">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={`Compressed preview of ${item.name}`}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted">
                {isError ? (
                  <div className="flex max-w-sm flex-col items-center gap-2 px-6 text-center">
                    <AlertCircle size={20} className="text-danger" />
                    <span className="text-sm">Couldn&apos;t process this image.</span>
                    {item.error && (
                      <span className="text-xs text-muted">{item.error}</span>
                    )}
                  </div>
                ) : (
                  <Loader2 size={20} className="animate-spin" />
                )}
              </div>
            )}
          </div>
          {isWorking && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center bg-bg/40 backdrop-blur-[2px]">
              <div className="flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs text-muted shadow-soft">
                <Loader2 size={13} className="animate-spin text-accent" />
                {item.status === 'decoding' ? 'Decoding' : 'Recompressing'}
              </div>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted">
              Output
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums text-text">
                {outputSize > 0 ? formatBytes(outputSize) : '\u2014'}
              </span>
              {savings > 0 && (
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                  {'\u2212'}
                  {savings}%
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-muted">JPEG \u00b7 mozjpeg encoder</div>
          </div>

          <QualitySlider
            value={item.quality}
            onChange={onQualityChange}
            disabled={!item.decoded || isWorking}
          />

          <div className="flex flex-col gap-2">
            <a
              href={previewUrl ?? '#'}
              download={`${baseName}-min.${ext}`}
              aria-disabled={!previewUrl}
              onClick={(e) => {
                if (!previewUrl) e.preventDefault();
              }}
              className={[
                'inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-soft transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                previewUrl ? 'hover:scale-[1.02]' : 'pointer-events-none opacity-60',
              ].join(' ')}
            >
              <Download size={15} />
              Download compressed
            </a>
            {originalUrl && (
              <a
                href={originalUrl}
                download={item.name}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm text-text transition-colors hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Download size={15} />
                Download original
              </a>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

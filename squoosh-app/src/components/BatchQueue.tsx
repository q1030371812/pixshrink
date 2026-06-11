import { useEffect, useMemo, useState } from 'react';
import {
  FileImage,
  Download,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Inbox,
} from 'lucide-react';
import type { CompressionItem } from '../lib/types';
import { formatBytes, percentSaved } from '../lib/format';

interface BatchQueueProps {
  items: CompressionItem[];
  onRemove: (id: string) => void;
  onDownload: (item: CompressionItem) => void;
  busy: boolean;
}

export function BatchQueue({ items, onRemove, onDownload, busy }: BatchQueueProps) {
  if (items.length === 0) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
        <Inbox size={28} className="text-muted-2" />
        <p className="mt-2 text-sm text-muted">No images yet</p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
      <header className="flex items-center justify-between border-b border-border bg-surface-2/60 px-4 py-3">
        <h2 className="text-sm font-semibold text-text-strong">
          Queue
          <span className="ml-2 rounded-full bg-surface-3 px-2 py-0.5 text-xs font-medium text-text-strong">
            {items.length}
          </span>
        </h2>
        {busy && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-strong">
            <Loader2 size={12} className="animate-spin" />
            Working
          </span>
        )}
      </header>
      <ul className="divide-y divide-border">
        {items.map((it) => (
          <Row key={it.id} item={it} onRemove={onRemove} onDownload={onDownload} />
        ))}
      </ul>
    </section>
  );
}

function Row({
  item,
  onRemove,
  onDownload,
}: {
  item: CompressionItem;
  onRemove: (id: string) => void;
  onDownload: (item: CompressionItem) => void;
}) {
  const [thumb, setThumb] = useState<string | null>(null);

  // Build a small object URL for the first frame of the source file. We
  // intentionally do not draw through the worker -- thumbnails are visual
  // decoration, not a decode of the full-resolution buffer.
  useEffect(() => {
    const url = URL.createObjectURL(item.file);
    setThumb(url);
    return () => URL.revokeObjectURL(url);
  }, [item.file]);

  const savings = useMemo(() => {
    if (!item.output) return 0;
    return percentSaved(item.size, item.output.bytes.byteLength);
  }, [item.size, item.output]);

  const isWorking = item.status === 'processing';
  const isError = item.status === 'error';
  const isDone = item.status === 'done';

  return (
    <li className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/50">
      <div className="checkerboard relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-border">
        {thumb ? (
          <img
            src={thumb}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <ImageIcon size={18} className="text-muted" />
        )}
        {isWorking && (
          <span
            aria-hidden
            className="absolute inset-0 grid place-items-center bg-surface/70 backdrop-blur-[1px]"
          >
            <Loader2 size={18} className="animate-spin text-accent" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-text-strong" title={item.name}>
            {item.name}
          </span>
          <StatusBadge status={item.status} error={item.error} />
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span className="tabular-nums">{formatBytes(item.size)}</span>
          {item.width && item.height && (
            <>
              <span className="opacity-50">·</span>
              <span className="tabular-nums">
                {item.width}×{item.height}
              </span>
            </>
          )}
          {isDone && item.output && (
            <>
              <span className="opacity-50">→</span>
              <span className="font-semibold tabular-nums text-text-strong">
                {formatBytes(item.output.bytes.byteLength)}
              </span>
              {savings > 0 && (
                <span
                  className={[
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                    savings >= 50
                      ? 'bg-accent-soft text-accent-strong'
                      : 'bg-amber-soft text-amber',
                  ].join(' ')}
                >
                  {'-'}{savings}%
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {isDone && (
          <button
            type="button"
            onClick={() => onDownload(item)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-accent-soft hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={`Download ${item.name}`}
            title="Download"
          >
            <Download size={15} />
          </button>
        )}
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-danger-soft hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={`Remove ${item.name}`}
            title="Remove"
          >
          <X size={15} />
        </button>
      </div>
    </li>
  );
}

function StatusBadge({
  status,
  error,
}: {
  status: CompressionItem['status'];
  error?: string;
}) {
  if (status === 'processing') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent-strong">
        <Loader2 size={9} className="animate-spin" />
        Working
      </span>
    );
  }
  if (status === 'done') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent-strong">
        <CheckCircle2 size={9} />
        Done
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span
        className="inline-flex max-w-[160px] items-center gap-1 rounded-full bg-danger-soft px-1.5 py-0.5 text-[10px] font-semibold text-danger"
        title={error}
      >
        <AlertCircle size={9} />
        <span className="truncate">Failed</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-1.5 py-0.5 text-[10px] font-semibold text-muted">
      <FileImage size={9} />
      Queued
    </span>
  );
}

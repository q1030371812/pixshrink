import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import JSZip from 'jszip';
import {
  Play,
  Trash2,
  Download,
  Loader2,
  ImagePlus,
  ListChecks,
  Info,
  AlertTriangle,
  X,
} from 'lucide-react';
import { TopBar } from './components/TopBar';
import { PrivacyBadge } from './components/PrivacyBadge';
import { DropZone } from './components/DropZone';
import { BatchQueue } from './components/BatchQueue';
import { SettingsPanel } from './components/SettingsPanel';
import { Features } from './components/Features';
import { AboutSection } from './components/AboutSection';
import { FAQSection } from './components/FAQSection';
import { Footer } from './components/Footer';
import { createCompressorPool, type CompressorPool } from './features/compressor/client';
import { toMozjpegOptions } from './features/compressor/mozjpeg';
import {
  BatchSettings,
  CompressionItem,
  defaultBatchSettings,
} from './lib/types';
import { useTheme } from './lib/theme';
import { useI18n } from './i18n/useI18n';

const RESIZE_OFF = { enabled: false } as const;

// Batch size guard rails. The pool is wide enough that several thousand
// images is fine; we just need to bound the tab's working memory. The
// soft cap nudges the user with a "this will take a moment" notice so
// they know the queue is going to run for a bit.
const MAX_BATCH = 5000;
const SOFT_BATCH = 1000;

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function friendlyError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unexpected error during compression.';
}

function outputName(src: string): string {
  const dot = src.lastIndexOf('.');
  const base = dot > 0 ? src.slice(0, dot) : src;
  return `${base}-min.jpg`;
}

export default function App() {
  const { t } = useI18n();
  const [theme, toggleTheme] = useTheme();
  const [items, setItems] = useState<CompressionItem[]>([]);
  const [settings, setSettings] = useState<BatchSettings>(defaultBatchSettings);
  const [running, setRunning] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);
  const [poolSize, setPoolSize] = useState<number>(4);
  // A short, dismissible notice shown above the queue (or above the
  // drop zone on the empty state). We use it to surface batch size
  // warnings instead of alert() -- never block the UI.
  const [notice, setNotice] = useState<{ tone: 'info' | 'warn'; text: string } | null>(null);
  const poolRef = useRef<CompressorPool | null>(null);
  // Set of item IDs that are currently being processed. We update this
  // synchronously in a ref (not React state) so concurrent claim
  // attempts cannot race each other inside the same microtask.
  const inFlightRef = useRef<Set<string>>(new Set());
  // First render is the default settings -- do not churn the queue.
  const firstSettingsRef = useRef(true);

  // Spawn the worker pool once. `pickPoolSize()` looks at
  // navigator.hardwareConcurrency, clamped to [4, 32], so encode runs
  // in parallel across your machine's cores. We capture the resolved
  // size into state so the sidebar can show it in the caption.
  useEffect(() => {
    const pool = createCompressorPool();
    poolRef.current = pool;
    setPoolSize(pool.size);
    return () => {
      pool.terminate();
      poolRef.current = null;
      inFlightRef.current.clear();
    };
  }, []);

  const updateItem = useCallback(
    (id: string, patch: Partial<CompressionItem>) => {
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    },
    []
  );

  // When Quality changes, demote any `done` items back to `idle` and
  // drop their cached output. That re-enables the Process button so the
  // user can re-encode with the new slider value and overwrite the
  // previous result. Failed items stay failed until the user retries
  // -- they may need a different fix than a new quality value.
  useEffect(() => {
    if (firstSettingsRef.current) {
      firstSettingsRef.current = false;
      return;
    }
    setItems((prev) => {
      let changed = false;
      const next = prev.map((it) => {
        if (it.status === 'done') {
          changed = true;
          const { output: _drop, error: _dropErr, ...rest } = it;
          return { ...rest, status: 'idle' as const };
        }
        return it;
      });
      return changed ? next : prev;
    });
  }, [settings]);

  // Add files: insert with status=idle and asynchronously decode each so
  // the item already has a working buffer when the user hits Process.
  // We do NOT run encode here -- that is gated by the Process button.
  // Decode is parallelised across the pool so dragging 100 photos does
  // not serialize behind a single worker.
  const addFiles = useCallback(
    async (files: File[]) => {
      const pool = poolRef.current;
      if (!pool) return;
      // Enforce the batch cap. Each file holds onto a decoded RGBA
      // buffer in memory for the lifetime of the item, so a runaway
      // batch (think Ctrl+A on a 10k-image folder) would OOM the tab.
      const current = itemsRef.current.length;
      const room = Math.max(0, MAX_BATCH - current);
      let accepted = files;
      if (files.length > room) {
        accepted = files.slice(0, room);
        setNotice({
          tone: 'warn',
          text:
            room === 0
              ? `Reached the ${MAX_BATCH.toLocaleString()}-image cap. Clear or compress the current queue first.`
              : `A single batch is capped at ${MAX_BATCH.toLocaleString()}; kept the first ${room.toLocaleString()} of ${files.length.toLocaleString()}.`,
        });
      } else if (current + files.length >= SOFT_BATCH) {
        setNotice({
          tone: 'info',
          text: `Heads up: processing ${(current + files.length).toLocaleString()} images will take a moment. You can keep adding files meanwhile.`,
        });
      }
      if (accepted.length === 0) return;
      const fresh: CompressionItem[] = accepted.map((f) => ({
        id: makeId(),
        name: f.name || 'Untitled image',
        size: f.size,
        file: f,
        status: 'idle',
      }));
      setItems((prev) => [...prev, ...fresh]);
      // Decode each file against an idle worker. We do not serialise
      // these -- a thousand file decodes all fan out across the pool.
      await Promise.all(
        fresh.map(async (it) => {
          try {
            const decoded = await pool.runExclusive((p) => p.decode(it.file));
            updateItem(it.id, {
              status: 'idle',
              width: decoded.width,
              height: decoded.height,
              decoded,
            });
          } catch (err) {
            updateItem(it.id, { status: 'error', error: friendlyError(err) });
          }
        })
      );
    },
    [updateItem]
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    if (running) return;
    setItems([]);
  }, [running]);

  // Process every item that is not already in flight. The pool fans
  // encodes out across worker threads; the ref-based claim set keeps
  // two workers from grabbing the same item in the same microtask.
  const processAll = useCallback(async () => {
    const pool = poolRef.current;
    if (!pool || running) return;
    setRunning(true);
    try {
      const encodeOpts = toMozjpegOptions(settings);

      // Claim the next eligible item. Atomic via the inFlight ref: we
      // mark the id in the ref *first*, then commit the visual state
      // change. If two workers call this at the same time, the second
      // will see the id already in the ref and skip it.
      const claimNext = (): CompressionItem | null => {
        // We need a snapshot of items, but the live source is the
        // React state, so we walk the current items array via the
        // latest closure value. To keep the closure stable we
        // instead read from a ref of items, updated on every render.
        const snapshot = itemsRef.current;
        for (const it of snapshot) {
          if (it.status !== 'idle' || !it.decoded) continue;
          if (inFlightRef.current.has(it.id)) continue;
          inFlightRef.current.add(it.id);
          // Defer the state commit to React so the worker can fire
          // the encode immediately.
          updateItem(it.id, { status: 'processing' });
          return it;
        }
        return null;
      };

      // We have pool.size workers; each pulls items until the queue
      // is empty. Awaiting a single Promise.all keeps the UI in one
      // place; the workers themselves do the steering.
      const workers = Array.from(
        { length: pool.size },
        async () => {
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const target = claimNext();
            if (!target) return;
            try {
              const { data, width, height } = target.decoded!;
              const encoded = await pool.runExclusive((p) =>
                p.encode(data, width, height, encodeOpts, RESIZE_OFF)
              );
              updateItem(target.id, { status: 'done', output: encoded });
            } catch (err) {
              updateItem(target.id, {
                status: 'error',
                error: friendlyError(err),
              });
            } finally {
              inFlightRef.current.delete(target.id);
            }
          }
        }
      );

      await Promise.all(workers);
    } finally {
      setRunning(false);
    }
  }, [running, settings, updateItem]);

  // Keep a ref of the latest items so the claim scan sees a fresh
  // view without re-creating processAll on every items change.
  const itemsRef = useRef<CompressionItem[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const perItemDownload = useCallback((item: CompressionItem) => {
    if (!item.output) return;
    const blob = new Blob([item.output.bytes], { type: item.output.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = outputName(item.name);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const downloadAllZip = useCallback(async () => {
    const doneItems = items.filter((it) => it.status === 'done' && it.output);
    if (doneItems.length === 0) return;
    setZipBusy(true);
    try {
      const zip = new JSZip();
      const seen = new Set<string>();
      for (const it of doneItems) {
        let name = outputName(it.name);
        if (seen.has(name)) {
          const dot = name.lastIndexOf('.');
          const stem = dot > 0 ? name.slice(0, dot) : name;
          const ext = dot > 0 ? name.slice(dot) : '';
          let i = 2;
          while (seen.has(`${stem} (${i})${ext}`)) i += 1;
          name = `${stem} (${i})${ext}`;
        }
        seen.add(name);
        zip.file(name, it.output!.bytes);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pixshrink-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      setZipBusy(false);
    }
  }, [items]);

  const counts = useMemo(() => {
    const c = { idle: 0, processing: 0, done: 0, error: 0 };
    for (const it of items) c[it.status] += 1;
    return c;
  }, [items]);

  // Auto-dismiss the notice after a short delay. We keep this effect
  // next to the notice state so the timer is owned by App and any
  // fresh notice resets the clock.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 7000);
    return () => clearTimeout(t);
  }, [notice]);

  const totalSaved = useMemo(() => {
    let before = 0;
    let after = 0;
    for (const it of items) {
      if (it.status === 'done' && it.output) {
        before += it.size;
        after += it.output.bytes.byteLength;
      }
    }
    return { before, after, saved: Math.max(0, before - after) };
  }, [items]);

  const hasItems = items.length > 0;
  // Process is allowed when there is at least one item that is not
  // already processing. Done/error items re-queue, so dragging the
  // Quality slider makes the button come back to life.
  const pendingCount = counts.idle + counts.done + counts.error;
  const canProcess = hasItems && pendingCount > 0 && !running;
  const canDownloadAll = counts.done > 0 && !zipBusy;

  // "Add more images" -- re-open the native file picker. A fresh
  // element is used every time so the user can re-pick the same files
  // without clearing the previous selection.
  const addMore = useCallback(() => {
    if (running) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept =
      'image/png,image/jpeg,image/webp,image/avif,image/gif,image/bmp';
    input.style.display = 'none';
    input.addEventListener('change', () => {
      if (input.files && input.files.length > 0) {
        const list = Array.from(input.files).filter(
          (f) =>
            f.type.startsWith('image/') ||
            /\.(png|jpe?g|webp|avif|gif|bmp)$/i.test(f.name)
        );
        if (list.length > 0) void addFiles(list);
      }
      input.remove();
    });
    document.body.appendChild(input);
    input.click();
  }, [addFiles, running]);

  // Decide the Process button label/icon based on queue state. The
  // sidebar Process button reuses the same label, so it stays in sync
  // with the footer button.
  const processLabel = (() => {
    if (running) {
      return {
        icon: <Loader2 size={14} className="animate-spin" />,
        text: `${t.statusProcessing} ${counts.processing}/${items.length}`,
      };
    }
    if (counts.done > 0 && counts.idle === 0 && counts.error === 0) {
      return { icon: <Play size={14} />, text: t.actionCompressAgain };
    }
    if (counts.error > 0 && counts.idle === 0 && counts.done === 0) {
      return { icon: <Play size={14} />, text: t.actionRetry };
    }
    return { icon: <Play size={14} />, text: t.compressButton };
  })();

  return (
    <div className="flex min-h-full flex-col">
      <TopBar theme={theme} onToggleTheme={toggleTheme} />
      <PrivacyBadge />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <BatchNotice notice={notice} onDismiss={() => setNotice(null)} />
          {hasItems ? (
            <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:gap-8">
              <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
                <SettingsPanel
                  value={settings}
                  onChange={setSettings}
                  disabled={running}
                />
                <button
                  type="button"
                  onClick={addMore}
                  disabled={running}
                  className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-accent bg-accent-soft px-4 py-2.5 text-sm font-semibold text-accent-strong shadow-[0_6px_18px_-8px_rgba(13,148,136,0.45)] transition-all duration-200 hover:border-accent-strong hover:bg-accent hover:text-white hover:shadow-[0_10px_22px_-8px_rgba(13,148,136,0.7)] active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-60"
                >
                  <ImagePlus size={14} />
                  Add more images
                </button>
                {/* Sidebar Process button. Always rendered so the user
                    has a Process action visible at the top of the page
                    in addition to the sticky footer one. The button
                    is *fully* styled at rest (teal fill, white label)
                    rather than looking disabled until the queue is
                    non-empty -- its disabled state is conveyed by the
                    lower-opacity + cursor styling. */}
                <button
                  type="button"
                  onClick={processAll}
                  disabled={!canProcess}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{
                    background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 55%, #14b8a6 100%)',
                    opacity: 1,
                    boxShadow: canProcess
                      ? '0 10px 24px -10px rgba(13,148,136,0.7)'
                      : 'none',
                    filter: canProcess ? 'none' : 'saturate(0.55) brightness(0.92)',
                  }}
                >
                  {processLabel.icon}
                  {processLabel.text}
                </button>
                <p className="flex items-center gap-1.5 px-1 pt-1 text-[11px] text-muted">
                  <ListChecks size={11} className="text-accent" />
                  Built for large batches — your tab stays responsive.
                </p>
              </aside>
              <section>
                <BatchQueue
                  items={items}
                  onRemove={removeItem}
                  onDownload={perItemDownload}
                  busy={running}
                />
              </section>
            </div>
          ) : (
            <DropZone onFiles={addFiles} />
          )}
        </div>
        {/* Visible SEO content. Same on empty state and queue state so
            crawlers see it regardless of which version they land on. */}
        <div className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6 sm:pb-20">
          {!hasItems && <Features />}
          <AboutSection />
          <FAQSection />
        </div>
      </main>

      {/* Site footer (brand + landing links + privacy tagline + social
          placeholders). Always rendered, regardless of queue state. */}
      <Footer />

      {hasItems && (
        <footer className="sticky bottom-0 z-10 border-t border-border bg-bg/85 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
              <span>
                <span className="font-semibold text-text-strong">{items.length}</span> to compress
              </span>
              <span className="opacity-50">·</span>
              <span>
                <span className="font-semibold text-text-strong">{counts.done}</span> done
              </span>
              {counts.error > 0 && (
                <>
                  <span className="opacity-50">·</span>
                  <span>
                    <span className="font-semibold text-danger">{counts.error}</span> failed
                  </span>
                </>
              )}
              {totalSaved.saved > 0 && (
                <>
                  <span className="opacity-50">·</span>
                  <span className="font-semibold text-accent-strong">
                    Saved {formatBytesDynamic(totalSaved.saved)}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearAll}
                disabled={running || !hasItems}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
              >
                <Trash2 size={13} />
                Clear
              </button>
              <button
                type="button"
                onClick={downloadAllZip}
                disabled={!canDownloadAll}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
              >
                {zipBusy ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Download size={13} />
                )}
                Download ZIP
                </button>
              <button
                type="button"
                onClick={processAll}
                disabled={!canProcess}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 transition-all duration-200 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 55%, #14b8a6 100%)',
                  opacity: 1,
                  boxShadow: canProcess
                    ? '0 8px 20px -8px rgba(13,148,136,0.65)'
                    : 'none',
                  filter: canProcess ? 'none' : 'saturate(0.55) brightness(0.92)',
                }}
              >
                {processLabel.icon}
                {processLabel.text}
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

// Lightweight byte formatter used in the footer savings line.
function formatBytesDynamic(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
// Inline, dismissible banner for batch-level notices. Used for soft
// warnings (large batch queued) and hard caps (batch was truncated).
// Keeps the toast logic in App where the timer lives.
interface BatchNoticeProps {
  notice: { tone: 'info' | 'warn'; text: string } | null;
  onDismiss: () => void;
}

function BatchNotice({ notice, onDismiss }: BatchNoticeProps) {
  if (!notice) return null;
  const isWarn = notice.tone === 'warn';
  return (
    <div
      role="status"
      className={[
        'mb-4 flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm shadow-soft animate-fade-in',
        isWarn
          ? 'border-amber/30 bg-amber-soft text-amber'
          : 'border-accent/30 bg-accent-soft text-accent-strong',
      ].join(' ')}
    >
      {isWarn ? (
        <AlertTriangle size={15} strokeWidth={2.4} className="mt-0.5 shrink-0" />
      ) : (
        <Info size={15} strokeWidth={2.4} className="mt-0.5 shrink-0" />
      )}
      <span className="flex-1 leading-snug">{notice.text}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        title="Dismiss"
        className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-current opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
      >
        <X size={12} strokeWidth={2.4} />
      </button>
    </div>
  );
}

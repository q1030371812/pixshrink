import { useCallback, useRef, useState } from 'react';
import { ImageDown, Upload, ClipboardPaste } from 'lucide-react';

interface DropZoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

const ACCEPT = 'image/png,image/jpeg,image/webp,image/avif,image/gif,image/bmp';

export function DropZone({ onFile, disabled }: DropZoneProps) {
  const [hover, setHover] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | File[] | null | undefined) => {
      if (!files) return;
      const list = Array.from(files);
      const image = list.find((f) => f.type.startsWith('image/'));
      if (image) onFile(image);
    },
    [onFile]
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setHover(false);
      if (disabled) return;
      handleFiles(event.dataTransfer.files);
    },
    [handleFiles, disabled]
  );

  const onPaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      handleFiles(event.clipboardData.files);
    },
    [handleFiles, disabled]
  );

  const openPicker = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPicker();
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
        'group relative mx-auto flex w-full max-w-3xl flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-surface px-6 py-12 text-center transition-all duration-200 sm:px-10 sm:py-16',
        disabled
          ? 'cursor-not-allowed border-border opacity-60'
          : 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        hover
          ? 'border-accent bg-accent-soft/40 shadow-soft'
          : 'border-border hover:border-accent/60 hover:bg-surface-2',
      ].join(' ')}
    >
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
        <ImageDown size={26} strokeWidth={2} />
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-text">
        Drop an image to compress
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        We&rsquo;ll recompress it as JPEG in your browser. The original file never leaves this tab.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openPicker();
          }}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-soft transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          <Upload size={15} />
          Choose image
        </button>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          <ClipboardPaste size={12} />
          or paste with Ctrl/⌘ + V
        </span>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
        {['PNG', 'JPEG', 'WebP', 'AVIF', 'GIF', 'BMP'].map((label) => (
          <span
            key={label}
            className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted"
          >
            {label}
          </span>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}

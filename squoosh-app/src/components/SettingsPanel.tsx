import { useState } from 'react';
import { Gauge, RotateCcw, RefreshCw } from 'lucide-react';
import { BatchSettings, defaultBatchSettings } from '../lib/types';

interface SettingsPanelProps {
  value: BatchSettings;
  onChange: (next: BatchSettings) => void;
  /** Disables the panel during a batch run so the user cannot change mid-flight. */
  disabled?: boolean;
}

// Quality is the single knob we expose. We label the slider with a
// human-friendly tier (Crisp / Balanced / Aggressive) so the user has a
// hint beyond the bare number.
const qualityLabel = (q: number) =>
  q >= 85 ? 'High fidelity' : q >= 65 ? 'Balanced' : 'Smaller files';

// Rough visual hint: the slider thumb changes colour and a tiny badge
// shifts to mirror the trade-off. We are not promising a byte count, just
// a sense of "left = aggressive, right = conservative".
const qualityTone = (q: number): 'rose' | 'amber' | 'teal' =>
  q >= 85 ? 'teal' : q >= 65 ? 'amber' : 'rose';

const toneClass: Record<ReturnType<typeof qualityTone>, string> = {
  teal: 'text-accent-strong bg-accent-soft',
  amber: 'text-amber bg-amber-soft',
  rose: 'text-rose bg-rose/10',
};

export function SettingsPanel({ value, onChange, disabled }: SettingsPanelProps) {
  const [hoverReset, setHoverReset] = useState(false);
  const quality = value.quality;
  const label = qualityLabel(quality);
  const tone = qualityTone(quality);

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent-soft text-accent-strong">
            <Gauge size={14} strokeWidth={2.2} />
          </span>
          <h2 className="text-sm font-semibold text-text-strong">Compression</h2>
        </div>
        <button
          type="button"
          onClick={() => onChange(defaultBatchSettings)}
          onMouseEnter={() => setHoverReset(true)}
          onMouseLeave={() => setHoverReset(false)}
          disabled={disabled}
          className="inline-flex items-center gap-1 text-xs font-medium text-text transition-colors hover:text-accent-strong focus:outline-none focus-visible:underline disabled:opacity-50"
          title="Reset to default quality 75"
        >
          <RotateCcw size={11} className={hoverReset ? 'animate-spin-once' : ''} />
          Reset
        </button>
      </header>

      <div className="rounded-xl border border-border bg-surface-2 p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-sm font-medium text-text-strong">Quality</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tabular-nums tracking-tight text-text-strong">
              {quality}
            </span>
            <span className={['rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider', toneClass[tone]].join(' ')}>
              {label}
            </span>
          </div>
        </div>

        <input
          type="range"
          min={1}
          max={100}
          value={quality}
          disabled={disabled}
          onChange={(e) => onChange({ quality: Number(e.target.value) })}
          style={{ ['--range-pct' as string]: `${quality}%` }}
          className="w-full"
          aria-label="JPEG quality"
        />

        <div className="mt-2 flex justify-between text-[10px] font-semibold uppercase tracking-wider text-text">
          <span>Smaller</span>
          <span>Balanced</span>
          <span>Sharper</span>
        </div>

        <p className="mt-3.5 flex items-start gap-2 rounded-lg border border-accent/20 bg-accent-soft/60 px-2.5 py-2 text-[12px] leading-relaxed text-text">
          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-white">
            <RefreshCw size={11} strokeWidth={2.6} />
          </span>
          <span>
            Drag the slider, then hit <span className="font-semibold text-accent-strong">Compress</span> again to re-encode the whole queue with the new value.
          </span>
        </p>
      </div>
    </section>
  );
}

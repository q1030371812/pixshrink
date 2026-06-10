import { useEffect, useRef, useState } from 'react';
import { Gauge } from 'lucide-react';

interface QualitySliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  debounceMs?: number;
}

export function QualitySlider({
  value,
  onChange,
  disabled,
  min = 20,
  max = 95,
  debounceMs = 280,
}: QualitySliderProps) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (next: number) => {
    setLocal(next);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => onChange(next), debounceMs);
  };

  const range = max - min;
  const pct = ((local - min) / range) * 100;
  const label = local >= 80 ? 'High' : local >= 60 ? 'Balanced' : 'Aggressive';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-muted">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Gauge size={13} className="text-accent" />
          Quality
        </span>
        <span className="font-semibold text-text">
          {local}
          <span className="ml-1 text-muted">{'\u00b7'} {label}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={local}
        disabled={disabled}
        onChange={(e) => handleChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${pct}%, var(--color-surface-2) ${pct}%, var(--color-surface-2) 100%)`,
        }}
      />
      <div className="flex justify-between text-[10px] text-muted">
        <span>Smaller</span>
        <span>{min}</span>
        <span>{max}</span>
        <span>Better</span>
      </div>
    </div>
  );
}

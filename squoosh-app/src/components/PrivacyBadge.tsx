import { Lock } from 'lucide-react';

export function PrivacyBadge() {
  return (
    <div className="border-b border-border bg-surface/60">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-[11px] text-muted sm:px-6 sm:text-xs">
        <Lock size={12} className="shrink-0 text-accent" />
        <span>
          Images are processed locally in your browser. Nothing is uploaded to any server.
        </span>
      </div>
    </div>
  );
}

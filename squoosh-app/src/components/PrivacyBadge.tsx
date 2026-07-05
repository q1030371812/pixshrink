import { ShieldCheck } from 'lucide-react';
import { useI18n } from '../i18n/useI18n';

export function PrivacyBadge() {
  const { t } = useI18n();
  return (
    <div className="border-b border-border bg-surface-2/60">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-[11px] text-muted sm:px-6 sm:text-xs">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-accent-soft text-accent-strong">
          <ShieldCheck size={11} strokeWidth={2.2} />
        </span>
        <span>{t.privacyBadge}</span>
      </div>
    </div>
  );
}

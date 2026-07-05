import { Moon, Sun } from 'lucide-react';
import type { Theme } from '../lib/theme';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useI18n } from '../i18n/useI18n';

interface TopBarProps {
  theme: Theme;
  onToggleTheme: () => void;
}

export function TopBar({ theme, onToggleTheme }: TopBarProps) {
  const { t } = useI18n();
  const themeToggleLabel = theme === 'dark' ? t.themeLight : t.themeDark;
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-bg/75 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3">
        <Logo />
        <div className="flex flex-col leading-none">
          <span className="text-[15px] font-semibold tracking-tight text-text-strong">
            Pixshrink
          </span>
          <span className="mt-0.5 hidden text-[11px] text-muted sm:block">
            {t.tagline}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={themeToggleLabel}
          title={themeToggleLabel}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface/80 text-text backdrop-blur transition-colors hover:border-accent/40 hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <span
      aria-hidden
      className="grid h-10 w-10 place-items-center rounded-xl text-white shadow-[0_8px_18px_-6px_rgba(13,148,136,0.55)]"
      style={{ background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 60%, #5eead4 100%)' }}
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <circle cx="9" cy="10" r="1.5" />
        <path d="M21 17l-5-5-7 7" />
      </svg>
    </span>
  );
}

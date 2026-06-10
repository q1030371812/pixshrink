import { Moon, Sun } from 'lucide-react';
import type { Theme } from '../lib/theme';

interface TopBarProps {
  theme: Theme;
  onToggleTheme: () => void;
}

export function TopBar({ theme, onToggleTheme }: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-bg/80 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <Logo />
        <div className="flex flex-col leading-none">
          <span className="text-[15px] font-semibold tracking-tight text-text">
            Pixshrink
          </span>
          <span className="mt-0.5 hidden text-[11px] text-muted sm:block">
            Local image compressor
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-text transition-colors hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </header>
  );
}

function Logo() {
  return (
    <span
      aria-hidden
      className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-white shadow-soft"
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
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

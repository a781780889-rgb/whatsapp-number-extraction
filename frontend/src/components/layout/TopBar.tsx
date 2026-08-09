import { Globe, LogOut, Moon, Radio, Sun } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useSocket } from '../../contexts/SocketContext';

export function TopBar() {
  const { user, logout } = useAuth();
  const { t, lang, toggleLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { connected } = useSocket();

  return (
    <header className="sticky top-0 z-30 border-b border-black/[0.06] dark:border-white/[0.08] bg-paper-50/80 dark:bg-ink-900/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-ink-950 font-display font-bold text-base shrink-0">
            #
          </div>
          <div>
            <h1 className="font-display text-sm font-bold text-ink-900 dark:text-paper-50 leading-none">
              {t('appTitle')}
            </h1>
            <p className="text-[11px] text-ink-500 dark:text-paper-400 mt-0.5 hidden sm:block">{t('appSubtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div
            className={`hidden sm:flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              connected
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300'
            }`}
          >
            <Radio className={`h-3 w-3 ${connected ? 'animate-pulse-soft' : ''}`} />
            {connected ? t('socket_connected') : t('socket_disconnected')}
          </div>

          <button
            onClick={toggleLang}
            className="focus-ring flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-ink-600 dark:text-paper-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
            aria-label="toggle language"
          >
            <Globe className="h-4 w-4" />
            {lang === 'ar' ? 'EN' : 'ع'}
          </button>

          <button
            onClick={toggleTheme}
            className="focus-ring flex h-9 w-9 items-center justify-center rounded-xl text-ink-600 dark:text-paper-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
            aria-label="toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <div className="mx-1 h-6 w-px bg-black/[0.08] dark:bg-white/[0.1] hidden sm:block" />

          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-xs font-semibold text-ink-800 dark:text-paper-100">{user?.name}</span>
            <span className="text-[10px] text-ink-400 dark:text-paper-500 uppercase tracking-wide">{user?.role}</span>
          </div>

          <button
            onClick={logout}
            className="focus-ring flex h-9 w-9 items-center justify-center rounded-xl text-ink-500 dark:text-paper-400 hover:bg-rose-500/10 hover:text-rose-500"
            aria-label={t('logout')}
            title={t('logout')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

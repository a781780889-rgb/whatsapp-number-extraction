import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, ChevronDown, Hash, Users } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export type DashboardTab = 'overview' | 'accounts' | 'numbers';

export function TabNav({ active, onChange }: { active: DashboardTab; onChange: (tab: DashboardTab) => void }) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const tabs: Array<{ id: DashboardTab; label: string; icon: typeof Activity }> = [
    { id: 'overview', label: t('nav_overview'), icon: Activity },
    { id: 'accounts', label: t('nav_accounts'), icon: Users },
    { id: 'numbers', label: t('nav_numbers'), icon: Hash },
  ];

  const activeTab = tabs.find((tab) => tab.id === active) ?? tabs[0];

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  function selectTab(tab: DashboardTab) {
    onChange(tab);
    setIsOpen(false);
  }

  return (
    <div ref={menuRef} className="relative z-50 w-full sm:w-fit">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={`focus-ring flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors sm:min-w-64 ${
          isOpen
            ? 'bg-amber-500 text-ink-950 shadow-md shadow-amber-500/20'
            : 'bg-black/[0.03] text-ink-800 hover:bg-black/[0.06] dark:bg-white/[0.04] dark:text-paper-100 dark:hover:bg-white/[0.08]'
        }`}
      >
        <span className="flex items-center gap-2">
          <activeTab.icon className={`h-4 w-4 ${isOpen ? 'text-ink-950' : 'text-amber-600 dark:text-amber-400'}`} />
          <span>{activeTab.label}</span>
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="menu"
            aria-label={t('appTitle')}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-full min-w-64 origin-top-right overflow-hidden rounded-2xl border border-black/[0.06] bg-paper-50 p-1.5 shadow-2xl shadow-black/15 dark:border-white/[0.08] dark:bg-ink-800"
          >
            {tabs.map((tab) => {
              const isActive = active === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="menuitem"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => selectTab(tab.id)}
                  className={`focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-amber-500 text-ink-950 shadow-sm shadow-amber-500/15'
                      : 'text-ink-600 hover:bg-black/[0.05] dark:text-paper-300 dark:hover:bg-white/[0.08]'
                  }`}
                >
                  <tab.icon className="h-4 w-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { motion } from 'framer-motion';
import { Activity, Users, Hash } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export type DashboardTab = 'overview' | 'accounts' | 'numbers';

export function TabNav({ active, onChange }: { active: DashboardTab; onChange: (tab: DashboardTab) => void }) {
  const { t } = useLanguage();

  const tabs: Array<{ id: DashboardTab; label: string; icon: typeof Activity }> = [
    { id: 'overview', label: t('nav_overview'), icon: Activity },
    { id: 'accounts', label: t('nav_accounts'), icon: Users },
    { id: 'numbers', label: t('nav_numbers'), icon: Hash },
  ];

  return (
    <div className="flex items-center gap-1 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] p-1 w-full sm:w-fit overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`focus-ring relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
              isActive ? 'text-ink-950' : 'text-ink-500 dark:text-paper-400 hover:text-ink-800 dark:hover:text-paper-100'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="active-tab-pill"
                className="absolute inset-0 rounded-xl bg-amber-500"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <tab.icon className="relative h-4 w-4" />
            <span className="relative">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

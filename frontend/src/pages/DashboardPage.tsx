import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TopBar } from '../components/layout/TopBar';
import { Sidebar, type DashboardTab } from '../components/layout/Sidebar';
import { Menu } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { OverviewPanel } from '../components/dashboard/OverviewPanel';
import { AccountsPanel } from '../components/accounts/AccountsPanel';
import { NumbersPanel } from '../components/numbers/NumbersPanel';

export function DashboardPage() {
  const [tab, setTab] = useState<DashboardTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { dir, t } = useLanguage();
  const isRtl = dir === 'rtl';

  return (
    <div className="min-h-screen bg-paper-50 dark:bg-ink-900">
      <Sidebar active={tab} onChange={setTab} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={isRtl ? 'lg:pr-[19rem]' : 'lg:pl-[19rem]'}>
        <TopBar />

        <main className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="focus-ring flex h-10 w-10 items-center justify-center rounded-xl bg-ink-950 text-paper-50 shadow-lg shadow-ink-950/10 dark:bg-paper-50 dark:text-ink-950"
              aria-label={isRtl ? 'فتح القائمة الجانبية' : 'Open sidebar'}
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-bold text-ink-700 dark:text-paper-200">{t('nav_overview')}</span>
          </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {tab === 'overview' && <OverviewPanel />}
            {tab === 'accounts' && <AccountsPanel />}
            {tab === 'numbers' && <NumbersPanel />}
          </motion.div>
        </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

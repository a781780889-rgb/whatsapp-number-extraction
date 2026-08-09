import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TopBar } from '../components/layout/TopBar';
import { TabNav, type DashboardTab } from '../components/layout/TabNav';
import { OverviewPanel } from '../components/dashboard/OverviewPanel';
import { AccountsPanel } from '../components/accounts/AccountsPanel';
import { NumbersPanel } from '../components/numbers/NumbersPanel';

export function DashboardPage() {
  const [tab, setTab] = useState<DashboardTab>('overview');

  return (
    <div className="min-h-screen bg-paper-50 dark:bg-ink-900">
      <TopBar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
        <div className="mb-6">
          <TabNav active={tab} onChange={setTab} />
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
  );
}

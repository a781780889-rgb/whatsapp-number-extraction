import { motion } from 'framer-motion';
import { Activity, Hash, LayoutDashboard, Menu, Users, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSocket } from '../../contexts/SocketContext';
import { useDashboardData } from '../../contexts/DashboardDataContext';

export type DashboardTab = 'overview' | 'accounts' | 'numbers';

interface SidebarProps {
  active: DashboardTab;
  onChange: (tab: DashboardTab) => void;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ active, onChange, open, onClose }: SidebarProps) {
  const { t, dir } = useLanguage();
  const { connected } = useSocket();
  const { accounts, overview } = useDashboardData();
  const isRtl = dir === 'rtl';
  const position = isRtl ? 'right-0' : 'left-0';

  const items: Array<{ id: DashboardTab; label: string; description: string; icon: typeof Activity; count?: number }> = [
    { id: 'overview', label: t('nav_overview'), description: isRtl ? 'متابعة النشاط والعمليات' : 'Track activity and jobs', icon: LayoutDashboard },
    { id: 'accounts', label: t('nav_accounts'), description: isRtl ? 'إدارة حسابات واتساب' : 'Manage WhatsApp accounts', icon: Users, count: accounts.length },
    { id: 'numbers', label: t('nav_numbers'), description: isRtl ? 'تصفح البيانات المستخرجة' : 'Browse extracted data', icon: Hash, count: overview?.totalExtractedNumbers ?? 0 },
  ];

  const handleChange = (tab: DashboardTab) => {
    onChange(tab);
    onClose();
  };

  return (
    <>
      {open && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-ink-950/40 backdrop-blur-sm lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 ${position} z-50 flex w-[min(19rem,calc(100vw-2rem))] flex-col border-black/[0.06] bg-white/95 shadow-2xl backdrop-blur-2xl transition-transform duration-200 dark:border-white/[0.08] dark:bg-ink-850/95 lg:translate-x-0 lg:border-${isRtl ? 'l' : 'r'} ${
          open ? 'translate-x-0' : isRtl ? 'translate-x-full' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-5 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-xl font-bold text-ink-950 shadow-lg shadow-amber-500/20">#</div>
            <div>
              <p className="font-display text-sm font-bold text-ink-950 dark:text-paper-50">{t('appTitle')}</p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-ink-400 dark:text-paper-500">Dashboard</p>
            </div>
          </div>
          <button onClick={onClose} className="focus-ring rounded-xl p-2 text-ink-400 hover:bg-black/[0.05] dark:text-paper-400 dark:hover:bg-white/[0.08] lg:hidden" aria-label="Close navigation">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 pt-7">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-400 dark:text-paper-500">{isRtl ? 'التنقل الرئيسي' : 'Main navigation'}</p>
          <nav className="mt-3 space-y-2" aria-label="Dashboard navigation">
            {items.map(({ id, label, description, icon: Icon, count }) => {
              const selected = active === id;
              return (
                <button
                  key={id}
                  onClick={() => handleChange(id)}
                  aria-current={selected ? 'page' : undefined}
                  className={`focus-ring group relative flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-start transition-all duration-200 ${selected ? 'text-ink-950 dark:text-paper-50' : 'text-ink-500 hover:bg-black/[0.04] hover:text-ink-900 dark:text-paper-400 dark:hover:bg-white/[0.06] dark:hover:text-paper-100'}`}
                >
                  {selected && <motion.span layoutId="sidebar-active" className="absolute inset-0 rounded-2xl bg-amber-500/15 ring-1 ring-amber-500/20 dark:bg-amber-500/20" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <span className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${selected ? 'bg-amber-500 text-ink-950 shadow-md shadow-amber-500/20' : 'bg-black/[0.04] text-ink-400 group-hover:bg-amber-500/10 group-hover:text-amber-600 dark:bg-white/[0.06] dark:text-paper-400 dark:group-hover:text-amber-300'}`}>
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="relative min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{label}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-ink-400 dark:text-paper-500">{description}</span>
                  </span>
                  {typeof count === 'number' && <span className={`relative rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${selected ? 'bg-amber-500/20 text-amber-700 dark:text-amber-200' : 'bg-black/[0.05] text-ink-400 dark:bg-white/[0.08] dark:text-paper-400'}`}>{count}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-4">
          <div className="rounded-2xl border border-black/[0.06] bg-black/[0.025] p-4 dark:border-white/[0.08] dark:bg-white/[0.035]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-700 dark:text-paper-200">{isRtl ? 'حالة الاتصال' : 'Connection status'}</span>
              <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]' : 'bg-rose-500'}`} />
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-ink-400 dark:text-paper-500">
              <Activity className={`h-3.5 w-3.5 ${connected ? 'text-emerald-500' : 'text-rose-500'}`} />
              {connected ? t('socket_connected') : t('socket_disconnected')}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="focus-ring flex h-10 w-10 items-center justify-center rounded-xl bg-black/[0.04] text-ink-600 hover:bg-amber-500/15 dark:bg-white/[0.06] dark:text-paper-300 lg:hidden" aria-label="Open navigation">
      <Menu className="h-5 w-5" />
    </button>
  );
}

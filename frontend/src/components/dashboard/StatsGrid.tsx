import { Users, UserCheck, UserX, FolderOpen, ScanLine, Contact, Hash, Plus, Copy, Trash2 } from 'lucide-react';
import { StatCard } from '../ui/StatCard';
import { useLanguage } from '../../contexts/LanguageContext';
import type { OverviewStats } from '../../types';

export function StatsGrid({ stats }: { stats: OverviewStats | null }) {
  const { t } = useLanguage();
  const s = stats;

  const cards = [
    { label: t('stat_totalAccounts'), value: s?.totalAccounts ?? 0, icon: Users, tone: 'neutral' as const },
    { label: t('stat_activeAccounts'), value: s?.activeAccounts ?? 0, icon: UserCheck, tone: 'emerald' as const },
    { label: t('stat_stoppedAccounts'), value: s?.stoppedAccounts ?? 0, icon: UserX, tone: 'neutral' as const },
    { label: t('stat_totalGroups'), value: s?.totalGroups ?? 0, icon: FolderOpen, tone: 'amber' as const },
    { label: t('stat_groupsScanning'), value: s?.groupsCurrentlyScanning ?? 0, icon: ScanLine, tone: 'amber' as const },
    { label: t('stat_totalMembers'), value: s?.totalMembers ?? 0, icon: Contact, tone: 'neutral' as const },
    { label: t('stat_totalExtracted'), value: s?.totalExtractedNumbers ?? 0, icon: Hash, tone: 'amber' as const },
    { label: t('stat_newLastRun'), value: s?.newNumbersLastRun ?? 0, icon: Plus, tone: 'emerald' as const },
    { label: t('stat_duplicateLastRun'), value: s?.duplicateNumbersLastRun ?? 0, icon: Copy, tone: 'neutral' as const },
    { label: t('stat_deletedLastRun'), value: s?.deletedNumbersLastRun ?? 0, icon: Trash2, tone: 'rose' as const },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card, i) => (
        <StatCard key={card.label} {...card} index={i} />
      ))}
    </div>
  );
}

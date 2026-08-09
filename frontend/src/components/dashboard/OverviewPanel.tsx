import { useDashboardData } from '../../contexts/DashboardDataContext';
import { StatsGrid } from './StatsGrid';
import { ResourceMonitor } from './ResourceMonitor';
import { ActiveJobsList } from './ActiveJobsList';
import { LiveEventLog } from './LiveEventLog';
import { CountryBreakdown } from './CountryBreakdown';

export function OverviewPanel() {
  const { overview, resources, logs, progressByAccount, accounts } = useDashboardData();

  return (
    <div className="space-y-4">
      <StatsGrid stats={overview} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <ActiveJobsList progressByAccount={progressByAccount} accounts={accounts} />
          <CountryBreakdown stats={overview} />
        </div>
        <div className="space-y-4">
          <ResourceMonitor snapshot={resources} />
          <LiveEventLog logs={logs} />
        </div>
      </div>
    </div>
  );
}

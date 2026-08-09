import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import { api } from '../lib/api';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import type {
  ExtractionAccount,
  OverviewStats,
  SystemLogEntry,
  SystemResourceSnapshot,
  JobProgressEvent,
  ApiEnvelope,
} from '../types';

interface DashboardDataContextValue {
  accounts: ExtractionAccount[];
  accountsLoading: boolean;
  refetchAccounts: () => Promise<void>;
  overview: OverviewStats | null;
  refetchOverview: () => Promise<void>;
  logs: SystemLogEntry[];
  resources: SystemResourceSnapshot | null;
  progressByAccount: Record<string, JobProgressEvent>;
}

const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);

const emptyProgress = (jobId: string, accountId: string): JobProgressEvent => ({
  jobId,
  accountId,
  totalGroups: 0,
  processedGroups: 0,
  newNumbers: 0,
  duplicateNumbers: 0,
  deletedNumbers: 0,
  elapsedMs: 0,
  estimatedRemainingMs: null,
  speedPerMinute: 0,
});

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth();
  const { socket } = useSocket();

  const [accounts, setAccounts] = useState<ExtractionAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [resources, setResources] = useState<SystemResourceSnapshot | null>(null);
  const [jobProgress, setJobProgress] = useState<Record<string, JobProgressEvent>>({});

  const refetchAccounts = useCallback(async () => {
    const { data } = await api.get<ApiEnvelope<ExtractionAccount[]>>('/number-extraction/accounts');
    setAccounts(data.data);
  }, []);

  const refetchOverview = useCallback(async () => {
    const { data } = await api.get<ApiEnvelope<OverviewStats>>('/number-extraction/stats/overview');
    setOverview(data.data);
  }, []);

  // تحميل أولي عبر REST فور توفر جلسة صالحة
  useEffect(() => {
    if (!accessToken) {
      setAccounts([]);
      setOverview(null);
      setLogs([]);
      setJobProgress({});
      setAccountsLoading(false);
      return;
    }

    let cancelled = false;
    setAccountsLoading(true);

    Promise.all([
      refetchAccounts(),
      refetchOverview(),
      api
        .get<ApiEnvelope<SystemLogEntry[]>>('/number-extraction/stats/logs?limit=60')
        .then((r) => !cancelled && setLogs(r.data.data)),
    ]).finally(() => !cancelled && setAccountsLoading(false));

    return () => {
      cancelled = true;
    };
  }, [accessToken, refetchAccounts, refetchOverview]);

  // بث لحظي عبر Socket.IO — "جميع العمليات تتم بدون إعادة تحميل الصفحة"
  useEffect(() => {
    if (!socket) return;

    const onAccountUpdated = (account: ExtractionAccount) => {
      setAccounts((prev) => {
        const idx = prev.findIndex((a) => a.id === account.id);
        if (idx === -1) return [account, ...prev];
        const next = [...prev];
        next[idx] = account;
        return next;
      });
    };

    const onAccountDeleted = ({ id }: { id: string }) => {
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    };

    const onJobStarted = (payload: { jobId: string; accountId: string }) => {
      setJobProgress((prev) => ({ ...prev, [payload.jobId]: emptyProgress(payload.jobId, payload.accountId) }));
    };

    const onJobProgress = (progress: JobProgressEvent) => {
      setJobProgress((prev) => ({ ...prev, [progress.jobId]: progress }));
    };

    const onJobSettled = (payload: { jobId: string }) => {
      setJobProgress((prev) => {
        if (!(payload.jobId in prev)) return prev;
        const next = { ...prev };
        delete next[payload.jobId];
        return next;
      });
      refetchOverview().catch(() => {});
    };

    const onLogNew = (entry: SystemLogEntry) => {
      setLogs((prev) => [{ ...entry, createdAt: entry.createdAt ?? new Date().toISOString() }, ...prev].slice(0, 100));
    };

    const onResources = (snapshot: SystemResourceSnapshot) => setResources(snapshot);

    socket.on('account:updated', onAccountUpdated);
    socket.on('account:deleted', onAccountDeleted);
    socket.on('job:started', onJobStarted);
    socket.on('job:progress', onJobProgress);
    socket.on('job:completed', onJobSettled);
    socket.on('job:failed', onJobSettled);
    socket.on('log:new', onLogNew);
    socket.on('system:resources', onResources);

    return () => {
      socket.off('account:updated', onAccountUpdated);
      socket.off('account:deleted', onAccountDeleted);
      socket.off('job:started', onJobStarted);
      socket.off('job:progress', onJobProgress);
      socket.off('job:completed', onJobSettled);
      socket.off('job:failed', onJobSettled);
      socket.off('log:new', onLogNew);
      socket.off('system:resources', onResources);
    };
  }, [socket, refetchOverview]);

  const progressByAccount = useMemo(() => {
    const map: Record<string, JobProgressEvent> = {};
    for (const progress of Object.values(jobProgress)) {
      map[progress.accountId] = progress;
    }
    return map;
  }, [jobProgress]);

  const value: DashboardDataContextValue = {
    accounts,
    accountsLoading,
    refetchAccounts,
    overview,
    refetchOverview,
    logs,
    resources,
    progressByAccount,
  };

  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}

export function useDashboardData() {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) throw new Error('useDashboardData must be used within DashboardDataProvider');
  return ctx;
}

export type UserRole = 'admin' | 'operator' | 'viewer';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export type AccountStatus =
  | 'pending'
  | 'awaiting_qr'
  | 'connecting'
  | 'connected'
  | 'stopped'
  | 'disconnected'
  | 'logged_out'
  | 'error';

export interface ExtractionAccount {
  id: string;
  name: string;
  description: string | null;
  phoneNumber: string | null;
  status: AccountStatus;
  connectionStatus: string;
  qrCode: string | null;
  groupsCount: number;
  membersCount: number;
  extractedCount: number;
  newCount: number;
  duplicateCount: number;
  deletedCount: number;
  lastExtractionSpeed: number | null;
  lastExtractionDurationMs: number | null;
  lastActivityAt: string | null;
  lastConnectedAt: string | null;
  lastOperationAt: string | null;
  lastOperationType: string | null;
  isEnabled: boolean;
  autoReconnect: boolean;
  createdAt: string;
  updatedAt: string;
}

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface ExtractionJob {
  id: string;
  accountId: string;
  status: JobStatus;
  totalGroups: number;
  processedGroups: number;
  totalExtracted: number;
  newNumbers: number;
  duplicateNumbers: number;
  deletedNumbers: number;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  speedPerMinute: number | null;
  attempts: number;
  errorMessage: string | null;
  triggerType: 'manual' | 'auto_on_connect';
}

export interface ExtractedNumber {
  id: string;
  phoneNumber: string;
  countryCode: string | null;
  countryIso: string | null;
  countryNameEn: string | null;
  countryNameAr: string | null;
  groupJidSnapshot: string | null;
  groupNameSnapshot: string | null;
  accountId: string | null;
  accountNameSnapshot: string | null;
  extractedAt: string;
  lastSeenAt: string;
  occurrenceCount: number;
  status: 'active' | 'invalid' | 'blocked';
  notes: string | null;
  tags: string[];
}

export interface OverviewStats {
  totalAccounts: number;
  activeAccounts: number;
  stoppedAccounts: number;
  totalGroups: number;
  groupsCurrentlyScanning: number;
  totalMembers: number;
  totalExtractedNumbers: number;
  newNumbersLastRun: number;
  duplicateNumbersLastRun: number;
  deletedNumbersLastRun: number;
  byCountry: Array<{ countryIso: string | null; countryNameAr: string | null; total: number }>;
}

export interface SystemLogEntry {
  id?: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  module: string;
  message: string;
  accountId?: string | null;
  context?: Record<string, unknown>;
  createdAt: string;
}

export interface SystemResourceSnapshot {
  cpuPercent: number;
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
    systemFreeMb: number;
    systemTotalMb: number;
  };
  database: { ok: boolean; latencyMs: number; error?: string };
  uptimeSeconds: number;
  timestamp: string;
}

export interface JobProgressEvent {
  jobId: string;
  accountId: string;
  totalGroups: number;
  processedGroups: number;
  currentGroupName?: string;
  newNumbers: number;
  duplicateNumbers: number;
  deletedNumbers: number;
  elapsedMs: number;
  estimatedRemainingMs: number | null;
  speedPerMinute: number;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  pagination?: Pagination;
  error?: { code: string; message: string; details?: unknown };
}

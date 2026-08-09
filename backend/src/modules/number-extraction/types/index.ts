export interface ExtractionJobResult {
  totalGroups: number;
  processedGroups: number;
  newNumbers: number;
  duplicateNumbers: number;
  deletedNumbers: number;
  totalExtracted: number;
  durationMs: number;
  speedPerMinute: number;
}

export interface GroupExtractionProgress {
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

export type ExtractionQueueJobData = {
  accountId: string;
  jobId: string;
  triggerType: 'manual' | 'auto_on_connect';
};

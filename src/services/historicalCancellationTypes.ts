export interface HistoricalCancellation {
  specialty: string;
  date: string;
  time: string;
  doctorId: string;
  sessionValue: number;
  reason: string;
  cancelRequester: 'patient' | 'professional' | 'clinic';
  cancelRequestedAt?: string;
}
export interface HistoricalCancellationResult {
  dryRun: boolean;
  created: number;
  preserved: number;
  conflicts: Array<HistoricalCancellation & { message: string }>;
  decisions: Array<HistoricalCancellation & { action: 'create' | 'preserve' | 'conflict'; appointmentId?: string }>;
}


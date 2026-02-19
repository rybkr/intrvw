import { db } from './schema';
import { deleteInterviewAudio } from './audio-store';

export interface RetentionPolicy {
  audioRetentionDays: number;
  abandonedInterviewDays: number;
  maxAudioStorageMB: number;
}

export const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  audioRetentionDays: 7,
  abandonedInterviewDays: 30,
  maxAudioStorageMB: 1000,
};

export interface CleanupReport {
  audioFilesDeleted: number;
  abandonedInterviewsDeleted: number;
  storageFreedEstimateBytes: number;
}

/**
 * Run cleanup on app startup and periodically.
 *
 * 1. Null out audioBlobKey on messages older than audioRetentionDays.
 * 2. Delete abandoned interviews older than abandonedInterviewDays.
 * 3. Transcripts and feedback are NEVER deleted.
 */
export async function runCleanup(
  policy: RetentionPolicy = DEFAULT_RETENTION_POLICY,
): Promise<CleanupReport> {
  const report: CleanupReport = {
    audioFilesDeleted: 0,
    abandonedInterviewsDeleted: 0,
    storageFreedEstimateBytes: 0,
  };

  const now = Date.now();
  const audioThreshold = new Date(
    now - policy.audioRetentionDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const abandonedThreshold = new Date(
    now - policy.abandonedInterviewDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  // 1. Clean up old audio references
  const oldMessages = await db.messages
    .where('timestamp')
    .below(audioThreshold)
    .filter((m) => m.audioBlobKey != null)
    .toArray();

  for (const msg of oldMessages) {
    report.storageFreedEstimateBytes += msg.audioSizeBytes ?? 0;
    report.audioFilesDeleted++;
    await db.messages.update(msg.id, {
      audioBlobKey: undefined,
      audioSizeBytes: undefined,
    });
  }

  // 2. Delete abandoned interviews
  const abandonedInterviews = await db.interviews
    .where('status')
    .equals('in-progress')
    .filter((i) => i.startedAt < abandonedThreshold)
    .toArray();

  for (const interview of abandonedInterviews) {
    await deleteInterviewAudio(interview.id);
    await db.messages.where('interviewId').equals(interview.id).delete();
    await db.whiteboardSnapshots
      .where('interviewId')
      .equals(interview.id)
      .delete();
    await db.interviews.delete(interview.id);
    report.abandonedInterviewsDeleted++;
  }

  return report;
}

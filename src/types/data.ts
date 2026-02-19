/** ISO 8601 timestamp string */
export type ISOTimestamp = string;

/** UUID v4 string */
export type UUID = string;

export type Difficulty = 'junior' | 'mid' | 'senior' | 'staff';
export type InterviewType = 'behavioral' | 'system-design';
export type InterviewStatus = 'in-progress' | 'completed' | 'abandoned';
export type MessageRole = 'interviewer' | 'candidate' | 'system';
export type InputMode = 'voice' | 'text';
export type Theme = 'light' | 'dark' | 'system';

// ─── User ───────────────────────────────────────────────────────────────

export interface User {
  id: UUID;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
  settings: UserSettings;
  syncEnabled: boolean;
  syncToken?: string;
}

export interface UserSettings {
  preferredDifficulty: Difficulty;
  preferredInterviewTypes: InterviewType[];
  audioRetentionDays: number;
  theme: Theme;
  pushToTalkKey: string;
  ttsVoice: string;
  ttsSpeed: number;
}

// ─── Interview ──────────────────────────────────────────────────────────

export interface Interview {
  id: UUID;
  userId: UUID;
  templateId: UUID;
  type: InterviewType;
  topic: string;
  difficulty: Difficulty;
  status: InterviewStatus;
  startedAt: ISOTimestamp;
  completedAt?: ISOTimestamp;
  durationSeconds?: number;
  messageCount: number;
  feedbackId?: UUID;
  metadata: Record<string, unknown>;
}

// ─── InterviewMessage ───────────────────────────────────────────────────

export interface InterviewMessage {
  id: UUID;
  interviewId: UUID;
  role: MessageRole;
  content: string;
  timestamp: ISOTimestamp;
  sequenceNumber: number;
  inputMode: InputMode;
  audioBlobKey?: string;
  audioSizeBytes?: number;
  durationMs?: number;
}

// ─── InterviewFeedback ──────────────────────────────────────────────────

export interface InterviewFeedback {
  id: UUID;
  interviewId: UUID;
  generatedAt: ISOTimestamp;
  overallScore: number;
  scores: FeedbackScores;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  rubricResults?: RubricResult[];
}

export interface FeedbackScores {
  communication: number;
  technicalDepth: number;
  problemSolving: number;
  clarifyingQuestions: number;
  structuredThinking: number;
  componentIdentification?: number;
  tradeoffAnalysis?: number;
  scalabilityAwareness?: number;
}

export interface RubricResult {
  rubricItemId: string;
  score: number;
  explanation: string;
}

// ─── WhiteboardSnapshot ─────────────────────────────────────────────────

export interface WhiteboardSnapshot {
  id: UUID;
  interviewId: UUID;
  capturedAt: ISOTimestamp;
  sequenceNumber: number;
  triggerMessageId?: UUID;
  canvasState: CanvasState;
  thumbnailDataUrl?: string;
}

export interface CanvasState {
  format: 'excalidraw-json';
  version: number;
  elements: unknown[];
  appState?: Record<string, unknown>;
}

// ─── UserProgress ───────────────────────────────────────────────────────

export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'all-time';

export interface UserProgress {
  id: UUID;
  userId: UUID;
  periodStart: ISOTimestamp;
  periodType: PeriodType;
  interviewCount: number;
  totalDurationSeconds: number;
  averageOverallScore: number;
  averageScores: Partial<FeedbackScores>;
  interviewsByType: Record<InterviewType, number>;
  interviewsByDifficulty: Record<Difficulty, number>;
  streakDays: number;
  updatedAt: ISOTimestamp;
}

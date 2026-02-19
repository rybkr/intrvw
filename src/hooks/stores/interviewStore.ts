import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { InterviewType, Difficulty, MessageRole, InputMode } from '@/types/data';

export type InterviewPhase =
  | 'not-started'
  | 'in-progress'
  | 'wrapping-up'
  | 'completed';

export type PTTState = 'idle' | 'recording' | 'processing' | 'speaking';

interface SessionMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  inputMode: InputMode;
  isStreaming?: boolean;
}

interface InterviewConfig {
  id: string;
  type: InterviewType;
  topic: string;
  difficulty: Difficulty;
  durationMinutes: number;
}

interface InterviewState {
  config: InterviewConfig | null;
  phase: InterviewPhase;
  messages: SessionMessage[];
  currentQuestion: number;
  elapsedSeconds: number;
  pttState: PTTState;

  initSession: (config: InterviewConfig) => void;
  addMessage: (msg: Omit<SessionMessage, 'id' | 'timestamp'>) => void;
  updateStreamingMessage: (content: string) => void;
  finalizeStreamingMessage: () => void;
  advanceQuestion: () => void;
  setPhase: (phase: InterviewPhase) => void;
  setPttState: (state: PTTState) => void;
  tick: () => void;
  reset: () => void;
}

export const useInterviewStore = create<InterviewState>()(
  immer((set) => ({
    config: null,
    phase: 'not-started',
    messages: [],
    currentQuestion: 0,
    elapsedSeconds: 0,
    pttState: 'idle',

    initSession: (config) =>
      set((state) => {
        state.config = config;
        state.phase = 'in-progress';
        state.messages = [];
        state.currentQuestion = 1;
        state.elapsedSeconds = 0;
        state.pttState = 'idle';
      }),

    addMessage: (msg) =>
      set((state) => {
        state.messages.push({
          ...msg,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        });
      }),

    updateStreamingMessage: (content) =>
      set((state) => {
        const last = state.messages[state.messages.length - 1];
        if (last?.isStreaming) {
          last.content = content;
        }
      }),

    finalizeStreamingMessage: () =>
      set((state) => {
        const last = state.messages[state.messages.length - 1];
        if (last?.isStreaming) {
          last.isStreaming = false;
        }
      }),

    advanceQuestion: () =>
      set((state) => {
        state.currentQuestion += 1;
      }),

    setPhase: (phase) =>
      set((state) => {
        state.phase = phase;
      }),

    setPttState: (pttState) =>
      set((state) => {
        state.pttState = pttState;
      }),

    tick: () =>
      set((state) => {
        state.elapsedSeconds += 1;
      }),

    reset: () =>
      set((state) => {
        state.config = null;
        state.phase = 'not-started';
        state.messages = [];
        state.currentQuestion = 0;
        state.elapsedSeconds = 0;
        state.pttState = 'idle';
      }),
  })),
);

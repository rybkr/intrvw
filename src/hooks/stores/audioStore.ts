import { create } from 'zustand';

export type STTState = 'idle' | 'listening' | 'processing';
export type TTSState = 'idle' | 'synthesizing' | 'playing';

interface AudioState {
  sttState: STTState;
  ttsState: TTSState;
  lastError: string | null;

  setSttState: (state: STTState) => void;
  setTtsState: (state: TTSState) => void;
  setError: (error: string | null) => void;
}

export const useAudioStore = create<AudioState>()((set) => ({
  sttState: 'idle',
  ttsState: 'idle',
  lastError: null,

  setSttState: (state) => set({ sttState: state }),
  setTtsState: (state) => set({ ttsState: state }),
  setError: (error) => set({ lastError: error }),
}));

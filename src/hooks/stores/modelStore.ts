import { create } from 'zustand';
import type { ServerStatus, VoiceInfo } from '@/types/inference';

interface ModelState {
  serverStatus: ServerStatus;
  serverError: string | null;
  availableModels: string[];
  availableVoices: VoiceInfo[];
  activeModel: string | null;

  setServerStatus: (status: ServerStatus) => void;
  setServerError: (error: string | null) => void;
  setAvailableModels: (models: string[]) => void;
  setAvailableVoices: (voices: VoiceInfo[]) => void;
  setActiveModel: (model: string | null) => void;
}

export const useModelStore = create<ModelState>()((set) => ({
  serverStatus: 'disconnected',
  serverError: null,
  availableModels: [],
  availableVoices: [],
  activeModel: null,

  setServerStatus: (status) => set({ serverStatus: status }),
  setServerError: (error) => set({ serverError: error }),
  setAvailableModels: (models) => set({ availableModels: models }),
  setAvailableVoices: (voices) => set({ availableVoices: voices }),
  setActiveModel: (model) => set({ activeModel: model }),
}));

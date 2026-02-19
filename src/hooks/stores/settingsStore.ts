import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Theme } from '@/types/data';

interface SettingsState {
  theme: Theme;
  ttsVoice: string;
  ttsSpeed: number;
  sttLanguage: string;
  defaultInterviewDuration: number;
  pushToTalkKey: string;
  audioInputDeviceId: string | null;

  setTheme: (theme: Theme) => void;
  setTtsVoice: (voice: string) => void;
  setTtsSpeed: (speed: number) => void;
  setSttLanguage: (lang: string) => void;
  setDefaultDuration: (mins: number) => void;
  setPushToTalkKey: (key: string) => void;
  setAudioInputDevice: (deviceId: string | null) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      ttsVoice: 'alba',
      ttsSpeed: 1.0,
      sttLanguage: 'en',
      defaultInterviewDuration: 30,
      pushToTalkKey: 'Space',
      audioInputDeviceId: null,

      setTheme: (theme) => set({ theme }),
      setTtsVoice: (voice) => set({ ttsVoice: voice }),
      setTtsSpeed: (speed) => set({ ttsSpeed: speed }),
      setSttLanguage: (lang) => set({ sttLanguage: lang }),
      setDefaultDuration: (mins) => set({ defaultInterviewDuration: mins }),
      setPushToTalkKey: (key) => set({ pushToTalkKey: key }),
      setAudioInputDevice: (id) => set({ audioInputDeviceId: id }),
    }),
    { name: 'intrvw-settings' },
  ),
);

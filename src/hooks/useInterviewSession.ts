import { useEffect, useRef, useState, useCallback } from 'react';
import { getBridge } from '@/hooks/useTrillim';
import { useInterviewStore } from '@/hooks/stores/interviewStore';
import { useModelStore } from '@/hooks/stores/modelStore';
import { useAudioStore } from '@/hooks/stores/audioStore';
import { useSettingsStore } from '@/hooks/stores/settingsStore';
import { DEFAULT_INFERENCE_CONFIG } from '@/types/inference';
import type { ChatMessage } from '@/types/inference';
import type { Interview } from '@/types/data';
import { buildBehavioralSystemPrompt } from '@content/behavioral/_shared/system-prompt';
import { buildSystemDesignPrompt } from '@content/system-design/_shared/system-prompt';
import { startCapture, stopCapture } from '@/speech/recorder';
import { playAudio } from '@/speech/player';
import { db } from '@/db/schema';

interface UseInterviewSessionOpts {
  interviewId: string;
  interview: Interview;
}

interface UseInterviewSessionReturn {
  sendText: (text: string) => void;
  startRecording: () => void;
  stopRecording: () => void;
  isGenerating: boolean;
}

const NOOP_RETURN: UseInterviewSessionReturn = {
  sendText: () => {},
  startRecording: () => {},
  stopRecording: () => {},
  isGenerating: false,
};

export function useInterviewSession(
  opts: UseInterviewSessionOpts | null,
): UseInterviewSessionReturn {
  const conversationRef = useRef<ChatMessage[]>([]);
  const sequenceRef = useRef(0);
  const initializedRef = useRef(false);
  const abortRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const serverStatus = useModelStore((s) => s.serverStatus);

  // ── streamLLMResponse ─────────────────────────────────────────────────
  const streamLLMResponse = useCallback(async () => {
    const bridge = getBridge();
    if (!bridge) return;

    setIsGenerating(true);
    abortRef.current = false;

    const interviewStore = useInterviewStore.getState();
    interviewStore.addMessage({
      role: 'interviewer',
      content: '',
      inputMode: 'text',
      isStreaming: true,
    });

    let accumulated = '';

    try {
      for await (const event of bridge.infer(conversationRef.current, DEFAULT_INFERENCE_CONFIG)) {
        if (abortRef.current) break;

        if (event.type === 'token') {
          accumulated += event.content;
          useInterviewStore.getState().updateStreamingMessage(accumulated);
        } else if (event.type === 'completion') {
          accumulated = event.content;
          useInterviewStore.getState().finalizeStreamingMessage();
        } else if (event.type === 'error') {
          useInterviewStore.getState().finalizeStreamingMessage();
          useAudioStore.getState().setError(event.message);
          setIsGenerating(false);
          return;
        }
      }
    } catch {
      useInterviewStore.getState().finalizeStreamingMessage();
    }

    if (!accumulated) {
      setIsGenerating(false);
      return;
    }

    // Update conversation history
    conversationRef.current.push({ role: 'assistant', content: accumulated });

    // Persist to DB
    if (opts) {
      const seq = ++sequenceRef.current;
      await db.messages.add({
        id: crypto.randomUUID(),
        interviewId: opts.interviewId,
        role: 'interviewer',
        content: accumulated,
        timestamp: new Date().toISOString(),
        sequenceNumber: seq,
        inputMode: 'text',
      });
      await db.interviews.update(opts.interviewId, {
        messageCount: seq,
      });
    }

    setIsGenerating(false);

    // TTS — non-blocking so user can type while it plays
    synthesizeAndPlay(accumulated);
  }, [opts]);

  // ── synthesizeAndPlay ────────────────────────────────────────────────
  const synthesizeAndPlay = useCallback(async (text: string) => {
    const bridge = getBridge();
    if (!bridge) return;

    const audioStore = useAudioStore.getState();
    const interviewStore = useInterviewStore.getState();
    const voice = useSettingsStore.getState().ttsVoice;

    try {
      audioStore.setTtsState('synthesizing');
      interviewStore.setPttState('speaking');

      const { audio, sampleRate } = await bridge.synthesize(text, voice);

      audioStore.setTtsState('playing');
      await playAudio(audio, sampleRate);
    } catch {
      // TTS failure is non-fatal — the text is already on screen
    } finally {
      useAudioStore.getState().setTtsState('idle');
      useInterviewStore.getState().setPttState('idle');
    }
  }, []);

  // ── sendText ──────────────────────────────────────────────────────────
  const sendText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isGenerating || !opts) return;
      if (useModelStore.getState().serverStatus !== 'connected') return;

      const interviewStore = useInterviewStore.getState();
      interviewStore.addMessage({
        role: 'candidate',
        content: trimmed,
        inputMode: 'text',
      });

      conversationRef.current.push({ role: 'user', content: trimmed });

      // Persist to DB
      const seq = ++sequenceRef.current;
      db.messages.add({
        id: crypto.randomUUID(),
        interviewId: opts.interviewId,
        role: 'candidate',
        content: trimmed,
        timestamp: new Date().toISOString(),
        sequenceNumber: seq,
        inputMode: 'text',
      });
      db.interviews.update(opts.interviewId, { messageCount: seq });

      streamLLMResponse();
    },
    [isGenerating, opts, streamLLMResponse],
  );

  // ── startRecording / stopRecording ───────────────────────────────────
  const startRecording = useCallback(() => {
    if (isGenerating) return;
    if (useModelStore.getState().serverStatus !== 'connected') return;

    const deviceId = useSettingsStore.getState().audioInputDeviceId;
    startCapture(deviceId ?? undefined).then(() => {
      useInterviewStore.getState().setPttState('recording');
      useAudioStore.getState().setSttState('listening');
    });
  }, [isGenerating]);

  const stopRecording = useCallback(async () => {
    const interviewStore = useInterviewStore.getState();
    const audioStore = useAudioStore.getState();

    interviewStore.setPttState('processing');
    audioStore.setSttState('processing');

    try {
      const audio = await stopCapture();
      const bridge = getBridge();
      if (!bridge) return;

      const language = useSettingsStore.getState().sttLanguage;
      const transcript = await bridge.transcribe(audio, 16000, language);

      audioStore.setSttState('idle');
      interviewStore.setPttState('idle');

      if (transcript.trim()) {
        sendText(transcript);
      }
    } catch {
      audioStore.setSttState('idle');
      interviewStore.setPttState('idle');
    }
  }, [sendText]);

  // ── Initialization ────────────────────────────────────────────────────
  useEffect(() => {
    if (!opts || initializedRef.current || serverStatus !== 'connected') return;
    initializedRef.current = true;

    const { interview, interviewId } = opts;

    // Build system prompt
    let systemPrompt: string;
    if (interview.type === 'behavioral') {
      systemPrompt = buildBehavioralSystemPrompt(interview.difficulty, interview.topic);
    } else {
      const duration = useSettingsStore.getState().defaultInterviewDuration;
      systemPrompt = buildSystemDesignPrompt(interview.difficulty, interview.topic, duration);
    }

    conversationRef.current = [{ role: 'system', content: systemPrompt }];

    // Init the session store
    useInterviewStore.getState().initSession({
      id: interviewId,
      type: interview.type,
      topic: interview.topic,
      difficulty: interview.difficulty,
      durationMinutes: useSettingsStore.getState().defaultInterviewDuration,
    });

    // Start elapsed-time timer
    timerRef.current = setInterval(() => {
      useInterviewStore.getState().tick();
    }, 1000);

    // Check for existing messages (page refresh recovery)
    db.messages
      .where('[interviewId+sequenceNumber]')
      .between([interviewId, 0], [interviewId, Infinity])
      .toArray()
      .then((existing) => {
        if (existing.length > 0) {
          // Hydrate store and conversation from DB
          const interviewStore = useInterviewStore.getState();
          for (const msg of existing) {
            interviewStore.addMessage({
              role: msg.role,
              content: msg.content,
              inputMode: msg.inputMode,
            });
            conversationRef.current.push({
              role: msg.role === 'interviewer' ? 'assistant' : 'user',
              content: msg.content,
            });
          }
          sequenceRef.current = existing.length;
        } else {
          // First load — LLM sends the opening message
          streamLLMResponse();
        }
      });

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      abortRef.current = true;
      getBridge()?.abort();
      useInterviewStore.getState().reset();
    };
  }, [opts, serverStatus, streamLLMResponse]);

  // ── Push-to-talk keyboard listener ───────────────────────────────────
  useEffect(() => {
    if (!opts) return;

    const pttKey = useSettingsStore.getState().pushToTalkKey;
    let isHolding = false;

    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== pttKey) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (isHolding) return;
      e.preventDefault();
      isHolding = true;
      startRecording();
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.code !== pttKey) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!isHolding) return;
      e.preventDefault();
      isHolding = false;
      stopRecording();
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [opts, startRecording, stopRecording]);

  if (!opts) return NOOP_RETURN;

  return { sendText, startRecording, stopRecording, isGenerating };
}

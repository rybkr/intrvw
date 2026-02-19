import { useEffect, useRef, useCallback } from 'react';
import { RuntimeBridge } from '@/inference/provider';
import { useModelStore } from '@/hooks/stores/modelStore';

const RECONNECT_INTERVAL = 5_000;

export function useTrillim() {
  const bridgeRef = useRef<RuntimeBridge | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const connect = useCallback(async () => {
    const store = useModelStore.getState();
    store.setServerStatus('connecting');
    store.setServerError(null);

    const bridge = new RuntimeBridge();
    bridgeRef.current = bridge;

    try {
      await bridge.initialize();

      const [models, voices] = await Promise.all([
        bridge.listModels(),
        bridge.listVoices().catch(() => []),
      ]);

      const s = useModelStore.getState();
      s.setServerStatus('connected');
      s.setAvailableModels(models);
      s.setAvailableVoices(voices);
      s.setActiveModel(models[0] ?? null);

      // Stop polling once connected
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } catch (err) {
      const s = useModelStore.getState();
      s.setServerStatus('error');
      s.setServerError(err instanceof Error ? err.message : String(err));
      startPolling();
    }
  }, []);

  const startPolling = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      const status = useModelStore.getState().serverStatus;
      if (status === 'connected') {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return;
      }
      connect();
    }, RECONNECT_INTERVAL);
  }, [connect]);

  const reconnect = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    connect();
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [connect]);

  return { bridge: bridgeRef, reconnect };
}

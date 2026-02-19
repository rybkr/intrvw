import { useEffect, useRef, useCallback } from 'react';
import { RuntimeBridge } from '@/inference/provider';
import { useModelStore } from '@/hooks/stores/modelStore';

const RECONNECT_INTERVAL = 5_000;

// Module-scope shared refs — set by whichever component calls useTrillim()
let sharedBridge: React.RefObject<RuntimeBridge | null> | null = null;
let sharedReconnect: (() => void) | null = null;

/** Get the RuntimeBridge instance (null if not yet connected) */
export function getBridge(): RuntimeBridge | null {
  return sharedBridge?.current ?? null;
}

/** Get the reconnect callback (null if useTrillim hasn't mounted) */
export function getReconnect(): (() => void) | null {
  return sharedReconnect;
}

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

  // Publish to module scope so non-hook code can access
  sharedBridge = bridgeRef;
  sharedReconnect = reconnect;

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

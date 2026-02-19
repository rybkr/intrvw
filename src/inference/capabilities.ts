export interface DeviceCapabilities {
  hasAudioWorklet: boolean;
  trillimServerReachable: boolean;
  microphonePermission: PermissionState;
  warnings: string[];
}

export async function detectCapabilities(): Promise<DeviceCapabilities> {
  const warnings: string[] = [];

  const hasAudioWorklet =
    'AudioWorklet' in window && 'AudioWorkletNode' in window;
  if (!hasAudioWorklet) {
    warnings.push('AudioWorklet not available. Voice input requires a modern browser.');
  }

  let trillimServerReachable = false;
  try {
    const res = await fetch('/v1/models');
    trillimServerReachable = res.ok;
  } catch {
    // Server not running
  }
  if (!trillimServerReachable) {
    warnings.push(
      'Trillim server not reachable. Start it with: trillim serve Trillim/BitNet-TRNQ --voice',
    );
  }

  let microphonePermission: PermissionState = 'prompt';
  try {
    const result = await navigator.permissions.query({
      name: 'microphone' as PermissionName,
    });
    microphonePermission = result.state;
  } catch {
    // Permissions API not supported
  }

  return {
    hasAudioWorklet,
    trillimServerReachable,
    microphonePermission,
    warnings,
  };
}

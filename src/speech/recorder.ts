/**
 * Audio recorder using AudioWorklet for raw PCM capture.
 * Captures 16kHz mono Float32Array suitable for Whisper STT.
 */

let mediaStream: MediaStream | null = null;
let audioContext: AudioContext | null = null;
let workletNode: AudioWorkletNode | null = null;
let resolveCapture: ((audio: Float32Array) => void) | null = null;

/**
 * Start capturing audio from the microphone.
 * Call stopCapture() to get the recorded audio buffer.
 */
export async function startCapture(
  deviceId?: string,
): Promise<void> {
  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      sampleRate: 16000,
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
    },
  });

  audioContext = new AudioContext({ sampleRate: 16000 });
  const source = audioContext.createMediaStreamSource(mediaStream);

  await audioContext.audioWorklet.addModule('/audio-capture-processor.js');
  workletNode = new AudioWorkletNode(audioContext, 'audio-capture-processor');

  workletNode.port.onmessage = (e) => {
    if (e.data.type === 'audio' && resolveCapture) {
      resolveCapture(new Float32Array(e.data.buffer));
      resolveCapture = null;
    }
  };

  source.connect(workletNode);
  // Don't connect to destination — we don't want playback of mic input
  workletNode.port.postMessage({ type: 'start' });
}

/**
 * Stop capturing and return the recorded audio as a Float32Array (16kHz mono PCM).
 */
export function stopCapture(): Promise<Float32Array> {
  return new Promise((resolve) => {
    resolveCapture = resolve;
    workletNode?.port.postMessage({ type: 'stop' });

    // Clean up the media stream
    mediaStream?.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  });
}

/**
 * Check if microphone permission has been granted.
 */
export async function checkMicrophonePermission(): Promise<PermissionState> {
  try {
    const result = await navigator.permissions.query({
      name: 'microphone' as PermissionName,
    });
    return result.state;
  } catch {
    return 'prompt';
  }
}

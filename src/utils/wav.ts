/**
 * Encode a Float32Array of PCM samples into a WAV blob.
 * Used to prepare audio from the recorder (16kHz Float32) for STT upload.
 */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = samples.length * (bitsPerSample / 8);
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Convert Float32 [-1, 1] to Int16
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Decode a WAV ArrayBuffer into Float32Array samples and sample rate.
 * Used to play TTS responses from Trillim (24kHz int16 WAV).
 */
export function decodeWav(buffer: ArrayBuffer): { audio: Float32Array; sampleRate: number } {
  const view = new DataView(buffer);

  // Validate RIFF header
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (riff !== 'RIFF') throw new Error('Invalid WAV: missing RIFF header');

  const sampleRate = view.getUint32(24, true);
  const bitsPerSample = view.getUint16(34, true);

  // Find the data chunk
  let offset = 12;
  while (offset < buffer.byteLength) {
    const chunkId = String.fromCharCode(
      view.getUint8(offset), view.getUint8(offset + 1),
      view.getUint8(offset + 2), view.getUint8(offset + 3),
    );
    const chunkSize = view.getUint32(offset + 4, true);
    if (chunkId === 'data') {
      offset += 8;
      break;
    }
    offset += 8 + chunkSize;
  }

  const numSamples = (buffer.byteLength - offset) / (bitsPerSample / 8);
  const audio = new Float32Array(numSamples);

  if (bitsPerSample === 16) {
    for (let i = 0; i < numSamples; i++) {
      const sample = view.getInt16(offset + i * 2, true);
      audio[i] = sample / 0x8000;
    }
  } else if (bitsPerSample === 32) {
    for (let i = 0; i < numSamples; i++) {
      audio[i] = view.getFloat32(offset + i * 4, true);
    }
  } else {
    throw new Error(`Unsupported WAV bit depth: ${bitsPerSample}`);
  }

  return { audio, sampleRate };
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

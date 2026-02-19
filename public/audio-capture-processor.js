/**
 * AudioWorklet processor for capturing raw PCM audio.
 * Accumulates samples while recording, then merges and transfers on stop.
 */
class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.recording = false;
    this.chunks = [];
    this.port.onmessage = (e) => {
      if (e.data.type === 'start') {
        this.recording = true;
        this.chunks = [];
      } else if (e.data.type === 'stop') {
        this.recording = false;
        const totalLength = this.chunks.reduce((sum, c) => sum + c.length, 0);
        const merged = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of this.chunks) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }
        this.port.postMessage({ type: 'audio', buffer: merged.buffer }, [
          merged.buffer,
        ]);
        this.chunks = [];
      }
    };
  }

  process(inputs, _outputs, _parameters) {
    if (this.recording && inputs[0] && inputs[0][0]) {
      this.chunks.push(new Float32Array(inputs[0][0]));
    }
    return true;
  }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor);

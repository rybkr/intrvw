/**
 * TTS audio playback via Web Audio API.
 * Plays raw Float32Array PCM audio at a given sample rate.
 */
export async function playAudio(
  audio: Float32Array,
  sampleRate: number,
): Promise<void> {
  const ctx = new AudioContext({ sampleRate });

  // Handle browser autoplay policy
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  const buffer = ctx.createBuffer(1, audio.length, sampleRate);
  buffer.getChannelData(0).set(audio);

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);

  return new Promise<void>((resolve) => {
    source.onended = () => {
      ctx.close();
      resolve();
    };
    source.start();
  });
}

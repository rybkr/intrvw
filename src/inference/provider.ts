import type {
  ChatMessage,
  InferenceConfig,
  InferenceEvent,
  VoiceInfo,
} from '@/types/inference';
import { TrillimClient } from './trillim-client';

/**
 * The RuntimeBridge is the single point of contact for the React UI.
 * Delegates all inference, STT, and TTS to the Trillim HTTP server.
 */
export class RuntimeBridge {
  readonly client: TrillimClient;

  constructor() {
    this.client = new TrillimClient();
  }

  async initialize(): Promise<void> {
    const ok = await this.client.healthCheck();
    if (!ok) {
      throw new Error(
        'Cannot reach Trillim server. Start it with:\n  trillim serve Trillim/BitNet-TRNQ --voice',
      );
    }
  }

  async *infer(
    messages: ChatMessage[],
    config: InferenceConfig,
  ): AsyncGenerator<InferenceEvent> {
    yield* this.client.infer(messages, config);
  }

  async transcribe(audio: Float32Array, sampleRate: number, language?: string): Promise<string> {
    return this.client.transcribe(audio, sampleRate, language);
  }

  async synthesize(text: string, voice?: string): Promise<{ audio: Float32Array; sampleRate: number }> {
    return this.client.synthesize(text, voice);
  }

  abort(): void {
    this.client.abort();
  }

  async listModels(): Promise<string[]> {
    return this.client.listModels();
  }

  async listVoices(): Promise<VoiceInfo[]> {
    return this.client.listVoices();
  }
}

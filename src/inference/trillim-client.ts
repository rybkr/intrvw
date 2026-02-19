import type {
  ChatMessage,
  InferenceConfig,
  InferenceEvent,
  VoiceInfo,
} from '@/types/inference';
import { encodeWav, decodeWav } from '@/utils/wav';

/**
 * HTTP client for the Trillim local server.
 * All requests go through the Vite proxy at /v1/* → localhost:8000.
 */
export class TrillimClient {
  private abortController: AbortController | null = null;

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch('/v1/models');
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    const res = await fetch('/v1/models');
    if (!res.ok) throw new Error(`Failed to list models: ${res.status}`);
    const json = await res.json() as { data: Array<{ id: string }> };
    return json.data.map((m) => m.id);
  }

  async listVoices(): Promise<VoiceInfo[]> {
    const res = await fetch('/v1/voices');
    if (!res.ok) throw new Error(`Failed to list voices: ${res.status}`);
    const json = await res.json() as { voices: Array<{ id: string; name?: string }> };
    return json.voices.map((v) => ({ id: v.id, name: v.name ?? v.id }));
  }

  async *infer(
    messages: ChatMessage[],
    config: InferenceConfig,
  ): AsyncGenerator<InferenceEvent> {
    this.abortController = new AbortController();

    const res = await fetch('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        top_p: config.topP,
        stop: config.stopSequences.length > 0 ? config.stopSequences : undefined,
        stream: true,
      }),
      signal: this.abortController.signal,
    });

    if (!res.ok) {
      yield {
        type: 'error',
        code: `http_${res.status}`,
        message: `Server returned ${res.status}: ${res.statusText}`,
      };
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      yield { type: 'error', code: 'no_body', message: 'Response has no body' };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop()!;

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const chunk = JSON.parse(data) as {
              choices: Array<{
                delta?: { content?: string };
                finish_reason?: string | null;
              }>;
              usage?: { prompt_tokens?: number; completion_tokens?: number };
            };

            const delta = chunk.choices[0]?.delta?.content ?? '';
            if (delta) {
              fullContent += delta;
              yield { type: 'token', content: delta, finishReason: null };
            }

            const finishReason = chunk.choices[0]?.finish_reason;
            if (finishReason) {
              yield {
                type: 'completion',
                content: fullContent,
                finishReason: finishReason as 'stop' | 'length',
                usage: {
                  promptTokens: chunk.usage?.prompt_tokens ?? 0,
                  completionTokens: chunk.usage?.completion_tokens ?? 0,
                },
              };
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  abort(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  async transcribe(
    audio: Float32Array,
    sampleRate: number,
    language?: string,
  ): Promise<string> {
    const wavBlob = encodeWav(audio, sampleRate);
    const form = new FormData();
    form.append('file', wavBlob, 'audio.wav');
    form.append('model', 'whisper-1');
    if (language) form.append('language', language);

    const res = await fetch('/v1/audio/transcriptions', {
      method: 'POST',
      body: form,
    });

    if (!res.ok) throw new Error(`Transcription failed: ${res.status}`);
    const json = await res.json() as { text: string };
    return json.text;
  }

  async synthesize(
    text: string,
    voice?: string,
  ): Promise<{ audio: Float32Array; sampleRate: number }> {
    const res = await fetch('/v1/audio/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: text,
        voice: voice ?? 'alba',
        response_format: 'wav',
      }),
    });

    if (!res.ok) throw new Error(`Speech synthesis failed: ${res.status}`);
    const buffer = await res.arrayBuffer();
    return decodeWav(buffer);
  }
}

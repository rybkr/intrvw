/** A single message in the conversation sent to the LLM */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Configuration for a single inference call */
export interface InferenceConfig {
  temperature: number;
  maxTokens: number;
  topP: number;
  stopSequences: string[];
}

export const DEFAULT_INFERENCE_CONFIG: InferenceConfig = {
  temperature: 0.7,
  maxTokens: 512,
  topP: 0.9,
  stopSequences: [],
};

/** Streaming inference events */
export interface TokenEvent {
  type: 'token';
  content: string;
  finishReason: null;
}

export interface CompletionEvent {
  type: 'completion';
  content: string;
  finishReason: 'stop' | 'length';
  usage: { promptTokens: number; completionTokens: number };
}

export interface InferenceErrorEvent {
  type: 'error';
  code: string;
  message: string;
}

export type InferenceEvent = TokenEvent | CompletionEvent | InferenceErrorEvent;

export type ServerStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface VoiceInfo {
  id: string;
  name: string;
}

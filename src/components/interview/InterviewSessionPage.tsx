import { useState, useRef, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { useInterviewSession } from '@/hooks/useInterviewSession';
import { useInterviewStore } from '@/hooks/stores/interviewStore';
import { useModelStore } from '@/hooks/stores/modelStore';

export default function InterviewSessionPage() {
  const { interviewId } = useParams<{ interviewId: string }>();

  const interview = useLiveQuery(
    () => (interviewId ? db.interviews.get(interviewId) : undefined),
    [interviewId],
  );

  const opts = useMemo(
    () =>
      interviewId && interview
        ? { interviewId, interview }
        : null,
    [interviewId, interview],
  );

  const { sendText, startRecording, stopRecording, isGenerating } =
    useInterviewSession(opts);

  const messages = useInterviewStore((s) => s.messages);
  const elapsedSeconds = useInterviewStore((s) => s.elapsedSeconds);
  const pttState = useInterviewStore((s) => s.pttState);
  const serverStatus = useModelStore((s) => s.serverStatus);

  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const inputDisabled = isGenerating || serverStatus !== 'connected';

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function handleSend() {
    if (!inputText.trim() || inputDisabled) return;
    sendText(inputText);
    setInputText('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  if (!interview) {
    return (
      <div style={{ padding: 'var(--space-8)', color: 'var(--color-text-secondary)' }}>
        Loading interview...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Chat Panel */}
      <div
        style={{
          flex: interview.type === 'system-design' ? '0 0 40%' : '1',
          display: 'flex',
          flexDirection: 'column',
          borderRight:
            interview.type === 'system-design'
              ? '1px solid var(--color-border-subtle)'
              : 'none',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            borderBottom: '1px solid var(--color-border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <span style={{ fontWeight: 'var(--font-weight-medium)' }}>
              {interview.topic}
            </span>
            <span
              style={{
                marginLeft: 'var(--space-2)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-tertiary)',
              }}
            >
              {interview.type} &middot; {interview.difficulty}
            </span>
          </div>
          <span
            style={{
              fontSize: 'var(--text-sm)',
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--color-text-secondary)',
            }}
          >
            {formatTime(elapsedSeconds)}
          </span>
        </div>

        {/* Server disconnected banner */}
        {serverStatus !== 'connected' && (
          <div
            style={{
              padding: 'var(--space-2) var(--space-4)',
              backgroundColor: 'var(--color-warning-subtle, #fefce8)',
              color: 'var(--color-warning, #854d0e)',
              fontSize: 'var(--text-sm)',
              textAlign: 'center',
            }}
          >
            Server disconnected — reconnecting...
          </div>
        )}

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                alignSelf:
                  msg.role === 'candidate' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-lg)',
                backgroundColor:
                  msg.role === 'candidate'
                    ? 'var(--color-accent)'
                    : 'var(--color-bg-tertiary)',
                color:
                  msg.role === 'candidate'
                    ? 'var(--color-text-inverse)'
                    : 'var(--color-text-primary)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {msg.content}
              {msg.isStreaming && (
                <span
                  style={{
                    display: 'inline-block',
                    width: 6,
                    height: '1em',
                    marginLeft: 2,
                    backgroundColor: 'currentColor',
                    animation: 'blink 1s step-end infinite',
                    verticalAlign: 'text-bottom',
                  }}
                />
              )}
            </div>
          ))}
          {messages.length === 0 && serverStatus === 'connected' && (
            <div
              style={{
                textAlign: 'center',
                color: 'var(--color-text-tertiary)',
                padding: 'var(--space-8)',
              }}
            >
              Starting interview...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            borderTop: '1px solid var(--color-border-subtle)',
            display: 'flex',
            gap: 'var(--space-2)',
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={inputDisabled}
            placeholder={
              inputDisabled
                ? isGenerating
                  ? 'Waiting for response...'
                  : 'Server disconnected...'
                : 'Type your response...'
            }
            style={{
              flex: 1,
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-surface)',
              opacity: inputDisabled ? 0.6 : 1,
            }}
          />
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              startRecording();
            }}
            onMouseUp={stopRecording}
            onMouseLeave={() => {
              if (pttState === 'recording') stopRecording();
            }}
            disabled={inputDisabled}
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-full)',
              backgroundColor:
                pttState === 'recording'
                  ? 'var(--color-error, #e53e3e)'
                  : 'var(--color-bg-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--text-xl)',
              opacity: inputDisabled ? 0.6 : 1,
              cursor: inputDisabled ? 'not-allowed' : 'pointer',
              transition: 'background-color var(--transition-fast)',
            }}
            title="Push to talk (hold Space)"
          >
            {pttState === 'processing' ? '...' : '🎤'}
          </button>
        </div>
      </div>

      {/* Whiteboard Panel (system design only) */}
      {interview.type === 'system-design' && (
        <div
          style={{
            flex: '0 0 60%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-bg-secondary)',
            color: 'var(--color-text-tertiary)',
          }}
        >
          Excalidraw whiteboard will be mounted here
        </div>
      )}

      {/* Streaming cursor blink animation */}
      <style>{`
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

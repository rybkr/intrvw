import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';

export default function InterviewSessionPage() {
  const { interviewId } = useParams<{ interviewId: string }>();

  const interview = useLiveQuery(
    () => (interviewId ? db.interviews.get(interviewId) : undefined),
    [interviewId],
  );

  const messages = useLiveQuery(
    () =>
      interviewId
        ? db.messages
            .where('[interviewId+sequenceNumber]')
            .between([interviewId, 0], [interviewId, Infinity])
            .toArray()
        : [],
    [interviewId],
  );

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
        </div>

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
          {messages?.map((msg) => (
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
              }}
            >
              {msg.content}
            </div>
          ))}
          {(!messages || messages.length === 0) && (
            <div
              style={{
                textAlign: 'center',
                color: 'var(--color-text-tertiary)',
                padding: 'var(--space-8)',
              }}
            >
              Interview starting... Press the microphone button or type to begin.
            </div>
          )}
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
            placeholder="Type your response..."
            style={{
              flex: 1,
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-surface)',
            }}
          />
          <button
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-bg-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--text-xl)',
            }}
            title="Push to talk (hold Space)"
          >
            🎤
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
    </div>
  );
}

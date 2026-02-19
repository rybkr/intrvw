import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';

export default function ReviewPage() {
  const { interviewId } = useParams<{ interviewId: string }>();

  const interview = useLiveQuery(
    () => (interviewId ? db.interviews.get(interviewId) : undefined),
    [interviewId],
  );

  const feedback = useLiveQuery(
    () =>
      interviewId
        ? db.feedback.where('interviewId').equals(interviewId).first()
        : undefined,
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
        Loading...
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-8)', maxWidth: 'var(--max-content-width)' }}>
      <Link
        to="/history"
        style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-secondary)',
          marginBottom: 'var(--space-4)',
          display: 'inline-block',
        }}
      >
        &larr; Back to History
      </Link>

      <h1
        style={{
          fontSize: 'var(--text-2xl)',
          fontWeight: 'var(--font-weight-bold)',
          marginBottom: 'var(--space-2)',
        }}
      >
        {interview.topic}
      </h1>
      <p
        style={{
          color: 'var(--color-text-secondary)',
          marginBottom: 'var(--space-6)',
        }}
      >
        {interview.type} &middot; {interview.difficulty} &middot;{' '}
        {new Date(interview.startedAt).toLocaleDateString()}
        {interview.durationSeconds &&
          ` &middot; ${Math.round(interview.durationSeconds / 60)} min`}
      </p>

      <div style={{ display: 'flex', gap: 'var(--space-8)', flexWrap: 'wrap' }}>
        {/* Feedback */}
        <div style={{ flex: '1 1 300px' }}>
          <h2
            style={{
              fontSize: 'var(--text-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: 'var(--space-4)',
            }}
          >
            Feedback
          </h2>
          {feedback ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-4)',
              }}
            >
              <div
                style={{
                  fontSize: 'var(--text-3xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--color-accent)',
                }}
              >
                {feedback.overallScore}/10
              </div>
              <p>{feedback.summary}</p>
              {feedback.strengths.length > 0 && (
                <div>
                  <h3 style={{ fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-2)' }}>
                    Strengths
                  </h3>
                  <ul style={{ paddingLeft: 'var(--space-4)' }}>
                    {feedback.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {feedback.weaknesses.length > 0 && (
                <div>
                  <h3 style={{ fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-2)' }}>
                    Areas for Improvement
                  </h3>
                  <ul style={{ paddingLeft: 'var(--space-4)' }}>
                    {feedback.weaknesses.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: 'var(--color-text-tertiary)' }}>
              Feedback not yet generated.
            </p>
          )}
        </div>

        {/* Transcript */}
        <div style={{ flex: '1 1 400px' }}>
          <h2
            style={{
              fontSize: 'var(--text-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: 'var(--space-4)',
            }}
          >
            Transcript
          </h2>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
              maxHeight: '600px',
              overflow: 'auto',
            }}
          >
            {messages?.map((msg) => (
              <div key={msg.id}>
                <div
                  style={{
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-tertiary)',
                    textTransform: 'uppercase',
                    marginBottom: 'var(--space-1)',
                  }}
                >
                  {msg.role}
                </div>
                <div
                  style={{
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-bg-secondary)',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

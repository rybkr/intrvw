import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';

export default function HistoryPage() {
  const interviews = useLiveQuery(() =>
    db.interviews.orderBy('startedAt').reverse().limit(50).toArray(),
  );

  return (
    <div style={{ padding: 'var(--space-8)', maxWidth: 'var(--max-content-width)' }}>
      <h1
        style={{
          fontSize: 'var(--text-2xl)',
          fontWeight: 'var(--font-weight-bold)',
          marginBottom: 'var(--space-6)',
        }}
      >
        Interview History
      </h1>

      {interviews === undefined ? (
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
      ) : interviews.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 'var(--space-16)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <p style={{ marginBottom: 'var(--space-4)' }}>
            No interviews yet. Start your first one!
          </p>
          <Link
            to="/setup"
            style={{
              color: 'var(--color-accent)',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            New Interview
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {interviews.map((interview) => (
            <Link
              key={interview.id}
              to={`/review/${interview.id}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border-subtle)',
                backgroundColor: 'var(--color-bg-surface)',
                color: 'var(--color-text-primary)',
                textDecoration: 'none',
              }}
            >
              <div>
                <div style={{ fontWeight: 'var(--font-weight-medium)' }}>
                  {interview.topic}
                </div>
                <div
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {interview.type} &middot; {interview.difficulty} &middot;{' '}
                  {new Date(interview.startedAt).toLocaleDateString()}
                </div>
              </div>
              <div
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-tertiary)',
                }}
              >
                {interview.messageCount} messages
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

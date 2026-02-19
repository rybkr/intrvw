import { Link } from 'react-router-dom';
import { useModelStore } from '@/hooks/stores/modelStore';

export default function LandingPage() {
  const serverStatus = useModelStore((s) => s.serverStatus);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        padding: 'var(--space-8)',
        textAlign: 'center',
        gap: 'var(--space-6)',
      }}
    >
      <h1
        style={{
          fontSize: 'var(--text-3xl)',
          fontWeight: 'var(--font-weight-bold)',
        }}
      >
        Practice makes perfect.
      </h1>
      <p
        style={{
          fontSize: 'var(--text-lg)',
          color: 'var(--color-text-secondary)',
          maxWidth: '600px',
        }}
      >
        AI-powered mock interviews for software engineers. Behavioral, system
        design — all running locally on your machine. No data leaves your
        device.
      </p>

      <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
        <Link
          to="/setup"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-3) var(--space-6)',
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-text-inverse)',
            borderRadius: 'var(--radius-md)',
            fontWeight: 'var(--font-weight-medium)',
            fontSize: 'var(--text-lg)',
          }}
        >
          Start Interview
        </Link>
        <Link
          to="/history"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-3) var(--space-6)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-primary)',
            fontWeight: 'var(--font-weight-medium)',
            fontSize: 'var(--text-lg)',
          }}
        >
          View History
        </Link>
      </div>

      {serverStatus !== 'connected' && (
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-tertiary)',
            marginTop: 'var(--space-4)',
          }}
        >
          Trillim server not connected.{' '}
          <Link to="/settings" style={{ color: 'var(--color-accent)' }}>
            Check Settings
          </Link>{' '}
          to configure.
        </p>
      )}
    </div>
  );
}

import { useSettingsStore } from '@/hooks/stores/settingsStore';
import { useModelStore } from '@/hooks/stores/modelStore';
import { useTrillim } from '@/hooks/useTrillim';

export default function SettingsPage() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const ttsSpeed = useSettingsStore((s) => s.ttsSpeed);
  const setTtsSpeed = useSettingsStore((s) => s.setTtsSpeed);
  const ttsVoice = useSettingsStore((s) => s.ttsVoice);
  const setTtsVoice = useSettingsStore((s) => s.setTtsVoice);

  const serverStatus = useModelStore((s) => s.serverStatus);
  const serverError = useModelStore((s) => s.serverError);
  const activeModel = useModelStore((s) => s.activeModel);
  const availableVoices = useModelStore((s) => s.availableVoices);

  const { reconnect } = useTrillim();

  const statusColor =
    serverStatus === 'connected'
      ? 'var(--color-success)'
      : serverStatus === 'error'
        ? 'var(--color-error, #e53e3e)'
        : 'var(--color-text-tertiary)';

  const statusLabel =
    serverStatus === 'connected'
      ? 'Connected'
      : serverStatus === 'connecting'
        ? 'Connecting...'
        : serverStatus === 'error'
          ? 'Error'
          : 'Disconnected';

  return (
    <div style={{ padding: 'var(--space-8)', maxWidth: '600px' }}>
      <h1
        style={{
          fontSize: 'var(--text-2xl)',
          fontWeight: 'var(--font-weight-bold)',
          marginBottom: 'var(--space-6)',
        }}
      >
        Settings
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
        {/* Trillim Server */}
        <section>
          <h2
            style={{
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: 'var(--space-4)',
            }}
          >
            Trillim Server
          </h2>
          <div
            style={{
              padding: 'var(--space-4)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Status</span>
              <span style={{ fontSize: 'var(--text-sm)', color: statusColor }}>
                {statusLabel}
              </span>
            </div>

            {serverStatus === 'connected' && activeModel && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Model</span>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                  {activeModel}
                </span>
              </div>
            )}

            {serverStatus === 'connected' && availableVoices.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Voices</span>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                  {availableVoices.length} available
                </span>
              </div>
            )}

            {serverStatus !== 'connected' && (
              <>
                {serverError && (
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error, #e53e3e)' }}>
                    {serverError}
                  </p>
                )}
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
                  Start the server with:{' '}
                  <code style={{ fontSize: 'var(--text-xs)' }}>
                    trillim serve Trillim/BitNet-TRNQ --voice
                  </code>
                </p>
                <button
                  onClick={reconnect}
                  style={{
                    padding: 'var(--space-2) var(--space-4)',
                    backgroundColor: 'var(--color-accent)',
                    color: 'var(--color-text-inverse)',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 'var(--font-weight-medium)',
                    alignSelf: 'flex-start',
                  }}
                >
                  Retry Connection
                </button>
              </>
            )}
          </div>
        </section>

        {/* Appearance */}
        <section>
          <h2
            style={{
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: 'var(--space-4)',
            }}
          >
            Appearance
          </h2>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {(['system', 'light', 'dark'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                style={{
                  padding: 'var(--space-2) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid',
                  borderColor:
                    theme === t ? 'var(--color-accent)' : 'var(--color-border)',
                  backgroundColor:
                    theme === t ? 'var(--color-accent-subtle)' : 'transparent',
                  color:
                    theme === t
                      ? 'var(--color-accent)'
                      : 'var(--color-text-secondary)',
                  textTransform: 'capitalize',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        {/* Voice Settings */}
        <section>
          <h2
            style={{
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: 'var(--space-4)',
            }}
          >
            Voice
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {availableVoices.length > 0 && (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                }}
              >
                <span>TTS Voice</span>
                <select
                  value={ttsVoice}
                  onChange={(e) => setTtsVoice(e.target.value)}
                  style={{
                    flex: 1,
                    padding: 'var(--space-1) var(--space-2)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg-primary)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {availableVoices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
              }}
            >
              <span>TTS Speed</span>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={ttsSpeed}
                onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: 'var(--text-sm)', minWidth: 40 }}>
                {ttsSpeed.toFixed(1)}x
              </span>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}

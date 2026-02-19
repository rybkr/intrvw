import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/db/schema';
import type { Difficulty, InterviewType } from '@/types/data';

export default function InterviewSetupPage() {
  const navigate = useNavigate();
  const [type, setType] = useState<InterviewType>('behavioral');
  const [difficulty, setDifficulty] = useState<Difficulty>('mid');
  const [topic, setTopic] = useState('');

  async function handleStart() {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.interviews.add({
      id,
      userId: 'default',
      templateId: '',
      type,
      topic: topic || (type === 'behavioral' ? 'General Behavioral' : 'System Design'),
      difficulty,
      status: 'in-progress',
      startedAt: now,
      messageCount: 0,
      metadata: {},
    });

    navigate(`/session/${id}`);
  }

  return (
    <div style={{ padding: 'var(--space-8)', maxWidth: '600px' }}>
      <h1
        style={{
          fontSize: 'var(--text-2xl)',
          fontWeight: 'var(--font-weight-bold)',
          marginBottom: 'var(--space-6)',
        }}
      >
        New Interview
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {/* Interview Type */}
        <fieldset style={{ border: 'none' }}>
          <legend
            style={{
              fontWeight: 'var(--font-weight-medium)',
              marginBottom: 'var(--space-3)',
            }}
          >
            Interview Type
          </legend>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <TypeCard
              label="Behavioral"
              description="Practice STAR method responses, leadership stories, and conflict resolution."
              selected={type === 'behavioral'}
              onClick={() => setType('behavioral')}
            />
            <TypeCard
              label="System Design"
              description="Design scalable systems with a whiteboard canvas for diagramming."
              selected={type === 'system-design'}
              onClick={() => setType('system-design')}
            />
          </div>
        </fieldset>

        {/* Difficulty */}
        <fieldset style={{ border: 'none' }}>
          <legend
            style={{
              fontWeight: 'var(--font-weight-medium)',
              marginBottom: 'var(--space-3)',
            }}
          >
            Difficulty
          </legend>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {(['junior', 'mid', 'senior', 'staff'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                style={{
                  padding: 'var(--space-2) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid',
                  borderColor:
                    difficulty === d
                      ? 'var(--color-accent)'
                      : 'var(--color-border)',
                  backgroundColor:
                    difficulty === d
                      ? 'var(--color-accent-subtle)'
                      : 'transparent',
                  color:
                    difficulty === d
                      ? 'var(--color-accent)'
                      : 'var(--color-text-secondary)',
                  fontWeight: 'var(--font-weight-medium)',
                  textTransform: 'capitalize',
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Topic */}
        <div>
          <label
            htmlFor="topic"
            style={{
              display: 'block',
              fontWeight: 'var(--font-weight-medium)',
              marginBottom: 'var(--space-2)',
            }}
          >
            Topic (optional)
          </label>
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={
              type === 'behavioral'
                ? 'e.g., Leadership, Conflict Resolution'
                : 'e.g., Design a URL Shortener'
            }
            style={{
              width: '100%',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-surface)',
            }}
          />
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          style={{
            padding: 'var(--space-3) var(--space-6)',
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-text-inverse)',
            borderRadius: 'var(--radius-md)',
            fontWeight: 'var(--font-weight-medium)',
            fontSize: 'var(--text-lg)',
            marginTop: 'var(--space-4)',
          }}
        >
          Start Interview
        </button>
      </div>
    </div>
  );
}

function TypeCard({
  label,
  description,
  selected,
  onClick,
}: {
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-lg)',
        border: '2px solid',
        borderColor: selected ? 'var(--color-accent)' : 'var(--color-border)',
        backgroundColor: selected
          ? 'var(--color-accent-subtle)'
          : 'var(--color-bg-surface)',
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: 'var(--space-1)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-secondary)',
        }}
      >
        {description}
      </div>
    </button>
  );
}

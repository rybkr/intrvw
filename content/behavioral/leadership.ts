import { defineTemplate } from '../shared/scoring';
import { buildBehavioralSystemPrompt } from './_shared/system-prompt';
import { behavioralRubric } from './_shared/rubric';

export default defineTemplate({
  id: 'beh-leadership-v1',
  type: 'behavioral',
  title: 'Leadership & Influence',
  description:
    'Practice answering questions about leading teams, driving initiatives, and influencing technical decisions.',
  difficulty: 'senior',
  category: 'leadership',
  tags: ['leadership', 'influence', 'mentoring', 'decision-making'],
  estimatedMinutes: 30,

  systemPrompt: buildBehavioralSystemPrompt('senior', 'Leadership & Influence'),

  openingMessage:
    "Hi! Thanks for taking the time to chat today. This will be a behavioral interview focused on leadership and influence. I'll ask you about situations where you've led teams, driven initiatives, or influenced technical decisions. For each question, I'd love to hear about a specific example from your experience. Ready to get started?",

  questionBank: [
    {
      id: 'lead-q1',
      question:
        'Tell me about a time you led a significant technical initiative. What was the challenge, and how did you drive it forward?',
      followUps: [
        'How did you get buy-in from stakeholders?',
        'Were there disagreements? How did you handle them?',
        'What was the measurable impact?',
      ],
      hints: [
        'Think about a project that required coordination across teams.',
        'Consider a time when you had to convince others of a technical direction.',
      ],
      category: 'leadership',
      difficulty: 'senior',
    },
    {
      id: 'lead-q2',
      question:
        "Describe a time when you had to make a difficult technical decision with incomplete information. How did you approach it?",
      followUps: [
        'What were the trade-offs you considered?',
        'How did you communicate the decision and its rationale?',
        'Looking back, would you make the same decision?',
      ],
      hints: [
        'Think about architectural decisions, technology choices, or priority calls.',
      ],
      category: 'problemSolving',
      difficulty: 'senior',
    },
    {
      id: 'lead-q3',
      question:
        'Tell me about a time you mentored or developed someone on your team. What was your approach?',
      followUps: [
        'How did you identify what they needed?',
        'What specific actions did you take?',
        "How did you measure their growth?",
      ],
      hints: ['Consider both formal and informal mentoring situations.'],
      category: 'leadership',
      difficulty: 'senior',
    },
    {
      id: 'lead-q4',
      question:
        'Tell me about a project that failed or significantly underperformed. What was your role, and what did you learn?',
      followUps: [
        'What were the early warning signs?',
        'What would you do differently?',
        'How did you communicate the failure to stakeholders?',
      ],
      hints: [
        'Interviewers value honesty and self-awareness here. Focus on what you learned.',
      ],
      category: 'self-awareness',
      difficulty: 'senior',
    },
  ],

  rubric: behavioralRubric,

  version: 1,
  createdAt: '2026-02-19T00:00:00Z',
  updatedAt: '2026-02-19T00:00:00Z',
});

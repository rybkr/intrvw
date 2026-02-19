import type { InterviewTemplate, RubricItem } from '../../src/types/content';

/** Helper to create a template with full type checking */
export function defineTemplate(
  template: InterviewTemplate,
): InterviewTemplate {
  // Validate rubric weights sum to ~1.0
  const totalWeight = template.rubric.reduce((sum, r) => sum + r.weight, 0);
  if (Math.abs(totalWeight - 1.0) > 0.01) {
    console.warn(
      `Template "${template.id}": rubric weights sum to ${totalWeight}, expected 1.0`,
    );
  }
  return template;
}

/** Shared rubric dimensions used across interview types */
export const SHARED_RUBRIC: Record<string, Omit<RubricItem, 'id' | 'weight'>> =
  {
    communication: {
      dimension: 'Communication',
      description: 'Clarity, conciseness, and structure of verbal responses',
      scoringGuide: {
        low: 'Rambling, unclear, or disorganized responses. Difficulty articulating thoughts.',
        mid: 'Generally clear but occasionally verbose or unfocused. Adequate structure.',
        high: 'Concise, well-structured responses. Articulates complex ideas clearly. Good use of examples.',
      },
    },
    problemSolving: {
      dimension: 'Problem Solving',
      description:
        'Approach to breaking down problems and working through solutions',
      scoringGuide: {
        low: 'Jumps to solutions without analysis. Cannot break down problems.',
        mid: 'Shows some structured thinking. Identifies key aspects but may miss nuances.',
        high: 'Systematic decomposition. Considers multiple angles. Identifies edge cases and trade-offs.',
      },
    },
    clarifyingQuestions: {
      dimension: 'Clarifying Questions',
      description:
        'Quality of questions asked to understand the problem or scenario',
      scoringGuide: {
        low: 'Makes assumptions without asking. Questions are superficial.',
        mid: 'Asks some relevant questions but misses important dimensions.',
        high: 'Asks targeted questions that reveal deep understanding. Identifies ambiguities proactively.',
      },
    },
  };

import type { RubricItem } from '../../../src/types/content';
import { SHARED_RUBRIC } from '../../shared/scoring';

export const behavioralRubric: RubricItem[] = [
  {
    id: 'beh-communication',
    ...SHARED_RUBRIC.communication!,
    weight: 0.25,
  },
  {
    id: 'beh-problem-solving',
    ...SHARED_RUBRIC.problemSolving!,
    weight: 0.2,
  },
  {
    id: 'beh-star-method',
    dimension: 'STAR Method',
    description:
      'Use of Situation-Task-Action-Result structure in behavioral responses',
    scoringGuide: {
      low: 'No clear structure. Missing key STAR elements. Vague or hypothetical answers.',
      mid: 'Covers most STAR elements. Some answers are specific but others lack detail on actions or results.',
      high: 'Consistently uses STAR structure. Specific, concrete examples with quantified results where possible.',
    },
    weight: 0.25,
  },
  {
    id: 'beh-self-awareness',
    dimension: 'Self-Awareness',
    description: 'Ability to reflect on experiences, learn from mistakes, and show growth',
    scoringGuide: {
      low: 'Deflects blame. Cannot articulate lessons learned. Lacks introspection.',
      mid: 'Shows some reflection. Can identify what went wrong but struggles with nuanced self-assessment.',
      high: 'Demonstrates genuine self-awareness. Articulates specific lessons and how they changed behavior.',
    },
    weight: 0.15,
  },
  {
    id: 'beh-leadership',
    dimension: 'Leadership & Influence',
    description: 'Evidence of leadership, initiative, and ability to influence outcomes',
    scoringGuide: {
      low: 'Passive role in stories. Follows instructions without initiative.',
      mid: 'Shows initiative in some examples. Can influence within their immediate team.',
      high: 'Proactive leader. Drives initiatives, influences cross-team decisions, mentors others.',
    },
    weight: 0.15,
  },
];

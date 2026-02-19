import type { RubricItem } from '../../../src/types/content';
import { SHARED_RUBRIC } from '../../shared/scoring';

export const systemDesignRubric: RubricItem[] = [
  {
    id: 'sd-communication',
    ...SHARED_RUBRIC.communication!,
    weight: 0.15,
  },
  {
    id: 'sd-clarifying',
    ...SHARED_RUBRIC.clarifyingQuestions!,
    weight: 0.15,
  },
  {
    id: 'sd-component-identification',
    dimension: 'Component Identification',
    description: 'Ability to identify the major components needed for the system',
    scoringGuide: {
      low: 'Misses critical components. Cannot articulate what the system needs.',
      mid: 'Identifies most required components but misses some or includes unnecessary ones.',
      high: 'Identifies all critical components and explains why each is needed. Good separation of concerns.',
    },
    weight: 0.2,
  },
  {
    id: 'sd-tradeoff-analysis',
    dimension: 'Trade-off Analysis',
    description: 'Ability to evaluate and articulate trade-offs between design choices',
    scoringGuide: {
      low: 'Makes choices without considering alternatives. Cannot explain trade-offs.',
      mid: 'Acknowledges trade-offs when prompted. Can compare two options.',
      high: 'Proactively identifies trade-offs. Evaluates multiple dimensions (cost, complexity, performance, reliability).',
    },
    weight: 0.2,
  },
  {
    id: 'sd-scalability',
    dimension: 'Scalability Awareness',
    description: 'Understanding of how the system scales and where bottlenecks emerge',
    scoringGuide: {
      low: 'Does not consider scale. Single-server mindset.',
      mid: 'Identifies that scaling is needed. Knows about horizontal scaling and caching but lacks depth.',
      high: 'Quantifies load. Identifies bottlenecks. Proposes specific scaling strategies with numbers.',
    },
    weight: 0.2,
  },
  {
    id: 'sd-depth',
    dimension: 'Technical Depth',
    description: 'Depth of knowledge in chosen components and technologies',
    scoringGuide: {
      low: 'Surface-level knowledge. Cannot explain how components work internally.',
      mid: 'Solid understanding of most components. Can explain key mechanisms.',
      high: 'Deep expertise. Understands internal workings, failure modes, and tuning parameters.',
    },
    weight: 0.1,
  },
];

import type { Difficulty, InterviewType, ISOTimestamp } from './data';

export interface InterviewTemplate {
  id: string;
  type: InterviewType;
  title: string;
  description: string;
  difficulty: Difficulty;
  category: string;
  tags: string[];
  estimatedMinutes: number;
  systemPrompt: string;
  openingMessage: string;
  questionBank: QuestionBankItem[];
  rubric: RubricItem[];
  expectedComponents?: ExpectedComponent[];
  version: number;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface QuestionBankItem {
  id: string;
  question: string;
  followUps: string[];
  hints: string[];
  category: string;
  difficulty: Difficulty;
}

export interface RubricItem {
  id: string;
  dimension: string;
  description: string;
  scoringGuide: {
    low: string;
    mid: string;
    high: string;
  };
  weight: number;
}

export interface ExpectedComponent {
  name: string;
  required: boolean;
  description: string;
  aliases: string[];
  connections: string[];
}

/** Helper to create a template with type checking */
export function defineTemplate(template: InterviewTemplate): InterviewTemplate {
  return template;
}

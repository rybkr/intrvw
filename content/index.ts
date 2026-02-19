import { behavioralTemplates } from './behavioral';
import { systemDesignTemplates } from './system-design';
import type { InterviewTemplate } from '../src/types/content';

/** All available interview templates */
export const allTemplates: InterviewTemplate[] = [
  ...behavioralTemplates,
  ...systemDesignTemplates,
];

/** Look up a template by ID */
export function getTemplateById(id: string): InterviewTemplate | undefined {
  return allTemplates.find((t) => t.id === id);
}

/** Filter templates by type and/or difficulty */
export function filterTemplates(filters: {
  type?: InterviewTemplate['type'];
  difficulty?: InterviewTemplate['difficulty'];
  category?: string;
}): InterviewTemplate[] {
  return allTemplates.filter((t) => {
    if (filters.type && t.type !== filters.type) return false;
    if (filters.difficulty && t.difficulty !== filters.difficulty) return false;
    if (filters.category && t.category !== filters.category) return false;
    return true;
  });
}

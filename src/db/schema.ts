import Dexie, { type EntityTable } from 'dexie';
import type {
  User,
  Interview,
  InterviewMessage,
  InterviewFeedback,
  WhiteboardSnapshot,
  UserProgress,
} from '@/types/data';
import type { InterviewTemplate } from '@/types/content';

const db = new Dexie('intrvw') as Dexie & {
  users: EntityTable<User, 'id'>;
  interviews: EntityTable<Interview, 'id'>;
  messages: EntityTable<InterviewMessage, 'id'>;
  feedback: EntityTable<InterviewFeedback, 'id'>;
  whiteboardSnapshots: EntityTable<WhiteboardSnapshot, 'id'>;
  templates: EntityTable<InterviewTemplate, 'id'>;
  userProgress: EntityTable<UserProgress, 'id'>;
};

db.version(1).stores({
  users: 'id, email, updatedAt',
  interviews:
    'id, userId, templateId, type, difficulty, status, ' +
    '[userId+type], [userId+status], startedAt, completedAt',
  messages: 'id, interviewId, [interviewId+sequenceNumber], timestamp',
  feedback: 'id, interviewId, overallScore',
  whiteboardSnapshots: 'id, interviewId, [interviewId+sequenceNumber]',
  templates: 'id, type, difficulty, category, [type+difficulty], *tags',
  userProgress: 'id, userId, periodType, [userId+periodType], periodStart',
});

export { db };

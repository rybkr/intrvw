# INTRVW -- Technical Architecture Document

**Version**: 1.0
**Date**: 2026-02-19
**Status**: Foundation / Pre-implementation

---

## Table of Contents

1. [Architecture Principles](#1-architecture-principles)
2. [Data Model](#2-data-model)
3. [Local Storage Architecture](#3-local-storage-architecture)
4. [Sync Architecture](#4-sync-architecture)
5. [Interview Content System](#5-interview-content-system)
6. [Deployment Strategy](#6-deployment-strategy)
7. [Project Structure](#7-project-structure)
8. [Risk Assessment](#8-risk-assessment)

---

## 1. Architecture Principles

These principles are ordered by priority. When two principles conflict, the higher-numbered principle yields to the lower.

### P1 -- Offline-Complete
The app must work **fully offline** after the initial model download. No feature degrades without a network connection. The network is a progressive enhancement for sync, not a requirement for function.

### P2 -- Zero Recurring Cost
No paid APIs, no cloud compute, no server infrastructure required for the core experience. The user pays nothing after downloading the app. Any optional cloud sync must have a credible free tier or self-host path.

### P3 -- Browser-Native Compute
All inference (LLM, STT, TTS) runs inside the browser or on a localhost process the user controls. User data and voice never leave the device unless the user explicitly opts into sync.

### P4 -- Audio Is Ephemeral, Text Is Permanent
Raw audio blobs are expensive to store (tens of MB per interview). The system transcribes audio in real-time and stores transcripts as the permanent record. Raw audio is retained temporarily for playback review, then garbage-collected on a configurable schedule.

### P5 -- Content-Driven Interview Quality
The quality of mock interviews depends more on well-crafted prompts, rubrics, and question banks than on model size. The content layer (templates, rubrics, evaluation criteria) is a first-class, version-controlled part of the codebase -- not an afterthought stuffed into a database.

### P6 -- Progressive Capability Loading
The app shell loads fast. Models load on demand and in the background. The user sees a functional UI immediately, with capability indicators showing what is ready ("LLM loading... 43%") and what is available.

### P7 -- Separation of Inference Runtime
The inference layer (Trillim) is behind an abstraction boundary. The app talks to an `InferenceProvider` interface, not directly to Trillim internals. This allows swapping between WASM-in-browser mode and local-Python-server mode without changing application code.

### P8 -- Local-First Data Ownership
All data is created and stored locally first. Cloud sync is an optional, additive layer. The IndexedDB database is the source of truth. If the sync server disappears, the user loses nothing.

### P9 -- Statically Deployable
The production build is a set of static files that can be served from any CDN, file server, or `file://` protocol. No server-side rendering, no edge functions, no lambda invocations in the critical path.

### P10 -- Explicit Over Automatic
No auto-saving half-finished interviews. No silent data deletion. No background syncs without user awareness. Every destructive or network operation requires clear user intent or at minimum, visible status indication.

### P11 -- Accessible by Default
Push-to-talk is the primary speech input, but text input is always available as a parallel path. The app is usable without a microphone. Screen reader compatibility is a baseline, not a stretch goal.

### P12 -- Monorepo Simplicity
One repository. One package manager (`pnpm`). No micro-frontends, no workspace package publishing, no multi-service orchestration. Complexity is managed through directory conventions, not toolchain proliferation.

---

## 2. Data Model

All schemas are defined as TypeScript interfaces. Fields marked with `?` are optional. UUIDs are used for all primary keys to support offline creation and future cross-device sync without ID collisions.

### 2.1 Core Entities

```typescript
// src/types/data.ts

/** ISO 8601 timestamp string */
type ISOTimestamp = string;

/** UUID v4 string */
type UUID = string;

// ─── User ───────────────────────────────────────────────────────────────

interface User {
  id: UUID;
  displayName: string;
  email?: string;                    // populated when auth is enabled
  avatarUrl?: string;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
  settings: UserSettings;
  syncEnabled: boolean;
  syncToken?: string;                // opaque token for cloud auth
}

interface UserSettings {
  preferredDifficulty: Difficulty;
  preferredInterviewTypes: InterviewType[];
  audioRetentionDays: number;        // default: 7
  theme: 'light' | 'dark' | 'system';
  pushToTalkKey: string;             // default: 'Space'
  ttsVoice: string;                  // Piper voice identifier
  ttsSpeed: number;                  // 0.5 - 2.0, default 1.0
}

type Difficulty = 'junior' | 'mid' | 'senior' | 'staff';
type InterviewType = 'behavioral' | 'system-design';

// ─── Interview ──────────────────────────────────────────────────────────

interface Interview {
  id: UUID;
  userId: UUID;
  templateId: UUID;                  // links to InterviewTemplate
  type: InterviewType;
  topic: string;                     // e.g., "Design a URL shortener"
  difficulty: Difficulty;
  status: 'in-progress' | 'completed' | 'abandoned';
  startedAt: ISOTimestamp;
  completedAt?: ISOTimestamp;
  durationSeconds?: number;          // computed on completion
  messageCount: number;              // denormalized for list views
  feedbackId?: UUID;                 // links to InterviewFeedback
  metadata: Record<string, unknown>; // extensible bag for future fields
}

// ─── InterviewMessage ───────────────────────────────────────────────────

interface InterviewMessage {
  id: UUID;
  interviewId: UUID;                 // foreign key, indexed
  role: 'interviewer' | 'candidate' | 'system';
  content: string;                   // transcript text
  timestamp: ISOTimestamp;
  sequenceNumber: number;            // monotonic order within interview
  inputMode: 'voice' | 'text';      // how the candidate provided input
  audioBlobKey?: string;             // key into OPFS for raw audio
  audioSizeBytes?: number;           // for storage accounting
  durationMs?: number;               // audio duration
}

// ─── InterviewFeedback ──────────────────────────────────────────────────

interface InterviewFeedback {
  id: UUID;
  interviewId: UUID;                 // foreign key, indexed
  generatedAt: ISOTimestamp;
  overallScore: number;              // 1-10
  scores: FeedbackScores;
  summary: string;                   // 2-3 paragraph overall assessment
  strengths: string[];               // bullet points
  weaknesses: string[];              // bullet points
  suggestions: string[];             // actionable next steps
  rubricResults?: RubricResult[];    // per-rubric-item evaluation
}

interface FeedbackScores {
  communication: number;             // 1-10
  technicalDepth: number;            // 1-10
  problemSolving: number;            // 1-10
  clarifyingQuestions: number;        // 1-10
  structuredThinking: number;        // 1-10
  // System design only:
  componentIdentification?: number;  // 1-10
  tradeoffAnalysis?: number;         // 1-10
  scalabilityAwareness?: number;     // 1-10
}

interface RubricResult {
  rubricItemId: string;              // references template rubric
  score: number;                     // 1-10
  explanation: string;
}

// ─── WhiteboardSnapshot ─────────────────────────────────────────────────

interface WhiteboardSnapshot {
  id: UUID;
  interviewId: UUID;                 // foreign key, indexed
  capturedAt: ISOTimestamp;
  sequenceNumber: number;            // order of snapshots
  triggerMessageId?: UUID;           // which message prompted this snapshot
  canvasState: CanvasState;          // full serializable canvas
  thumbnailDataUrl?: string;         // small PNG for list previews
}

interface CanvasState {
  format: 'excalidraw-json';         // using Excalidraw's native format
  version: number;
  elements: unknown[];               // Excalidraw element array
  appState?: Record<string, unknown>;
}

// ─── InterviewTemplate ──────────────────────────────────────────────────

interface InterviewTemplate {
  id: UUID;
  type: InterviewType;
  title: string;                     // e.g., "Design a Chat Application"
  description: string;
  difficulty: Difficulty;
  category: string;                  // e.g., "distributed-systems", "leadership"
  tags: string[];
  estimatedMinutes: number;
  systemPrompt: string;              // the AI interviewer's persona + instructions
  openingMessage: string;            // first message from interviewer
  questionBank: QuestionBankItem[];
  rubric: RubricItem[];
  // System design specific:
  expectedComponents?: ExpectedComponent[];
  version: number;                   // content version for updates
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

interface QuestionBankItem {
  id: string;
  question: string;
  followUps: string[];               // conditional follow-up questions
  hints: string[];                   // if candidate is stuck
  category: string;                  // maps to scoring dimension
  difficulty: Difficulty;
}

interface RubricItem {
  id: string;
  dimension: string;                 // e.g., "scalability", "communication"
  description: string;
  scoringGuide: {
    low: string;                     // what a 1-3 looks like
    mid: string;                     // what a 4-6 looks like
    high: string;                    // what a 7-10 looks like
  };
  weight: number;                    // relative importance (0-1, sums to 1)
}

interface ExpectedComponent {
  name: string;                      // e.g., "Load Balancer", "Cache Layer"
  required: boolean;                 // must-have vs nice-to-have
  description: string;
  aliases: string[];                 // alternative names the candidate might use
  connections: string[];             // names of components it should connect to
}

// ─── UserProgress ───────────────────────────────────────────────────────

interface UserProgress {
  id: UUID;
  userId: UUID;
  periodStart: ISOTimestamp;         // beginning of the aggregation period
  periodType: 'daily' | 'weekly' | 'monthly' | 'all-time';
  interviewCount: number;
  totalDurationSeconds: number;
  averageOverallScore: number;
  averageScores: Partial<FeedbackScores>;
  interviewsByType: Record<InterviewType, number>;
  interviewsByDifficulty: Record<Difficulty, number>;
  streakDays: number;                // consecutive days with at least one interview
  updatedAt: ISOTimestamp;
}
```

### 2.2 Entity Relationship Diagram

```
User 1──────────* Interview
                    │
                    ├── 1──* InterviewMessage
                    │
                    ├── 1──1 InterviewFeedback
                    │
                    └── 1──* WhiteboardSnapshot

InterviewTemplate 1──────* Interview

User 1──────────* UserProgress (one per period type)
```

### 2.3 Design Decisions

**Why UUIDs everywhere**: Interviews are created offline. Auto-incrementing IDs would collide across devices when sync is added. `crypto.randomUUID()` is available in all modern browsers.

**Why `sequenceNumber` on messages**: Timestamps alone are insufficient for ordering (clock skew, same-millisecond messages). A monotonically increasing integer within each interview guarantees display order.

**Why `audioBlobKey` instead of inline blob**: Audio data is large and would bloat IndexedDB reads of message lists. Audio lives in OPFS (see Section 3) and is referenced by key.

**Why denormalized `messageCount` on Interview**: Avoids counting queries on the messages store when rendering the interview list view.

---

## 3. Local Storage Architecture

### 3.1 Storage Layer Decisions

| Data Type | Storage | Rationale |
|-----------|---------|-----------|
| Structured data (interviews, messages, feedback, templates, progress) | **IndexedDB** via Dexie.js | Queryable, indexed, transactional. Dexie provides migrations, live queries for React, and optional cloud sync path. |
| Raw audio blobs | **Origin Private File System (OPFS)** | Designed for large binary files. Does not bloat IndexedDB. Accessible via `navigator.storage.getDirectory()`. Stream-friendly for playback. |
| WASM model weights (LLM, Whisper, Piper) | **Cache API** | HTTP cache semantics are ideal for large, versioned, immutable files fetched from a CDN. Survives page reloads. Can be managed with a Service Worker for offline. |
| App shell + static assets | **Cache API** via Service Worker | Standard PWA pattern. Precache on install, network-first for updates. |

### 3.2 Why Dexie.js

**Recommendation: [Dexie.js](https://dexie.org/) v4.x**

Rationale:
- **Live Queries**: `useLiveQuery()` hook provides reactive data binding for React -- when IndexedDB data changes, components re-render automatically. This is critical for the interview chat view.
- **Schema Migrations**: Declarative version-based migrations handle schema evolution as features are added.
- **Dexie Cloud**: If/when cloud sync is needed, Dexie Cloud provides a turnkey sync solution with CRDT support (including Y.js integration for the whiteboard). This avoids building a custom sync protocol.
- **Query API**: Compound indexes, multi-entry indexes, and `.where()` chaining cover all query patterns needed (e.g., "all interviews of type system-design, ordered by date, with difficulty >= senior").
- **Bundle Size**: ~45KB minified+gzipped. Acceptable for an app that downloads multi-GB models.
- **Maturity**: 10+ years of development. Active maintenance. Large community.

Alternatives considered:
- **idb**: Too low-level. Would require building migration, reactivity, and sync layers manually.
- **RxDB**: More powerful sync capabilities but significantly larger bundle and more complexity than needed at this stage.
- **localForage**: Key-value only. Insufficient for relational data with indexes.

### 3.3 IndexedDB Schema (Dexie)

```typescript
// src/db/schema.ts

import Dexie, { type EntityTable } from 'dexie';

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
  // Primary key listed first, then indexed fields.
  // Compound indexes use [field1+field2] syntax.

  users: 'id, email, updatedAt',

  interviews: 'id, userId, templateId, type, difficulty, status, ' +
              '[userId+type], [userId+status], startedAt, completedAt',

  messages: 'id, interviewId, [interviewId+sequenceNumber], timestamp',

  feedback: 'id, interviewId, overallScore',

  whiteboardSnapshots: 'id, interviewId, [interviewId+sequenceNumber]',

  templates: 'id, type, difficulty, category, [type+difficulty], *tags',

  userProgress: 'id, userId, periodType, [userId+periodType], periodStart',
});

export { db };
```

**Index rationale**:
- `[interviewId+sequenceNumber]` on messages: fetching all messages for an interview in order is the most common query.
- `[userId+type]` on interviews: "show me all my system design interviews" is a core dashboard query.
- `*tags` on templates: multi-entry index allows querying templates by any tag.
- `[type+difficulty]` on templates: filtering the template picker by both dimensions.

### 3.4 OPFS Audio Storage

```typescript
// src/db/audio-store.ts

const AUDIO_ROOT_DIR = 'interview-audio';

async function getAudioDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(AUDIO_ROOT_DIR, { create: true });
}

/** Store a recorded audio blob, returns the storage key */
async function storeAudio(
  interviewId: string,
  messageId: string,
  blob: Blob
): Promise<string> {
  const dir = await getAudioDir();
  const key = `${interviewId}/${messageId}.webm`;
  // OPFS uses flat keys; we encode the path
  const fileHandle = await dir.getFileHandle(
    encodeURIComponent(key),
    { create: true }
  );
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
  return key;
}

/** Retrieve audio blob for playback */
async function getAudio(key: string): Promise<Blob | null> {
  try {
    const dir = await getAudioDir();
    const fileHandle = await dir.getFileHandle(encodeURIComponent(key));
    const file = await fileHandle.getFile();
    return file;
  } catch {
    return null; // file was garbage-collected or never stored
  }
}

/** Delete audio for a specific interview (called during cleanup) */
async function deleteInterviewAudio(interviewId: string): Promise<void> {
  const dir = await getAudioDir();
  for await (const [name] of dir.entries()) {
    if (decodeURIComponent(name).startsWith(interviewId + '/')) {
      await dir.removeEntry(name);
    }
  }
}
```

### 3.5 Storage Size Estimates

| Data Type | Per Interview Estimate | Basis |
|-----------|----------------------|-------|
| Interview record | ~0.5 KB | Small JSON object |
| Messages (30 min, ~40 exchanges) | ~20-50 KB | Text transcripts, ~500-1200 chars each |
| Feedback | ~5-10 KB | Scores + narrative text |
| Whiteboard snapshots (5 snapshots) | ~50-200 KB | Excalidraw JSON (varies by diagram complexity) |
| Audio blobs (30 min, both sides) | **30-60 MB** | WebM Opus at ~128kbps, ~1MB/min candidate audio |
| **Total per interview (with audio)** | **~30-60 MB** | Audio dominates |
| **Total per interview (text only)** | **~75-260 KB** | Quite small |

**Storage budget reasoning**: With audio retention set to 7 days and a user doing 3 interviews/week, peak audio storage is approximately 21 interviews * 45 MB = ~945 MB. This is within typical browser storage quotas (Chrome allows up to 60% of disk space for an origin; Firefox allows up to 50%).

Without audio (after GC), 100 interviews consume approximately 25 MB of IndexedDB storage. This is negligible.

### 3.6 Model Weight Storage

| Model | Approximate Size | Storage |
|-------|-----------------|---------|
| LLM (Trillim, quantized) | 500 MB - 5 GB | Cache API |
| Whisper (tiny/base) | 40 - 150 MB | Cache API |
| Piper TTS (single voice) | 15 - 60 MB | Cache API |
| **Total** | **~555 MB - 5.2 GB** | |

Models are fetched once from the CDN and stored in the Cache API. A Service Worker intercepts subsequent requests and serves from cache. Model version is embedded in the URL path (e.g., `/models/whisper-tiny-v1.0/model.onnx`) so cache invalidation is handled by URL change.

### 3.7 Cleanup / Retention Policies

```typescript
// src/db/cleanup.ts

interface RetentionPolicy {
  audioRetentionDays: number;      // default: 7
  abandonedInterviewDays: number;  // default: 30
  maxAudioStorageMB: number;       // default: 1000
}

/**
 * Run on app startup and every 24 hours.
 *
 * 1. Delete audio blobs older than audioRetentionDays.
 *    - Null out audioBlobKey on corresponding messages.
 *    - Transcripts are preserved permanently.
 *
 * 2. If total audio storage exceeds maxAudioStorageMB,
 *    delete oldest audio first (LRU by interview completedAt).
 *
 * 3. Delete abandoned interviews (status='in-progress')
 *    older than abandonedInterviewDays, including their
 *    messages, snapshots, and audio.
 *
 * 4. Recalculate UserProgress aggregates for affected periods.
 */
async function runCleanup(policy: RetentionPolicy): Promise<CleanupReport> {
  // Implementation details omitted -- this is the contract
}
```

**Critical invariant**: Cleanup NEVER deletes transcript text or feedback. Only raw audio and abandoned incomplete interviews are removed.

---

## 4. Sync Architecture

Sync is a **Phase 2** feature. The data model and storage layer are designed to support it, but the initial release is fully local-only.

### 4.1 Sync Strategy: Dexie Cloud

**Recommendation: [Dexie Cloud](https://dexie.org/cloud)**

Rationale:
- Already using Dexie.js for local storage, so Dexie Cloud is a natural extension -- it adds sync with zero changes to the query layer.
- Provides built-in authentication (email OTP, OAuth providers).
- Uses server-side merge with per-object conflict resolution (effectively last-write-wins at the field level for simple objects).
- For the whiteboard canvas (which needs collaborative-style merge semantics), Dexie Cloud v4.1 integrates with Y.js CRDTs natively.
- Pricing: Free tier available. Self-hostable with the premium license for zero-cost operation if desired.

**Alternative considered: Custom sync with PocketBase/Supabase**
- Pro: Full control, no vendor dependency.
- Con: Requires building conflict resolution, change tracking, delta sync, and offline queue from scratch. Estimated 4-8 weeks of engineering effort that Dexie Cloud provides out of the box.
- Verdict: Only pursue if Dexie Cloud proves insufficient or too costly.

**Alternative considered: CRDTs with Automerge/Y.js directly**
- Pro: Theoretically superior conflict resolution.
- Con: Requires a sync server, custom protocol, and significantly more complexity. Overkill for single-user data that occasionally syncs across devices.
- Verdict: Y.js is used for whiteboard state via the Dexie Cloud Y.js integration. Full CRDT for all data is unnecessary.

### 4.2 What Syncs vs What Stays Local

| Data | Syncs? | Rationale |
|------|--------|-----------|
| User profile + settings | Yes | Consistent experience across devices |
| Interviews (metadata) | Yes | See history everywhere |
| Interview messages (text) | Yes | Core value -- review transcripts anywhere |
| Interview feedback | Yes | Core value -- track progress across devices |
| Whiteboard snapshots | Yes | Part of the interview record |
| UserProgress aggregates | Yes | Dashboard data |
| Interview templates | **No** -- shipped with app | Static content, versioned with deploys |
| Audio blobs | **No** | Too large, ephemeral by policy |
| Model weights | **No** | Fetched from CDN per device |
| User settings > local overrides | **No** | Device-specific (e.g., audio device selection) |

### 4.3 Auth Strategy

**Phase 1 (local-only)**: A single default `User` record is created on first launch. No authentication UI.

**Phase 2 (sync-enabled)**: Dexie Cloud provides authentication. Recommended flow:

1. **Primary: Magic link (email OTP)** -- lowest friction, no password to manage.
2. **Secondary: OAuth** (Google, GitHub) -- one-click for users who prefer it.
3. **Future: Passkeys/WebAuthn** -- passwordless, phishing-resistant. Add when browser support is ubiquitous.

The `User.syncToken` field stores the Dexie Cloud auth token. The local user record merges with the cloud identity on first sync.

### 4.4 Sync Data Flow

```
┌──────────────────────────────────────────────┐
│                  Browser                      │
│                                               │
│  ┌─────────┐    ┌──────────┐    ┌──────────┐ │
│  │ React   │───▶│ Dexie.js │───▶│IndexedDB │ │
│  │ UI      │◀───│ (live    │◀───│          │ │
│  │         │    │  queries)│    │          │ │
│  └─────────┘    └────┬─────┘    └──────────┘ │
│                      │                        │
│                      │ Dexie Cloud addon      │
│                      │ (background sync)      │
└──────────────────────┼────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │  Dexie Cloud   │
              │  Server        │
              │  (PostgreSQL)  │
              └────────┬───────┘
                       │
                       ▼
              ┌────────────────┐
              │  Other Devices │
              │  (same user)   │
              └────────────────┘
```

### 4.5 Conflict Resolution

- **Simple fields** (scores, timestamps, strings): Last-write-wins. For single-user cross-device sync, conflicts are rare and LWW is sufficient.
- **Whiteboard canvas**: Y.js CRDT via `y-dexie`. Merges concurrent edits structurally. (This matters mainly if real-time collaborative features are ever added; for single-user sync, even LWW would work.)
- **Messages**: Append-only. No conflicts possible -- messages are immutable after creation.

---

## 5. Interview Content System

### 5.1 Content Architecture

Interview content is **static, version-controlled TypeScript** -- not database records. This ensures:
- Content changes are reviewed in pull requests.
- Content ships with the app bundle (no fetching required).
- TypeScript compiler catches structural errors in templates.
- Content can reference other content by import (e.g., shared rubric dimensions).

```
content/
├── behavioral/
│   ├── _shared/
│   │   ├── rubric.ts              # shared behavioral rubric dimensions
│   │   └── system-prompt.ts       # base behavioral interviewer prompt
│   ├── leadership.ts
│   ├── conflict-resolution.ts
│   ├── failure-and-growth.ts
│   └── index.ts                   # re-exports all behavioral templates
├── system-design/
│   ├── _shared/
│   │   ├── rubric.ts              # shared system design rubric dimensions
│   │   ├── system-prompt.ts       # base system design interviewer prompt
│   │   └── components.ts          # canonical component library
│   ├── url-shortener.ts
│   ├── chat-application.ts
│   ├── rate-limiter.ts
│   └── index.ts
├── shared/
│   ├── scoring.ts                 # shared scoring logic and types
│   └── prompt-utils.ts            # template string helpers
└── index.ts                       # master registry of all templates
```

### 5.2 Template Structure

```typescript
// content/system-design/url-shortener.ts

import { defineTemplate } from '../shared/scoring';
import { baseSystemDesignPrompt } from './_shared/system-prompt';
import { baseSystemDesignRubric } from './_shared/rubric';

export default defineTemplate({
  id: 'sd-url-shortener-v1',
  type: 'system-design',
  title: 'Design a URL Shortener',
  description:
    'Design a service like bit.ly that takes long URLs and generates ' +
    'short, unique aliases. Consider the read/write ratio, storage, ' +
    'and how to handle collisions.',
  difficulty: 'mid',
  category: 'distributed-systems',
  tags: ['hashing', 'databases', 'caching', 'horizontal-scaling'],
  estimatedMinutes: 45,

  systemPrompt: `${baseSystemDesignPrompt}

## Topic-Specific Instructions

You are interviewing the candidate on designing a URL shortening service.

Start by asking them to gather requirements. A strong candidate will ask about:
- Expected scale (reads vs writes per second)
- URL expiration policy
- Custom short URLs
- Analytics requirements

Guide them through these phases:
1. Requirements gathering (5 min)
2. High-level design (10 min)
3. Deep dive into components (15 min)
4. Scalability and trade-offs (10 min)
5. Wrap-up (5 min)

If the candidate gets stuck, offer hints from the question bank.
Do not give away answers. Ask probing follow-up questions.
If the candidate mentions a component, ask them to explain WHY
it is needed and what alternatives they considered.`,

  openingMessage:
    "Welcome! Today we'll be working through a system design problem. " +
    "I'd like you to design a URL shortening service -- something like " +
    "bit.ly. Before we dive into the design, let's start by understanding " +
    "the requirements. What questions do you have about the system we're building?",

  questionBank: [
    {
      id: 'url-short-q1',
      question: 'How would you generate a unique short URL for each long URL?',
      followUps: [
        'What happens if two different long URLs produce the same hash?',
        'How would you handle the collision?',
        'What are the trade-offs between hashing and a counter-based approach?',
      ],
      hints: [
        'Think about base62 encoding...',
        'Consider both hash-based and counter-based approaches.',
      ],
      category: 'technicalDepth',
      difficulty: 'mid',
    },
    {
      id: 'url-short-q2',
      question: 'How would you design the database schema for this service?',
      followUps: [
        'SQL or NoSQL? Why?',
        'What indexes would you need?',
        'How would you handle the read/write ratio?',
      ],
      hints: [
        'Consider the access patterns -- mostly reads or writes?',
      ],
      category: 'technicalDepth',
      difficulty: 'mid',
    },
    {
      id: 'url-short-q3',
      question: 'How would this system handle 10,000 requests per second?',
      followUps: [
        'Where would you add caching?',
        'How would you scale the write path?',
        'What happens during a cache miss?',
      ],
      hints: [
        'Think about what data is read-heavy and cache-friendly.',
      ],
      category: 'scalabilityAwareness',
      difficulty: 'senior',
    },
  ],

  rubric: [
    ...baseSystemDesignRubric,
    {
      id: 'url-short-r1',
      dimension: 'URL Generation Strategy',
      description: 'Candidate identifies and evaluates approaches for generating short URLs',
      scoringGuide: {
        low: 'Only mentions one approach. Cannot explain collision handling.',
        mid: 'Compares hash-based vs counter-based. Identifies collision risk.',
        high: 'Deep analysis of trade-offs. Discusses base62, MD5/SHA truncation, ' +
              'Snowflake IDs. Addresses collision probability quantitatively.',
      },
      weight: 0.15,
    },
  ],

  expectedComponents: [
    {
      name: 'Load Balancer',
      required: true,
      description: 'Distributes incoming requests across application servers',
      aliases: ['LB', 'reverse proxy', 'nginx', 'ALB'],
      connections: ['Application Server'],
    },
    {
      name: 'Application Server',
      required: true,
      description: 'Handles URL creation and redirect logic',
      aliases: ['API server', 'web server', 'backend'],
      connections: ['Database', 'Cache', 'Load Balancer'],
    },
    {
      name: 'Database',
      required: true,
      description: 'Persistent storage for URL mappings',
      aliases: ['DB', 'MySQL', 'PostgreSQL', 'DynamoDB', 'Cassandra', 'data store'],
      connections: ['Application Server'],
    },
    {
      name: 'Cache',
      required: true,
      description: 'In-memory cache for hot URL lookups',
      aliases: ['Redis', 'Memcached', 'caching layer'],
      connections: ['Application Server'],
    },
    {
      name: 'CDN',
      required: false,
      description: 'Edge caching for the most popular redirects',
      aliases: ['CloudFront', 'edge cache', 'content delivery'],
      connections: ['Load Balancer'],
    },
    {
      name: 'Analytics Service',
      required: false,
      description: 'Tracks click counts, referrers, geographic data',
      aliases: ['analytics', 'tracking', 'metrics', 'click counter'],
      connections: ['Application Server', 'Message Queue'],
    },
    {
      name: 'Message Queue',
      required: false,
      description: 'Async processing for analytics writes',
      aliases: ['Kafka', 'RabbitMQ', 'SQS', 'queue', 'event bus'],
      connections: ['Application Server', 'Analytics Service'],
    },
  ],

  version: 1,
  createdAt: '2026-02-19T00:00:00Z',
  updatedAt: '2026-02-19T00:00:00Z',
});
```

### 5.3 System Prompt Architecture

The AI interviewer prompt is composed of three layers:

```
┌─────────────────────────────────────────────┐
│  Layer 1: Base Persona                       │
│  "You are a senior engineering interviewer   │
│   at a top tech company. You are warm but    │
│   rigorous. You never give away answers..."  │
├─────────────────────────────────────────────┤
│  Layer 2: Interview Type Instructions        │
│  (behavioral OR system-design specific)      │
│  Pacing, phases, evaluation focus areas      │
├─────────────────────────────────────────────┤
│  Layer 3: Topic-Specific Context             │
│  Question bank, expected components,         │
│  domain-specific follow-ups                  │
└─────────────────────────────────────────────┘
```

These layers are concatenated at interview start time. The `questionBank` and `expectedComponents` are injected into the system prompt as structured context the AI can reference.

### 5.4 Whiteboard Evaluation

For system design interviews, the whiteboard evaluation works as follows:

1. **Snapshots are captured** at key moments: after each candidate response, on explicit save, and at interview end.
2. **Component detection** runs locally by extracting text labels from the Excalidraw JSON elements.
3. **Fuzzy matching** compares extracted labels against `expectedComponents[].aliases` using simple string similarity (Levenshtein distance or substring matching).
4. **The evaluation prompt** sent to the LLM includes:
   - The list of expected components and which were detected on the canvas.
   - The list of connections (arrows) between components.
   - The full conversation transcript.
5. **The LLM generates** scores for `componentIdentification`, `tradeoffAnalysis`, and `scalabilityAwareness` based on both the diagram state and the verbal discussion.

This approach avoids complex computer vision -- Excalidraw's JSON format gives us structured access to all shapes, text, and connections.

---

## 6. Deployment Strategy

### 6.1 Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        User's Browser                            │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ React    │  │ Service  │  │ Web Workers  │  │ WASM       │  │
│  │ App      │  │ Worker   │  │              │  │ Runtime    │  │
│  │          │  │ (caching)│  │ - LLM infer. │  │ - Whisper  │  │
│  │          │  │          │  │ - Audio proc.│  │ - Piper    │  │
│  │          │  │          │  │ - Eval logic │  │ - Trillim  │  │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘  └──────┬─────┘  │
│       │              │               │                  │        │
│       ▼              ▼               ▼                  ▼        │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌────────────┐  │
│  │IndexedDB │  │Cache API │  │    OPFS      │  │ Cache API  │  │
│  │(Dexie)   │  │(SW cache)│  │  (audio)     │  │ (models)   │  │
│  └──────────┘  └──────────┘  └──────────────┘  └────────────┘  │
│                                                                  │
└───────────────────────────────┬──────────────────────────────────┘
                                │ HTTPS (initial load + model fetch)
                                ▼
                  ┌──────────────────────────┐
                  │    Static Hosting        │
                  │  (Cloudflare Pages)      │
                  │                          │
                  │  /              app shell │
                  │  /assets/       JS/CSS   │
                  │  /models/       weights  │
                  └──────────────────────────┘
```

### 6.2 Static Site Deployment

**Recommendation: Cloudflare Pages**

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **Cloudflare Pages** | Generous free tier (unlimited bandwidth), global CDN, Workers for future API needs, R2 for model storage | Slight vendor lock-in for Workers | **Recommended** |
| Vercel | Great DX, automatic previews | 100GB/mo bandwidth on free tier (models will consume this fast) | Model hosting would need separate origin |
| Netlify | Similar to Vercel | Same bandwidth concern | Same issue |
| GitHub Pages | Free, simple | 100MB repo size limit, 100GB/mo bandwidth, no custom headers | Insufficient for model hosting |

**Why Cloudflare specifically**: The free tier includes unlimited bandwidth and 10GB of R2 (object storage). R2 can host the multi-GB model weights without bandwidth charges (zero egress fees). This uniquely satisfies the zero-cost principle for a project that serves gigabytes of model data.

### 6.3 Model Weight Hosting

```
Model delivery pipeline:

  1. Model weights are quantized/optimized during CI
  2. Uploaded to Cloudflare R2 (or HuggingFace Hub as fallback)
  3. Served via Cloudflare CDN with immutable cache headers
  4. Service Worker intercepts fetch, serves from Cache API after first download
  5. Model version embedded in URL path for cache busting

URL pattern:
  https://models.intrvw.app/trillim/v1.0/model-q4.bin
  https://models.intrvw.app/whisper/tiny-v1.0/model.onnx
  https://models.intrvw.app/piper/en-us-amy-v1.0/model.onnx
```

**Fallback strategy**: If the primary CDN is down, models can be fetched from HuggingFace Hub as a secondary source. The Service Worker tries the primary URL first, falls back to HuggingFace, and caches from whichever succeeds.

**Alternative: HuggingFace Hub as primary**
- Pro: Already hosts most open-source models. Free. No infrastructure to manage.
- Con: No control over CDN caching headers. Slower in some regions. Rate limits on free tier.
- Verdict: Use as fallback, not primary.

### 6.4 Local Python Server Mode

For users who want higher-quality inference (larger models, GPU acceleration), Trillim can run as a local Python server instead of in-browser WASM.

**Packaging approach: `uv` (recommended)**

```bash
# User runs one command to start the local server:
uvx intrvw-server

# Or, from a cloned repo:
uv run python -m intrvw.server
```

**Why `uv`**: It handles Python version management, virtual environment creation, and dependency resolution in a single tool. No Docker required. No system Python contamination. Cross-platform.

**Architecture in local server mode**:

```
┌────────────────────────┐       ┌──────────────────────────┐
│      Browser           │       │   Local Python Server    │
│                        │       │                          │
│  React App             │◀─────▶│   Trillim (GPU/CPU)     │
│  (same UI)             │ HTTP  │   localhost:8741         │
│                        │       │                          │
│  InferenceProvider     │       │   POST /v1/chat          │
│   └─ LocalServerMode   │       │   POST /v1/evaluate     │
│                        │       │   GET  /v1/health       │
└────────────────────────┘       └──────────────────────────┘
```

The `InferenceProvider` abstraction in the frontend switches between:
- `BrowserWasmProvider`: Trillim running in a Web Worker via WASM/Pyodide.
- `LocalServerProvider`: HTTP calls to `localhost:8741`.

The user selects the mode in settings. The app auto-detects if the local server is running.

**Alternative: Tauri sidecar**
- Pro: Single-binary distribution, automatic lifecycle management.
- Con: Requires shipping a Tauri desktop app. Adds Rust build toolchain. Significant complexity increase.
- Verdict: Defer to Phase 3. The `uv run` approach covers the use case with minimal complexity.

**Alternative: Docker**
- Pro: Reproducible environment.
- Con: Docker Desktop is heavyweight, not free for commercial use, and most users doing mock interviews are not Docker-savvy.
- Verdict: Provide a Dockerfile for power users, but do not make it the primary path.

### 6.5 Service Worker Strategy

```typescript
// public/sw.ts (conceptual)

// Three caching strategies:

// 1. App Shell: Cache-first, update in background
//    Matches: /, /index.html, /assets/*.js, /assets/*.css
//    Ensures instant app load even offline.

// 2. Model Weights: Cache-first, never expire (immutable URLs)
//    Matches: /models/**
//    Downloads once. Served from cache forever (URL changes on new version).

// 3. API/Sync: Network-first, queue on failure
//    Matches: /api/** (future sync endpoints)
//    Attempts network, falls back to cache, queues writes for retry.
```

### 6.6 CI/CD Pipeline

```
┌─────────┐     ┌──────────┐     ┌───────────┐     ┌───────────┐
│  Push   │────▶│  Lint +  │────▶│   Build   │────▶│  Deploy   │
│  to     │     │  Type    │     │  + Test   │     │           │
│  main   │     │  Check   │     │           │     │           │
└─────────┘     └──────────┘     └───────────┘     └───────────┘

Tooling: GitHub Actions

Jobs:
  1. lint-and-typecheck:
     - pnpm install
     - pnpm lint          (ESLint + Prettier)
     - pnpm typecheck     (tsc --noEmit)

  2. test:
     - pnpm test          (Vitest -- unit + integration)
     - pnpm test:e2e      (Playwright -- critical paths)

  3. build:
     - pnpm build         (Vite production build)
     - Verify bundle size budget (warn if app shell > 200KB gzipped)

  4. deploy-preview (on PR):
     - Deploy to Cloudflare Pages preview URL
     - Comment PR with preview link

  5. deploy-production (on main merge):
     - Deploy to Cloudflare Pages production
     - Upload any new model files to R2 (if changed)

  6. content-validation (on content/ changes):
     - Validate all templates parse correctly
     - Check rubric weights sum to 1.0
     - Verify expectedComponents have no orphan connections
```

---

## 7. Project Structure

```
intrvw/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    # lint, test, build
│   │   └── deploy.yml                # Cloudflare Pages deployment
│   └── CODEOWNERS
│
├── .claude/
│   └── settings.local.json           # Claude Code permissions
│
├── content/                          # Interview content (Section 5)
│   ├── behavioral/
│   │   ├── _shared/
│   │   │   ├── rubric.ts
│   │   │   └── system-prompt.ts
│   │   ├── leadership.ts
│   │   ├── conflict-resolution.ts
│   │   └── index.ts
│   ├── system-design/
│   │   ├── _shared/
│   │   │   ├── rubric.ts
│   │   │   ├── system-prompt.ts
│   │   │   └── components.ts
│   │   ├── url-shortener.ts
│   │   ├── chat-application.ts
│   │   └── index.ts
│   ├── shared/
│   │   ├── scoring.ts
│   │   └── prompt-utils.ts
│   └── index.ts                      # Master template registry
│
├── public/
│   ├── sw.ts                         # Service Worker source
│   ├── manifest.json                 # PWA manifest
│   └── icons/                        # App icons (various sizes)
│
├── server/                           # Local Python server (optional)
│   ├── pyproject.toml                # uv project definition
│   ├── src/
│   │   └── intrvw_server/
│   │       ├── __init__.py
│   │       ├── __main__.py           # python -m intrvw_server
│   │       ├── api.py                # FastAPI routes
│   │       └── inference.py          # Trillim wrapper
│   └── tests/
│
├── src/
│   ├── app/
│   │   ├── App.tsx                   # Root component, router setup
│   │   ├── routes.tsx                # Route definitions
│   │   └── providers.tsx             # Context providers (theme, db, inference)
│   │
│   ├── components/
│   │   ├── ui/                       # Generic UI primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Dialog.tsx
│   │   │   ├── Progress.tsx
│   │   │   └── ...
│   │   ├── interview/                # Interview-specific components
│   │   │   ├── ChatPanel.tsx         # Message list + input
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── InterviewControls.tsx # Start, pause, end, PTT button
│   │   │   ├── FeedbackPanel.tsx     # Score display + narrative
│   │   │   └── TimerBar.tsx
│   │   ├── whiteboard/              # System design canvas
│   │   │   ├── WhiteboardCanvas.tsx  # Excalidraw wrapper
│   │   │   ├── ComponentPalette.tsx  # Draggable system components
│   │   │   └── SnapshotStrip.tsx     # Thumbnail timeline
│   │   ├── dashboard/               # Home / stats
│   │   │   ├── InterviewList.tsx
│   │   │   ├── ProgressCharts.tsx
│   │   │   └── QuickStart.tsx
│   │   ├── settings/
│   │   │   ├── SettingsPanel.tsx
│   │   │   ├── ModelManager.tsx      # Download/delete models
│   │   │   └── AudioSettings.tsx
│   │   └── onboarding/
│   │       ├── ModelDownload.tsx     # First-run model acquisition
│   │       └── MicrophoneSetup.tsx
│   │
│   ├── db/                          # Data layer (Section 3)
│   │   ├── schema.ts                # Dexie schema definition
│   │   ├── audio-store.ts           # OPFS audio operations
│   │   ├── cleanup.ts               # Retention policy enforcement
│   │   ├── migrations.ts            # Custom migration logic (if needed beyond Dexie)
│   │   └── seed.ts                  # Load templates into IndexedDB on first run
│   │
│   ├── hooks/                       # React hooks
│   │   ├── useInterview.ts          # Interview lifecycle management
│   │   ├── useMessages.ts           # Live query for interview messages
│   │   ├── useInference.ts          # Send prompt, get response
│   │   ├── useSpeech.ts             # PTT recording + Whisper transcription
│   │   ├── useTTS.ts                # Piper text-to-speech
│   │   ├── useWhiteboard.ts         # Canvas state + snapshot management
│   │   ├── useProgress.ts           # Aggregated stats
│   │   └── useModelStatus.ts        # Model download progress + readiness
│   │
│   ├── inference/                   # Inference abstraction layer
│   │   ├── provider.ts             # InferenceProvider interface
│   │   ├── browser-wasm.ts         # Trillim via WASM/Pyodide in Worker
│   │   ├── local-server.ts         # HTTP calls to localhost Python server
│   │   ├── evaluator.ts            # Feedback generation logic
│   │   └── prompts.ts              # Runtime prompt assembly (Section 5.3)
│   │
│   ├── speech/                      # Audio processing
│   │   ├── recorder.ts             # MediaRecorder wrapper (WebM/Opus)
│   │   ├── whisper-worker.ts       # Whisper WASM in Web Worker
│   │   ├── piper-worker.ts         # Piper TTS in Web Worker
│   │   └── audio-utils.ts          # Format conversion, level metering
│   │
│   ├── services/                    # Business logic (non-UI)
│   │   ├── interview-engine.ts     # Orchestrates interview flow
│   │   ├── feedback-generator.ts   # Generates post-interview feedback
│   │   ├── whiteboard-analyzer.ts  # Extracts components from canvas JSON
│   │   └── progress-aggregator.ts  # Computes UserProgress records
│   │
│   ├── types/
│   │   ├── data.ts                 # Core data model interfaces (Section 2)
│   │   ├── inference.ts            # InferenceProvider types
│   │   └── content.ts              # Template/content types
│   │
│   ├── utils/
│   │   ├── id.ts                   # UUID generation
│   │   ├── time.ts                 # Timestamp formatting
│   │   ├── fuzzy-match.ts          # String similarity for component detection
│   │   └── storage-estimate.ts     # Check available storage quota
│   │
│   ├── workers/
│   │   ├── inference.worker.ts     # Web Worker for LLM inference
│   │   ├── whisper.worker.ts       # Web Worker for STT
│   │   └── piper.worker.ts         # Web Worker for TTS
│   │
│   ├── styles/
│   │   ├── globals.css
│   │   └── tokens.css              # Design tokens (colors, spacing, etc.)
│   │
│   ├── main.tsx                    # Entry point
│   └── vite-env.d.ts
│
├── tests/
│   ├── unit/                       # Vitest unit tests (mirror src/ structure)
│   ├── integration/                # Database + service integration tests
│   └── e2e/                        # Playwright end-to-end tests
│       ├── interview-flow.spec.ts
│       └── model-download.spec.ts
│
├── scripts/
│   ├── prepare-models.sh           # Quantize/optimize models for deployment
│   ├── upload-models.sh            # Upload to R2/CDN
│   └── validate-content.ts         # CI script to validate templates
│
├── .eslintrc.cjs
├── .prettierrc
├── .gitignore
├── index.html                      # Vite entry HTML
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
└── README.md
```

### 7.1 Directory Responsibilities

| Directory | Responsibility | Key Constraint |
|-----------|---------------|----------------|
| `content/` | Interview templates, prompts, rubrics | No runtime dependencies. Pure data + types. Importable by both `src/` and `scripts/`. |
| `src/app/` | App shell, routing, top-level providers | Thin layer. No business logic. |
| `src/components/` | React components organized by feature domain | Components receive data via props and hooks. No direct DB or inference calls in components. |
| `src/db/` | All IndexedDB and OPFS operations | Only module that imports Dexie. All other code accesses data through hooks. |
| `src/hooks/` | React hooks that bridge UI to services | Hooks compose services and DB calls. The primary API surface for components. |
| `src/inference/` | LLM inference abstraction | Defines the `InferenceProvider` interface. Browser WASM and local server are interchangeable implementations. |
| `src/speech/` | Audio recording, STT, TTS | All audio processing runs in Web Workers. Main thread only receives transcriptions and audio URLs. |
| `src/services/` | Pure business logic | No React imports. No DOM access. Testable in isolation with mock data. |
| `src/workers/` | Web Worker entry points | Thin wrappers that load WASM modules and expose a message-based API. |
| `server/` | Optional local Python inference server | Completely independent. Own `pyproject.toml`. Not part of the frontend build. |
| `scripts/` | Build-time and CI scripts | Not shipped to users. Model preparation, content validation, deployment helpers. |
| `tests/` | All test files | Mirrors `src/` structure. E2E tests use Playwright. Unit/integration use Vitest. |

### 7.2 Dependency Flow

```
components/ ──▶ hooks/ ──▶ services/ ──▶ db/
                  │              │          │
                  │              ▼          │
                  │         inference/      │
                  │              │          │
                  ▼              ▼          ▼
               speech/       content/    types/
```

**Rules**:
- `components/` imports from `hooks/` only. Never from `db/`, `services/`, or `inference/` directly.
- `hooks/` may import from `services/`, `db/`, `inference/`, and `speech/`.
- `services/` may import from `db/` and `inference/`. Never from React or DOM.
- `db/` imports from `types/` only. It is a leaf dependency.
- `content/` imports from `types/` only. It is a leaf dependency.
- `workers/` are isolated. They communicate via `postMessage` only.

---

## 8. Risk Assessment

### 8.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Trillim WASM performance is too slow** for conversational flow (>10s per response) | Medium | High | The `InferenceProvider` abstraction allows fallback to local server mode. Set user expectations with a loading indicator. Consider streaming token output to show partial responses. |
| **Browser storage quota exceeded** (model weights + audio) | Low-Medium | Medium | Check `navigator.storage.estimate()` on startup. Warn user before model download if space is tight. Aggressive audio cleanup. Request `navigator.storage.persist()` to prevent eviction. |
| **OPFS browser support gaps** | Low | Medium | OPFS is supported in Chrome 86+, Firefox 111+, Safari 15.2+. For unsupported browsers, fall back to storing audio blobs directly in IndexedDB (with size warnings). |
| **Dexie Cloud pricing changes or discontinuation** | Low | Medium | Sync is Phase 2 and additive. The app works fully without it. Dexie.js itself is MIT-licensed and will continue to work with local-only IndexedDB regardless of Cloud's fate. |
| **Model quantization quality** insufficient for good interview feedback | Medium | High | Content quality (prompts, rubrics, few-shot examples) can compensate significantly for smaller model capability. Invest heavily in prompt engineering. Allow power users to bring larger models via local server mode. |
| **Whisper WASM accuracy** insufficient for real-time transcription | Low-Medium | Medium | Use Whisper base (150MB) instead of tiny (40MB) if quality is poor. Always show transcript for user correction. Text input is a parallel path that never degrades. |

### 8.2 Assumptions

1. **Trillim can run in a Web Worker via Pyodide/WASM**: If this proves infeasible, the browser-native mode is blocked. The local server mode still works. This assumption should be validated in a spike during Week 1.
2. **Users have modern browsers**: The app targets the last 2 major versions of Chrome, Firefox, Safari, and Edge. No IE11. No legacy mobile browsers.
3. **Users have sufficient disk space**: 1-5 GB for models + ~1 GB for audio. This is reasonable for desktop/laptop browsers but may be tight on mobile. The app should detect and warn.
4. **Single-user per device**: The initial architecture does not support multi-user on the same browser. This simplifies the data model significantly.
5. **English only for V1**: Whisper supports 99 languages, but prompt engineering, content, and rubrics are English-only initially.

### 8.3 What Would Change If Assumptions Are Wrong

- **If Trillim cannot run in WASM**: Pivot to WebLLM (which uses WebGPU + WASM for inference) or make local server mode the default. The abstraction layer (P7) protects the rest of the app from this change.
- **If IndexedDB proves too slow for large message histories**: Introduce pagination at the hook level (`useMessages` loads 50 messages at a time, loads more on scroll). The Dexie query layer supports cursor-based pagination natively.
- **If Dexie Cloud does not meet sync needs**: The structured data model with UUIDs and timestamps is compatible with any sync backend. Switch to a custom sync protocol over Supabase or PocketBase. Estimated migration effort: 2-3 weeks.

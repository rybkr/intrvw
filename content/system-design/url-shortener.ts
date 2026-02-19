import { defineTemplate } from '../shared/scoring';
import { buildSystemDesignPrompt } from './_shared/system-prompt';
import { systemDesignRubric } from './_shared/rubric';

export default defineTemplate({
  id: 'sd-url-shortener-v1',
  type: 'system-design',
  title: 'Design a URL Shortener',
  description:
    'Design a service like bit.ly that takes long URLs and generates short, unique aliases. Consider the read/write ratio, storage, and collision handling.',
  difficulty: 'mid',
  category: 'distributed-systems',
  tags: ['hashing', 'databases', 'caching', 'horizontal-scaling'],
  estimatedMinutes: 45,

  systemPrompt: buildSystemDesignPrompt(
    'mid',
    'URL Shortening Service (like bit.ly)',
    45,
  ),

  openingMessage:
    "Welcome! Today we'll work through a system design problem together. I'd like you to design a URL shortening service — something like bit.ly. Before we dive into the design, let's start by understanding the requirements. What questions do you have about the system we're building?",

  questionBank: [
    {
      id: 'url-short-q1',
      question:
        'How would you generate a unique short URL for each long URL?',
      followUps: [
        'What happens if two different long URLs produce the same hash?',
        'How would you handle the collision?',
        'What are the trade-offs between hashing and a counter-based approach?',
      ],
      hints: [
        'Think about base62 encoding.',
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
        'Consider the access patterns — mostly reads or writes?',
      ],
      category: 'technicalDepth',
      difficulty: 'mid',
    },
    {
      id: 'url-short-q3',
      question:
        'How would this system handle 10,000 requests per second?',
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

  rubric: systemDesignRubric,

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
      aliases: ['DB', 'MySQL', 'PostgreSQL', 'DynamoDB', 'Cassandra'],
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
      aliases: ['analytics', 'tracking', 'metrics'],
      connections: ['Application Server', 'Message Queue'],
    },
  ],

  version: 1,
  createdAt: '2026-02-19T00:00:00Z',
  updatedAt: '2026-02-19T00:00:00Z',
});

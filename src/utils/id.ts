/** Generate a UUID v4 */
export function generateId(): string {
  return crypto.randomUUID();
}

/** Generate an ISO 8601 timestamp for the current time */
export function now(): string {
  return new Date().toISOString();
}

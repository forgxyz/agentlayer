/**
 * Deduplicate ERC-8004 feedback: same client + same tag1 + same agent → keep most recent.
 * Then average per-dimension (tag1), then average across dimensions.
 */

interface FeedbackEntry {
  agent_id: number;
  client_address: string;
  score: number | null;
  tag1: string | null;
  timestamp: string;
  [key: string]: unknown;
}

interface DedupResult {
  avg_score: number | null;
  deduped_count: number;
  raw_count: number;
}

export function deduplicateFeedback(entries: FeedbackEntry[]): DedupResult {
  const scored = entries.filter(e => e.score != null);
  if (scored.length === 0) {
    return { avg_score: null, deduped_count: 0, raw_count: entries.length };
  }

  // Group by (client_address, tag1), keep latest by timestamp
  const groupMap = new Map<string, FeedbackEntry>();
  for (const entry of scored) {
    const key = `${entry.client_address.toLowerCase()}|${entry.tag1 || ''}`;
    const existing = groupMap.get(key);
    if (!existing || entry.timestamp > existing.timestamp) {
      groupMap.set(key, entry);
    }
  }

  const deduped = Array.from(groupMap.values());

  // Average within each tag1 dimension, then average across dimensions
  const dimensionMap = new Map<string, number[]>();
  for (const entry of deduped) {
    const dim = entry.tag1 || '__none__';
    const arr = dimensionMap.get(dim) || [];
    arr.push(entry.score!);
    dimensionMap.set(dim, arr);
  }

  const dimensionAvgs: number[] = [];
  for (const scores of dimensionMap.values()) {
    dimensionAvgs.push(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  const avg_score = dimensionAvgs.reduce((a, b) => a + b, 0) / dimensionAvgs.length;

  return {
    avg_score,
    deduped_count: deduped.length,
    raw_count: scored.length,
  };
}

export function annotateFeedback<T extends FeedbackEntry>(entries: T[]): (T & { superseded: boolean })[] {
  // Find the latest entry for each (client_address, tag1) pair
  const latestMap = new Map<string, string>(); // key -> latest timestamp
  for (const entry of entries) {
    if (entry.score == null) continue;
    const key = `${entry.client_address.toLowerCase()}|${entry.tag1 || ''}`;
    const existing = latestMap.get(key);
    if (!existing || entry.timestamp > existing) {
      latestMap.set(key, entry.timestamp);
    }
  }

  return entries.map(entry => {
    if (entry.score == null) {
      return { ...entry, superseded: false };
    }
    const key = `${entry.client_address.toLowerCase()}|${entry.tag1 || ''}`;
    const latestTs = latestMap.get(key);
    return {
      ...entry,
      superseded: latestTs !== entry.timestamp,
    };
  });
}

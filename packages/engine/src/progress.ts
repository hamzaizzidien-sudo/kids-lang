import type { ConceptId } from "@kids-lang/content-schema";

/**
 * Spaced repetition: one strength score in [0, 1] per (child, concept).
 * Correct first tries raise it, wrong ones lower it, and it decays over time.
 * The app stores one Progress per child profile.
 */
export interface ConceptProgress {
  strength: number;
  /** Epoch ms of the last answer. */
  lastSeen: number;
}
export type Progress = Readonly<Record<ConceptId, ConceptProgress>>;

const DAY_MS = 24 * 60 * 60 * 1000;
export const HALF_LIFE_DAYS = 3;
const GAIN = 0.35;
const LOSS = 0.7;
export const WEAK_THRESHOLD = 0.5;

/** Strength after time decay (half-life of HALF_LIFE_DAYS). Unseen concepts are 0. */
export function strengthAt(progress: Progress, conceptId: ConceptId, now: number): number {
  const entry = progress[conceptId];
  if (!entry) return 0;
  const days = Math.max(0, now - entry.lastSeen) / DAY_MS;
  return entry.strength * 0.5 ** (days / HALF_LIFE_DAYS);
}

export function recordAnswer(
  progress: Progress,
  conceptId: ConceptId,
  correct: boolean,
  now: number,
): Progress {
  const s = strengthAt(progress, conceptId, now);
  const strength = correct ? s + (1 - s) * GAIN : s * LOSS;
  return { ...progress, [conceptId]: { strength, lastSeen: now } };
}

/** Concepts the child has met that have decayed below the threshold, weakest first. */
export function weakConcepts(
  progress: Progress,
  now: number,
  threshold = WEAK_THRESHOLD,
): ConceptId[] {
  return Object.keys(progress)
    .map((id) => ({ id, s: strengthAt(progress, id, now) }))
    .filter(({ s }) => s < threshold)
    .sort((a, b) => a.s - b.s || a.id.localeCompare(b.id))
    .map(({ id }) => id);
}

import type { Mood } from "./art";

/** Lip-sync timing (Rhubarb Lip Sync output, later). One language-neutral mouth set. */
export interface VisemeTrack {
  cues: Array<{ start: number; end: number; shape: string }>;
}

/** Screens and the engine talk only to this (CLAUDE.md §6). A Rive build may implement it later. */
export interface CharacterController {
  /** The signature unfold. */
  appear(delaySec?: number): Promise<void>;
  /** Fold away: the unfold in reverse at about 0.6× duration. */
  disappear(): Promise<void>;
  /** Cross-fade the mood layers over 150 ms. */
  setMood(m: Mood): void;
  talk(audioRef: string, visemes?: VisemeTrack): Promise<void>;
  /** setMood('celebrating') plus a small hop. */
  celebrate(): Promise<void>;
  /** setMood('oops') plus a small wobble. */
  oops(): Promise<void>;
  /** Quick squash and stretch. */
  tapReaction(): void;
}

/** Plays an audio ref and resolves when it ends. Provided by the app (expo-audio). */
export type PlayAudio = (audioRef: string) => Promise<void>;

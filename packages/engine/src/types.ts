import type {
  CharacterId,
  ConceptId,
  ExerciseTemplate,
  LanguagePack,
} from "@kids-lang/content-schema";

export class EngineError extends Error {
  override name = "EngineError";
}

/** One word in the target language, ready to show and play. */
export interface WordView {
  conceptId: ConceptId;
  /** Audio ref (content-root relative) spoken by the exercise's speaker. */
  audio: string;
  /** Only present when the age band shows text. */
  text?: string;
  transliteration?: string;
}

interface BaseView {
  exerciseId: string;
  template: ExerciseTemplate;
  speaker: CharacterId;
  /** From the target pack: render target-language text in this direction. */
  direction: LanguagePack["direction"];
  /** True when the engine mixed this exercise in as spaced-repetition review. */
  review: boolean;
}

/** Hear a word, tap the matching picture. */
export interface ListenTapView extends BaseView {
  template: "listenTap";
  prompt: WordView;
  /** Pictures to tap, in display order. Includes the answer. */
  choices: ConceptId[];
  answer: ConceptId;
}

/** Drag each spoken word onto its picture. */
export interface DragMatchView extends BaseView {
  template: "dragMatch";
  /** Draggable word tokens, in display order. */
  words: WordView[];
  /** Drop-target pictures, in display order. */
  pictures: ConceptId[];
}

/** Hear a word and say it. Every attempt is rewarded; recognition never blocks. */
export interface SayItView extends BaseView {
  template: "sayIt";
  prompt: WordView;
}

export type ExerciseView = ListenTapView | DragMatchView | SayItView;

export type Choice =
  | { type: "tap"; conceptId: ConceptId }
  | { type: "drop"; word: ConceptId; picture: ConceptId }
  /** A "Say it!" attempt. `heard` is optional on-device recognition output; it never decides progress. */
  | { type: "say"; heard?: string };

export type Feedback = "celebrate" | "oops-retry";

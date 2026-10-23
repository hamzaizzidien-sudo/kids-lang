import type {
  AgeBandProfile,
  ConceptId,
  Exercise,
  LanguagePack,
  Lesson,
} from "@kids-lang/content-schema";
import { recordAnswer, weakConcepts, type Progress } from "./progress";
import { createRng, shuffle } from "./rng";
import { TEMPLATES } from "./templates";
import { EngineError, type Choice, type ExerciseView, type Feedback } from "./types";

export interface SessionOptions {
  /** Seed for choice order and review picks. Same inputs + seed = same session. */
  seed?: number;
  /** Epoch ms used for spaced-repetition decay. */
  now?: number;
  /** Most review exercises to mix in (default 1). */
  maxReview?: number;
}

/** What the screen renders right now. */
export interface ExerciseState {
  view: ExerciseView;
  /** Set after a wrong answer: the item to wiggle until the child gets it. */
  highlight?: ConceptId;
  /** dragMatch: words already placed on their pictures. */
  matched: ConceptId[];
  /** Wrong answers so far on this exercise. Never ends the lesson. */
  mistakes: number;
}

export interface SessionReward {
  sticker?: ConceptId;
  world: boolean;
}

export interface Session {
  readonly lessonId: string;
  readonly lang: string;
  readonly profile: AgeBandProfile;
  readonly exercises: readonly ExerciseView[];
  readonly index: number;
  readonly current: ExerciseState | undefined;
  readonly complete: boolean;
  /** Updated spaced-repetition scores; persist this when the session ends. */
  readonly progress: Progress;
  readonly reward: SessionReward;
  /** Concepts already scored this exercise, so retries don't count twice. */
  readonly scored: readonly ConceptId[];
}

export interface AnswerResult {
  correct: boolean;
  feedback: Feedback;
  next: Session;
}

export function createSession(
  profile: AgeBandProfile,
  lesson: Lesson,
  pack: LanguagePack,
  progress: Progress = {},
  options: SessionOptions = {},
): Session {
  const rng = createRng(options.seed ?? 1);
  const now = options.now ?? Date.now();
  const [, maxExercises] = profile.sessionExercises;

  const runnable = lesson.exercises.filter(
    (ex) => TEMPLATES[ex.template] && profile.allowedTemplates.includes(ex.template),
  );
  const review = pickReview(runnable, pack, profile, progress, now, options.maxReview ?? 1, rng);
  const planned = runnable.slice(0, maxExercises - review.length);

  // Mix each review exercise in at a random spot after the first exercise.
  const exercises: Array<{ ex: Exercise; review: boolean }> = planned.map((ex) => ({
    ex,
    review: false,
  }));
  for (const ex of review) {
    const at = 1 + Math.floor(rng() * exercises.length);
    exercises.splice(at, 0, { ex, review: true });
  }
  const views = exercises.map(({ ex, review }) => ({
    ...TEMPLATES[ex.template]!(ex, pack, profile, rng),
    review,
  }));
  if (views.length === 0) throw new EngineError(`Lesson "${lesson.id}" has no runnable exercises`);

  const targets = [...new Set(planned.flatMap((ex) => ex.targets))];
  const reward: SessionReward = {
    ...(profile.rewards.includes("stickers")
      ? { sticker: targets[Math.floor(rng() * targets.length)]! }
      : {}),
    world: profile.rewards.includes("world"),
  };

  return {
    lessonId: lesson.id,
    lang: pack.lang,
    profile,
    exercises: views,
    index: 0,
    current: freshState(views[0]!),
    complete: false,
    progress,
    reward,
    scored: [],
  };
}

/**
 * Apply one answer. Wrong answers never end the lesson: the same exercise repeats with the
 * correct item highlighted. Only first tries move spaced-repetition strength.
 */
export function answer(session: Session, choice: Choice, now: number = Date.now()): AnswerResult {
  const state = session.current;
  if (!state) throw new EngineError("Session is already complete");
  const { view } = state;

  switch (view.template) {
    case "listenTap": {
      if (choice.type !== "tap") throw wrongChoice(view.template, choice);
      const correct = choice.conceptId === view.answer;
      const scored = score(session, view.answer, correct, now);
      return correct
        ? { correct, feedback: "celebrate", next: advance(scored) }
        : { correct, feedback: "oops-retry", next: retry(scored, view.answer) };
    }

    case "dragMatch": {
      if (choice.type !== "drop") throw wrongChoice(view.template, choice);
      if (
        !view.words.some((w) => w.conceptId === choice.word) ||
        state.matched.includes(choice.word)
      ) {
        throw new EngineError(`"${choice.word}" is not an unmatched word in this exercise`);
      }
      const correct = choice.word === choice.picture;
      const scored = score(session, choice.word, correct, now);
      if (!correct) return { correct, feedback: "oops-retry", next: retry(scored, choice.word) };
      const matched = [...state.matched, choice.word];
      const next =
        matched.length === view.words.length
          ? advance(scored)
          : { ...scored, current: { ...state, matched, highlight: undefined } };
      return { correct, feedback: "celebrate", next };
    }

    case "sayIt": {
      if (choice.type !== "say") throw wrongChoice(view.template, choice);
      // The attempt is what we reward. Recognition is unreliable for young voices, so it
      // neither blocks progress nor changes strength.
      return { correct: true, feedback: "celebrate", next: advance(session) };
    }
  }
}

function freshState(view: ExerciseView): ExerciseState {
  return { view, matched: [], mistakes: 0 };
}

function advance(session: Session): Session {
  const index = session.index + 1;
  const view = session.exercises[index];
  return {
    ...session,
    index,
    current: view ? freshState(view) : undefined,
    complete: !view,
    scored: [],
  };
}

function retry(session: Session, highlight: ConceptId): Session {
  const state = session.current!;
  return { ...session, current: { ...state, highlight, mistakes: state.mistakes + 1 } };
}

function score(session: Session, conceptId: ConceptId, correct: boolean, now: number): Session {
  if (session.scored.includes(conceptId)) return session;
  return {
    ...session,
    progress: recordAnswer(session.progress, conceptId, correct, now),
    scored: [...session.scored, conceptId],
  };
}

function pickReview(
  runnable: Exercise[],
  pack: LanguagePack,
  profile: AgeBandProfile,
  progress: Progress,
  now: number,
  maxReview: number,
  rng: () => number,
): Exercise[] {
  if (!profile.allowedTemplates.includes("listenTap")) return [];
  const [minExercises, maxExercises] = profile.sessionExercises;
  // Review fills spare slots up to the max, and may replace lesson exercises down to the min.
  const lessonLength = Math.min(runnable.length, maxExercises);
  const spare = maxExercises - lessonLength;
  const trimmable = Math.max(0, lessonLength - minExercises);
  const room = Math.min(maxReview, spare + trimmable);

  const lessonConcepts = [
    ...new Set(runnable.flatMap((ex) => [...ex.targets, ...(ex.distractors ?? [])])),
  ].filter((id) => pack.lexemes[id]?.audio.guide);
  const weak = weakConcepts(progress, now).filter(
    (id) => !lessonConcepts.includes(id) && pack.lexemes[id]?.audio.guide,
  );

  return weak.slice(0, room).map((id) => ({
    id: `review-${id.replace(/\./g, "-")}`,
    template: "listenTap",
    targets: [id],
    distractors: shuffle(lessonConcepts, rng).slice(0, profile.maxChoices - 1),
    speakers: ["guide"],
  }));
}

function wrongChoice(template: string, choice: Choice): EngineError {
  return new EngineError(`A "${choice.type}" choice does not fit a ${template} exercise`);
}

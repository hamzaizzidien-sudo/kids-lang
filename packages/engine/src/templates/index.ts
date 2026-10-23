import type { AgeBandProfile, ConceptId, Exercise, LanguagePack } from "@kids-lang/content-schema";
import { shuffle, type Rng } from "../rng";
import {
  EngineError,
  type DragMatchView,
  type ExerciseView,
  type ListenTapView,
  type SayItView,
  type WordView,
} from "../types";

export type TemplateFn = (
  exercise: Exercise,
  pack: LanguagePack,
  profile: AgeBandProfile,
  rng: Rng,
) => ExerciseView;

export const listenTap: TemplateFn = (exercise, pack, profile, rng): ListenTapView => {
  const answer = exercise.targets[0]!;
  const distractors = (exercise.distractors ?? []).filter((d) => d !== answer);
  const choices = shuffle([answer, ...distractors.slice(0, profile.maxChoices - 1)], rng);
  return {
    ...base(exercise, pack),
    template: "listenTap",
    prompt: word(answer, exercise, pack, profile),
    choices,
    answer,
  };
};

export const dragMatch: TemplateFn = (exercise, pack, profile, rng): DragMatchView => {
  const targets = exercise.targets.slice(0, profile.maxChoices);
  return {
    ...base(exercise, pack),
    template: "dragMatch",
    words: shuffle(targets, rng).map((id) => word(id, exercise, pack, profile)),
    pictures: shuffle(targets, rng),
  };
};

export const sayIt: TemplateFn = (exercise, pack, profile): SayItView => ({
  ...base(exercise, pack),
  template: "sayIt",
  prompt: word(exercise.targets[0]!, exercise, pack, profile),
});

/** Templates the engine can run today. Others are skipped until built. */
export const TEMPLATES: Partial<Record<Exercise["template"], TemplateFn>> = {
  listenTap,
  dragMatch,
  sayIt,
};

function base(exercise: Exercise, pack: LanguagePack) {
  return {
    exerciseId: exercise.id,
    speaker: exercise.speakers[0]!,
    direction: pack.direction,
    review: false,
  };
}

function word(
  conceptId: ConceptId,
  exercise: Exercise,
  pack: LanguagePack,
  profile: AgeBandProfile,
): WordView {
  const lexeme = pack.lexemes[conceptId];
  if (!lexeme) throw new EngineError(`No "${pack.lang}" lexeme for "${conceptId}"`);
  const speaker = exercise.speakers[0]!;
  const audio = lexeme.audio[speaker];
  if (!audio)
    throw new EngineError(`"${pack.lang}" lexeme "${conceptId}" has no audio for "${speaker}"`);
  return {
    conceptId,
    audio,
    ...(profile.showText ? { text: lexeme.text } : {}),
    ...(profile.showText && lexeme.transliteration
      ? { transliteration: lexeme.transliteration }
      : {}),
  };
}

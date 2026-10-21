import { z } from "zod";

// Dotted lowercase ids, e.g. "animal.cat", "greeting.hello".
export const ConceptId = z
  .string()
  .regex(/^[a-z][a-z0-9-]*(\.[a-z0-9-]+)+$/, "expected e.g. animal.cat");
export type ConceptId = z.infer<typeof ConceptId>;

const Slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "expected a kebab-case slug");

export const CharacterId = z.enum(["guide", "cheerleader", "silly", "calm"]);
export type CharacterId = z.infer<typeof CharacterId>;

export const ExerciseTemplate = z.enum([
  "listenTap",
  "whoSaidIt",
  "dragMatch",
  "sayIt",
  "popBubbles",
  "singAlong",
  "storyMoment",
]);
export type ExerciseTemplate = z.infer<typeof ExerciseTemplate>;

export const AgeBand = z.enum(["3-5", "5-8", "8-12"]);
export type AgeBand = z.infer<typeof AgeBand>;

export const Reward = z.enum([
  "stickers",
  "world",
  "streak",
  "collections",
  "avatarItems",
  "quests",
]);
export type Reward = z.infer<typeof Reward>;

/** Content-root-relative path to an asset, e.g. "audio/es/placeholder_guide_animal.cat.wav". */
export const AssetRef = z
  .string()
  .min(1)
  .regex(/^[a-z0-9_./-]+$/i, "expected a relative asset path");

// ---------------------------------------------------------------------------
// Language-neutral

export const Concept = z.strictObject({
  id: ConceptId,
  art: AssetRef,
  sfx: AssetRef.optional(),
  tags: z.array(z.string().min(1)),
});
export type Concept = z.infer<typeof Concept>;

export const Exercise = z.strictObject({
  id: Slug,
  template: ExerciseTemplate,
  targets: z.array(ConceptId).min(1),
  distractors: z.array(ConceptId).optional(),
  /** Characters who speak the target words. Defaults to the guide. */
  speakers: z.array(CharacterId).min(1).default(["guide"]),
  params: z.record(z.string(), z.unknown()).optional(),
});
export type Exercise = z.infer<typeof Exercise>;
export type ExerciseInput = z.input<typeof Exercise>;

export const Lesson = z.strictObject({
  id: Slug,
  unitId: Slug,
  exercises: z.array(Exercise),
  estimatedMinutes: z.number().positive(),
});
export type Lesson = z.infer<typeof Lesson>;

export const LessonRef = z.strictObject({ id: Slug });
export type LessonRef = z.infer<typeof LessonRef>;

export const Unit = z.strictObject({
  id: Slug,
  order: z.number().int().nonnegative(),
  /** UI-language i18n key, not display text. */
  title: z.string().regex(/^[a-z0-9.-]+$/i, "expected an i18n key"),
  theme: z.string().min(1),
  worldArt: AssetRef,
  lessons: z.array(LessonRef),
  ageBands: z.array(AgeBand).min(1),
});
export type Unit = z.infer<typeof Unit>;

export const AgeBandProfile = z
  .strictObject({
    id: AgeBand,
    showText: z.boolean(),
    maxChoices: z.number().int().min(1),
    allowedTemplates: z.array(ExerciseTemplate).min(1),
    sessionExercises: z.tuple([z.number().int().min(1), z.number().int().min(1)]),
    livesEnabled: z.boolean(),
    timersEnabled: z.boolean(),
    rewards: z.array(Reward),
  })
  .refine((p) => p.sessionExercises[0] <= p.sessionExercises[1], {
    message: "sessionExercises must be [min, max] with min <= max",
    path: ["sessionExercises"],
  });
export type AgeBandProfile = z.infer<typeof AgeBandProfile>;

// ---------------------------------------------------------------------------
// Per language

export const ReviewStatus = z.enum(["draft", "reviewed", "approved"]);
export type ReviewStatus = z.infer<typeof ReviewStatus>;

export const Lexeme = z.strictObject({
  text: z.string().min(1),
  transliteration: z.string().min(1).optional(),
  article: z.string().min(1).optional(),
  gender: z.enum(["m", "f", "n"]).optional(),
  audio: z.partialRecord(CharacterId, AssetRef),
  visemes: z.partialRecord(CharacterId, AssetRef).optional(),
  review: z.strictObject({
    status: ReviewStatus,
    reviewer: z.string().min(1).optional(),
  }),
});
export type Lexeme = z.infer<typeof Lexeme>;

export const LanguagePack = z.strictObject({
  // Open-ended: adding a language is data only.
  lang: z.string().regex(/^[a-z]{2,3}$/, "expected an ISO 639 code"),
  variety: z.string().min(1).optional(),
  direction: z.enum(["ltr", "rtl"]),
  lexemes: z.record(ConceptId, Lexeme),
  overrides: z.strictObject({ lessons: z.array(Lesson).optional() }).optional(),
});
export type LanguagePack = z.infer<typeof LanguagePack>;

/** content/manifest.json: which packs ship in this build. */
export const ContentManifest = z.strictObject({
  shippedPacks: z.array(z.string()).min(1),
});
export type ContentManifest = z.infer<typeof ContentManifest>;

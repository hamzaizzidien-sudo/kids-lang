# Kids Language App: Brief for Claude Code

This is a gamified language-learning app for young children, in the spirit of Duolingo but designed for children who cannot read yet.
**Launch scope:** ages 3–5, teaching Spanish, French, Arabic and Turkish to English (UK) speakers.
**Later updates:** ages 5–8 (with avatars), then ages 8–12 (with an avatar designer).

The full product plan lives in a separate planning doc. This file has everything you need to build. When this brief and the code disagree, ask before changing direction.

---

## 1. Non-negotiable principles

1. **Audio-first, text-optional.** Every instruction is spoken. Whether text shows is controlled by the child's age band.
2. **One engine, many languages.** Lessons reference *language-neutral concepts*. Adding a language means adding data only, with zero new screens or components.
3. **Age band is configuration, not code branches.** Never write `if (age < 5)` in a component. Read capabilities from the age-band profile.
4. **Never punish a 3–5 year old.** No lives, timers or fail screens. A wrong answer leads to a gentle retry.
5. **Characters are swappable.** Every character implements the same animation contract (section 6). Use placeholders until the final Rive files arrive.
6. **Privacy by design.** See section 8. No third-party analytics or ad SDKs, ever.
7. **Offline-first.** Lesson packs download and play without a network connection.

---

## 2. Stack

| Layer | Choice |
| --- | --- |
| App | React Native + Expo (latest SDK), TypeScript strict, Expo Router |
| Characters | Rive (`rive-react-native`), behind a `Character` component |
| Motion | Reanimated, Gesture Handler, React Native Skia for effects |
| Audio | `expo-audio`, preload every clip a lesson needs before it starts |
| Speech | On-device speech recognition only. The attempt is rewarded and never blocks progress |
| State | Zustand for app state; progress persisted locally (MMKV or SQLite) |
| Content | JSON packs validated with Zod. Source of truth is `content/` in git |
| Backend (Phase 4, not now) | Supabase, UK/EU region, for parent accounts and progress sync |
| Monorepo | pnpm workspaces + Turborepo |
| Tests | Vitest for packages, Jest + React Native Testing Library for the app |

Check current package versions before installing. Don't rely on remembered versions.

---

## 3. Repository layout

```
kids-lang/
  apps/mobile/                 Expo app
  apps/studio/                 (later) web content studio; leave a stub README
  packages/engine/             pure TS: lesson runner, exercise logic, spaced repetition
  packages/content-schema/     Zod schemas + inferred types + validator CLI
  packages/characters/         character contract, placeholder impl, Rive loader
  packages/ui/                 design tokens, kid-sized components
  content/
    concepts/                  one JSON per concept + art refs
    curriculum/                units, lessons, exercises (by age band)
    packs/{es,fr,ar,tr}/       lexemes per language
    audio/{es,fr,ar,tr}/       audio files (placeholder TTS allowed in dev)
    art/                       concept art (placeholders in dev)
  scripts/                     validate-content, build-packs
```

`packages/engine` must have **no React or React Native imports**. It is pure logic and fully unit-tested.

---

## 4. Content model

The core idea: **curriculum → concepts ← language packs**, combined at runtime by the engine.

```ts
// Language-neutral
Concept {
  id: string                 // "animal.cat", "colour.red", "greeting.hello"
  art: string                // asset ref
  sfx?: string               // e.g. meow
  tags: string[]
}

Unit     { id, title (UI-language key), theme, worldArt, lessons: LessonRef[], ageBands: AgeBand[] }
Lesson   { id, unitId, exercises: Exercise[], estimatedMinutes }
Exercise { id, template: ExerciseTemplate, targets: ConceptId[], distractors?: ConceptId[], params?: {...} }

// Per language
LanguagePack {
  lang: "es" | "fr" | "ar" | "tr" | string   // open-ended: new languages are data only
  variety?: string                            // e.g. "ar-MSA", "es-ES"
  direction: "ltr" | "rtl"
  lexemes: Record<ConceptId, Lexeme>
  overrides?: { lessons?: Lesson[] }          // language-specific extras (e.g. Arabic letters for 5–8)
}

Lexeme {
  text: string
  transliteration?: string                    // required for ar
  article?: string; gender?: "m" | "f" | "n"
  audio: Record<CharacterId, string>          // the word spoken by each character
  visemes?: Record<CharacterId, string>       // lip-sync timing file
  review: { status: "draft" | "reviewed" | "approved"; reviewer?: string }
}

AgeBandProfile {
  id: "3-5" | "5-8" | "8-12"
  showText: boolean
  maxChoices: number                          // 3 for 3–5
  allowedTemplates: ExerciseTemplate[]
  sessionExercises: [min, max]                // [5, 6] for 3–5
  livesEnabled: boolean                       // false for 3–5
  timersEnabled: boolean                      // false for 3–5
  rewards: ("stickers" | "world" | "streak" | "collections" | "avatarItems" | "quests")[]
}
```

### Validation (`pnpm validate-content`, runs in CI)
Fail the build if any of these is true:
- A lesson references a concept with no lexeme in any shipped language pack.
- A lexeme is missing audio for a character that speaks it in a lesson.
- A shipped lexeme isn't `approved`. In dev, allow `draft` behind a flag.
- An Arabic lexeme has no transliteration.
- An exercise uses a template not allowed by its unit's age bands.

---

## 5. Engine (`packages/engine`)

- `createSession(profile, lesson, pack, progress) → Session` gives a deterministic sequence of exercise *states*, ready to render.
- `answer(session, choice) → { correct, feedback: "celebrate" | "oops-retry", next }`. On a wrong answer in 3–5, the same exercise repeats with the correct item highlighted.
- **Spaced repetition:** a strength score per (child, concept), which rises on correct answers and decays over time. Weak concepts are mixed into later lessons as review.
- Seedable randomness, so tests are deterministic.
- Each template is a pure function: `(exercise, pack, profile) → ExerciseViewModel`.

### Launch templates (3–5)
`listenTap`, `whoSaidIt`, `dragMatch`, `sayIt`, `popBubbles`, `singAlong`, `storyMoment`.
**Build first:** `listenTap`, `dragMatch`, `sayIt`.

---

## 6. Character contract (`packages/characters`)

The launch cast is four animal narrators. Species and names are still being designed, so use these IDs: `guide`, `cheerleader`, `silly`, `calm`.

```ts
interface CharacterController {
  idle(): void
  talk(audioRef: string, visemes?: VisemeTrack): Promise<void>
  mood(m: "happy" | "thinking" | "encouraging" | "celebrating" | "surprised" | "listening" | "sleepy" | "oops"): void
  celebrate(): Promise<void>
  oops(): Promise<void>
  pointAt(dir: "left" | "right" | "up" | "down"): void
  tapReaction(): void
  sleep(): void
}
```

- **Rive implementation:** maps these calls onto state-machine inputs of the same names.
- **Placeholder implementation:** a coloured rounded blob with eyes, drawn in Skia or SVG, that animates the same states. One colour per character. It must be good enough to playtest with.
- The engine and screens talk only to `CharacterController`, never to Rive directly.
- Visemes come from one language-neutral set of about 8–10 mouth shapes, so one rig serves all languages.

---

## 7. Language handling

- **UI language** (English at launch, i18n-ready via i18next) is separate from the **target language**.
- **Direction:** take it from the *target* pack. Render Arabic content right-to-left inside an otherwise left-to-right app. Do not flip the whole app with `I18nManager`.
- **Turkish:** always use locale-aware casing (`toLocaleUpperCase("tr")`). Never use bare `toUpperCase()`. Add a lint rule or test for this.
- **Arabic:** use a proper Arabic font (for example Noto Naskh Arabic, or a rounded Arabic face) and show harakat (vowel marks) for beginners.
- **Fonts:** one rounded, child-friendly Latin face with full Turkish glyph coverage, plus the matching Arabic face.

---

## 8. Privacy and child safety (build these constraints in now)

- There are no child accounts. Later, a parent account owns child *profiles*, each with a nickname, avatar and age band only.
- Collect learning progress only: no location, contacts, advertising ID, photos or real names.
- "Say it!" audio is processed on-device and never uploaded or stored.
- No ads and no third-party analytics or crash SDKs that collect identifiers. If crash reporting is needed, propose a compliant option and ask first.
- **Parent gate:** settings, external links, purchases and deletion sit behind an adult-only check. Build the component in Phase 2.
- Target compliance: the UK Children's Code, UK GDPR, COPPA, Apple Kids Category, and Google Play Families.

---

## 9. UX rules for 3–5

- At most 3 choices per screen, and one action.
- Touch targets of at least 64pt. Tolerate imprecise taps.
- Every prompt has a large replay-audio button.
- A wrong answer means the `silly` character does `oops()`, the correct item wiggles, and the child tries again.
- A session is 5–6 exercises, then a sticker, then a world update, then the `calm` character says goodbye.
- Leaving a lesson takes a hold-to-exit gesture, so accidental taps don't end it.
- No streak loss is ever shown to a child.

---

## 10. Work plan: what to build now

### Phase 0: Foundations
- [ ] Monorepo scaffold (pnpm + Turborepo), TypeScript strict, ESLint and Prettier, CI running lint, tests and content validation.
- [ ] `content-schema`: Zod schemas for everything in section 4, inferred types, and a validator CLI.
- [ ] Seed content: unit **Animals**, with 8 concepts (cat, dog, fish, bird, rabbit, cow, duck, horse) and lexemes in es, fr, ar (MSA, with transliteration) and tr.
  - Mark all lexemes `draft`. Native speakers will review them later.
  - Placeholder TTS audio is fine in dev; label it as placeholder.
- [ ] Add the 10 launch units as stubs: hello & goodbye, colours, numbers 1–10, animals, family, food & fruit, body, clothes, toys, feelings.

### Phase 2 (start once Phase 0 is green): Playable prototype
- [ ] `engine`: session runner, the `listenTap`, `dragMatch` and `sayIt` templates, and spaced repetition. All unit-tested.
- [ ] `characters`: the contract plus placeholder characters.
- [ ] `ui`: design tokens with a soft picture-book palette (placeholder until the brand is set), plus big buttons and a replay-audio button.
- [ ] Mobile app screens:
  - child profile picker (local only)
  - language picker
  - world map with one unit
  - lesson player
  - reward screen
  - parent gate stub
- [ ] Offline: bundle the Animals pack in the app; download logic can come later.
- [ ] Runs on a real phone through Expo Go or a dev build.

### Acceptance criteria for the prototype
- A child can complete the Animals lesson in **any of the 4 languages** by switching only the language pack, with zero code changes.
- Arabic content renders right-to-left correctly inside the left-to-right UI.
- Wrong answers never end the lesson.
- `pnpm validate-content` catches a deliberately broken lexeme (cover this with a test).
- `packages/engine` test coverage is at least 90%.

### Not now
- The Supabase backend and parent accounts (Phase 4).
- Avatars, skins and the avatar designer (5–8 update).
- The content studio web app.
- Payments.

---

## 11. Working conventions

- Small, focused commits with conventional commit messages.
- Before a big structural change, write a short plan and ask.
- Use placeholders freely, but name them so they're easy to find (`placeholder_` prefix, `// PLACEHOLDER:` comments).
- Open decisions are listed below. Use the defaults and flag anything that depends on them.

### Open decisions (defaults in brackets)
- Arabic variety [MSA with harakat]
- Spanish variety [Spain, es-ES]
- App name [working name `kids-lang`]
- Brand mood [soft picture-book]
- Character species and names [placeholder IDs: guide, cheerleader, silly, calm]

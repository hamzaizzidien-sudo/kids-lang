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
5. **Characters are data-driven.** The five folded-paper narrators are drawn from `design/characters/characters.json`, and every one implements the same controller (section 6). Never hand-draw or hard-code a character in a screen.
6. **Privacy by design.** See section 8. No third-party analytics or ad SDKs, ever.
7. **Offline-first.** Lesson packs download and play without a network connection.

---

## 2. Stack

| Layer | Choice |
| --- | --- |
| App | React Native + Expo (latest SDK), TypeScript strict, Expo Router |
| Characters | `react-native-svg` + Reanimated, rendering `characters.json` (Rive is optional later, behind the same controller) |
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
  packages/characters/         controller contract, PaperCharacter renderer, unfold animation
  design/characters/           MASTER ART: characters.json, 25 SVGs, preview.html (read its README)
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

## 6. Characters (`packages/characters`)

The cast is final: five **folded-paper** animal narrators, faceted like origami. The master art lives in `design/characters/`. **Read `design/characters/README.md` before writing any character code**, and open `preview.html` to see the target look and animation.

| ID | Name | Animal | Role | Used for |
| --- | --- | --- | --- | --- |
| `guide` | Nilo | otter | The Guide | Every instruction, pointing at choices |
| `cheerleader` | Zuzu | rabbit | The Cheerleader | Right answers, rewards, end of lesson |
| `silly` | Kiko | frog | The Silly friend | Wrong answers (oops and retry), songs |
| `calm` | Mina | turtle | The Calm friend | Stopping points, goodbye, bedtime mode |
| `explorer` | Tamu | monkey | The Explorer | World map, introducing each new unit and its words |

`CharacterId` maps to the art's `kind` as follows: guide→otter, cheerleader→rabbit, silly→frog, calm→turtle, explorer→monkey. Keep the mapping in one place.

### Moods

There are five moods, shared by every character: `wave` (hello and instructions), `listening` (the child should tap or speak), `thinking` (waiting for an answer), `celebrating`, and `oops` (gentle retry).

### Controller (screens and engine talk only to this)

```ts
type Mood = 'wave' | 'listening' | 'thinking' | 'celebrating' | 'oops';

interface CharacterController {
  appear(delaySec?: number): Promise<void>     // the signature unfold, see below
  disappear(): Promise<void>                   // fold away (reverse, about 0.6× duration)
  setMood(m: Mood): void                       // cross-fade the mood layers, 150 ms
  talk(audioRef: string, visemes?: VisemeTrack): Promise<void>
  celebrate(): Promise<void>                   // setMood('celebrating') plus a small hop
  oops(): Promise<void>                        // setMood('oops') plus a small wobble
  tapReaction(): void                          // quick squash and stretch
}
```

### Rendering and the unfold animation

- Build one `PaperCharacter` component (`react-native-svg` + Reanimated) that renders any `kind` and `mood` from `characters.json`, exactly as described in the README. The data file is the only source of art.
- **Unfold on appear (required):** each shape scales open from its crease edge, in four stages: body, then head, then ears, arms, tail and hats, then the face. Timings, easing and fold directions are in `characters.json → unfold`. Match `preview.html`.
- When several characters appear together, stagger them by `unfold.castStaggerSec`.
- With reduced motion turned on, render the final frame with no animation.
- Performance: there are about 40 shapes per character. Use shared values per stage, not one animation per shape, if frame rate drops on low-end Android.
- **Talking:** until viseme timing files exist, alternate between the mood's mouth and the open mouth from the `wave` mood at about 8 Hz while audio plays. Visemes come later from Rhubarb Lip Sync, as one language-neutral set of mouth shapes.
- Rive is optional later. An animator may rebuild the cast in Rive behind the same `CharacterController`. Nothing outside `packages/characters` may change when that happens.

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
- A wrong answer means the `silly` character (Kiko) does `oops()`, the correct item wiggles, and the child tries again.
- A session is 5–6 exercises, then a sticker, then a world update, then the `calm` character (Mina) says goodbye.
- Every character that comes on screen uses `appear()`, so the unfold is the app's signature moment. The `explorer` (Tamu) unfolds on the world map to introduce a new unit.
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
- [ ] `characters`: the controller, the `PaperCharacter` renderer for all five characters and five moods, and the unfold, fold-away and mood cross-fade. Add a dev-only "cast gallery" screen that mirrors `preview.html`.
- [ ] `ui`: design tokens taken from the folded-paper palette: warm paper background `#F4F1EA`, ink `#2B1D16`, teal accent `#2BA59B`, gold `#F2C14E`, and flat "paper card" surfaces with a hard offset shadow. Big buttons and a replay-audio button.
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
- Brand mood [**decided:** folded paper, origami facets on warm paper]
- Characters [**decided:** Nilo, Zuzu, Kiko, Mina and Tamu; names are working names, so keep them in one constants file]

# kids-lang

Audio-first language learning for children aged 3–5 (Spanish, French, Arabic and Turkish for
English (UK) speakers). The product and engineering brief is in [CLAUDE.md](CLAUDE.md).

## Getting started

Requires Node 22.12+ and pnpm 10.

```sh
pnpm install
pnpm test                          # Vitest across packages
pnpm lint && pnpm typecheck
pnpm validate-content --allow-draft
```

## Layout

| Path                       | What                                                          |
| -------------------------- | ------------------------------------------------------------- |
| `packages/content-schema/` | Zod schemas, inferred types, and the content validator        |
| `content/`                 | Concepts, curriculum, language packs, audio, art (git is SoT) |
| `design/characters/`       | Master character art: `characters.json`, SVGs, `preview.html` |
| `scripts/`                 | `validate-content`, `make-placeholder-audio`                  |
| `apps/studio/`             | Stub for the later content studio                             |

| `packages/engine/` | Pure TS lesson runner, templates, spaced repetition |
| `packages/characters/` | `PaperCharacter` + `CharacterController`, drawn from the art |
| `packages/ui/` | Folded-paper tokens and kid-sized components |
| `apps/mobile/` | Expo app (Expo Router) |

## Running the app on a phone

1. Install **Expo Go** on the phone (App Store / Google Play).
2. On a computer: `pnpm install`, then `cd apps/mobile && pnpm start`.
3. Scan the QR code with the phone camera (iOS) or Expo Go (Android). The phone and computer
   must be on the same network (or use `pnpm start --tunnel`).

The grown-ups area (⚙︎ on the first screen, or "+" to add a player) is behind a parent gate. The
dev-only cast gallery is linked from the grown-ups area.

After changing anything in `content/`, run `pnpm build-packs` so the app bundles it.

## Content

- **Concepts** (`content/concepts/*.json`) are language-neutral: `animal.cat`, with art and sfx refs.
- **Curriculum** (`content/curriculum/`) has units, lessons and age-band profiles. Lessons refer to
  concept ids only. Each exercise lists its `speakers` (default `guide`).
- **Language packs** (`content/packs/<lang>/pack.json`) map concept ids to lexemes. Adding a
  language means adding a pack and listing it in `content/manifest.json`; no code changes.
- Asset refs are relative to `content/`.

### Validation

`pnpm validate-content` fails if:

- a lesson uses a concept with no lexeme in a shipped pack;
- a lexeme lacks audio (ref or file) for a character that speaks it in a lesson;
- a shipped lexeme isn't `approved` (`--allow-draft` relaxes this for dev);
- an Arabic lexeme has no transliteration;
- an exercise uses a template its unit's age bands don't allow, or offers more choices than allowed;
- curriculum links are broken (unknown unit, lesson, concept, profile or pack), or ids are duplicated.

### Placeholders

- All lexemes are `draft` and need native-speaker review before release.
- Audio files named `placeholder_*` are silent clips from `pnpm placeholder-audio`, which fills in
  any audio ref that has no file. Replace them with real recordings (or dev TTS).
- Art refs (`art/placeholder_*.svg`) point at files that don't exist yet.

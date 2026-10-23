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

Engine, characters, UI and the Expo app arrive in Phase 2.

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

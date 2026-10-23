# Folded-paper cast: art handoff

This folder is the master source for the app's five narrator characters. Open `preview.html` in a browser to see them all, every mood, and the unfold animation.

| ID (code) | Name | Animal | Role | Typical moments |
| --- | --- | --- | --- | --- |
| `guide` | Nilo | otter | The Guide | Every instruction, pointing at choices |
| `cheerleader` | Zuzu | rabbit | The Cheerleader | Right answers, rewards, end of lesson |
| `silly` | Kiko | frog | The Silly friend | Wrong answers (the "oops" retry), songs |
| `calm` | Mina | turtle | The Calm friend | Stopping points, goodbye, bedtime mode |
| `explorer` | Tamu | monkey | The Explorer | World map, introducing a new unit and its words |

Names are working names. They are short and contain no P or V sounds, so they are easy to say in Spanish, French, Arabic and Turkish.

## Files

| File | What it is |
| --- | --- |
| `characters.json` | **Source of truth.** Every shape of every character, with its fold direction and unfold stage. The app renders from this. |
| `svg/<kind>-<mood>.svg` | 25 static SVGs (5 characters × 5 moods) for docs, store screenshots, the parent app and quick reference. |
| `preview.html` | A reference renderer and animation, about 60 lines of JavaScript. Copy its logic. |

## How `characters.json` works

```ts
type Kind = 'otter' | 'rabbit' | 'frog' | 'turtle' | 'monkey';
type Mood = 'wave' | 'listening' | 'thinking' | 'celebrating' | 'oops';
type Fold = 'left' | 'right' | 'up' | 'down' | 'pop';

interface CharacterArt {
  viewBox: [number, number, number, number];   // [0, -30, 200, 260] for every character
  kinds: Kind[];
  moods: Mood[];
  armColor: Record<Kind, string>;              // substitutes the "ARM" fill value
  unfold: {
    stageDelaysSec: Record<'1' | '2' | '3' | '4', number>;
    durationSec: number;
    easing: [number, number, number, number];  // cubic-bezier
    startBrightness: number;                    // shapes start darker, like paper in shadow
    castStaggerSec: number;                     // delay between characters when several appear
  };
  layers: Array<{
    when: { kinds?: Kind[]; moods?: Mood[]; transform?: string };
    tint: boolean;                              // true = shapes may use fill "ARM"
    shapes: Array<{
      tag: 'polygon' | 'path' | 'ellipse' | 'circle' | 'line' | 'polyline';
      attrs: Record<string, string>;            // SVG attributes, ready for react-native-svg
      fold: Fold;
      stage: 1 | 2 | 3 | 4;
    }>;
  }>;
}
```

**To draw a character**, walk `layers` in order and keep each layer whose `when.kinds` includes the kind and whose `when.moods` includes the mood. A missing key matches everything. Replace any `fill: "ARM"` with `armColor[kind]`, and wrap the layer in a group when it has a `transform`. Draw order matters, so never sort the layers.

**To unfold**, animate every shape from folded to open. Each shape starts at `stageDelaysSec[stage]`, plus the character's own start delay:

| Fold | Animation | Origin (the shape's own bounding box) |
| --- | --- | --- |
| `left` | scaleX 0 → 1 | right edge (opens like a book page) |
| `right` | scaleX 0 → 1 | left edge |
| `up` | scaleY 0 → 1 | bottom edge |
| `down` | scaleY 0 → 1 | top edge |
| `pop` | scale 0 → 1 | centre |

The stages run in this order: 1 = body and shadow, 2 = head, collar and muzzle, 3 = ears, arms, tail, feet and hats, 4 = face and effects. Brightness goes from `startBrightness` to 1 during the unfold.

**To fold away**, play the same animation in reverse at about 0.6× the duration.

**Mood change** (no unfold): cross-fade the mood-specific layers over 150 ms. These are the face, arm and effect layers, which are the ones with `when.moods`.

**Reduced motion**: if the device asks for reduced motion, skip straight to the final frame.

## Adding a new character later

Every character shares the same face, arm and effect positions. A new character only needs its own body layer (behind the arms) and head layer (in front of the arms), keyed by a new kind. All five moods then work automatically.

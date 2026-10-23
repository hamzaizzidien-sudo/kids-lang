import data from "../../../design/characters/characters.json";

export type Kind = "otter" | "rabbit" | "frog" | "turtle" | "monkey";
export type Mood = "wave" | "listening" | "thinking" | "celebrating" | "oops";
export type Fold = "left" | "right" | "up" | "down" | "pop";
export type Stage = 1 | 2 | 3 | 4;

export interface ArtShape {
  tag: "polygon" | "path" | "ellipse" | "circle" | "line" | "polyline";
  attrs: Record<string, string>;
  fold: Fold;
  stage: Stage;
}

export interface ArtLayer {
  when: { kinds?: Kind[]; moods?: Mood[]; transform?: string };
  tint: boolean;
  shapes: ArtShape[];
}

/** Shape of design/characters/characters.json. See design/characters/README.md. */
export interface CharacterArt {
  version: number;
  viewBox: [number, number, number, number];
  kinds: Kind[];
  moods: Mood[];
  armColor: Record<Kind, string>;
  unfold: {
    stageDelaysSec: Record<"1" | "2" | "3" | "4", number>;
    durationSec: number;
    easing: [number, number, number, number];
    startBrightness: number;
    castStaggerSec: number;
  };
  layers: ArtLayer[];
}

/** The master art. The data file is the only source of character art. */
export const ART = data as unknown as CharacterArt;

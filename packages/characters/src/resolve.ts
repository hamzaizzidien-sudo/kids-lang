import { ART, type CharacterArt, type Fold, type Kind, type Mood, type Stage } from "./art";
import {
  bbox,
  foldTransform,
  paintAttrs,
  toCommands,
  type Box,
  type Cmd,
  type FoldTransform,
} from "./geometry";

export interface ResolvedShape {
  key: string;
  cmds: Cmd[];
  box: Box;
  fold: Fold;
  foldTransform: FoldTransform;
  stage: Stage;
  paint: Record<string, string>;
  /** The mood's mouth, swapped for the open `wave` mouth while talking. */
  mouth: boolean;
}

export interface ResolvedLayer {
  key: string;
  transform?: string;
  /** Mood-specific layers (face, arms, effects) cross-fade on mood change. Undefined = always shown. */
  moods?: Mood[];
  shapes: ResolvedShape[];
}

// Every character shares face positions, so the mouth sits in one region of the viewBox.
const MOUTH_REGION: Box = { x0: 86, y0: 102, x1: 114, y1: 122 };

/** Every layer that applies to `kind`, in draw order, across all moods. Never sort these. */
export function resolveKind(kind: Kind, art: CharacterArt = ART): ResolvedLayer[] {
  const out: ResolvedLayer[] = [];
  art.layers.forEach((layer, li) => {
    const { kinds, moods, transform } = layer.when;
    if (kinds && !kinds.includes(kind)) return;
    out.push({
      key: `l${li}`,
      ...(transform ? { transform } : {}),
      ...(moods ? { moods } : {}),
      shapes: layer.shapes.map((shape, si) => {
        const cmds = toCommands(shape);
        const box = bbox(shape, cmds);
        return {
          key: `l${li}s${si}`,
          cmds,
          box,
          fold: shape.fold,
          foldTransform: foldTransform(shape.fold, box),
          stage: shape.stage,
          paint: paintAttrs(shape, art.armColor[kind]),
          mouth: Boolean(moods) && !layer.tint && inside(box, MOUTH_REGION),
        };
      }),
    });
  });
  return out;
}

/** Layers drawn for one kind in one mood (README "To draw a character"). */
export function layersFor(layers: ResolvedLayer[], mood: Mood): ResolvedLayer[] {
  return layers.filter((l) => !l.moods || l.moods.includes(mood));
}

/** The open mouth from the `wave` mood, used for talking until visemes exist. */
export function openMouth(layers: ResolvedLayer[]): ResolvedShape {
  const mouth = layersFor(layers, "wave")
    .filter((l) => l.moods)
    .flatMap((l) => l.shapes)
    .find((s) => s.mouth);
  if (!mouth) throw new Error("No open mouth in the wave mood");
  return mouth;
}

/** Seconds from the start of an unfold until a stage's shapes start moving. */
export function stageDelay(stage: Stage, art: CharacterArt = ART): number {
  return art.unfold.stageDelaysSec[String(stage) as "1" | "2" | "3" | "4"];
}

/** Total seconds for a full unfold. */
export function unfoldDuration(art: CharacterArt = ART): number {
  return Math.max(...Object.values(art.unfold.stageDelaysSec)) + art.unfold.durationSec;
}

function inside(b: Box, region: Box): boolean {
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  return cx >= region.x0 && cx <= region.x1 && cy >= region.y0 && cy <= region.y1;
}

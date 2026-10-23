// Pure geometry for the unfold. Every shape becomes one absolute path command list, so a
// Reanimated worklet can rebuild its `d` each frame with the fold's scale applied.
import type { ArtShape, Fold } from "./art";

export type Cmd =
  | { c: "M" | "L"; x: number; y: number }
  | {
      c: "A";
      rx: number;
      ry: number;
      rot: number;
      large: number;
      sweep: number;
      x: number;
      y: number;
    }
  | { c: "Z" };

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Scale origin and axes for a fold, per design/characters/README.md. */
export interface FoldTransform {
  ox: number;
  oy: number;
  scaleX: boolean;
  scaleY: boolean;
}

const GEOMETRY_ATTRS = new Set([
  "points",
  "d",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x1",
  "y1",
  "x2",
  "y2",
]);

export function toCommands(shape: ArtShape): Cmd[] {
  const a = shape.attrs;
  const n = (k: string) => Number(a[k]);
  switch (shape.tag) {
    case "polygon":
    case "polyline": {
      const pts = (a.points ?? "")
        .trim()
        .split(/[\s,]+/)
        .map(Number);
      const cmds: Cmd[] = [];
      for (let i = 0; i + 1 < pts.length; i += 2) {
        cmds.push({ c: i === 0 ? "M" : "L", x: pts[i]!, y: pts[i + 1]! });
      }
      if (shape.tag === "polygon") cmds.push({ c: "Z" });
      return cmds;
    }
    case "line":
      return [
        { c: "M", x: n("x1"), y: n("y1") },
        { c: "L", x: n("x2"), y: n("y2") },
      ];
    case "circle":
    case "ellipse": {
      const [cx, cy] = [n("cx"), n("cy")];
      const [rx, ry] = shape.tag === "circle" ? [n("r"), n("r")] : [n("rx"), n("ry")];
      const arc = (x: number): Cmd => ({ c: "A", rx, ry, rot: 0, large: 1, sweep: 0, x, y: cy });
      return [{ c: "M", x: cx - rx, y: cy }, arc(cx + rx), arc(cx - rx), { c: "Z" }];
    }
    case "path":
      return parsePath(a.d ?? "");
  }
}

/** Absolute M/L/H/V/A/Z only, which is all the art uses. */
export function parsePath(d: string): Cmd[] {
  const tokens = d.match(/[MLHVAZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
  const cmds: Cmd[] = [];
  let i = 0;
  let cmd = "";
  let x = 0;
  let y = 0;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/^[a-z]$/i.test(tokens[i]!)) cmd = tokens[i++]!;
    if (!/^[MLHVAZ]$/.test(cmd)) {
      throw new Error(`Unsupported path command "${cmd}" in "${d}"`);
    }
    switch (cmd) {
      case "M":
      case "L":
        x = num();
        y = num();
        cmds.push({ c: cmd, x, y });
        if (cmd === "M") cmd = "L";
        break;
      case "H":
        x = num();
        cmds.push({ c: "L", x, y });
        break;
      case "V":
        y = num();
        cmds.push({ c: "L", x, y });
        break;
      case "A": {
        const [rx, ry, rot, large, sweep] = [num(), num(), num(), num(), num()];
        x = num();
        y = num();
        cmds.push({ c: "A", rx, ry, rot, large, sweep, x, y });
        break;
      }
      case "Z":
        cmds.push({ c: "Z" });
        cmd = ""; // numbers straight after Z are malformed
        break;
    }
  }
  return cmds;
}

/** Bounding box. Arcs use their end points plus radii around their centre-ish, close enough for an origin. */
export function bbox(shape: ArtShape, cmds: Cmd[]): Box {
  const a = shape.attrs;
  if (shape.tag === "circle" || shape.tag === "ellipse") {
    const rx = Number(shape.tag === "circle" ? a.r : a.rx);
    const ry = Number(shape.tag === "circle" ? a.r : a.ry);
    const [cx, cy] = [Number(a.cx), Number(a.cy)];
    return { x0: cx - rx, y0: cy - ry, x1: cx + rx, y1: cy + ry };
  }
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const c of cmds) {
    if (c.c === "Z") continue;
    box.x0 = Math.min(box.x0, c.x);
    box.y0 = Math.min(box.y0, c.y);
    box.x1 = Math.max(box.x1, c.x);
    box.y1 = Math.max(box.y1, c.y);
  }
  return box;
}

/** Crease edge of the shape's own bounding box (README "To unfold" table). */
export function foldTransform(fold: Fold, b: Box): FoldTransform {
  const midX = (b.x0 + b.x1) / 2;
  const midY = (b.y0 + b.y1) / 2;
  switch (fold) {
    case "left":
      return { ox: b.x1, oy: midY, scaleX: true, scaleY: false };
    case "right":
      return { ox: b.x0, oy: midY, scaleX: true, scaleY: false };
    case "up":
      return { ox: midX, oy: b.y1, scaleX: false, scaleY: true };
    case "down":
      return { ox: midX, oy: b.y0, scaleX: false, scaleY: true };
    case "pop":
      return { ox: midX, oy: midY, scaleX: true, scaleY: true };
  }
}

/** The shape's `d` at unfold scale `s` (0 = folded flat on its crease, 1 = open). */
export function pathAt(cmds: Cmd[], f: FoldTransform, s: number): string {
  "worklet";
  const sx = f.scaleX ? s : 1;
  const sy = f.scaleY ? s : 1;
  const r = (v: number) => Math.round(v * 100) / 100;
  let d = "";
  for (let i = 0; i < cmds.length; i++) {
    const c = cmds[i]!;
    if (c.c === "Z") {
      d += "Z";
      continue;
    }
    const x = r(f.ox + (c.x - f.ox) * sx);
    const y = r(f.oy + (c.y - f.oy) * sy);
    if (c.c === "A") {
      d += `A${r(Math.abs(c.rx * sx))} ${r(Math.abs(c.ry * sy))} ${c.rot} ${c.large} ${c.sweep} ${x} ${y}`;
    } else {
      d += `${c.c}${x} ${y}`;
    }
  }
  return d;
}

/** Non-geometry SVG attributes (fill, stroke…), with "ARM" replaced by the kind's arm colour. */
export function paintAttrs(shape: ArtShape, armColor: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(shape.attrs)) {
    if (!GEOMETRY_ATTRS.has(k)) out[k] = v === "ARM" ? armColor : v;
  }
  return out;
}

/** Multiply a #RRGGBB colour's channels, like CSS brightness(). Other values pass through. */
export function darken(color: string, brightness: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m) return color;
  const v = parseInt(m[1]!, 16);
  const ch = (shift: number) => Math.round(((v >> shift) & 255) * brightness);
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

/** cubic-bezier(x1, y1, x2, y2) as a function of time in [0, 1]; y may overshoot. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const bez = (a: number, b: number, t: number) =>
    3 * a * (1 - t) ** 2 * t + 3 * b * (1 - t) * t ** 2 + t ** 3;
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    // Solve x(u) = t by bisection; x is monotonic for x1, x2 in [0, 1].
    let lo = 0;
    let hi = 1;
    for (let k = 0; k < 30; k++) {
      const mid = (lo + hi) / 2;
      if (bez(x1, x2, mid) < t) lo = mid;
      else hi = mid;
    }
    return bez(y1, y2, (lo + hi) / 2);
  };
}

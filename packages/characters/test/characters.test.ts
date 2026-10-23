import { describe, expect, it } from "vitest";
import {
  ART,
  CAST,
  CHARACTER_IDS,
  bbox,
  cubicBezier,
  darken,
  foldTransform,
  layersFor,
  openMouth,
  parsePath,
  pathAt,
  resolveKind,
  stageDelay,
  toCommands,
  unfoldDuration,
  type ArtShape,
} from "../src/pure";

const poly = (points: string, fold: ArtShape["fold"] = "left"): ArtShape => ({
  tag: "polygon",
  attrs: { points, fill: "ARM" },
  fold,
  stage: 1,
});

describe("cast", () => {
  it("maps all five ids to distinct kinds in the art", () => {
    expect(CHARACTER_IDS).toEqual(["guide", "cheerleader", "silly", "calm", "explorer"]);
    expect(new Set(CHARACTER_IDS.map((id) => CAST[id].kind))).toEqual(new Set(ART.kinds));
    expect(CAST.silly).toMatchObject({ kind: "frog", name: "Kiko" });
  });
});

describe("art data", () => {
  it.each(ART.kinds)("%s draws in every mood with exactly one mouth", (kind) => {
    const layers = resolveKind(kind);
    for (const mood of ART.moods) {
      const shown = layersFor(layers, mood);
      expect(shown.some((l) => !l.moods)).toBe(true);
      expect(shown.flatMap((l) => l.shapes).filter((s) => s.mouth)).toHaveLength(1);
    }
    expect(openMouth(layers).key).toBe("l16s4");
  });

  it("keeps draw order and substitutes the arm colour", () => {
    const layers = resolveKind("frog");
    const keys = layers.map((l) => Number(l.key.slice(1)));
    expect(keys).toEqual([...keys].sort((a, b) => a - b));
    const arm = layers.flatMap((l) => l.shapes).find((s) => s.key === "l5s0")!;
    expect(arm.paint.fill).toBe(ART.armColor.frog);
    expect(layers.find((l) => l.transform)?.transform).toBe("rotate(-14 100 40)");
  });

  it("parses every shape in the file", () => {
    for (const layer of ART.layers)
      for (const s of layer.shapes) expect(toCommands(s).length).toBeGreaterThan(1);
  });

  it("times the unfold from the data", () => {
    expect(stageDelay(1)).toBe(0);
    expect(stageDelay(4)).toBe(ART.unfold.stageDelaysSec["4"]);
    expect(unfoldDuration()).toBeCloseTo(ART.unfold.stageDelaysSec["4"] + ART.unfold.durationSec);
  });
});

describe("geometry", () => {
  it("parses absolute M/L/H/V/A/Z paths", () => {
    expect(parsePath("M68 172 H132 V180 L1 2 A8 8 0 1 1 98 156 Z")).toEqual([
      { c: "M", x: 68, y: 172 },
      { c: "L", x: 132, y: 172 },
      { c: "L", x: 132, y: 180 },
      { c: "L", x: 1, y: 2 },
      { c: "A", rx: 8, ry: 8, rot: 0, large: 1, sweep: 1, x: 98, y: 156 },
      { c: "Z" },
    ]);
    expect(parsePath("M0 0 1 1")).toEqual([
      { c: "M", x: 0, y: 0 },
      { c: "L", x: 1, y: 1 },
    ]);
    expect(() => parsePath("m0 0")).toThrow(/Unsupported/);
    expect(() => parsePath("M0 0 Z 4 4")).toThrow(/Unsupported/);
  });

  it("converts circles, ellipses and lines", () => {
    const circle: ArtShape = {
      tag: "circle",
      attrs: { cx: "10", cy: "20", r: "2" },
      fold: "pop",
      stage: 4,
    };
    expect(bbox(circle, toCommands(circle))).toEqual({ x0: 8, y0: 18, x1: 12, y1: 22 });
    const ellipse: ArtShape = {
      tag: "ellipse",
      attrs: { cx: "0", cy: "0", rx: "4", ry: "1" },
      fold: "pop",
      stage: 1,
    };
    expect(
      pathAt(toCommands(ellipse), foldTransform("pop", bbox(ellipse, toCommands(ellipse))), 1),
    ).toBe("M-4 0A4 1 0 1 0 4 0A4 1 0 1 0 -4 0Z");
    const line: ArtShape = {
      tag: "line",
      attrs: { x1: "0", y1: "0", x2: "10", y2: "0" },
      fold: "pop",
      stage: 4,
    };
    expect(pathAt(toCommands(line), foldTransform("pop", bbox(line, toCommands(line))), 0.5)).toBe(
      "M2.5 0L7.5 0",
    );
    const pl: ArtShape = { tag: "polyline", attrs: { points: "0,0 1,1" }, fold: "up", stage: 4 };
    expect(toCommands(pl).at(-1)).toEqual({ c: "L", x: 1, y: 1 });
    expect(toCommands({ tag: "path", attrs: {}, fold: "pop", stage: 1 })).toEqual([]);
    expect(toCommands({ tag: "polygon", attrs: {}, fold: "pop", stage: 1 })).toEqual([{ c: "Z" }]);
  });

  it("opens each fold from its crease edge", () => {
    const shape = poly("0,0 10,0 10,20 0,20");
    const cmds = toCommands(shape);
    const box = bbox(shape, cmds);
    expect(pathAt(cmds, foldTransform("left", box), 0)).toBe("M10 0L10 0L10 20L10 20Z");
    expect(pathAt(cmds, foldTransform("right", box), 0)).toBe("M0 0L0 0L0 20L0 20Z");
    expect(pathAt(cmds, foldTransform("up", box), 0)).toBe("M0 20L10 20L10 20L0 20Z");
    expect(pathAt(cmds, foldTransform("down", box), 0)).toBe("M0 0L10 0L10 0L0 0Z");
    expect(pathAt(cmds, foldTransform("pop", box), 0)).toBe("M5 10L5 10L5 10L5 10Z");
    expect(pathAt(cmds, foldTransform("left", box), 1)).toBe("M0 0L10 0L10 20L0 20Z");
  });

  it("darkens hex colours like CSS brightness and passes others through", () => {
    expect(darken("#FF8000", 0.5)).toBe("rgb(128, 64, 0)");
    expect(darken("none", 0.5)).toBe("none");
  });

  it("evaluates the overshooting cubic-bezier", () => {
    const ease = cubicBezier(...ART.unfold.easing);
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    const samples = Array.from({ length: 99 }, (_, i) => ease((i + 1) / 100));
    expect(Math.max(...samples)).toBeGreaterThan(1);
  });
});

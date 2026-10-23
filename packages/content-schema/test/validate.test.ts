import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  AgeBandProfile,
  Exercise,
  LanguagePack,
  hasErrors,
  validateContent,
  type ContentBundle,
} from "../src";
import { loadContent, validateContentDir } from "../src/node";
import { formatIssue, runCli } from "../src/run-cli";

const CONTENT = resolve(import.meta.dirname, "../../../content");

function seed(): ContentBundle {
  const { bundle, issues } = loadContent(CONTENT);
  expect(issues).toEqual([]);
  return structuredClone(bundle);
}

const rules = (bundle: ContentBundle, opts = { allowDraft: true }) =>
  validateContent(bundle, opts)
    .filter((i) => i.severity === "error")
    .map((i) => i.rule);

const pack = (b: ContentBundle, lang: string) => b.packs.find((p) => p.lang === lang)!;
const lesson = (b: ContentBundle, id = "animals-1") => b.lessons.find((l) => l.id === id)!;

describe("seed content", () => {
  it("is valid in dev (draft allowed) with every audio file present", () => {
    const issues = validateContentDir(CONTENT, { allowDraft: true });
    expect(hasErrors(issues)).toBe(false);
    expect(issues.map((i) => i.rule)).toEqual([
      "not-approved",
      "not-approved",
      "not-approved",
      "not-approved",
    ]);
  });

  it("is not shippable until native speakers approve it", () => {
    expect(rules(seed(), { allowDraft: false })).toContain("not-approved");
  });

  it("has the 10 launch units and 8 animal concepts", () => {
    const b = seed();
    expect(b.units).toHaveLength(10);
    expect(b.concepts.map((c) => c.id).sort()).toEqual(
      ["bird", "cat", "cow", "dog", "duck", "fish", "horse", "rabbit"].map((a) => `animal.${a}`),
    );
  });

  it("gives every Arabic lexeme harakat", () => {
    const harakat = /[ً-ْ]/;
    for (const lexeme of Object.values(pack(seed(), "ar").lexemes))
      expect(lexeme.text).toMatch(harakat);
  });
});

describe("validation rules", () => {
  it("catches a deliberately broken lexeme (missing from one shipped pack)", () => {
    const b = seed();
    delete pack(b, "fr").lexemes["animal.cat"];
    expect(rules(b)).toContain("missing-lexeme");
  });

  it("catches missing audio for a speaking character", () => {
    const b = seed();
    delete pack(b, "es").lexemes["animal.cat"]!.audio.cheerleader;
    expect(rules(b)).toEqual(["missing-audio"]);
  });

  it("catches an audio ref whose file does not exist", () => {
    const b = seed();
    const issues = validateContent(b, {
      allowDraft: true,
      assetExists: (ref) => !ref.includes("/tr/"),
    });
    expect(issues.filter((i) => i.rule === "missing-asset").length).toBeGreaterThan(0);
  });

  it("catches an Arabic lexeme with no transliteration", () => {
    const b = seed();
    delete pack(b, "ar").lexemes["animal.dog"]!.transliteration;
    expect(rules(b)).toEqual(["missing-transliteration"]);
  });

  it("catches a template not allowed by the unit's age bands", () => {
    const b = seed();
    b.profiles[0]!.allowedTemplates = ["listenTap", "dragMatch"];
    expect(new Set(rules(b))).toEqual(new Set(["template-not-allowed"]));
  });

  it("catches more choices than the age band allows", () => {
    const b = seed();
    lesson(b).exercises[0]!.distractors!.push("animal.horse");
    expect(rules(b)).toEqual(["too-many-choices"]);
  });

  it("catches unknown concepts in lessons and packs", () => {
    const b = seed();
    lesson(b).exercises[0]!.targets = ["animal.unicorn"];
    pack(b, "tr").lexemes["animal.dragon"] = structuredClone(pack(b, "tr").lexemes["animal.cat"]!);
    expect(rules(b)).toEqual(["unknown-concept", "unknown-concept"]);
  });

  it("catches broken curriculum links", () => {
    const b = seed();
    b.units.find((u) => u.id === "colours")!.lessons.push({ id: "colours-1" });
    b.units.find((u) => u.id === "body")!.ageBands = ["5-8"];
    lesson(b, "animals-2").unitId = "space";
    b.manifest.shippedPacks.push("de");
    expect(new Set(rules(b))).toEqual(
      new Set(["missing-lesson", "missing-profile", "missing-unit", "missing-pack"]),
    );
  });

  it("catches a lesson its unit does not list", () => {
    const b = seed();
    b.units.find((u) => u.id === "animals")!.lessons.pop();
    expect(rules(b)).toEqual(["missing-lesson"]);
  });

  it("catches duplicate ids", () => {
    const b = seed();
    b.concepts.push(b.concepts[0]!);
    b.packs.push(pack(b, "es"));
    expect(rules(b)).toEqual(["duplicate-id", "duplicate-id"]);
  });

  it("checks language-specific override lessons against their own pack only", () => {
    const b = seed();
    const ar = pack(b, "ar");
    ar.overrides = {
      lessons: [
        {
          ...structuredClone(lesson(b)),
          id: "ar-extra",
          exercises: [
            Exercise.parse({
              id: "x",
              template: "sayIt",
              targets: ["animal.cat"],
              speakers: ["calm"],
            }),
          ],
        },
      ],
    };
    expect(rules(b)).toEqual(["missing-audio"]);
  });

  it("does not require a pack that is not shipped", () => {
    const b = seed();
    b.manifest.shippedPacks = ["es"];
    delete pack(b, "fr").lexemes["animal.cat"];
    expect(rules(b)).toEqual([]);
  });
});

describe("schemas", () => {
  it("defaults exercise speakers to the guide", () => {
    expect(
      Exercise.parse({ id: "a", template: "listenTap", targets: ["animal.cat"] }).speakers,
    ).toEqual(["guide"]);
  });

  it("rejects an inverted session range", () => {
    const p = { ...seed().profiles[0]!, sessionExercises: [6, 5] };
    expect(AgeBandProfile.safeParse(p).success).toBe(false);
  });

  it("accepts a new language as data only", () => {
    const de = {
      lang: "de",
      direction: "ltr",
      lexemes: { "animal.cat": { text: "Katze", audio: {}, review: { status: "draft" } } },
    };
    expect(LanguagePack.safeParse(de).success).toBe(true);
  });
});

describe("loader and CLI", () => {
  let tmp: string | undefined;
  afterEach(() => tmp && rmSync(tmp, { recursive: true, force: true }));

  const copy = () => {
    tmp = mkdtempSync(join(tmpdir(), "kids-lang-content-"));
    cpSync(CONTENT, tmp, { recursive: true });
    return tmp;
  };
  const edit = (file: string, fn: (json: Record<string, any>) => void) => {
    const json = JSON.parse(readFileSync(file, "utf8"));
    fn(json);
    writeFileSync(file, JSON.stringify(json));
  };
  const run = (...argv: string[]) => {
    const lines: string[] = [];
    const code = runCli(argv, CONTENT, (l) => lines.push(l));
    return { code, out: lines.join("\n") };
  };

  it("passes on the seed content with --allow-draft and fails without", () => {
    expect(run("--allow-draft").code).toBe(0);
    expect(run().code).toBe(1);
  });

  it("fails on a deliberately broken lexeme on disk", () => {
    const dir = copy();
    edit(join(dir, "packs/ar/pack.json"), (p) => {
      p.lexemes["animal.cat"].text = "";
      delete p.lexemes["animal.cow"].transliteration;
    });
    const { code, out } = run("--allow-draft", "--content", dir);
    expect(code).toBe(1);
    expect(out).toContain("[schema] packs/ar/pack.json: lexemes.animal.cat.text");
  });

  it("fails when an audio file is missing on disk", () => {
    const dir = copy();
    rmSync(join(dir, "audio/tr/placeholder_guide_animal.cat.wav"));
    const { code, out } = run("--allow-draft", "--content", dir);
    expect(code).toBe(1);
    expect(out).toContain("[missing-asset]");
  });

  it("reports unreadable JSON, mismatched file names and pack folders", () => {
    const dir = copy();
    writeFileSync(join(dir, "concepts/animal.cat.json"), "{ nope");
    edit(join(dir, "concepts/animal.dog.json"), (c) => (c.id = "animal.hound"));
    edit(join(dir, "packs/tr/pack.json"), (p) => (p.lang = "az"));
    const issues = loadContent(dir).issues.map(formatIssue);
    expect(issues).toHaveLength(3);
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Cannot read JSON"),
        expect.stringContaining('File name must match id "animal.hound"'),
        expect.stringContaining('Pack lang "az" must match its folder'),
      ]),
    );
  });

  it("handles --help and bad arguments", () => {
    expect(run("--help").code).toBe(0);
    expect(run("--bogus").code).toBe(2);
  });
});

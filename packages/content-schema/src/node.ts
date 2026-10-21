// Node-only helpers (filesystem). Kept out of index.ts so the app can import schemas without `fs`.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";
import type { z } from "zod";
import { AgeBandProfile, Concept, ContentManifest, LanguagePack, Lesson, Unit } from "./schemas";
import { validateContent, type ContentBundle, type Issue, type ValidateOptions } from "./validate";

export interface LoadResult {
  bundle: ContentBundle;
  issues: Issue[];
}

/**
 * Reads and schema-checks everything under a content root:
 *   manifest.json, concepts/*.json, curriculum/{units,lessons,age-bands}/*.json, packs/<lang>/pack.json
 * Each file's name must match its id (or lang for packs).
 */
export function loadContent(root: string): LoadResult {
  const issues: Issue[] = [];

  const read = <S extends z.ZodType>(schema: S, file: string): z.infer<S> | undefined => {
    const rel = relative(root, file);
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(file, "utf8"));
    } catch (e) {
      issues.push({
        severity: "error",
        rule: "schema",
        message: `Cannot read JSON: ${(e as Error).message}`,
        file: rel,
      });
      return undefined;
    }
    const result = schema.safeParse(raw);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const path = issue.path.length ? issue.path.join(".") + ": " : "";
        issues.push({
          severity: "error",
          rule: "schema",
          message: path + issue.message,
          file: rel,
        });
      }
      return undefined;
    }
    return result.data;
  };

  const readDir = <S extends z.ZodType<{ id: string }>>(schema: S, dir: string): z.infer<S>[] => {
    const out: z.infer<S>[] = [];
    for (const file of jsonFiles(join(root, dir))) {
      const item = read(schema, file);
      if (!item) continue;
      if (basename(file, ".json") !== item.id) {
        issues.push({
          severity: "error",
          rule: "schema",
          message: `File name must match id "${item.id}"`,
          file: relative(root, file),
        });
      }
      out.push(item);
    }
    return out;
  };

  const manifest = read(ContentManifest, join(root, "manifest.json")) ?? { shippedPacks: [] };

  const packs: LanguagePack[] = [];
  const packsDir = join(root, "packs");
  for (const lang of existsSync(packsDir) ? readdirSync(packsDir).sort() : []) {
    const file = join(packsDir, lang, "pack.json");
    if (!existsSync(file)) continue;
    const pack = read(LanguagePack, file);
    if (!pack) continue;
    if (pack.lang !== lang) {
      issues.push({
        severity: "error",
        rule: "schema",
        message: `Pack lang "${pack.lang}" must match its folder`,
        file: relative(root, file),
      });
    }
    packs.push(pack);
  }

  const bundle: ContentBundle = {
    manifest,
    concepts: readDir(Concept, "concepts"),
    units: readDir(Unit, "curriculum/units"),
    lessons: readDir(Lesson, "curriculum/lessons"),
    profiles: readDir(AgeBandProfile, "curriculum/age-bands"),
    packs,
  };
  return { bundle, issues };
}

/** Load + validate a content root, checking audio files exist on disk. */
export function validateContentDir(
  root: string,
  options: Omit<ValidateOptions, "assetExists"> = {},
): Issue[] {
  const { bundle, issues } = loadContent(root);
  return [
    ...issues,
    ...validateContent(bundle, { ...options, assetExists: (ref) => isFile(join(root, ref)) }),
  ];
}

function jsonFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => join(dir, f));
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

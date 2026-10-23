import type {
  AgeBandProfile,
  Concept,
  ContentManifest,
  LanguagePack,
  Lesson,
  Unit,
} from "./schemas";

export interface ContentBundle {
  manifest: ContentManifest;
  concepts: Concept[];
  units: Unit[];
  lessons: Lesson[];
  profiles: AgeBandProfile[];
  packs: LanguagePack[];
}

export type IssueRule =
  | "schema"
  | "duplicate-id"
  | "missing-pack"
  | "missing-lesson"
  | "missing-unit"
  | "missing-profile"
  | "unknown-concept"
  | "missing-lexeme"
  | "missing-audio"
  | "missing-asset"
  | "not-approved"
  | "missing-transliteration"
  | "template-not-allowed"
  | "too-many-choices";

export interface Issue {
  severity: "error" | "warning";
  rule: IssueRule;
  message: string;
  file?: string;
}

export interface ValidateOptions {
  /** Dev only: let `draft`/`reviewed` lexemes through shipped packs (reported as one warning per pack). */
  allowDraft?: boolean;
  /** When given, every audio ref a lesson needs must resolve to a real file. */
  assetExists?: (ref: string) => boolean;
}

const LANGS_REQUIRING_TRANSLITERATION = new Set(["ar"]);

export function validateContent(bundle: ContentBundle, options: ValidateOptions = {}): Issue[] {
  const issues: Issue[] = [];
  const error = (rule: IssueRule, message: string, file?: string) =>
    issues.push({ severity: "error", rule, message, ...(file ? { file } : {}) });

  const concepts = indexById(bundle.concepts, "concept", error);
  const units = indexById(bundle.units, "unit", error);
  const lessons = indexById(bundle.lessons, "lesson", error);
  const profiles = indexById(bundle.profiles, "age band profile", error);
  const packs = new Map<string, LanguagePack>();
  for (const pack of bundle.packs) {
    if (packs.has(pack.lang)) error("duplicate-id", `Duplicate language pack "${pack.lang}"`);
    packs.set(pack.lang, pack);
  }

  const shipped: LanguagePack[] = [];
  for (const lang of bundle.manifest.shippedPacks) {
    const pack = packs.get(lang);
    if (pack) shipped.push(pack);
    else error("missing-pack", `Manifest ships "${lang}" but there is no pack for it`);
  }

  // Units ↔ lessons ↔ age-band profiles.
  for (const unit of units.values()) {
    for (const ref of unit.lessons) {
      if (!lessons.has(ref.id))
        error("missing-lesson", `Unit "${unit.id}" lists unknown lesson "${ref.id}"`);
    }
    for (const band of unit.ageBands) {
      if (!profiles.has(band))
        error("missing-profile", `Unit "${unit.id}" targets age band "${band}" with no profile`);
    }
  }

  const checkLesson = (lesson: Lesson, inPacks: LanguagePack[], where: string) => {
    const unit = units.get(lesson.unitId);
    if (!unit) {
      error("missing-unit", `${where} belongs to unknown unit "${lesson.unitId}"`);
    } else if (!unit.lessons.some((l) => l.id === lesson.id) && where.startsWith("Lesson")) {
      error("missing-lesson", `${where} is not listed in unit "${unit.id}"`);
    }
    const bandProfiles = (unit?.ageBands ?? []).flatMap((b) => profiles.get(b) ?? []);

    for (const ex of lesson.exercises) {
      const at = `${where}, exercise "${ex.id}"`;

      // Rule: template must be allowed by every age band the unit targets.
      for (const profile of bandProfiles) {
        if (!profile.allowedTemplates.includes(ex.template)) {
          error(
            "template-not-allowed",
            `${at}: template "${ex.template}" is not allowed for age band ${profile.id}`,
          );
        }
      }

      const choiceIds = [...ex.targets, ...(ex.distractors ?? [])];
      const maxChoices = Math.min(...bandProfiles.map((p) => p.maxChoices));
      if (choiceIds.length > maxChoices) {
        error(
          "too-many-choices",
          `${at}: ${choiceIds.length} choices, but the limit is ${maxChoices}`,
        );
      }

      for (const conceptId of new Set(choiceIds)) {
        if (!concepts.has(conceptId)) {
          error("unknown-concept", `${at}: unknown concept "${conceptId}"`);
          continue;
        }
        for (const pack of inPacks) {
          // Rule: every concept a lesson uses needs a lexeme in every shipped pack.
          const lexeme = pack.lexemes[conceptId];
          if (!lexeme) {
            error(
              "missing-lexeme",
              `${at}: no "${pack.lang}" lexeme for "${conceptId}"`,
              packFile(pack),
            );
            continue;
          }
          // Rule: each speaking character needs audio for the word.
          for (const speaker of ex.speakers) {
            const ref = lexeme.audio[speaker];
            if (!ref) {
              error(
                "missing-audio",
                `${at}: "${pack.lang}" lexeme "${conceptId}" has no audio for "${speaker}"`,
                packFile(pack),
              );
            } else if (options.assetExists && !options.assetExists(ref)) {
              error("missing-asset", `${at}: audio file "${ref}" does not exist`, packFile(pack));
            }
          }
        }
      }
    }
  };

  for (const lesson of lessons.values()) checkLesson(lesson, shipped, `Lesson "${lesson.id}"`);

  for (const pack of bundle.packs) {
    for (const lesson of pack.overrides?.lessons ?? []) {
      checkLesson(lesson, [pack], `"${pack.lang}" override lesson "${lesson.id}"`);
    }

    for (const [conceptId, lexeme] of Object.entries(pack.lexemes)) {
      if (!concepts.has(conceptId)) {
        error(
          "unknown-concept",
          `"${pack.lang}" has a lexeme for unknown concept "${conceptId}"`,
          packFile(pack),
        );
      }
      if (LANGS_REQUIRING_TRANSLITERATION.has(pack.lang) && !lexeme.transliteration) {
        error(
          "missing-transliteration",
          `"${pack.lang}" lexeme "${conceptId}" has no transliteration`,
          packFile(pack),
        );
      }
    }
  }

  // Rule: shipped lexemes must be approved (draft allowed in dev behind a flag).
  for (const pack of shipped) {
    const unapproved = Object.entries(pack.lexemes).filter(
      ([, l]) => l.review.status !== "approved",
    );
    if (unapproved.length === 0) continue;
    if (options.allowDraft) {
      issues.push({
        severity: "warning",
        rule: "not-approved",
        message: `"${pack.lang}": ${unapproved.length} lexeme(s) not yet approved (allowed by --allow-draft)`,
        file: packFile(pack),
      });
    } else {
      for (const [conceptId, l] of unapproved) {
        error(
          "not-approved",
          `"${pack.lang}" lexeme "${conceptId}" is "${l.review.status}", not "approved"`,
          packFile(pack),
        );
      }
    }
  }

  return issues;
}

export function hasErrors(issues: Issue[]): boolean {
  return issues.some((i) => i.severity === "error");
}

export function packFile(pack: LanguagePack): string {
  return `packs/${pack.lang}/pack.json`;
}

function indexById<T extends { id: string }>(
  items: T[],
  kind: string,
  error: (rule: IssueRule, message: string) => void,
): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    if (map.has(item.id)) error("duplicate-id", `Duplicate ${kind} id "${item.id}"`);
    map.set(item.id, item);
  }
  return map;
}

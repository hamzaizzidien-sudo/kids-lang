import {
  AgeBandProfile,
  Concept,
  ContentManifest,
  LanguagePack,
  Lesson,
  Unit,
  type AgeBand,
} from "@kids-lang/content-schema";
import { audioAssets, rawContent } from "./generated";

// Parse the bundled content once at startup; a broken pack fails loudly in dev.
export const manifest = ContentManifest.parse(rawContent.manifest);
export const concepts = new Map(
  rawContent.concepts.map((c) => Concept.parse(c)).map((c) => [c.id, c]),
);
export const units = rawContent.units.map((u) => Unit.parse(u)).sort((a, b) => a.order - b.order);
export const lessons = new Map(
  rawContent.lessons.map((l) => Lesson.parse(l)).map((l) => [l.id, l]),
);
export const profiles = new Map(
  rawContent.profiles.map((p) => AgeBandProfile.parse(p)).map((p) => [p.id, p]),
);
export const packs = new Map(
  rawContent.packs.map((p) => LanguagePack.parse(p)).map((p) => [p.lang, p]),
);

export { audioAssets };

export function getPack(lang: string): LanguagePack {
  const pack = packs.get(lang);
  if (!pack) throw new Error(`No bundled pack for "${lang}"`);
  return pack;
}

export function getProfile(band: AgeBand): AgeBandProfile {
  const profile = profiles.get(band);
  if (!profile) throw new Error(`No age-band profile "${band}"`);
  return profile;
}

/** BCP 47 tag for device speech, from the pack's variety ("es-ES") or its language ("ar"). */
export function speechLocale(pack: LanguagePack): string {
  return pack.variety && /^[a-z]{2,3}-[A-Z]{2}$/.test(pack.variety) ? pack.variety : pack.lang;
}

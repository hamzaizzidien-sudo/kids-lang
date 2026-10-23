import { answer, createSession, type Choice, type Session } from "@kids-lang/engine";
import { validateContent, hasErrors } from "@kids-lang/content-schema";
import {
  concepts,
  getPack,
  getProfile,
  lessons,
  manifest,
  packs,
  profiles,
  units,
} from "../src/content";

describe("bundled content", () => {
  it("ships every pack in the manifest and validates", () => {
    expect([...packs.keys()].sort()).toEqual([...manifest.shippedPacks].sort());
    const issues = validateContent(
      {
        manifest,
        concepts: [...concepts.values()],
        units,
        lessons: [...lessons.values()],
        profiles: [...profiles.values()],
        packs: [...packs.values()],
      },
      { allowDraft: true },
    );
    expect(hasErrors(issues)).toBe(false);
  });

  // Acceptance: the Animals lesson completes in any of the 4 languages by switching only the pack.
  it.each(manifest.shippedPacks)("plays every lesson to the end in %s", (lang) => {
    for (const lesson of lessons.values()) {
      let s: Session = createSession(getProfile("3-5"), lesson, getPack(lang), {}, { seed: 1 });
      while (!s.complete) {
        const { view, matched } = s.current!;
        const choice: Choice =
          view.template === "listenTap"
            ? { type: "tap", conceptId: view.answer }
            : view.template === "dragMatch"
              ? {
                  type: "drop",
                  word: view.words.find((w) => !matched.includes(w.conceptId))!.conceptId,
                  picture: view.words.find((w) => !matched.includes(w.conceptId))!.conceptId,
                }
              : { type: "say" };
        s = answer(s, choice).next;
      }
      expect(s.complete).toBe(true);
    }
  });
});

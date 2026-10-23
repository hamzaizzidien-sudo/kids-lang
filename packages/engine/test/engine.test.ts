import { resolve } from "node:path";
import type { AgeBandProfile, LanguagePack, Lesson } from "@kids-lang/content-schema";
import { loadContent } from "@kids-lang/content-schema/node";
import { describe, expect, it } from "vitest";
import {
  EngineError,
  HALF_LIFE_DAYS,
  answer,
  createRng,
  createSession,
  recordAnswer,
  shuffle,
  strengthAt,
  weakConcepts,
  type Choice,
  type Progress,
  type Session,
} from "../src";

const { bundle } = loadContent(resolve(import.meta.dirname, "../../../content"));
const profile = bundle.profiles.find((p) => p.id === "3-5")!;
const lesson = bundle.lessons.find((l) => l.id === "animals-1")!;
const pack = (lang: string) => bundle.packs.find((p) => p.lang === lang)!;
const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 1);

/** Plays the whole session with correct answers; returns every state seen. */
function playPerfect(session: Session): Session[] {
  const seen = [session];
  while (!session.complete) {
    session = answer(session, rightChoice(session), NOW).next;
    seen.push(session);
  }
  return seen;
}

function rightChoice(session: Session): Choice {
  const { view, matched } = session.current!;
  if (view.template === "listenTap") return { type: "tap", conceptId: view.answer };
  if (view.template === "dragMatch") {
    const word = view.words.find((w) => !matched.includes(w.conceptId))!.conceptId;
    return { type: "drop", word, picture: word };
  }
  return { type: "say" };
}

describe("rng", () => {
  it("is deterministic per seed and shuffles without losing items", () => {
    const [r1, r2] = [createRng(7), createRng(7)];
    expect([r1(), r1(), r1()]).toEqual([r2(), r2(), r2()]);
    expect(createRng(8)()).not.toBe(createRng(7)());
    const a = shuffle([1, 2, 3, 4, 5], createRng(1));
    expect(a).toEqual(shuffle([1, 2, 3, 4, 5], createRng(1)));
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("spaced repetition", () => {
  it("raises strength on correct answers and lowers it on wrong ones", () => {
    let p: Progress = {};
    p = recordAnswer(p, "animal.cat", true, NOW);
    const afterOne = strengthAt(p, "animal.cat", NOW);
    p = recordAnswer(p, "animal.cat", true, NOW);
    expect(strengthAt(p, "animal.cat", NOW)).toBeGreaterThan(afterOne);
    p = recordAnswer(p, "animal.cat", false, NOW);
    expect(strengthAt(p, "animal.cat", NOW)).toBeLessThan(afterOne * 2);
  });

  it("decays by half every half-life and never before it was seen", () => {
    const p = { "animal.cat": { strength: 0.8, lastSeen: NOW } };
    expect(strengthAt(p, "animal.cat", NOW + HALF_LIFE_DAYS * DAY)).toBeCloseTo(0.4);
    expect(strengthAt(p, "animal.cat", NOW - DAY)).toBe(0.8);
    expect(strengthAt(p, "animal.dog", NOW)).toBe(0);
  });

  it("lists weak concepts weakest first", () => {
    const p: Progress = {
      "animal.cat": { strength: 0.9, lastSeen: NOW },
      "animal.dog": { strength: 0.3, lastSeen: NOW },
      "animal.cow": { strength: 0.9, lastSeen: NOW - 30 * DAY },
      "animal.fish": { strength: 0.3, lastSeen: NOW },
    };
    expect(weakConcepts(p, NOW)).toEqual(["animal.cow", "animal.dog", "animal.fish"]);
  });
});

describe("session", () => {
  it("is deterministic for the same seed", () => {
    const a = createSession(profile, lesson, pack("es"), {}, { seed: 42, now: NOW });
    const b = createSession(profile, lesson, pack("es"), {}, { seed: 42, now: NOW });
    expect(a).toEqual(b);
  });

  it.each(["es", "fr", "ar", "tr"])(
    "completes the Animals lesson in %s with only the pack swapped",
    (lang) => {
      const states = playPerfect(createSession(profile, lesson, pack(lang), {}, { now: NOW }));
      const last = states.at(-1)!;
      expect(last.complete).toBe(true);
      expect(last.current).toBeUndefined();
      expect(last.exercises).toHaveLength(6);
      expect(last.exercises.map((e) => e.template)).toEqual([
        "listenTap",
        "listenTap",
        "dragMatch",
        "sayIt",
        "listenTap",
        "sayIt",
      ]);
      expect(Object.keys(last.progress).length).toBeGreaterThan(0);
    },
  );

  it("takes text direction from the target pack", () => {
    expect(createSession(profile, lesson, pack("ar")).current!.view.direction).toBe("rtl");
    expect(createSession(profile, lesson, pack("tr")).current!.view.direction).toBe("ltr");
  });

  it("hides text for 3-5 and shows it (with transliteration) when the band allows", () => {
    const hidden = createSession(profile, lesson, pack("ar")).current!.view;
    expect(hidden.template === "listenTap" && hidden.prompt.text).toBeFalsy();
    const shown = createSession({ ...profile, showText: true }, lesson, pack("ar")).current!.view;
    expect(shown.template === "listenTap" && shown.prompt).toMatchObject({
      text: "قِطَّة",
      transliteration: "qitta",
    });
  });

  it("gives a sticker and a world update from the profile's rewards", () => {
    const s = createSession(profile, lesson, pack("es"), {}, { now: NOW });
    expect(lesson.exercises.flatMap((e) => e.targets)).toContain(s.reward.sticker);
    expect(s.reward.world).toBe(true);
    expect(createSession({ ...profile, rewards: [] }, lesson, pack("es")).reward).toEqual({
      world: false,
    });
  });

  it("caps choices at the profile's maxChoices", () => {
    const wide: Lesson = {
      ...lesson,
      exercises: [
        {
          id: "x",
          template: "listenTap",
          targets: ["animal.cat"],
          distractors: ["animal.dog", "animal.fish", "animal.bird"],
          speakers: ["guide"],
        },
      ],
    };
    const view = createSession(profile, wide, pack("es")).current!.view;
    expect(view.template === "listenTap" && view.choices).toHaveLength(3);
  });

  it("skips templates that are not built yet or not allowed", () => {
    const mixed: Lesson = {
      ...lesson,
      exercises: [
        { id: "a", template: "singAlong", targets: ["animal.cat"], speakers: ["guide"] },
        ...lesson.exercises,
      ],
    };
    expect(
      createSession(profile, mixed, pack("es")).exercises.map((e) => e.exerciseId),
    ).not.toContain("a");
    const strict: AgeBandProfile = { ...profile, allowedTemplates: ["sayIt"] };
    expect(
      createSession(strict, lesson, pack("es")).exercises.every((e) => e.template === "sayIt"),
    ).toBe(true);
    expect(() => createSession(profile, { ...lesson, exercises: [] }, pack("es"))).toThrow(
      EngineError,
    );
  });

  it("throws a clear error when a pack lacks a lexeme or audio", () => {
    const broken: LanguagePack = structuredClone(pack("fr"));
    delete broken.lexemes["animal.cat"];
    expect(() => createSession(profile, lesson, broken)).toThrow(/No "fr" lexeme for "animal.cat"/);
    const mute: LanguagePack = structuredClone(pack("fr"));
    delete mute.lexemes["animal.cat"]!.audio.guide;
    expect(() => createSession(profile, lesson, mute)).toThrow(/no audio for "guide"/);
  });
});

describe("answers", () => {
  const start = () => createSession(profile, lesson, pack("tr"), {}, { seed: 3, now: NOW });

  it("listenTap: a wrong tap repeats the exercise with the answer highlighted, never ending it", () => {
    let s = start();
    const view = s.current!.view;
    if (view.template !== "listenTap") throw new Error("expected listenTap");
    const wrong = view.choices.find((c) => c !== view.answer)!;
    for (let i = 0; i < 10; i++) {
      const r = answer(s, { type: "tap", conceptId: wrong }, NOW);
      expect(r).toMatchObject({ correct: false, feedback: "oops-retry" });
      s = r.next;
    }
    expect(s.index).toBe(0);
    expect(s.complete).toBe(false);
    expect(s.current).toMatchObject({ highlight: view.answer, mistakes: 10 });

    const r = answer(s, { type: "tap", conceptId: view.answer }, NOW);
    expect(r).toMatchObject({ correct: true, feedback: "celebrate" });
    expect(r.next.index).toBe(1);
    expect(r.next.current!.highlight).toBeUndefined();
  });

  it("scores only the first try of a concept within an exercise", () => {
    let s = start();
    const view = s.current!.view;
    if (view.template !== "listenTap") throw new Error("expected listenTap");
    const wrong = view.choices.find((c) => c !== view.answer)!;
    s = answer(s, { type: "tap", conceptId: wrong }, NOW).next;
    const afterMiss = strengthAt(s.progress, view.answer, NOW);
    s = answer(s, { type: "tap", conceptId: view.answer }, NOW).next;
    expect(strengthAt(s.progress, view.answer, NOW)).toBe(afterMiss);
  });

  it("dragMatch: matches one word at a time and retries a wrong drop", () => {
    let s = start();
    while (s.current!.view.template !== "dragMatch") s = answer(s, rightChoice(s), NOW).next;
    const view = s.current!.view;
    if (view.template !== "dragMatch") throw new Error("expected dragMatch");
    const [a, b] = [view.words[0]!.conceptId, view.words[1]!.conceptId];

    const miss = answer(s, { type: "drop", word: a, picture: b }, NOW);
    expect(miss).toMatchObject({ correct: false, feedback: "oops-retry" });
    expect(miss.next.current).toMatchObject({ highlight: a, matched: [] });

    const hit = answer(miss.next, { type: "drop", word: a, picture: a }, NOW);
    expect(hit).toMatchObject({ correct: true, feedback: "celebrate" });
    expect(hit.next.current).toMatchObject({ matched: [a] });
    expect(hit.next.current!.highlight).toBeUndefined();
    expect(() => answer(hit.next, { type: "drop", word: a, picture: a }, NOW)).toThrow(EngineError);

    let rest = hit.next;
    while (rest.index === s.index) rest = answer(rest, rightChoice(rest), NOW).next;
    expect(rest.current!.view.template).toBe("sayIt");
  });

  it("sayIt: every attempt is rewarded, whatever was heard", () => {
    let s = start();
    while (s.current!.view.template !== "sayIt") s = answer(s, rightChoice(s), NOW).next;
    const r = answer(s, { type: "say", heard: "something else entirely" }, NOW);
    expect(r).toMatchObject({ correct: true, feedback: "celebrate" });
    expect(r.next.index).toBe(s.index + 1);
    expect(r.next.progress).toBe(s.progress);
  });

  it("rejects a choice that does not fit the exercise, and answers after completion", () => {
    const s = start();
    expect(() => answer(s, { type: "say" }, NOW)).toThrow(/does not fit a listenTap/);
    let d = s;
    while (d.current!.view.template !== "dragMatch") d = answer(d, rightChoice(d), NOW).next;
    expect(() => answer(d, { type: "tap", conceptId: "animal.cat" }, NOW)).toThrow(EngineError);
    let say = d;
    while (say.current!.view.template !== "sayIt") say = answer(say, rightChoice(say), NOW).next;
    expect(() => answer(say, { type: "tap", conceptId: "animal.cat" }, NOW)).toThrow(EngineError);
    const done = playPerfect(s).at(-1)!;
    expect(() => answer(done, { type: "say" }, NOW)).toThrow(/already complete/);
  });

  it("uses Date.now() by default", () => {
    const s = createSession(profile, lesson, pack("es"));
    const view = s.current!.view;
    if (view.template !== "listenTap") throw new Error("expected listenTap");
    const r = answer(s, { type: "tap", conceptId: view.answer });
    expect(r.next.progress[view.answer]!.lastSeen).toBeGreaterThan(NOW);
  });
});

describe("review mixing", () => {
  const animals2 = bundle.lessons.find((l) => l.id === "animals-2")!;
  // The child learned lesson 1's words a while ago; cat has faded.
  const progress: Progress = {
    "animal.cat": { strength: 0.6, lastSeen: NOW - 10 * DAY },
    "animal.dog": { strength: 0.95, lastSeen: NOW - DAY },
  };

  it("mixes a weak concept from an earlier lesson into a later one", () => {
    const s = createSession(profile, animals2, pack("es"), progress, { now: NOW });
    const review = s.exercises.filter((e) => e.review);
    expect(review).toHaveLength(1);
    expect(review[0]).toMatchObject({
      template: "listenTap",
      answer: "animal.cat",
      speaker: "guide",
    });
    expect(s.exercises[0]!.review).toBe(false);
    expect(s.exercises).toHaveLength(profile.sessionExercises[1]);
  });

  it("never pushes the lesson below its minimum length", () => {
    const s = createSession(profile, animals2, pack("es"), progress, { now: NOW, maxReview: 5 });
    expect(s.exercises.filter((e) => !e.review).length).toBeGreaterThanOrEqual(
      profile.sessionExercises[0],
    );
    expect(s.exercises.length).toBeLessThanOrEqual(profile.sessionExercises[1]);
  });

  it("does not review concepts the lesson already teaches, or when listenTap is not allowed", () => {
    expect(
      createSession(profile, lesson, pack("es"), progress, { now: NOW }).exercises.some(
        (e) => e.review,
      ),
    ).toBe(false);
    const noTap = { ...profile, allowedTemplates: ["sayIt", "dragMatch"] } as AgeBandProfile;
    expect(
      createSession(noTap, animals2, pack("es"), progress, { now: NOW }).exercises.some(
        (e) => e.review,
      ),
    ).toBe(false);
  });

  it("completes a session that includes review", () => {
    const states = playPerfect(
      createSession(profile, animals2, pack("ar"), progress, { now: NOW }),
    );
    expect(strengthAt(states.at(-1)!.progress, "animal.cat", NOW)).toBeGreaterThan(
      strengthAt(progress, "animal.cat", NOW),
    );
  });
});

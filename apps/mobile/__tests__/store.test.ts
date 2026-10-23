import { act } from "@testing-library/react-native";
import { learningFor, parentGate, useApp } from "../src/lib/store";

describe("local profiles", () => {
  beforeEach(() => act(() => useApp.setState({ profiles: [], activeId: undefined })));

  it("keeps progress per target language", () => {
    const { addProfile, selectProfile, setLanguage, finishLesson } = useApp.getState();
    act(() => {
      const id = addProfile("  Bee  ", "silly");
      selectProfile(id);
      setLanguage("tr");
      finishLesson("animals-1", { "animal.cat": { strength: 0.4, lastSeen: 1 } }, "animal.cat");
      setLanguage("fr");
    });
    const p = useApp.getState().profiles[0]!;
    expect(p).toMatchObject({ nickname: "Bee", avatar: "silly", ageBand: "3-5", lang: "fr" });
    expect(learningFor(p, "tr")).toMatchObject({
      completedLessons: ["animals-1"],
      stickers: ["animal.cat"],
    });
    expect(learningFor(p, "fr").completedLessons).toEqual([]);
  });

  it("resets and removes profiles", () => {
    const s = useApp.getState();
    act(() => {
      const id = s.addProfile("Kit", "calm");
      s.selectProfile(id);
      s.setLanguage("es");
      s.finishLesson("animals-1", {});
      s.resetProgress(id);
    });
    expect(useApp.getState().profiles[0]!.learning).toEqual({});
    act(() => s.removeProfile(useApp.getState().profiles[0]!.id));
    expect(useApp.getState()).toMatchObject({ profiles: [], activeId: undefined });
  });

  it("opens the parent gate only for a while", () => {
    expect(parentGate.isOpen()).toBe(false);
    parentGate.open();
    expect(parentGate.isOpen()).toBe(true);
  });
});

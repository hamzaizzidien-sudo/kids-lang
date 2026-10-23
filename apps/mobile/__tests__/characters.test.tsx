import {
  ART,
  CHARACTER_IDS,
  CAST,
  PaperCharacter,
  type CharacterController,
} from "@kids-lang/characters";
import { act, render, screen } from "@testing-library/react-native";
import { createRef } from "react";

describe("PaperCharacter", () => {
  it.each(CHARACTER_IDS)("renders %s in every mood from characters.json", async (id) => {
    for (const mood of ART.moods) {
      await render(<PaperCharacter character={id} mood={mood} appearOnMount={false} />);
      expect(screen.getByLabelText(`${CAST[id].name}, ${mood}`)).toBeTruthy();
    }
  });

  it("drives moods through the controller", async () => {
    const ref = createRef<CharacterController>();
    await render(<PaperCharacter ref={ref} character="silly" mood="wave" />);
    await act(async () => {
      await ref.current!.appear();
      ref.current!.setMood("thinking");
    });
    expect(screen.getByLabelText("Kiko, thinking")).toBeTruthy();
    await act(async () => {
      await ref.current!.oops();
    });
    expect(screen.getByLabelText("Kiko, oops")).toBeTruthy();
  });
});

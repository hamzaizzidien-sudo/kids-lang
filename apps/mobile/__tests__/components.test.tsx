import {
  createSession,
  type ListenTapView,
  type DragMatchView,
  type ExerciseState,
} from "@kids-lang/engine";
import { TargetText } from "@kids-lang/ui";
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { getPack, getProfile, lessons } from "../src/content";
import { DragMatch, ListenTap } from "../src/lesson/exercises";

const session = createSession(
  getProfile("3-5"),
  lessons.get("animals-1")!,
  getPack("ar"),
  {},
  { seed: 2 },
);
const inRoot = (el: ReactElement) => render(<GestureHandlerRootView>{el}</GestureHandlerRootView>);
const common = { disabled: false, showText: false, lang: "ar" };

describe("TargetText", () => {
  it("renders Arabic right-to-left inside the left-to-right app", async () => {
    await render(
      <TargetText direction="rtl" lang="ar">
        قِطَّة
      </TargetText>,
    );
    const style = screen.getByText("قِطَّة").props.style;
    expect(style).toMatchObject({ writingDirection: "rtl", fontFamily: "BalooBhaijaan2_700Bold" });
  });

  it("renders Turkish left-to-right in the Latin face", async () => {
    await render(
      <TargetText direction="ltr" lang="tr">
        kuş
      </TargetText>,
    );
    expect(screen.getByText("kuş").props.style).toMatchObject({
      writingDirection: "ltr",
      fontFamily: "Baloo2_700Bold",
    });
  });
});

describe("ListenTap", () => {
  const state = session.current as ExerciseState & { view: ListenTapView };

  it("shows at most 3 pictures and reports the tapped one", async () => {
    const onTap = jest.fn();
    await render(<ListenTap {...common} state={state} onTap={onTap} />);
    expect(state.view.choices).toHaveLength(3);
    await fireEvent.press(screen.getByTestId(`choice-${state.view.choices[1]}`));
    expect(onTap).toHaveBeenCalledWith(state.view.choices[1]);
  });

  it("hides target-language text for 3-5", async () => {
    await render(<ListenTap {...common} state={state} onTap={jest.fn()} />);
    expect(screen.queryByText(getPack("ar").lexemes[state.view.answer]!.text)).toBeNull();
  });
});

describe("DragMatch", () => {
  const view = session.exercises.find((e) => e.template === "dragMatch") as DragMatchView;
  const state: ExerciseState & { view: DragMatchView } = { view, matched: [], mistakes: 0 };

  it("accepts tap-word-then-tap-picture as a drop", async () => {
    const onDrop = jest.fn();
    const playWord = jest.fn();
    await inRoot(<DragMatch {...common} state={state} onDrop={onDrop} playWord={playWord} />);
    const word = view.words[0]!.conceptId;
    await fireEvent.press(screen.getByTestId(`word-${word}`));
    expect(playWord).toHaveBeenCalledWith(view.words[0]);
    await fireEvent.press(screen.getByTestId(`picture-${view.pictures[2]}`));
    expect(onDrop).toHaveBeenCalledWith(word, view.pictures[2]);
  });

  it("removes matched words from the tray", async () => {
    const matched = [view.words[0]!.conceptId];
    await inRoot(
      <DragMatch
        {...common}
        state={{ ...state, matched }}
        onDrop={jest.fn()}
        playWord={jest.fn()}
      />,
    );
    expect(screen.queryByTestId(`word-${matched[0]}`)).toBeNull();
  });
});

import type { ConceptId } from "@kids-lang/content-schema";
import type {
  DragMatchView,
  ExerciseState,
  ListenTapView,
  SayItView,
  WordView,
} from "@kids-lang/engine";
import { BigButton, MicIcon, SpeakerIcon, TargetText, Wiggle, colors, space } from "@kids-lang/ui";
import { useRef, useState, type ComponentRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { ConceptPicture } from "../content/art";

/** Generous hit area around drop targets: little fingers are imprecise (CLAUDE.md §9). */
const DROP_SLOP = 40;

interface Common {
  disabled: boolean;
  showText: boolean;
  lang: string;
}

export function ListenTap({
  state,
  onTap,
  disabled,
}: Common & { state: ExerciseState & { view: ListenTapView }; onTap: (id: ConceptId) => void }) {
  return (
    <View style={styles.choices}>
      {state.view.choices.map((id) => (
        <Wiggle key={id} active={state.highlight === id}>
          <Pressable
            onPress={() => onTap(id)}
            disabled={disabled}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={id}
            testID={`choice-${id}`}
          >
            <ConceptPicture
              conceptId={id}
              size={104}
              color={state.highlight === id ? colors.gold : colors.card}
            />
          </Pressable>
        </Wiggle>
      ))}
    </View>
  );
}

export function SayIt({
  state,
  onSay,
  disabled,
  listening,
  showText,
  lang,
}: Common & { state: ExerciseState & { view: SayItView }; onSay: () => void; listening: boolean }) {
  const { prompt, direction } = state.view;
  return (
    <View style={styles.sayIt}>
      <ConceptPicture conceptId={prompt.conceptId} size={150} />
      {showText && prompt.text && (
        <TargetText direction={direction} lang={lang}>
          {prompt.text}
        </TargetText>
      )}
      <BigButton
        onPress={onSay}
        disabled={disabled}
        label="Say it"
        size={112}
        color={listening ? colors.gold : colors.coral}
        testID="say-it"
      >
        <MicIcon size={64} color={colors.ink} />
      </BigButton>
    </View>
  );
}

/**
 * Drag each spoken word onto its picture. Tapping a word then a picture works too, for
 * children who find dragging hard.
 */
export function DragMatch({
  state,
  onDrop,
  playWord,
  disabled,
  showText,
  lang,
}: Common & {
  state: ExerciseState & { view: DragMatchView };
  onDrop: (word: ConceptId, picture: ConceptId) => void;
  playWord: (w: WordView) => void;
}) {
  const [selected, setSelected] = useState<ConceptId | undefined>();
  const pictures = useRef(new Map<ConceptId, ComponentRef<typeof View> | null>());
  const { words, direction } = state.view;

  const dropAt = (word: ConceptId, x: number, y: number, done: (hit: boolean) => void) => {
    const entries = [...pictures.current.entries()];
    let pending = entries.length;
    let hit: ConceptId | undefined;
    if (!pending) return done(false);
    for (const [id, node] of entries) {
      node?.measureInWindow((px, py, w, h) => {
        if (
          x >= px - DROP_SLOP &&
          x <= px + w + DROP_SLOP &&
          y >= py - DROP_SLOP &&
          y <= py + h + DROP_SLOP
        )
          hit ??= id;
        if (--pending === 0) {
          if (hit) onDrop(word, hit);
          done(Boolean(hit));
        }
      });
    }
  };

  return (
    <View style={styles.drag}>
      <View style={styles.choices}>
        {words
          .filter((w) => !state.matched.includes(w.conceptId))
          .map((w) => (
            <WordToken
              key={w.conceptId}
              word={w}
              disabled={disabled}
              selected={selected === w.conceptId}
              hint={state.highlight === w.conceptId}
              label={
                showText && w.text ? (
                  <TargetText direction={direction} lang={lang} size={20}>
                    {w.text}
                  </TargetText>
                ) : undefined
              }
              onPick={() => {
                setSelected(w.conceptId);
                playWord(w);
              }}
              onRelease={(x, y, done) => dropAt(w.conceptId, x, y, done)}
            />
          ))}
      </View>
      <View style={styles.choices}>
        {state.view.pictures.map((id) => {
          const matched = state.matched.includes(id);
          return (
            <Wiggle key={id} active={state.highlight === id}>
              <Pressable
                ref={(n) => {
                  pictures.current.set(id, n);
                }}
                onPress={() => {
                  if (!selected || matched) return;
                  onDrop(selected, id);
                  setSelected(undefined);
                }}
                disabled={disabled || matched}
                accessibilityRole="button"
                accessibilityLabel={id}
                testID={`picture-${id}`}
              >
                <ConceptPicture
                  conceptId={id}
                  size={100}
                  color={matched ? colors.gold : state.highlight === id ? colors.leaf : colors.card}
                />
              </Pressable>
            </Wiggle>
          );
        })}
      </View>
    </View>
  );
}

function WordToken({
  word,
  disabled,
  selected,
  hint,
  label,
  onPick,
  onRelease,
}: {
  word: WordView;
  disabled: boolean;
  selected: boolean;
  hint: boolean;
  label?: React.ReactNode;
  onPick: () => void;
  onRelease: (absX: number, absY: number, done: (hit: boolean) => void) => void;
}) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const home = () => {
    tx.value = withSpring(0);
    ty.value = withSpring(0);
  };
  const pan = usePanGesture({
    enabled: !disabled,
    runOnJS: true,
    minDistance: 6,
    onActivate: () => onPick(),
    onUpdate: (e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    },
    onDeactivate: (e) => onRelease(e.absoluteX, e.absoluteY, (hit) => !hit && home()),
    onFinalize: () => {
      if (tx.value !== 0 || ty.value !== 0) setTimeout(home, 50);
    },
  });
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
    zIndex: tx.value !== 0 || ty.value !== 0 ? 10 : 0,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={style}>
        <Wiggle active={hint}>
          <BigButton
            onPress={onPick}
            disabled={disabled}
            label={`Word ${word.conceptId}`}
            size={84}
            color={selected ? colors.gold : colors.teal}
            testID={`word-${word.conceptId}`}
          >
            <SpeakerIcon size={40} color={colors.card} />
            {label}
          </BigButton>
        </Wiggle>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  choices: { flexDirection: "row", justifyContent: "center", gap: space.lg, flexWrap: "wrap" },
  drag: { gap: space.xxl },
  sayIt: { alignItems: "center", gap: space.lg },
});

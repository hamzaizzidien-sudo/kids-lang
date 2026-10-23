import { useEffect, useRef, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { colors, fonts, minTouch, paperShadow, radius, space } from "./tokens";

/** A flat paper card with a hard offset shadow. */
export function PaperCard({
  children,
  style,
  color = colors.card,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  color?: string;
}) {
  return (
    <View style={[styles.cardWrap, style]}>
      <View style={styles.cardShadow} />
      <View style={[styles.card, { backgroundColor: color }]}>{children}</View>
    </View>
  );
}

/**
 * Big tappable paper card. Children can't read yet, so pass a picture or icon as children;
 * `label` is for screen readers and for grown-up screens.
 */
export function BigButton({
  onPress,
  label,
  children,
  color,
  size = 96,
  style,
  disabled,
  testID,
}: {
  onPress: () => void;
  label: string;
  children?: ReactNode;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={12}
      testID={testID}
      style={({ pressed }) => [{ transform: [{ translateY: pressed ? 3 : 0 }] }, style]}
    >
      <PaperCard
        color={color}
        style={{ minWidth: Math.max(size, minTouch), minHeight: Math.max(size, minTouch) }}
      >
        <View style={styles.center}>{children ?? <Text style={styles.label}>{label}</Text>}</View>
      </PaperCard>
    </Pressable>
  );
}

/** The large replay-audio button every prompt has (CLAUDE.md §9). */
export function ReplayAudioButton({
  onPress,
  size = 88,
  testID = "replay-audio",
}: {
  onPress: () => void;
  size?: number;
  testID?: string;
}) {
  return (
    <BigButton onPress={onPress} label="Play again" color={colors.teal} size={size} testID={testID}>
      <SpeakerIcon size={size * 0.55} color={colors.card} />
    </BigButton>
  );
}

export function SpeakerIcon({ size = 40, color = colors.ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 9h4l5-4v14l-5-4H3z" fill={color} />
      <Path
        d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

export function MicIcon({ size = 40, color = colors.ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" fill={color} />
      <Path
        d="M6 11a6 6 0 0 0 12 0M12 17v4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

/**
 * Hold-to-exit (CLAUDE.md §9): the child must hold for `holdMs` to leave, so stray taps don't
 * end a lesson. The paper fills up while held and drains if let go.
 */
export function HoldToExit({
  onExit,
  holdMs = 1500,
  label = "Hold to leave",
}: {
  onExit: () => void;
  holdMs?: number;
  label?: string;
}) {
  const fill = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const start = () => {
    fill.value = withTiming(1, { duration: holdMs, easing: Easing.linear });
    timer.current = setTimeout(onExit, holdMs);
  };
  const stop = () => {
    clearTimeout(timer.current);
    cancelAnimation(fill);
    fill.value = withTiming(0, { duration: 200 });
  };
  const fillStyle = useAnimatedStyle(() => ({ height: `${fill.value * 100}%` }));

  return (
    <Pressable
      onPressIn={start}
      onPressOut={stop}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Press and hold"
      testID="hold-to-exit"
      hitSlop={8}
    >
      <View style={styles.holdBox}>
        <Animated.View style={[styles.holdFill, fillStyle]} />
        <Svg width={28} height={28} viewBox="0 0 24 24">
          <Path
            d="M6 6l12 12M18 6L6 18"
            stroke={colors.ink}
            strokeWidth={3}
            strokeLinecap="round"
          />
        </Svg>
      </View>
    </Pressable>
  );
}

/** Wiggles while `active`: the "this one!" hint after a wrong answer. */
export function Wiggle({ active, children }: { active: boolean; children: ReactNode }) {
  const rot = useSharedValue(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (active && !reduce) {
      rot.value = withRepeat(
        withSequence(withTiming(-5, { duration: 110 }), withTiming(5, { duration: 110 })),
        -1,
        true,
      );
    } else {
      cancelAnimation(rot);
      rot.value = withTiming(0, { duration: 100 });
    }
  }, [active, reduce, rot]);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value}deg` }, { scale: active ? 1.06 : 1 }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/**
 * Target-language text. Direction comes from the language pack, not the app (CLAUDE.md §7):
 * Arabic renders right-to-left inside the left-to-right UI, in the Arabic face with harakat.
 */
export function TargetText({
  children,
  direction,
  lang,
  size = 28,
}: {
  children: string;
  direction: "ltr" | "rtl";
  lang: string;
  size?: number;
}) {
  const arabicScript = lang === "ar" || direction === "rtl";
  return (
    <Text
      style={{
        fontFamily: arabicScript ? fonts.arabic : fonts.latin,
        fontSize: size,
        lineHeight: size * (arabicScript ? 1.9 : 1.3),
        color: colors.ink,
        writingDirection: direction,
        textAlign: "center",
      }}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    position: "relative",
    paddingRight: paperShadow.offset,
    paddingBottom: paperShadow.offset,
  },
  cardShadow: {
    position: "absolute",
    left: paperShadow.offset,
    top: paperShadow.offset,
    right: 0,
    bottom: 0,
    borderRadius: radius.card,
    backgroundColor: paperShadow.color,
  },
  card: {
    flex: 1,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.ink,
    padding: space.sm,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: fonts.latin, fontSize: 20, color: colors.ink, textAlign: "center" },
  holdBox: {
    width: minTouch,
    height: minTouch,
    borderRadius: radius.round,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  holdFill: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.gold },
});

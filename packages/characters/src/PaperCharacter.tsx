import type { CharacterId } from "@kids-lang/content-schema";
import {
  createContext,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react";
import { Pressable } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { G, Path } from "react-native-svg";
import { ART, type Mood, type Stage } from "./art";
import { CAST } from "./cast";
import type { CharacterController, PlayAudio } from "./controller";
import { pathAt } from "./geometry";
import {
  layersFor,
  openMouth,
  resolveKind,
  stageDelay,
  unfoldDuration,
  type ResolvedShape,
} from "./resolve";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

const MOOD_FADE_MS = 150;
const TALK_TOGGLE_MS = 62; // ≈ 8 open/close cycles per second
const STAGES: Stage[] = [1, 2, 3, 4];
const { unfold } = ART;
const EASE = Easing.bezier(...unfold.easing);

/** How characters play audio. The app provides expo-audio; the default just waits a moment. */
export const CharacterAudioContext = createContext<PlayAudio>(
  () => new Promise((resolve) => setTimeout(resolve, 600)),
);

export interface PaperCharacterProps {
  character: CharacterId;
  mood?: Mood;
  /** Width in points; height follows the art's aspect ratio. */
  size?: number;
  /** Unfold when mounted (CLAUDE.md §9: every character on screen uses appear()). */
  appearOnMount?: boolean;
  appearDelaySec?: number;
  ref?: Ref<CharacterController>;
}

export function PaperCharacter({
  character,
  mood: initialMood = "wave",
  size = 160,
  appearOnMount = true,
  appearDelaySec = 0,
  ref,
}: PaperCharacterProps) {
  const { kind, name } = CAST[character];
  const layers = useMemo(() => resolveKind(kind), [kind]);
  const talkMouths = useMemo(() => {
    const open = openMouth(layers);
    const closedFor = (m: Mood) => {
      const own = layersFor(layers, m)
        .flatMap((l) => (l.moods ? l.shapes : []))
        .find((s) => s.mouth);
      return own && own.key !== open.key
        ? own
        : layersFor(layers, "thinking")
            .flatMap((l) => (l.moods ? l.shapes : []))
            .find((s) => s.mouth)!;
    };
    return { open, closedFor };
  }, [layers]);
  const playAudio = useContext(CharacterAudioContext);
  const reduceMotion = useReducedMotion();

  const [mood, setMoodState] = useState<{ cur: Mood; prev?: Mood }>({ cur: initialMood });
  const [shading, setShading] = useState(false); // brightness overlays, only while (un)folding
  const [talkPhase, setTalkPhase] = useState<"open" | "closed" | undefined>();

  const startOpen = reduceMotion || !appearOnMount ? 1 : 0;
  const s1 = useSharedValue(startOpen);
  const s2 = useSharedValue(startOpen);
  const s3 = useSharedValue(startOpen);
  const s4 = useSharedValue(startOpen);
  const stages: Record<Stage, SharedValue<number>> = { 1: s1, 2: s2, 3: s3, 4: s4 };
  const moodT = useSharedValue(1);
  const hop = useSharedValue(0);
  const tilt = useSharedValue(0);
  const squash = useSharedValue(1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const after = (sec: number) =>
    new Promise<void>((resolve) => {
      timers.current.push(setTimeout(resolve, sec * 1000));
    });

  const controller = useMemo<CharacterController>(() => {
    const setMood = (m: Mood) => {
      setMoodState((s) => (s.cur === m ? s : { cur: m, prev: s.cur }));
      moodT.value = 0;
      moodT.value = reduceMotion ? 1 : withTiming(1, { duration: MOOD_FADE_MS });
    };
    return {
      async appear(delaySec = 0) {
        if (reduceMotion) {
          STAGES.forEach((st) => (stages[st].value = 1));
          return;
        }
        setShading(true);
        for (const st of STAGES) {
          stages[st].value = 0;
          stages[st].value = withDelay(
            (delaySec + stageDelay(st)) * 1000,
            withTiming(1, { duration: unfold.durationSec * 1000, easing: EASE }),
          );
        }
        await after(delaySec + unfoldDuration());
        setShading(false);
      },
      async disappear() {
        if (reduceMotion) {
          STAGES.forEach((st) => (stages[st].value = 0));
          return;
        }
        setShading(true);
        const last = stageDelay(4);
        for (const st of STAGES) {
          stages[st].value = withDelay(
            (last - stageDelay(st)) * 0.6 * 1000,
            withTiming(0, {
              duration: unfold.durationSec * 0.6 * 1000,
              easing: Easing.in(Easing.quad),
            }),
          );
        }
        await after(unfoldDuration() * 0.6);
      },
      setMood,
      async talk(audioRef) {
        // PLACEHOLDER: alternate mouths until Rhubarb viseme tracks exist (CLAUDE.md §6).
        let open = true;
        setTalkPhase("open");
        const flap = setInterval(() => {
          open = !open;
          setTalkPhase(open ? "open" : "closed");
        }, TALK_TOGGLE_MS);
        try {
          await playAudio(audioRef);
        } finally {
          clearInterval(flap);
          setTalkPhase(undefined);
        }
      },
      async celebrate() {
        setMood("celebrating");
        if (reduceMotion) return;
        hop.value = withSequence(
          withTiming(-18, { duration: 180, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 220, easing: Easing.bounce }),
        );
        await after(0.4);
      },
      async oops() {
        setMood("oops");
        if (reduceMotion) return;
        tilt.value = withSequence(
          withTiming(-6, { duration: 90 }),
          withTiming(6, { duration: 120 }),
          withTiming(-3, { duration: 100 }),
          withTiming(0, { duration: 90 }),
        );
        await after(0.4);
      },
      tapReaction() {
        if (reduceMotion) return;
        squash.value = withSequence(
          withTiming(0.88, { duration: 80 }),
          withTiming(1.06, { duration: 120 }),
          withTiming(1, { duration: 120 }),
        );
      },
    };
    // Shared values and setters are stable; playAudio and reduceMotion are the real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playAudio, reduceMotion]);

  useImperativeHandle(ref, () => controller, [controller]);

  useEffect(() => {
    if (appearOnMount) void controller.appear(appearDelaySec);
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      [s1, s2, s3, s4, hop, tilt, squash, moodT].forEach((v) => cancelAnimation(v));
    };
    // Appear once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: hop.value },
      { rotate: `${tilt.value}deg` },
      { scaleX: 2 - squash.value },
      { scaleY: squash.value },
    ],
  }));

  const [vx, vy, vw, vh] = ART.viewBox;
  const visible = layersFor(layers, mood.cur);
  const fading = mood.prev
    ? layersFor(layers, mood.prev).filter((l) => l.moods && !visible.includes(l))
    : [];
  const drawn = layers.filter((l) => visible.includes(l) || fading.includes(l));
  const talkMouth =
    talkPhase === "open" ? talkMouths.open : talkPhase ? talkMouths.closedFor(mood.cur) : undefined;

  return (
    <Pressable
      onPress={controller.tapReaction}
      accessibilityRole="image"
      accessibilityLabel={`${name}, ${mood.cur}`}
    >
      <Animated.View style={[{ width: size, height: (size * vh) / vw }, bodyStyle]}>
        <Svg width="100%" height="100%" viewBox={`${vx} ${vy} ${vw} ${vh}`}>
          {drawn.map((layer) => {
            const role = !layer.moods
              ? "always"
              : fading.includes(layer)
                ? "out"
                : mood.prev && layersFor(layers, mood.prev).includes(layer)
                  ? "always"
                  : "in";
            return (
              <MoodLayer key={layer.key} role={role} t={moodT} transform={layer.transform}>
                {layer.shapes.map((shape) =>
                  talkPhase && shape.mouth ? null : (
                    <UnfoldShape
                      key={shape.key}
                      shape={shape}
                      progress={stages[shape.stage]}
                      shading={shading}
                    />
                  ),
                )}
              </MoodLayer>
            );
          })}
          {talkMouth && <UnfoldShape shape={talkMouth} progress={s4} shading={false} />}
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

function MoodLayer({
  role,
  t,
  transform,
  children,
}: {
  role: "always" | "in" | "out";
  t: SharedValue<number>;
  transform?: string;
  children: React.ReactNode;
}) {
  const props = useAnimatedProps(() => ({
    opacity: role === "always" ? 1 : role === "in" ? t.value : 1 - t.value,
  }));
  return (
    <AnimatedG animatedProps={props} {...(transform ? { transform } : {})}>
      {children}
    </AnimatedG>
  );
}

function UnfoldShape({
  shape,
  progress,
  shading,
}: {
  shape: ResolvedShape;
  progress: SharedValue<number>;
  shading: boolean;
}) {
  const { cmds, foldTransform } = shape;
  const shapeProps = useAnimatedProps(() => ({ d: pathAt(cmds, foldTransform, progress.value) }));
  // Paper in shadow: a black copy fades from (1 - startBrightness) to 0 while unfolding.
  const shadeProps = useAnimatedProps(() => ({
    d: pathAt(cmds, foldTransform, progress.value),
    opacity: (1 - unfold.startBrightness) * (1 - Math.min(1, Math.max(0, progress.value))),
  }));
  return (
    <>
      <AnimatedPath animatedProps={shapeProps} {...svgPaint(shape.paint)} />
      {shading && (
        <AnimatedPath animatedProps={shadeProps} {...svgPaint(shadePaint(shape.paint))} />
      )}
    </>
  );
}

function shadePaint(paint: Record<string, string>): Record<string, string> {
  const out = { ...paint };
  if (out.fill !== "none") out.fill = "#000000";
  if (out.stroke) out.stroke = "#000000";
  return out;
}

/** "stroke-width" → strokeWidth, for react-native-svg props. */
function svgPaint(paint: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(paint))
    out[k.replace(/-([a-z])/g, (_, c: string) => c.toLocaleUpperCase("en"))] = v;
  return out;
}

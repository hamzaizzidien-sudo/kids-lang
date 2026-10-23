/* eslint-disable @typescript-eslint/no-require-imports */
// Minimal stand-in for the Reanimated APIs this app uses. Animations jump to their end value.
const { View } = require("react-native");

const identity = <T>(v: T) => v;
const easing = Object.assign(() => identity, {
  linear: identity,
  quad: identity,
  bounce: identity,
  in: () => identity,
  out: () => identity,
  bezier: () => identity,
});
const builder = { springify: () => builder, duration: () => builder, delay: () => builder };

module.exports = {
  __esModule: true,
  default: { View, createAnimatedComponent: identity },
  createAnimatedComponent: identity,
  useSharedValue: (v: unknown) => ({ value: v }),
  useAnimatedStyle: (fn: () => unknown) => fn(),
  useAnimatedProps: (fn: () => unknown) => fn(),
  useReducedMotion: () => false,
  withTiming: identity,
  withSpring: identity,
  withDelay: (_ms: number, v: unknown) => v,
  withSequence: (...vs: unknown[]) => vs[vs.length - 1],
  withRepeat: identity,
  cancelAnimation: () => undefined,
  Easing: easing,
  ZoomIn: builder,
};

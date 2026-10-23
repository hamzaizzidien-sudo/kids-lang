/* eslint-disable @typescript-eslint/no-require-imports */

jest.mock("react-native-reanimated", () => require("./test/reanimated-mock"));

jest.mock("expo-speech", () => ({
  speak: jest.fn((_text: string, opts?: { onDone?: () => void }) => opts?.onDone?.()),
  stop: jest.fn(),
}));

jest.mock("expo-audio", () => ({
  setAudioModeAsync: jest.fn(async () => undefined),
  createAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(async () => undefined),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  })),
}));

jest.mock("expo-sqlite/kv-store", () => {
  const data = new Map<string, string>();
  const Storage = {
    getItem: async (k: string) => data.get(k) ?? null,
    setItem: async (k: string, v: string) => void data.set(k, v),
    removeItem: async (k: string) => void data.delete(k),
  };
  return { __esModule: true, default: Storage, Storage };
});

// Gesture Handler 3 hooks need the native runtime; drags are covered by the tap fallback in tests.
jest.mock("react-native-gesture-handler", () => {
  const actual = jest.requireActual("react-native-gesture-handler");
  return {
    ...actual,
    GestureDetector: ({ children }: { children: unknown }) => children,
    usePanGesture: () => ({}),
  };
});

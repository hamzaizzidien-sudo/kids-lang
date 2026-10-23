import type { AgeBand, CharacterId, ConceptId } from "@kids-lang/content-schema";
import type { Progress } from "@kids-lang/engine";
import { storage } from "./storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * A child profile on this device only (CLAUDE.md §8): a nickname, a character as avatar,
 * an age band, and learning progress. No real names, no accounts, nothing leaves the device.
 */
export interface ChildProfile {
  id: string;
  nickname: string;
  avatar: CharacterId;
  ageBand: AgeBand;
  lang?: string;
  /** Per target language, so switching languages doesn't mix up strengths. */
  learning: Record<
    string,
    { progress: Progress; completedLessons: string[]; stickers: ConceptId[] }
  >;
}

interface AppState {
  profiles: ChildProfile[];
  activeId?: string;
  addProfile(nickname: string, avatar: CharacterId): string;
  removeProfile(id: string): void;
  selectProfile(id: string): void;
  setLanguage(lang: string): void;
  finishLesson(lessonId: string, progress: Progress, sticker?: ConceptId): void;
  resetProgress(id: string): void;
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      profiles: [],
      addProfile(nickname, avatar) {
        const id = `p${Date.now().toString(36)}`;
        set((s) => ({
          profiles: [
            ...s.profiles,
            { id, nickname: nickname.trim(), avatar, ageBand: "3-5", learning: {} },
          ],
        }));
        return id;
      },
      removeProfile(id) {
        set((s) => ({
          profiles: s.profiles.filter((p) => p.id !== id),
          activeId: s.activeId === id ? undefined : s.activeId,
        }));
      },
      selectProfile(id) {
        set({ activeId: id });
      },
      setLanguage(lang) {
        updateActive(set, get, (p) => ({ ...p, lang }));
      },
      finishLesson(lessonId, progress, sticker) {
        updateActive(set, get, (p) => {
          if (!p.lang) return p;
          const cur = p.learning[p.lang] ?? { progress: {}, completedLessons: [], stickers: [] };
          return {
            ...p,
            learning: {
              ...p.learning,
              [p.lang]: {
                progress,
                completedLessons: cur.completedLessons.includes(lessonId)
                  ? cur.completedLessons
                  : [...cur.completedLessons, lessonId],
                stickers: sticker ? [...cur.stickers, sticker] : cur.stickers,
              },
            },
          };
        });
      },
      resetProgress(id) {
        set((s) => ({
          profiles: s.profiles.map((p) => (p.id === id ? { ...p, learning: {} } : p)),
        }));
      },
    }),
    { name: "kids-lang", version: 1, storage: createJSONStorage(() => storage) },
  ),
);

function updateActive(
  set: (fn: (s: AppState) => Partial<AppState>) => void,
  get: () => AppState,
  fn: (p: ChildProfile) => ChildProfile,
) {
  const { activeId } = get();
  set((s) => ({ profiles: s.profiles.map((p) => (p.id === activeId ? fn(p) : p)) }));
}

export function useActiveProfile(): ChildProfile | undefined {
  return useApp((s) => s.profiles.find((p) => p.id === s.activeId));
}

export function learningFor(profile: ChildProfile | undefined, lang: string | undefined) {
  return (
    (profile && lang && profile.learning[lang]) || {
      progress: {},
      completedLessons: [],
      stickers: [],
    }
  );
}

// The parent gate opens for a few minutes, in memory only.
let gateOpenUntil = 0;
export const parentGate = {
  open() {
    gateOpenUntil = Date.now() + 5 * 60_000;
  },
  isOpen() {
    return Date.now() < gateOpenUntil;
  },
};

import type { CharacterController } from "@kids-lang/characters";
import { useEffect, useRef } from "react";
import { ttsRef } from "./audio";

/** A narrator that unfolds, then says `line` (UI language) once. Returns its ref. */
export function useNarrator(line: string | undefined, character = "guide", delayMs = 900) {
  const ref = useRef<CharacterController>(null);
  useEffect(() => {
    if (!line) return;
    const t = setTimeout(() => void ref.current?.talk(ttsRef(line, "en-GB", character)), delayMs);
    return () => clearTimeout(t);
  }, [line, character, delayMs]);
  return ref;
}

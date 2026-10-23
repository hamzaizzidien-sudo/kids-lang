import type { LanguagePack } from "@kids-lang/content-schema";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import * as Speech from "expo-speech";
import { audioAssets } from "../content";

interface Spoken {
  text: string;
  locale: string;
  pitch?: number;
}

const PLACEHOLDER = /(^|\/)placeholder_([a-z]+)_/;
const TTS = "tts:";
const MAX_CLIP_MS = 10_000;

// PLACEHOLDER: until real recordings exist, each character gets its own device-TTS pitch.
const PITCH: Record<string, number> = {
  guide: 1,
  cheerleader: 1.25,
  silly: 1.45,
  calm: 0.85,
  explorer: 1.1,
};

/** An audio ref that speaks text with on-device TTS (instructions, until recorded). */
export function ttsRef(text: string, locale = "en-GB", character = "guide"): string {
  return TTS + JSON.stringify({ text, locale, pitch: PITCH[character] ?? 1 } satisfies Spoken);
}

/**
 * Plays content audio refs. Clips are preloaded before a lesson starts (CLAUDE.md §2).
 * Placeholder clips are silent, so their word is spoken with device TTS instead.
 * Speech synthesis runs on the device; nothing is recorded or uploaded.
 */
class AudioService {
  private players = new Map<string, AudioPlayer>();
  private words = new Map<string, Spoken>();
  private ready = false;

  private async init() {
    if (this.ready) return;
    this.ready = true;
    await setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  }

  /** Remember what each placeholder clip in a pack should say. */
  registerPack(pack: LanguagePack, locale: string) {
    for (const lexeme of Object.values(pack.lexemes)) {
      for (const ref of Object.values(lexeme.audio)) {
        const m = ref && PLACEHOLDER.exec(ref);
        if (ref && m) this.words.set(ref, { text: lexeme.text, locale, pitch: PITCH[m[2]!] ?? 1 });
      }
    }
  }

  async preload(refs: Iterable<string>) {
    await this.init();
    for (const ref of refs) {
      if (this.players.has(ref) || PLACEHOLDER.test(ref) || ref.startsWith(TTS)) continue;
      const asset = audioAssets[ref];
      if (asset !== undefined) this.players.set(ref, createAudioPlayer(asset));
    }
  }

  play = async (ref: string): Promise<void> => {
    await this.init();
    if (ref.startsWith(TTS)) return speak(JSON.parse(ref.slice(TTS.length)) as Spoken);
    const placeholder = this.words.get(ref);
    if (placeholder) return speak(placeholder);
    await this.preload([ref]);
    const player = this.players.get(ref);
    if (!player) return;
    await player.seekTo(0);
    await new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(timeout);
        sub.remove();
        resolve();
      };
      const sub = player.addListener("playbackStatusUpdate", (s) => s.didJustFinish && done());
      const timeout = setTimeout(done, MAX_CLIP_MS);
      player.play();
    });
  };

  stop() {
    Speech.stop();
    this.players.forEach((p) => p.pause());
  }
}

function speak({ text, locale, pitch }: Spoken): Promise<void> {
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, MAX_CLIP_MS);
    const done = () => {
      clearTimeout(timeout);
      resolve();
    };
    Speech.speak(text, {
      language: locale,
      pitch,
      rate: 0.85,
      onDone: done,
      onStopped: done,
      onError: done,
    });
  });
}

export const audio = new AudioService();

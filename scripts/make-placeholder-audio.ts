// PLACEHOLDER: writes a short silent WAV for every audio ref in content/ that has no file yet.
// Real recordings (or dev TTS) replace these; their file names keep the `placeholder_` prefix until then.
// Usage: pnpm placeholder-audio
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { loadContent } from "@kids-lang/content-schema/node";

const root = resolve(import.meta.dirname, "../content");
const { bundle } = loadContent(root);

const refs = new Set<string>();
for (const pack of bundle.packs) {
  for (const lexeme of Object.values(pack.lexemes)) {
    for (const ref of Object.values(lexeme.audio)) if (ref) refs.add(ref);
  }
}
for (const concept of bundle.concepts) if (concept.sfx) refs.add(concept.sfx);

let written = 0;
for (const ref of refs) {
  const file = join(root, ref);
  if (existsSync(file)) continue;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, silentWav(0.3));
  written++;
}
console.log(`Wrote ${written} placeholder clip(s); ${refs.size - written} already present.`);

/** 8 kHz, 8-bit mono PCM silence. */
function silentWav(seconds: number): Buffer {
  const rate = 8000;
  const samples = Math.round(rate * seconds);
  const buf = Buffer.alloc(44 + samples, 0x80); // 0x80 = silence for unsigned 8-bit
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + samples, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16); // fmt chunk size
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate, 28); // byte rate
  buf.writeUInt16LE(1, 32); // block align
  buf.writeUInt16LE(8, 34); // bits per sample
  buf.write("data", 36);
  buf.writeUInt32LE(samples, 40);
  return buf;
}

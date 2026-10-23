import type { CharacterId } from "@kids-lang/content-schema";
import type { Kind } from "./art";

/**
 * The one place that maps code ids to art and names (CLAUDE.md §6).
 * Names are working names: change them here only.
 */
export const CAST: Record<CharacterId, { kind: Kind; name: string; role: string }> = {
  guide: { kind: "otter", name: "Nilo", role: "The Guide" },
  cheerleader: { kind: "rabbit", name: "Zuzu", role: "The Cheerleader" },
  silly: { kind: "frog", name: "Kiko", role: "The Silly friend" },
  calm: { kind: "turtle", name: "Mina", role: "The Calm friend" },
  explorer: { kind: "monkey", name: "Tamu", role: "The Explorer" },
};

export const CHARACTER_IDS = Object.keys(CAST) as CharacterId[];

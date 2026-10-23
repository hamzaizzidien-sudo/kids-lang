import { colors, PaperCard } from "@kids-lang/ui";
import { Text } from "react-native";
import { concepts } from "./index";

// PLACEHOLDER: concept art files don't exist yet (content/art/placeholder_*), so draw emoji.
const PLACEHOLDER_EMOJI: Record<string, string> = {
  "animal.cat": "🐱",
  "animal.dog": "🐶",
  "animal.fish": "🐟",
  "animal.bird": "🐦",
  "animal.rabbit": "🐰",
  "animal.cow": "🐮",
  "animal.duck": "🦆",
  "animal.horse": "🐴",
  "unit.animals": "🦁",
  "unit.hello-goodbye": "👋",
  "unit.colours": "🎨",
  "unit.numbers": "🔢",
  "unit.family": "👪",
  "unit.food-fruit": "🍎",
  "unit.body": "🖐️",
  "unit.clothes": "👕",
  "unit.toys": "🧸",
  "unit.feelings": "😊",
};

export function placeholderEmoji(id: string): string {
  return PLACEHOLDER_EMOJI[id] ?? "⭐";
}

/** The picture for a concept. No text: children can't read yet. */
export function ConceptPicture({
  conceptId,
  size = 104,
  color = colors.card,
}: {
  conceptId: string;
  size?: number;
  color?: string;
}) {
  if (!concepts.has(conceptId) && !conceptId.startsWith("unit."))
    throw new Error(`Unknown concept "${conceptId}"`);
  return (
    <PaperCard color={color} style={{ width: size, height: size }}>
      <Text
        style={{ fontSize: size * 0.5, textAlign: "center", lineHeight: size * 0.75 }}
        accessibilityLabel={conceptId}
      >
        {placeholderEmoji(conceptId)}
      </Text>
    </PaperCard>
  );
}

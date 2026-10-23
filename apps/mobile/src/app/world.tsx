import { PaperCharacter } from "@kids-lang/characters";
import { BigButton, PaperCard, colors, fonts, space } from "@kids-lang/ui";
import { Redirect, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { lessons, units } from "../content";
import { placeholderEmoji } from "../content/art";
import { Screen } from "../lib/Screen";
import { learningFor, useActiveProfile } from "../lib/store";
import { useNarrator } from "../lib/useNarrator";

/** World map. Tamu (explorer) unfolds to introduce the unit. Units without lessons stay folded. */
export default function World() {
  const { t } = useTranslation();
  const profile = useActiveProfile();
  const firstOpen = units.find((u) => u.lessons.length > 0);
  const tamu = useNarrator(
    firstOpen && t("world.intro", { unit: t(`units.${firstOpen.id}`) }),
    "explorer",
  );
  if (!profile) return <Redirect href="/" />;
  if (!profile.lang) return <Redirect href="/language" />;
  const learning = learningFor(profile, profile.lang);

  return (
    <Screen>
      <View style={styles.top}>
        <BigButton onPress={() => router.dismissTo("/")} label={t("world.home")} size={64}>
          <PaperCharacter
            interactive={false}
            character={profile.avatar}
            mood="wave"
            size={52}
            appearOnMount={false}
          />
        </BigButton>
        <View style={styles.stickers} accessibilityLabel={`${learning.stickers.length} stickers`}>
          {learning.stickers.slice(-6).map((s, i) => (
            <Text key={`${s}${i}`} style={styles.sticker}>
              {placeholderEmoji(s)}
            </Text>
          ))}
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.map}>
        {units.map((unit) => {
          const open = unit.lessons.length > 0;
          const done = unit.lessons.filter((l) => learning.completedLessons.includes(l.id)).length;
          return (
            <PaperCard
              key={unit.id}
              color={open ? colors.card : colors.paper}
              style={[styles.unit, !open && styles.folded]}
            >
              <View style={styles.unitHead}>
                <Text style={styles.unitEmoji}>{placeholderEmoji(`unit.${unit.id}`)}</Text>
                {open && unit.id === firstOpen?.id && (
                  <PaperCharacter
                    ref={tamu}
                    character="explorer"
                    mood="wave"
                    size={110}
                    appearDelaySec={0.2}
                  />
                )}
                <Text
                  style={styles.unitTitle}
                  accessibilityLabel={
                    open ? t(`units.${unit.id}`) : `${t(`units.${unit.id}`)}, ${t("world.soon")}`
                  }
                >
                  {open ? "★".repeat(done) + "☆".repeat(unit.lessons.length - done) : "…"}
                </Text>
              </View>
              {open && (
                <View style={styles.stones}>
                  {unit.lessons.map((ref, i) => {
                    const complete = learning.completedLessons.includes(ref.id);
                    return (
                      <BigButton
                        key={ref.id}
                        onPress={() =>
                          router.push({
                            pathname: "/lesson/[lessonId]",
                            params: { lessonId: ref.id },
                          })
                        }
                        label={`${t(`units.${unit.id}`)} ${i + 1}`}
                        size={88}
                        color={complete ? colors.gold : colors.teal}
                        disabled={!lessons.has(ref.id)}
                        testID={`lesson-${ref.id}`}
                      >
                        <Text style={styles.stoneText}>{"●".repeat(i + 1)}</Text>
                      </BigButton>
                    );
                  })}
                </View>
              )}
            </PaperCard>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: space.md },
  stickers: { flexDirection: "row", gap: space.xs, flex: 1, justifyContent: "flex-end" },
  sticker: { fontSize: 30 },
  map: { gap: space.lg, paddingBottom: space.xxl },
  unit: { padding: space.sm },
  folded: { opacity: 0.45 },
  unitHead: { flexDirection: "row", alignItems: "center", gap: space.md },
  unitEmoji: { fontSize: 44 },
  unitTitle: {
    fontFamily: fonts.latin,
    fontSize: 26,
    color: colors.goldDark,
    flex: 1,
    textAlign: "right",
  },
  stones: {
    flexDirection: "row",
    gap: space.lg,
    justifyContent: "center",
    paddingVertical: space.md,
  },
  stoneText: { fontSize: 18, color: colors.card, letterSpacing: 4 },
});

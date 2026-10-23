import { PaperCharacter, type CharacterController } from "@kids-lang/characters";
import { BigButton, PaperCard, colors, fonts, space } from "@kids-lang/ui";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { lessons, units } from "../content";
import { ConceptPicture } from "../content/art";
import { ttsRef } from "../lib/audio";
import { Screen } from "../lib/Screen";
import { learningFor, useActiveProfile } from "../lib/store";

type Phase = "sticker" | "world" | "goodbye";

/** End of lesson: a sticker, then a world update, then Mina says goodbye (CLAUDE.md §9). */
export default function Reward() {
  const { t } = useTranslation();
  const { lessonId, sticker } = useLocalSearchParams<{ lessonId: string; sticker?: string }>();
  const profile = useActiveProfile();
  const [phase, setPhase] = useState<Phase>(sticker ? "sticker" : "world");
  const zuzu = useRef<CharacterController>(null);
  const mina = useRef<CharacterController>(null);
  const unit = units.find((u) => u.id === lessons.get(lessonId)?.unitId);
  const unitName = unit ? t(`units.${unit.id}`) : "";
  const learning = learningFor(profile, profile?.lang);
  const done = unit
    ? unit.lessons.filter((l) => learning.completedLessons.includes(l.id)).length
    : 0;

  useEffect(() => {
    let alive = true;
    const run = async () => {
      await wait(900);
      if (sticker) {
        await Promise.all([
          zuzu.current?.celebrate(),
          zuzu.current?.talk(ttsRef(t("reward.sticker"), "en-GB", "cheerleader")),
        ]);
        await wait(600);
        if (!alive) return;
        setPhase("world");
      }
      await wait(300);
      await zuzu.current?.talk(
        ttsRef(t("reward.world", { unit: unitName }), "en-GB", "cheerleader"),
      );
      await wait(600);
      if (!alive) return;
      setPhase("goodbye");
      await wait(1300);
      await mina.current?.talk(ttsRef(t("reward.goodbye"), "en-GB", "calm"));
    };
    void run();
    return () => {
      alive = false;
    };
    // Plays once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen center>
      {phase !== "goodbye" && (
        <PaperCharacter ref={zuzu} character="cheerleader" mood="celebrating" size={170} />
      )}
      {phase === "sticker" && sticker && (
        <Animated.View entering={ZoomIn.springify()}>
          <ConceptPicture conceptId={sticker} size={160} color={colors.gold} />
        </Animated.View>
      )}
      {phase === "world" && unit && (
        <Animated.View entering={ZoomIn.springify()}>
          <PaperCard style={styles.world}>
            <Text
              style={styles.stars}
              accessibilityLabel={`${unitName}: ${done} of ${unit.lessons.length}`}
            >
              {"★".repeat(done) + "☆".repeat(Math.max(0, unit.lessons.length - done))}
            </Text>
          </PaperCard>
        </Animated.View>
      )}
      {phase === "goodbye" && (
        <View style={styles.goodbye}>
          <PaperCharacter ref={mina} character="calm" mood="wave" size={190} />
          <BigButton
            onPress={() => router.replace("/world")}
            label={t("reward.home")}
            size={96}
            color={colors.teal}
            testID="reward-home"
          >
            <Text style={styles.home}>⌂</Text>
          </BigButton>
        </View>
      )}
    </Screen>
  );
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const styles = StyleSheet.create({
  world: { paddingHorizontal: space.xl, paddingVertical: space.lg },
  stars: { fontFamily: fonts.latin, fontSize: 56, color: colors.goldDark },
  goodbye: { alignItems: "center", gap: space.xl },
  home: { fontSize: 48, color: colors.card },
});

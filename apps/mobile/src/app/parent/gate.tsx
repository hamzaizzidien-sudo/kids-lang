import { BigButton, PaperCard, colors, fonts, space } from "@kids-lang/ui";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../../lib/Screen";
import { parentGate } from "../../lib/store";

// PLACEHOLDER parent gate (CLAUDE.md §8): a written number to tap, which pre-readers can't do.
// Swap for a stronger check (e.g. a randomised sum) before release.
const ANSWER = 57;
const OPTIONS = [75, 57, 51];

/** Adult-only check in front of settings, purchases, links and deletion. */
export default function ParentGate() {
  const { t } = useTranslation();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const options = useMemo(() => [...OPTIONS].sort(() => Math.random() - 0.5), []);

  const pick = (n: number) => {
    if (n !== ANSWER) return router.back();
    parentGate.open();
    router.replace((next ?? "/parent") as Href);
  };

  return (
    <Screen center>
      <PaperCard style={styles.card}>
        <Text style={styles.title}>{t("parent.gateTitle")}</Text>
        <Text style={styles.question}>{t("parent.gateQuestion")}</Text>
        <View style={styles.row}>
          {options.map((n) => (
            <BigButton
              key={n}
              onPress={() => pick(n)}
              label={String(n)}
              size={80}
              testID={`gate-${n}`}
            >
              <Text style={styles.num}>{n}</Text>
            </BigButton>
          ))}
        </View>
      </PaperCard>
      <BigButton onPress={() => router.back()} label="Back" size={64} color={colors.paper}>
        <Text style={styles.num}>←</Text>
      </BigButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: space.lg, alignItems: "center" },
  title: { fontFamily: fonts.latin, fontSize: 24, color: colors.ink, textAlign: "center" },
  question: {
    fontFamily: fonts.latinRegular,
    fontSize: 20,
    color: colors.inkSoft,
    textAlign: "center",
    marginVertical: space.md,
  },
  row: { flexDirection: "row", gap: space.md, justifyContent: "center" },
  num: { fontFamily: fonts.latin, fontSize: 28, color: colors.ink },
});

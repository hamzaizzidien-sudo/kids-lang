import { CAST } from "@kids-lang/characters";
import { BigButton, PaperCard, colors, fonts, space } from "@kids-lang/ui";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { getPack, manifest } from "../../content";
import { Screen } from "../../lib/Screen";
import { useApp } from "../../lib/store";

/** Grown-up settings (stub): players, language per player, reset and delete. */
export default function ParentSettings() {
  const { t } = useTranslation();
  const { profiles, activeId, selectProfile, setLanguage, removeProfile, resetProgress } = useApp();

  return (
    <Screen>
      <Text style={styles.h1}>{t("parent.settings")}</Text>
      <ScrollView contentContainerStyle={{ gap: space.md }}>
        <Text style={styles.h2}>{t("parent.players")}</Text>
        {profiles.map((p) => (
          <PaperCard
            key={p.id}
            color={p.id === activeId ? colors.card : colors.paper}
            style={{ padding: space.sm }}
          >
            <Text style={styles.body} onPress={() => selectProfile(p.id)}>
              {p.nickname} · {CAST[p.avatar].name} ·{" "}
              {p.lang ? (getPack(p.lang).name ?? p.lang) : "—"}
            </Text>
            {p.id === activeId && (
              <View style={styles.row}>
                {manifest.shippedPacks.map((lang) => (
                  <BigButton
                    key={lang}
                    onPress={() => setLanguage(lang)}
                    label={getPack(lang).name ?? lang}
                    size={64}
                    color={p.lang === lang ? colors.gold : colors.card}
                  />
                ))}
              </View>
            )}
            <View style={styles.row}>
              <BigButton
                onPress={() => resetProgress(p.id)}
                label={t("parent.resetProgress")}
                size={64}
              />
              <BigButton
                onPress={() => removeProfile(p.id)}
                label={t("parent.delete")}
                size={64}
                color={colors.coral}
              />
            </View>
          </PaperCard>
        ))}
        <BigButton
          onPress={() => router.push("/parent/add-profile")}
          label={t("parent.addPlayer")}
          size={64}
          color={colors.gold}
        />
        {__DEV__ && (
          <BigButton onPress={() => router.push("/dev/cast")} label={t("parent.cast")} size={64} />
        )}
      </ScrollView>
      <BigButton
        onPress={() => router.dismissTo("/")}
        label={t("parent.done")}
        size={64}
        color={colors.teal}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontFamily: fonts.latin, fontSize: 28, color: colors.ink },
  h2: { fontFamily: fonts.latin, fontSize: 20, color: colors.inkSoft },
  body: { fontFamily: fonts.latinRegular, fontSize: 18, color: colors.ink, padding: space.sm },
  row: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, padding: space.xs },
});

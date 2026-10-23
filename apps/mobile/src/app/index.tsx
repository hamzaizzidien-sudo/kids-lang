import { PaperCharacter } from "@kids-lang/characters";
import { BigButton, colors, fonts, space } from "@kids-lang/ui";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Screen } from "../lib/Screen";
import { useApp } from "../lib/store";
import { useNarrator } from "../lib/useNarrator";

/** Child profile picker (local only). Adding or changing players sits behind the parent gate. */
export default function Profiles() {
  const { t } = useTranslation();
  const profiles = useApp((s) => s.profiles);
  const select = useApp((s) => s.selectProfile);
  const nilo = useNarrator(t("profiles.title"));

  const pick = (id: string, lang?: string) => {
    select(id);
    router.push(lang ? "/world" : "/language");
  };

  return (
    <Screen>
      <View style={styles.header}>
        <PaperCharacter ref={nilo} character="guide" mood="wave" size={130} />
        <Text style={styles.title}>{t("profiles.title")}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.grid}>
        {profiles.map((p, i) => (
          <BigButton
            key={p.id}
            onPress={() => pick(p.id, p.lang)}
            label={p.nickname}
            size={140}
            testID={`profile-${p.id}`}
          >
            <PaperCharacter
              interactive={false}
              character={p.avatar}
              mood="wave"
              size={90}
              appearDelaySec={0.3 + i * 0.45}
            />
            <Text style={styles.name} numberOfLines={1}>
              {p.nickname}
            </Text>
          </BigButton>
        ))}
        <BigButton
          onPress={() =>
            router.push({ pathname: "/parent/gate", params: { next: "/parent/add-profile" } })
          }
          label={t("profiles.add")}
          size={140}
          color={colors.gold}
          testID="add-profile"
        >
          <Text style={styles.plus}>+</Text>
        </BigButton>
      </ScrollView>
      <View style={styles.footer}>
        <BigButton
          onPress={() => router.push({ pathname: "/parent/gate", params: { next: "/parent" } })}
          label={t("profiles.grownUps")}
          size={64}
          testID="grown-ups"
        >
          <Text style={styles.small}>⚙︎</Text>
        </BigButton>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: space.md },
  title: { fontFamily: fonts.latin, fontSize: 28, color: colors.ink, flexShrink: 1 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.lg,
    justifyContent: "center",
    paddingVertical: space.lg,
  },
  name: { fontFamily: fonts.latin, fontSize: 18, color: colors.ink, maxWidth: 120 },
  plus: { fontFamily: fonts.latin, fontSize: 64, color: colors.ink, lineHeight: 72 },
  footer: { alignItems: "flex-end" },
  small: { fontSize: 28, color: colors.ink },
});

import { PaperCharacter } from "@kids-lang/characters";
import { BigButton, SpeakerIcon, TargetText, colors, fonts, space } from "@kids-lang/ui";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { getPack, manifest, speechLocale } from "../content";
import { audio, ttsRef } from "../lib/audio";
import { Screen } from "../lib/Screen";
import { useApp } from "../lib/store";
import { useNarrator } from "../lib/useNarrator";

/** Language picker. Every option comes from the shipped packs, so new languages are data only. */
export default function LanguagePicker() {
  const { t } = useTranslation();
  const setLanguage = useApp((s) => s.setLanguage);
  const nilo = useNarrator(t("language.title"));

  return (
    <Screen>
      <View style={styles.header}>
        <PaperCharacter ref={nilo} character="guide" mood="listening" size={130} />
        <Text style={styles.title}>{t("language.title")}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {manifest.shippedPacks.map((lang) => {
          const pack = getPack(lang);
          const name = pack.name ?? lang;
          return (
            <View key={lang} style={styles.row}>
              <BigButton
                onPress={() => void audio.play(ttsRef(name, speechLocale(pack)))}
                label={`Hear ${name}`}
                size={72}
                color={colors.teal}
              >
                <SpeakerIcon size={36} color={colors.card} />
              </BigButton>
              <BigButton
                onPress={() => {
                  setLanguage(lang);
                  router.replace("/world");
                }}
                label={name}
                size={72}
                style={{ flex: 1 }}
                testID={`lang-${lang}`}
              >
                <TargetText direction={pack.direction} lang={lang} size={30}>
                  {name}
                </TargetText>
              </BigButton>
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: space.md },
  title: { fontFamily: fonts.latin, fontSize: 26, color: colors.ink, flexShrink: 1 },
  list: { gap: space.md, paddingVertical: space.md },
  row: { flexDirection: "row", gap: space.md, alignItems: "stretch" },
});

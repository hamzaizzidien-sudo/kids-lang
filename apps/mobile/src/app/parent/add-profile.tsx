import type { CharacterId } from "@kids-lang/content-schema";
import { CHARACTER_IDS, PaperCharacter } from "@kids-lang/characters";
import { BigButton, PaperCard, colors, fonts, space } from "@kids-lang/ui";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "../../lib/Screen";
import { useApp } from "../../lib/store";

/** Add a local player: a nickname and a character only (CLAUDE.md §8). */
export default function AddProfile() {
  const { t } = useTranslation();
  const addProfile = useApp((s) => s.addProfile);
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState<CharacterId>("guide");

  const save = () => {
    if (!nickname.trim()) return;
    addProfile(nickname, avatar);
    router.dismissTo("/");
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: space.md }} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1}>{t("parent.addPlayer")}</Text>
        <PaperCard style={{ padding: space.sm }}>
          <TextInput
            value={nickname}
            onChangeText={setNickname}
            placeholder={t("parent.nickname")}
            maxLength={12}
            autoCorrect={false}
            autoComplete="off"
            style={styles.input}
            testID="nickname"
          />
        </PaperCard>
        <Text style={styles.hint}>{t("parent.nicknameHint")}</Text>
        <Text style={styles.h2}>{t("parent.avatar")}</Text>
        <View style={styles.row}>
          {CHARACTER_IDS.map((id, i) => (
            <BigButton
              key={id}
              onPress={() => setAvatar(id)}
              label={id}
              size={100}
              color={avatar === id ? colors.gold : colors.card}
            >
              <PaperCharacter
                interactive={false}
                character={id}
                mood="wave"
                size={80}
                appearDelaySec={i * 0.2}
              />
            </BigButton>
          ))}
        </View>
        <BigButton
          onPress={save}
          label={t("parent.save")}
          size={64}
          color={colors.teal}
          disabled={!nickname.trim()}
          testID="save-profile"
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontFamily: fonts.latin, fontSize: 28, color: colors.ink },
  h2: { fontFamily: fonts.latin, fontSize: 20, color: colors.inkSoft },
  hint: { fontFamily: fonts.latinRegular, fontSize: 16, color: colors.inkSoft },
  input: { fontFamily: fonts.latin, fontSize: 24, color: colors.ink, minHeight: 56 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: space.md, justifyContent: "center" },
});

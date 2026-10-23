import {
  ART,
  CAST,
  CHARACTER_IDS,
  PaperCharacter,
  type CharacterController,
  type Mood,
} from "@kids-lang/characters";
import { BigButton, PaperCard, colors, fonts, space } from "@kids-lang/ui";
import { Redirect } from "expo-router";
import { useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ttsRef } from "../../lib/audio";
import { Screen } from "../../lib/Screen";

// Matches design/characters/preview.html: the cast unfolding with a stagger, then every kind × mood.
const CAST_MOODS: Record<string, Mood> = {
  guide: "wave",
  cheerleader: "celebrating",
  silly: "oops",
  calm: "listening",
  explorer: "thinking",
};

/** Dev-only cast gallery (CLAUDE.md §10). */
export default function CastGallery() {
  const [run, setRun] = useState(0);
  const [mood, setMood] = useState<Mood | undefined>();
  const refs = useRef<Record<string, CharacterController | null>>({});
  if (!__DEV__) return <Redirect href="/" />;

  const all = (fn: (c: CharacterController) => unknown) =>
    Object.values(refs.current).forEach((c) => c && fn(c));

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: space.lg }}>
        <Text style={styles.h1}>Cast gallery</Text>
        <View style={styles.row}>
          <BigButton
            onPress={() => setRun((r) => r + 1)}
            label="Replay unfold"
            size={64}
            color={colors.teal}
          />
          <BigButton onPress={() => all((c) => c.disappear())} label="Fold away" size={64} />
          <BigButton onPress={() => all((c) => c.celebrate())} label="Celebrate" size={64} />
          <BigButton onPress={() => all((c) => c.oops())} label="Oops" size={64} />
          <BigButton
            onPress={() => all((c) => c.talk(ttsRef("Hello! I'm folded paper.")))}
            label="Talk"
            size={64}
          />
        </View>
        <View style={styles.row}>
          {ART.moods.map((m) => (
            <BigButton
              key={m}
              onPress={() => {
                setMood(m);
                all((c) => c.setMood(m));
              }}
              label={m}
              size={64}
              color={mood === m ? colors.gold : colors.card}
            />
          ))}
        </View>
        <View style={styles.row} key={run}>
          {CHARACTER_IDS.map((id, i) => (
            <View key={id} style={styles.cell}>
              <PaperCharacter
                ref={(c) => {
                  refs.current[id] = c;
                }}
                character={id}
                mood={mood ?? CAST_MOODS[id]}
                size={140}
                appearDelaySec={0.15 + i * ART.unfold.castStaggerSec}
              />
              <Text style={styles.label}>
                {CAST[id].name} · {CAST[id].role}
              </Text>
            </View>
          ))}
        </View>
        {CHARACTER_IDS.map((id) => (
          <PaperCard key={id} style={{ padding: space.sm }}>
            <View style={styles.row}>
              {ART.moods.map((m) => (
                <View key={m} style={styles.cell}>
                  <PaperCharacter character={id} mood={m} size={96} appearOnMount={false} />
                  <Text style={styles.small}>
                    {CAST[id].kind} · {m}
                  </Text>
                </View>
              ))}
            </View>
          </PaperCard>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontFamily: fonts.latin, fontSize: 28, color: colors.ink },
  row: { flexDirection: "row", flexWrap: "wrap", gap: space.md, justifyContent: "center" },
  cell: { alignItems: "center" },
  label: { fontFamily: fonts.latin, fontSize: 14, color: colors.ink },
  small: { fontFamily: fonts.latinRegular, fontSize: 12, color: colors.inkSoft },
});

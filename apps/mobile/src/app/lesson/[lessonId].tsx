import type { ConceptId } from "@kids-lang/content-schema";
import { PaperCharacter, type CharacterController } from "@kids-lang/characters";
import {
  answer,
  createSession,
  type Choice,
  type ExerciseView,
  type Session,
  type WordView,
} from "@kids-lang/engine";
import { HoldToExit, ReplayAudioButton, colors, space } from "@kids-lang/ui";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { getPack, getProfile, lessons, speechLocale } from "../../content";
import { DragMatch, ListenTap, SayIt } from "../../lesson/exercises";
import { audio, ttsRef } from "../../lib/audio";
import { Screen } from "../../lib/Screen";
import { learningFor, useActiveProfile, useApp } from "../../lib/store";

const NEXT_DELAY_MS = 900;
const LISTEN_MS = 1800;

/** Lesson player. Wrong answers never end the lesson; leaving needs a hold (CLAUDE.md §9). */
export default function LessonScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const profile = useActiveProfile();
  const lesson = lessons.get(lessonId);
  if (!profile?.lang || !lesson) return <Redirect href="/world" />;
  return <LessonPlayer key={lessonId} lessonId={lesson.id} lang={profile.lang} />;
}

function LessonPlayer({ lessonId, lang }: { lessonId: string; lang: string }) {
  const { t } = useTranslation();
  const profile = useActiveProfile()!;
  const finishLesson = useApp((s) => s.finishLesson);
  const pack = getPack(lang);
  const ageBand = getProfile(profile.ageBand);

  const [session, setSession] = useState<Session>(() =>
    createSession(ageBand, lessons.get(lessonId)!, pack, learningFor(profile, lang).progress, {
      seed: Date.now(),
    }),
  );
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [kikoVisible, setKikoVisible] = useState(false);
  const [listening, setListening] = useState(false);
  const narrator = useRef<CharacterController>(null);
  const kiko = useRef<CharacterController>(null);
  const alive = useRef(true);

  const state = session.current;
  const view = state?.view;
  const speak = useCallback((line: string, who = "guide") => ttsRef(line, "en-GB", who), []);

  // Preload every clip the session needs before it starts (CLAUDE.md §2).
  useEffect(() => {
    alive.current = true;
    audio.registerPack(pack, speechLocale(pack));
    void audio
      .preload(session.exercises.flatMap(clipsFor))
      .then(() => alive.current && setReady(true));
    return () => {
      alive.current = false;
      audio.stop();
    };
    // Once per lesson.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prompt = useCallback(
    async (v: ExerciseView) => {
      const n = narrator.current;
      if (!n || !alive.current) return;
      n.setMood("wave");
      if (v.template === "listenTap") {
        await n.talk(speak(t("lesson.listenTap"), v.speaker));
        await n.talk(v.prompt.audio);
      } else if (v.template === "sayIt") {
        await n.talk(speak(t("lesson.sayIt"), v.speaker));
        await n.talk(v.prompt.audio);
        await n.talk(speak(t("lesson.sayItTurn"), v.speaker));
      } else {
        await n.talk(speak(t("lesson.dragMatch"), v.speaker));
      }
      if (alive.current) n.setMood("listening");
    },
    [speak, t],
  );

  // Speak each new exercise once the narrator has unfolded.
  const index = session.index;
  useEffect(() => {
    if (!ready || !view) return;
    const timer = setTimeout(() => void prompt(view), 1300);
    return () => clearTimeout(timer);
    // Only when the exercise changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, index]);

  const respond = async (choice: Choice) => {
    if (busy || !state) return;
    setBusy(true);
    audio.stop();
    const result = answer(session, choice);
    try {
      if (result.correct) {
        setKikoVisible(false);
        const praise = t("lesson.correct") as unknown as string[];
        const line = praise[result.next.index % praise.length]!;
        const moved = result.next.index !== session.index || result.next.complete;
        if (!moved) {
          // dragMatch: one word placed, more to go.
          setSession(result.next);
          narrator.current?.tapReaction();
          return;
        }
        await Promise.all([
          narrator.current?.celebrate(),
          narrator.current?.talk(speak(line, view!.speaker)),
        ]);
        await wait(NEXT_DELAY_MS);
        if (!alive.current) return;
        if (result.next.complete) return finish(result.next);
        setSession(result.next);
      } else {
        // Gentle retry: Kiko does oops, the right item wiggles, and the prompt repeats.
        setSession(result.next);
        setKikoVisible(true);
        await wait(250);
        await Promise.all([
          kiko.current?.oops(),
          kiko.current?.talk(speak(t("lesson.oops"), "silly")),
        ]);
        if (view?.template === "listenTap") await narrator.current?.talk(view.prompt.audio);
        narrator.current?.setMood("listening");
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  const finish = (done: Session) => {
    finishLesson(lessonId, done.progress, done.reward.sticker);
    router.replace({
      pathname: "/reward",
      params: { lessonId, sticker: done.reward.sticker ?? "" },
    });
  };

  const sayIt = async () => {
    // PLACEHOLDER: on-device speech recognition comes with a dev build. Nothing is recorded:
    // the child's attempt is rewarded either way (CLAUDE.md §8).
    setListening(true);
    narrator.current?.setMood("listening");
    await wait(LISTEN_MS);
    setListening(false);
    if (alive.current) await respond({ type: "say" });
  };

  const playWord = (w: WordView) => void narrator.current?.talk(w.audio);
  const progress = useMemo(() => session.exercises.map((_, i) => i < session.index), [session]);

  if (!view || !state) return null;
  const common = { disabled: busy || !ready, showText: ageBand.showText, lang };

  return (
    <Screen>
      <View style={styles.top}>
        <HoldToExit onExit={() => router.dismissTo("/world")} label={t("lesson.exit")} />
        <View style={styles.dots}>
          {progress.map((done, i) => (
            <View
              key={i}
              style={[styles.dot, done && styles.dotDone, i === session.index && styles.dotNow]}
            />
          ))}
        </View>
      </View>

      <View style={styles.stage}>
        <PaperCharacter
          key={`${view.speaker}`}
          ref={narrator}
          character={view.speaker}
          mood="wave"
          size={150}
        />
        {kikoVisible && <PaperCharacter ref={kiko} character="silly" mood="oops" size={110} />}
        <ReplayAudioButton onPress={() => !busy && void prompt(view)} />
      </View>

      <View style={styles.exercise}>
        {view.template === "listenTap" && (
          <ListenTap
            {...common}
            state={{ ...state, view }}
            onTap={(id: ConceptId) => void respond({ type: "tap", conceptId: id })}
          />
        )}
        {view.template === "dragMatch" && (
          <DragMatch
            {...common}
            state={{ ...state, view }}
            playWord={playWord}
            onDrop={(word, picture) => void respond({ type: "drop", word, picture })}
          />
        )}
        {view.template === "sayIt" && (
          <SayIt
            {...common}
            state={{ ...state, view }}
            onSay={() => void sayIt()}
            listening={listening}
          />
        )}
      </View>
    </Screen>
  );
}

function clipsFor(v: ExerciseView): string[] {
  if (v.template === "dragMatch") return v.words.map((w) => w.audio);
  return [v.prompt.audio];
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: space.md },
  dots: { flexDirection: "row", gap: space.sm, flex: 1, justifyContent: "center" },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.card,
    transform: [{ rotate: "45deg" }],
  },
  dotDone: { backgroundColor: colors.teal },
  dotNow: { backgroundColor: colors.gold },
  stage: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    minHeight: 190,
  },
  exercise: { flex: 1, justifyContent: "center" },
});

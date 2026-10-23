import "../lib/i18n";
import { Baloo2_500Medium, Baloo2_700Bold } from "@expo-google-fonts/baloo-2";
import { BalooBhaijaan2_700Bold } from "@expo-google-fonts/baloo-bhaijaan-2";
import { CharacterAudioContext } from "@kids-lang/characters";
import { colors } from "@kids-lang/ui";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { audio } from "../lib/audio";

void SplashScreen.preventAutoHideAsync();

const FONT_WAIT_MS = 1500;

export default function RootLayout() {
  const [loaded, error] = useFonts({ Baloo2_500Medium, Baloo2_700Bold, BalooBhaijaan2_700Bold });
  // Never hold the app on fonts: after a moment, start with fallbacks and let the fonts swap in.
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWaited(true), FONT_WAIT_MS);
    return () => clearTimeout(t);
  }, []);
  const ready = loaded || Boolean(error) || waited;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.paper }}>
      <CharacterAudioContext.Provider value={audio.play}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.paper },
            animation: "fade",
          }}
        />
      </CharacterAudioContext.Provider>
    </GestureHandlerRootView>
  );
}

import { colors, space } from "@kids-lang/ui";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function Screen({ children, center }: { children: ReactNode; center?: boolean }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.body, center && styles.center]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  body: { flex: 1, padding: space.md, gap: space.md },
  center: { alignItems: "center", justifyContent: "center" },
});

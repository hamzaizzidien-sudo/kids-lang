import { Redirect, Stack, usePathname } from "expo-router";
import { parentGate } from "../../lib/store";

/** Everything under /parent needs the gate, except the gate itself. */
export default function ParentLayout() {
  const path = usePathname();
  if (path !== "/parent/gate" && !parentGate.isOpen()) {
    return <Redirect href={{ pathname: "/parent/gate", params: { next: path } }} />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}

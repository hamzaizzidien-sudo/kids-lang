// Native: SQLite-backed key-value store (survives app restarts, stays on the device).
import Storage from "expo-sqlite/kv-store";

export const storage = Storage;

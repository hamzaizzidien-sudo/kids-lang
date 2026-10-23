// Web preview: the browser's localStorage, so the SQLite wasm build isn't needed.
// Storage can be blocked (private windows, sandboxed frames); the app then just forgets on reload.
function local(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export const storage = {
  getItem: async (key: string) => {
    try {
      return local()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      local()?.setItem(key, value);
    } catch {
      // Ignore: progress just isn't kept between visits.
    }
  },
  removeItem: async (key: string) => {
    try {
      local()?.removeItem(key);
    } catch {
      // Ignore.
    }
  },
};

// Folded-paper palette (CLAUDE.md §10). Flat paper cards with a hard offset shadow.
export const colors = {
  paper: "#F4F1EA",
  card: "#FFFDF8",
  ink: "#2B1D16",
  inkSoft: "#6B5A50",
  teal: "#2BA59B",
  tealDark: "#1E7A72",
  gold: "#F2C14E",
  goldDark: "#C9982A",
  coral: "#F6A79B",
  leaf: "#A8D98A",
} as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const radius = { card: 14, round: 999 } as const;

/** Hard offset shadow: an ink block behind the card, shifted down-right. */
export const paperShadow = { offset: 5, color: colors.ink } as const;

/** CLAUDE.md §9: touch targets at least 64pt for 3–5. */
export const minTouch = 64;

/** Loaded by the app with expo-font. Rounded Latin with full Turkish coverage, and its Arabic sibling. */
export const fonts = {
  latin: "Baloo2_700Bold",
  latinRegular: "Baloo2_500Medium",
  arabic: "BalooBhaijaan2_700Bold",
} as const;

import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/node_modules/**", "**/coverage/**", "**/dist/**", "**/.turbo/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: globals.node },
    rules: {
      // Turkish needs locale-aware casing: "i".toUpperCase() gives "I", not "İ" (CLAUDE.md §7).
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name=/^to(Upper|Lower)Case$/]",
          message:
            'Use toLocaleUpperCase(lang) / toLocaleLowerCase(lang), e.g. toLocaleUpperCase("tr"). Bare casing breaks Turkish dotted/dotless i.',
        },
      ],
    },
  },
  {
    files: ["**/test/**/*.ts"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
  {
    // CLAUDE.md §3: the engine is pure logic, with no React or React Native.
    files: ["packages/engine/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: ["react", "react-*", "react/*", "expo", "expo-*", "@expo/*", "@react-native/*"],
        },
      ],
    },
  },
);

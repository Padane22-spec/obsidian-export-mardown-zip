import js from "@eslint/js";
import obsidian from "eslint-plugin-obsidianmd";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    plugins: {
      obsidianmd: obsidian
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      "obsidianmd/ui/sentence-case": ["error", { enforceCamelCaseLower: true }]
    }
  },
  {
    ignores: [
      "coverage/**",
      "dist/**",
      "main.js"
    ]
  }
];

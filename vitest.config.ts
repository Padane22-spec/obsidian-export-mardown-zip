import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node"
  },
  resolve: {
    alias: {
      obsidian: path.resolve(__dirname, "tests/obsidian-stub.ts")
    }
  }
});

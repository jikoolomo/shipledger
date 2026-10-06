import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node"
  },
  resolve: {
    alias: {
      "@shipledger/schema": path.resolve(__dirname, "packages/schema/src/index.ts"),
      "@shipledger/crypto": path.resolve(__dirname, "packages/crypto/src/index.ts"),
      "@shipledger/parsers": path.resolve(__dirname, "packages/parsers/src/index.ts"),
      "@shipledger/policy": path.resolve(__dirname, "packages/policy/src/index.ts"),
      "@shipledger/core": path.resolve(__dirname, "packages/core/src/index.ts")
    }
  }
});

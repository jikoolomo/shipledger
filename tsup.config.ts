import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      "action/index": "src/action/index.ts"
    },
    format: ["cjs"],
    platform: "node",
    target: "node24",
    bundle: true,
    noExternal: [/(.*)/], // GitHub Action single bundle
    sourcemap: true,
    clean: true,
    banner: {
      js: "#!/usr/bin/env node"
    }
  },
  {
    entry: {
      "cli/index": "src/cli/index.ts"
    },
    format: ["esm"],
    target: "node24",
    bundle: true,
    sourcemap: true,
    banner: {
      js: "#!/usr/bin/env node"
    }
  }
]);

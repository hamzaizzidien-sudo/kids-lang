// `pnpm validate-content [--allow-draft]` — see packages/content-schema/src/run-cli.ts
import { resolve } from "node:path";
import { runCli } from "@kids-lang/content-schema/run-cli";

process.exitCode = runCli(process.argv.slice(2), resolve(import.meta.dirname, "../content"));

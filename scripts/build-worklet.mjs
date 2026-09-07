// Bundles the AudioWorkletProcessor from TypeScript source into a plain JS
// file under public/worklets/, because `audioContext.audioWorklet.addModule()`
// fetches a URL and runs it in a separate global scope — it cannot go
// through Next.js's normal React bundling pipeline. Run automatically before
// `next dev` / `next build` (see package.json "predev"/"prebuild").
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

mkdirSync(path.join(root, "public", "worklets"), { recursive: true });

await build({
  entryPoints: [path.join(root, "src/lib/audio/worklet/pitch-processor.ts")],
  outfile: path.join(root, "public/worklets/pitch-processor.js"),
  bundle: true,
  format: "iife",
  target: "es2020",
  minify: false,
  logLevel: "info",
});

console.log("Built public/worklets/pitch-processor.js");

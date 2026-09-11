/**
 * OrcaRouter test runner.
 *
 * The repository ships no JS test runner, so this is a zero-dependency Node
 * runner that loads the real provider modules through jiti (already present
 * transitively) and executes every suite in order.
 *
 * Usage: node tests/orcarouter/run.mjs
 */

import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, {
  interopDefault: true,
  alias: {
    "~": new URL("../../app", import.meta.url).pathname,
    "@": new URL("../../app", import.meta.url).pathname,
  },
});

// Everything — harness included — is loaded through the same jiti registry so
// the suites and the runner share one set of result counters.
async function main() {
  const harness = await jiti.import("./harness.mjs");

  const SUITES = [
    ["credential seam", "./credentials.test.mjs"],
    ["pkce protocol", "./pkce.test.mjs"],
    ["model catalog", "./catalog.test.mjs"],
    ["connect flow lifecycle", "./connect-flow.test.mjs"],
    ["hygiene", "./hygiene.test.mjs"],
  ];

  for (const [name, file] of SUITES) {
    console.log(`\n# ${name}`);
    const mod = await jiti.import(file);
    await mod.run();
  }

  process.exit(harness.summary() ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

/**
 * Phase 3 scenario AI fence for the thin dashboard.
 *
 * Mirrors Python `chime.scenarios.scenarios_enabled`: only `AI_SCENARIOS_ENABLED=1`
 * opts in. No LLM / provider checks here — the dash page stays a stub either way.
 */

export function scenariosEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (env.AI_SCENARIOS_ENABLED ?? "0").trim() === "1";
}

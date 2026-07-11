/**
 * Safety — fail-open wrappers and debug dump.
 *
 * Every plugin hook must degrade gracefully: a registry error must
 * NEVER block the provider request. failOpen() swallows errors and
 * logs them, so the underlying OpenCode request proceeds untouched.
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

/**
 * Run `fn` inside a try/catch. On error, log to stderr and return
 * (do not throw). This is the core fail-open guarantee.
 */
export async function failOpen<T>(
  fn: () => Promise<T> | T,
  label = "registry",
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[McpRegistry] ${label} hook error (ignored):`, (err as Error).message);
    return undefined;
  }
}

/** Write a debug snapshot to /tmp for offline inspection. */
export function writeDebugDump(
  sessionID: string,
  state: Record<string, unknown>,
): void {
  try {
    const dir = "/tmp";
    const file = join(dir, `opencode-registry-${sessionID || "global"}.json`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, JSON.stringify({ ts: Date.now(), ...state }, null, 2));
  } catch {
    // best-effort only
  }
}

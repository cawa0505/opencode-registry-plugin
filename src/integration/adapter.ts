/**
 * Adapter — pure functions that turn registry state into the
 * OpenCode hook outputs (system-prompt hint + tool-description
 * down-ranking). No OpenCode SDK imports and no hidden module
 * state here, so they stay trivially testable. The plugin entry
 * passes the current state in as arguments.
 */

import type { CapabilityTag } from "../registry/types.js";

/**
 * Parse the MCP server name out of an OpenCode tool ID.
 *
 * OpenCode namespaces MCP tools as `mcp__<server>__<tool>` or
 * `<server>__<tool>`. Built-in tools (read, write, bash, ...) have
 * no `__` separator and return null.
 */
export function parseServerFromToolID(toolID: string): string | null {
  const parts = toolID.split("__");
  if (parts.length < 2) return null; // built-in tool
  if (parts[0] === "mcp") return parts[1] ?? null;
  return parts[0];
}

/**
 * Build the system-prompt note describing the active tool scope.
 * Returns null when no scope is active (nothing to inject).
 */
export function buildSystemHint(
  allowed: string[],
  profile: string | null,
  intentTags: CapabilityTag[],
): string | null {
  if (allowed.length === 0) return null;

  const scope = profile
    ? `profile "${profile}"`
    : `intent [${intentTags.join(", ")}]`;

  return (
    `[MCP Registry] Active scope: ${scope}. ` +
    `In-scope MCP servers: ${allowed.join(", ")}. ` +
    `Prefer these for tool calls. Out-of-scope MCP tools are deprioritized — ` +
    `only invoke them if the user explicitly asks.`
  );
}

/**
 * Down-rank an out-of-scope MCP tool by rewriting its description.
 * Built-in tools and in-scope tools are returned unchanged (null).
 */
export function rewriteToolDescription(
  toolID: string,
  description: string,
  allowed: string[],
  profile: string | null,
): string | null {
  const server = parseServerFromToolID(toolID);
  if (!server) return null; // built-in tool — never touch

  if (allowed.includes(server)) return null; // in scope — leave as-is

  const scope = profile ?? "default";
  const tag = `[registry: out-of-scope for "${scope}"]`;
  if (description.startsWith(tag)) return null; // already tagged

  return `${tag} Only use if the user explicitly requires it. ${description}`;
}

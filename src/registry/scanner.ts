/**
 * MCP config scanner — reads opencode.json and discovers MCP servers.
 *
 * Scans well-known config paths for the user's opencode.json,
 * extracts MCP entries, and infers capability tags from server names
 * and optional user tagging config.
 */

import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join, resolve } from "path";
import type {
  CapabilityTag,
  McpConfigEntry,
  OpencodeConfig,
  RegistryEntry,
  RegistrySnapshot,
} from "./types.js";
import { ALL_CAPABILITIES } from "./types.js";

// ── Default tag map: known MCP server → capability hints ──────────────
// Built-in so users don't need to manually tag every common MCP.
const DEFAULT_TAG_MAP: Record<string, CapabilityTag[]> = {
  "code-review-graph": ["code", "nav", "search"],
  "code-rag":           ["code", "search"],
  trafilatura:          ["web", "read"],
  firecrawl:            ["web", "search", "read"],
  markdownify:          ["media", "read"],
  "markdownify-mcp":    ["media", "read"],
  opendocuments:        ["read", "search"],
  "telegram-hook":      ["utility"],
  "context-cache":      ["utility"],
};

// ── Config paths to search ────────────────────────────────────────────
function configPaths(directory?: string): string[] {
  const home = homedir();
  const searchDirs = [directory, process.cwd()].filter(Boolean) as string[];
  const paths: string[] = [
    resolve(home, ".config/opencode/opencode.json"),
    resolve(home, ".config/opencode/opencode.jsonc"),
  ];
  for (const d of searchDirs) {
    paths.push(
      resolve(d, ".opencode/opencode.json"),
      resolve(d, ".opencode/opencode.jsonc"),
      resolve(d, "opencode.json"),
      resolve(d, "opencode.jsonc"),
    );
  }
  return paths;
}

/** Try to load and parse opencode.json from known paths. */
function loadConfig(directory?: string): OpencodeConfig | null {
  for (const p of configPaths(directory)) {
    if (!existsSync(p)) continue;
    try {
      const raw = readFileSync(p, "utf-8");
      // Strip comments — only // at line start or preceded by whitespace,
      // not the // inside URLs like https://
      const cleaned = raw
        .replace(/^\s*\/\/.*$/gm, "")      // line comments (not inside URLs)
        .replace(/\/\*[\s\S]*?\*\//g, "")   // block comments
        .replace(/,(\s*[}\]])/g, "$1");      // trailing commas
      return JSON.parse(cleaned) as OpencodeConfig;
    } catch {
      // Try next path
    }
  }
  return null;
}

/** Infer capability tags for a single MCP entry. */
function inferTags(name: string, _entry: McpConfigEntry): CapabilityTag[] {
  // 1) Check built-in map
  const builtIn = DEFAULT_TAG_MAP[name];
  if (builtIn) return [...builtIn];

  // 2) Heuristic from name keywords
  const n = name.toLowerCase();
  const tags: CapabilityTag[] = [];
  if (/code|review|graph|refactor|analysis?/.test(n)) tags.push("code");
  if (/search|find|rag|query/.test(n)) tags.push("search");
  if (/read|doc|view|content|extract/.test(n)) tags.push("read");
  if (/write|edit|create|patch/.test(n)) tags.push("write");
  if (/web|http|fetch|scrape|crawl/.test(n)) tags.push("web");
  if (/image|video|audio|media|pdf|file/.test(n)) tags.push("media");
  if (/debug|diagnose|trace|log/.test(n)) tags.push("debug");
  if (/nav|browse|explore|list|ls|tree/.test(n)) tags.push("nav");
  if (/util|tool|script|exec|run/.test(n)) tags.push("utility");

  return tags.length > 0 ? tags : ["utility"];
}

/** Convert MCP server name + entry to a RegistryEntry. */
function entryFromMcp(name: string, entry: McpConfigEntry): RegistryEntry {
  const tags = inferTags(name, entry);
  return {
    name,
    config: entry,
    tags,
  };
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Scan opencode.json MCP config and produce a RegistrySnapshot.
 *
 * Returns null when no valid config is found.
 */
export function scanRegistry(directory?: string): RegistrySnapshot | null {
  const config = loadConfig(directory);
  if (!config?.mcp) return null;

  const entries: RegistryEntry[] = [];

  for (const [name, mcpConfig] of Object.entries(config.mcp)) {
    const enabled = mcpConfig.enabled !== false;
    if (!enabled) continue;
    entries.push(entryFromMcp(name, mcpConfig));
  }

  return {
    entries,
    defaultTagMap: { ...DEFAULT_TAG_MAP },
    timestamp: Date.now(),
  };
}

/** Load raw opencode.json config. */
export function loadOpencodeConfig(): OpencodeConfig | null {
  return loadConfig();
}

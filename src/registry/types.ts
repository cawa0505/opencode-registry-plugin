/**
 * Core types for MCP tool capability registry.
 *
 * Capability tags categorize MCP tools by what they do, enabling
 * intent-driven filtering instead of manual name-based selection.
 */

/** Logical capability groups for MCP tools. */
export type CapabilityTag =
  | "nav"       // File/project navigation, browsing
  | "read"      // Reading file/doc content
  | "search"    // Searching code or data
  | "write"     // Writing/editing files
  | "code"      // Code analysis, review, refactoring
  | "web"       // Web fetching, scraping
  | "media"     // Image/video/audio processing
  | "debug"     // Debugging, diagnostics
  | "utility";  // General utilities, automation

/** All known capability tags. */
export const ALL_CAPABILITIES: CapabilityTag[] = [
  "nav", "read", "search", "write", "code",
  "web", "media", "debug", "utility",
];

/** Shape of an opencode.json MCP config entry. */
export interface McpConfigEntry {
  type: "remote" | "local";
  url?: string;
  command?: string;
  enabled?: boolean;
  [key: string]: unknown;
}

/** Full opencode.json schema subset. */
export interface OpencodeConfig {
  mcp?: Record<string, McpConfigEntry>;
  plugin?: string[];
}

/** RegistryEntry: a scanned MCP server with its tools and capabilities. */
export interface RegistryEntry {
  /** MCP server name from opencode.json key. */
  name: string;
  /** Raw config from opencode.json. */
  config: McpConfigEntry;
  /** Capability tags inferred for this server. */
  tags: CapabilityTag[];
}

/** A filter expression — keep tools matching ANY of these tags. */
export interface TagFilter {
  mode: "allow" | "deny";
  tags: CapabilityTag[];
}

/** Result of a registry scan. */
export interface RegistrySnapshot {
  /** All known MCP entries. */
  entries: RegistryEntry[];
  /** Default tag mappings per server name (built-in). */
  defaultTagMap: Record<string, CapabilityTag[]>;
  /** When the snapshot was taken. */
  timestamp: number;
}

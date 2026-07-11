/**
 * ToolFilter — filters MCP tool lists by capability tags.
 *
 * The core logic for dynamic injection: given a set of desired
 * capability tags, produce a list of allowed MCP server names.
 */

import type { CapabilityTag, RegistryEntry, TagFilter } from "../registry/types.js";
import { registry } from "../registry/registry.js";

export type FilterStrategy = "tag-allow" | "tag-deny" | "explicit";

export interface FilterConfig {
  strategy: FilterStrategy;
  /** Tags for allow/deny filtering. */
  tags?: CapabilityTag[];
  /** Explicit server name allow list (takes priority over tag filtering). */
  includeServers?: string[];
  /** Explicit server name deny list. */
  excludeServers?: string[];
}

const DEFAULT_FILTER: FilterConfig = {
  strategy: "tag-allow",
  tags: ["code", "search", "read", "web", "utility"],
};

/**
 * Resolve which MCP servers should be active under a filter config.
 *
 * Returns only server names that:
 * 1. Are not in the exclude list
 * 2. Match the tag filter (if tag-allow) or don't match (if tag-deny)
 * 3. Are in the include list (if explicit)
 */
export function resolveActiveServers(config: FilterConfig = DEFAULT_FILTER): RegistryEntry[] {
  let filtered: RegistryEntry[];

  switch (config.strategy) {
    case "tag-allow":
      filtered = registry.applyFilter({
        mode: "allow",
        tags: config.tags ?? [],
      });
      break;
    case "tag-deny":
      filtered = registry.applyFilter({
        mode: "deny",
        tags: config.tags ?? [],
      });
      break;
    case "explicit":
      filtered = registry.entries.filter(
        (e) => config.includeServers?.includes(e.name),
      );
      break;
  }

  // Apply exclude override
  const excludeSet = new Set(config.excludeServers ?? []);
  return filtered.filter((e) => !excludeSet.has(e.name));
}

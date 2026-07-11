/**
 * Profile schema types for YAML-based scene configurations.
 *
 * Profiles define named development scenarios that map to specific
 * MCP tool configurations. Users define profiles like `bugfix.yaml`
 * to activate a curated set of tools for debugging tasks.
 */

import type { CapabilityTag } from "../registry/types.js";

export interface McpProfileServer {
  /** MCP server name from the registry. */
  name: string;
  /** Optional: only include specific tools from this server. */
  tools?: string[];
}

export interface McpProfile {
  /** Profile metadata. */
  name: string;
  description?: string;
  version?: string;

  /** Capability tags this profile targets. */
  tags?: CapabilityTag[];

  /** Server-level include/exclude. */
  servers?: {
    include?: string[];
    exclude?: string[];
  };

  /** Explicit server + optional per-server tool filtering. */
  mcp?: McpProfileServer[];

  /** Priority: higher wins when multiple profiles overlap (default 0). */
  priority?: number;
}

export interface McpProfileManifest {
  $schema?: string;
  profiles: McpProfile[];
  default?: string;
}

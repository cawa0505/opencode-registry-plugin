/**
 * Profile schema types for YAML-based scene configurations.
 *
 * Profiles define named development scenarios that map to specific
 * MCP tool configurations. Users define profiles like `bugfix.yaml`
 * to activate a curated set of tools for debugging tasks.
 */

import type { CapabilityTag } from "../registry/types.js";

export interface McpProfile {
  /** Profile metadata. */
  name: string;
  description?: string;

  /** Capability tags this profile targets. */
  tags?: CapabilityTag[];

  /** Server-level include/exclude. */
  servers?: {
    include?: string[];
    exclude?: string[];
  };
}

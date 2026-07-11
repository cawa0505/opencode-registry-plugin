/**
 * RegistryEngine — central state for MCP tool discovery and indexing.
 *
 * Singleton that holds the scanned MCP registry, provides lookup
 * by capability tag, and can re-scan on demand.
 */

import type {
  CapabilityTag,
  RegistryEntry,
  RegistrySnapshot,
  TagFilter,
} from "./types.js";
import { scanRegistry } from "./scanner.js";

export class RegistryEngine {
  private snapshot: RegistrySnapshot | null = null;

  /** Initialize by scanning opencode.json. */
  initialize(directory?: string): boolean {
    this.snapshot = scanRegistry(directory);
    return this.snapshot !== null;
  }

  /** Force a re-scan. */
  reScan(directory?: string): boolean {
    return this.initialize(directory);
  }

  /** True if the engine has been initialized. */
  get ready(): boolean {
    return this.snapshot !== null;
  }

  /** All registry entries. */
  get entries(): RegistryEntry[] {
    return this.snapshot?.entries ?? [];
  }

  /** All server names. */
  get serverNames(): string[] {
    return this.snapshot?.entries.map((e) => e.name) ?? [];
  }

  /** Get a single entry by server name. */
  get(name: string): RegistryEntry | undefined {
    return this.snapshot?.entries.find((e) => e.name === name);
  }

  /** Find entries matching ANY of the given tags. */
  findByTags(tags: CapabilityTag[]): RegistryEntry[] {
    if (!tags.length) return this.entries;
    const tagSet = new Set(tags);
    return (this.snapshot?.entries ?? []).filter((e) =>
      e.tags.some((t) => tagSet.has(t)),
    );
  }

  /** Apply a TagFilter — returns entries matching allow tags, excluding deny tags. */
  applyFilter(filter: TagFilter): RegistryEntry[] {
    if (filter.mode === "allow") {
      return this.findByTags(filter.tags);
    }
    // deny mode: exclude entries with ANY of the deny tags
    const denySet = new Set(filter.tags);
    return this.entries.filter(
      (e) => !e.tags.some((t) => denySet.has(t)),
    );
  }

  /** Get the union of all unique capability tags across all entries. */
  get availableTags(): CapabilityTag[] {
    const set = new Set<CapabilityTag>();
    for (const e of this.entries) {
      for (const t of e.tags) set.add(t);
    }
    return Array.from(set);
  }

  /** Summary string for debugging. */
  summarize(): string {
    if (!this.snapshot)
      return "RegistryEngine: not initialized";
    const lines = [
      `RegistryEngine: ${this.entries.length} MCP servers`,
      `Available tags: ${this.availableTags.join(", ")}`,
    ];
    for (const e of this.entries) {
      lines.push(`  ${e.name} [${e.tags.join(", ")}] (${e.config.type})`);
    }
    return lines.join("\n");
  }
}

/** Singleton instance. */
export const registry = new RegistryEngine();

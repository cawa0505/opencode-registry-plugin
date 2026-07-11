/**
 * ProfileManager — loads, activates, and switches between scene profiles.
 *
 * Profiles are YAML files in the project or user config directory.
 * They define scenes (bugfix, feature, review, etc.) with custom
 * MCP tool selections and capability tag filters.
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { homedir } from "os";
import { join, resolve } from "path";
import { parse } from "yaml";
import type { CapabilityTag } from "../registry/types.js";
import type { FilterConfig } from "../dispatch/filter.js";
import type { McpProfile } from "./types.js";

/** Parse a profile YAML file into a plain object. */
function parseYaml(text: string): Record<string, unknown> {
  const result = parse(text);
  if (result && typeof result === "object") return result as Record<string, unknown>;
  return {};
}

// ── Profile directories ────────────────────────────────────────────────

function profileDirs(): string[] {
  const home = homedir();
  const cwd = process.cwd();
  return [
    join(home, ".config/opencode/profiles"),
    join(cwd, "profiles"),
    join(cwd, ".opencode/profiles"),
  ];
}

/** Scan profile directories for .yaml files. */
function discoverProfileFiles(): string[] {
  const files: string[] = [];
  for (const dir of profileDirs()) {
    if (!existsSync(dir)) continue;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isFile() && /\.ya?ml$/.test(e.name)) {
        files.push(join(dir, e.name));
      }
    }
  }
  return files;
}

/** Load a single profile from a file path. */
function loadProfileFromFile(filePath: string): McpProfile | null {
  try {
    const text = readFileSync(filePath, "utf-8");
    const parsed = parseYaml(text);
    if (!parsed || typeof parsed.name !== "string") return null;
    return parsed as unknown as McpProfile;
  } catch {
    return null;
  }
}

// ── Public API ──────────────────────────────────────────────────────────

export class ProfileManager {
  private profiles: Map<string, McpProfile> = new Map();
  private activeProfile: string | null = null;

  /** Scan and load all discovered profiles. */
  loadAll(): number {
    this.profiles.clear();
    const files = discoverProfileFiles();
    let loaded = 0;

    for (const file of files) {
      const profile = loadProfileFromFile(file);
      if (profile?.name) {
        this.profiles.set(profile.name, profile);
        loaded++;
      }
    }

    return loaded;
  }

  /** Get a profile by name. */
  get(name: string): McpProfile | undefined {
    return this.profiles.get(name);
  }

  /** List all loaded profile names. */
  list(): string[] {
    return Array.from(this.profiles.keys());
  }

  /** Activate a named profile. */
  activate(name: string): boolean {
    if (!this.profiles.has(name)) return false;
    this.activeProfile = name;
    return true;
  }

  /** Deactivate — returns to baseline. */
  deactivate(): void {
    this.activeProfile = null;
  }

  /** Get the currently active profile name. */
  get active(): string | null {
    return this.activeProfile;
  }

  /** Convert active profile to a FilterConfig if set. */
  toFilterConfig(): FilterConfig | null {
    if (!this.activeProfile) return null;
    const profile = this.profiles.get(this.activeProfile);
    if (!profile) return null;

    const tags = profile.tags;

    // Build from explicit server lists
    if (profile.servers?.include) {
      return {
        strategy: "explicit",
        includeServers: profile.servers.include,
        excludeServers: profile.servers.exclude,
      };
    }

    // Build from tags
    if (tags && tags.length > 0) {
      return {
        strategy: "tag-allow",
        tags,
        excludeServers: profile.servers?.exclude,
      };
    }

    return null;
  }
}

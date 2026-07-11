/**
 * ProfileManager — loads, activates, and switches between scene profiles.
 *
 * Profiles are YAML files in the project or user config directory.
 * They define scenes (bugfix, feature, review, etc.) with custom
 * MCP tool selections, capability tag filters, and priorities.
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { homedir } from "os";
import { join, resolve, extname } from "path";
import type { CapabilityTag } from "../registry/types.js";
import type { FilterConfig } from "../dispatch/filter.js";
import type { McpProfile, McpProfileManifest } from "./types.js";

/**
 * Minimal YAML parser — just enough for simple YAML profiles.
 * Avoids adding a dependency; only supports the subset needed.
 */
function parseSimpleYaml(text: string): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  const lines = text.split("\n");
  const stack: { key: string; indent: number; parent: Record<string, unknown> }[] = [];
  let current = obj;
  let currentIndent = 0;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s*#.*$/, ""); // strip comments
    if (!line.trim() || /^---/.test(line.trim())) continue;

    const indent = line.search(/\S/);
    const trimmed = line.trim();

    // Array items with -
    if (/^-\s/.test(trimmed)) {
      const val = trimmed.replace(/^-\s+/, "").replace(/^"|"$/g, "");
      if (!Array.isArray(current)) {
        // turn parent into array
        const parentKey = stack.length > 0 ? stack[stack.length - 1].key : "";
        if (parentKey && current !== obj) {
          const arr = [val];
          Object.assign(obj, { [parentKey]: arr });
          current = arr as unknown as Record<string, unknown>;
        }
      } else {
        (current as unknown as string[]).push(val);
      }
      continue;
    }

    // Key: value
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    let value: unknown = trimmed.slice(colonIdx + 1).trim();

    // Handle nested objects
    if (value === "" || value === "|") {
      value = {} as Record<string, unknown>;
    } else {
      // String or number
      if (/^\d+$/.test(value as string)) value = parseInt(value as string, 10);
      else if (value === "true") value = true;
      else if (value === "false") value = false;
      else {
        const sv = value as string;
        if ((sv.startsWith('"') && sv.endsWith('"')) || (sv.startsWith("'") && sv.endsWith("'"))) {
          value = sv.slice(1, -1);
        }
      }
    }

    // Navigate stack to right parent
    if (indent <= currentIndent) {
      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }
    }
    current = stack.length > 0 ? stack[stack.length - 1].parent : obj;
    currentIndent = indent;

    if (typeof value === "object") {
      (current as Record<string, unknown>)[key] = value;
      stack.push({ key, indent, parent: current });
      current = value as Record<string, unknown>;
    } else {
      (current as Record<string, unknown>)[key] = value;
    }
  }

  return obj;
}

/** Standard YAML parser (uses Node's built-in if available, else simple parser). */
function parseYaml(text: string): Record<string, unknown> {
  // Try native parse (Node 22+ has experimental YAML)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { parse } = require("yaml") as { parse: (s: string) => unknown };
    const result = parse(text);
    if (result && typeof result === "object") return result as Record<string, unknown>;
  } catch {
    // fall through to simple parser
  }
  return parseSimpleYaml(text);
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

    // Check if it's a manifest with a profiles array
    if (Array.isArray(parsed.profiles)) {
      const manifest = parsed as unknown as McpProfileManifest;
      return manifest.profiles[0] ?? null;
    }

    // Flat profile file
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

/**
 * AutoProfile — project-root `opencode.registry.json` support.
 *
 * Lets a project declare context-aware profile switching without
 * manual `/registry switch`. Pure functions only (no plugin state),
 * so middleware owns activation.
 *
 * Config resolution is two-level (project overrides global):
 *   1. Project:  <projectDir>/opencode.registry.json
 *   2. Global:   ~/.config/opencode/opencode.registry.json
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface AutoProfileRule {
  /** Match conditions (ALL must hold). */
  match: {
    /** Project path contains this substring (e.g. "migrations"). */
    pathContains?: string;
    /** Project contains a file with one of these extensions (e.g. ".py"). */
    fileTypes?: string[];
  };
  /** Profile name to activate when matched. */
  profile: string;
}

export interface RegistryConfig {
  $schema?: string;
  autoProfiles?: AutoProfileRule[];
  defaultProfile?: string;
}

/** Global config path: ~/.config/opencode/opencode.registry.json */
export function globalConfigPath(): string {
  return join(homedir(), ".config/opencode/opencode.registry.json");
}

/** Read and parse an `opencode.registry.json` at a specific dir (or null). */
export function loadRegistryConfig(dir: string): RegistryConfig | null {
  const p = join(dir, "opencode.registry.json");
  if (!existsSync(p)) return null;
  try {
    const raw = readFileSync(p, "utf-8");
    const parsed = JSON.parse(raw) as RegistryConfig;
    if (parsed && typeof parsed === "object") return parsed;
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve the effective config by merging global + project.
 * Project rules are prepended (project matches win) and
 * project `defaultProfile` overrides global.
 */
export function resolveRegistryConfig(projectDir: string): RegistryConfig | null {
  const global = loadRegistryConfig(homedir() + "/.config/opencode");
  const project = loadRegistryConfig(projectDir);

  if (!global && !project) return null;
  if (!global) return project;
  if (!project) return global;

  return {
    $schema: project.$schema ?? global.$schema,
    // project rules first → project matches take precedence
    autoProfiles: [...(project.autoProfiles ?? []), ...(global.autoProfiles ?? [])],
    defaultProfile: project.defaultProfile ?? global.defaultProfile,
  };
}

/**
 * Detect which profile (if any) matches the project at `dir`.
 * Returns the profile name, or null when nothing matches.
 */
export function detectProfile(dir: string): string | null {
  const cfg = resolveRegistryConfig(dir);
  if (!cfg?.autoProfiles?.length) return null;

  for (const rule of cfg.autoProfiles) {
    const m = rule.match ?? {};
    let ok = true;

    if (m.pathContains && !dir.includes(m.pathContains)) ok = false;

    if (ok && m.fileTypes?.length) {
      let found = false;
      try {
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
          if (e.isFile() && m.fileTypes.some((ext) => e.name.endsWith(ext))) {
            found = true;
            break;
          }
        }
      } catch {
        found = false;
      }
      if (!found) ok = false;
    }

    if (ok) return rule.profile;
  }

  return null;
}

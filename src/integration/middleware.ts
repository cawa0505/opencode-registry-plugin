/**
 * Integration middleware — bridges the registry plugin to OpenCode's
 * plugin hook system and omo-slim.
 */

import { registry } from "../registry/registry.js";
import { ProfileManager } from "../profile/manager.js";
import { dispatchIntent } from "../dispatch/intent.js";
import { resolveActiveServers } from "../dispatch/filter.js";
import type { FilterConfig } from "../dispatch/filter.js";
import type { CapabilityTag } from "../registry/types.js";
import { detectProfile } from "./autoprofile.js";

// ── Plugin lifecycle state ────────────────────────────────────────────

let initialized = false;
let debugEnabled = false;
let projectDir: string | undefined = undefined;

const profileManager = new ProfileManager();
let activeFilter: FilterConfig | undefined = undefined;

/** Plugin metadata exposed for the status dashboard. */
export interface PluginState {
  ready: boolean;
  registry: {
    entries: number;
    tags: string[];
  };
  profiles: {
    loaded: number;
    names: string[];
    active: string | null;
  };
  filter: {
    active: boolean;
    strategy: string;
    tags: string[];
  };
  debug: boolean;
}

// ── Initialization ────────────────────────────────────────────────────

/**
 * Initialize the plugin — scan registry + load profiles.
 * Called once at plugin load time.
 */
export function initializePlugin(debug = false, directory?: string): boolean {
  if (initialized) return true;
  debugEnabled = debug;
  if (directory) projectDir = directory;

  const regOk = registry.initialize(projectDir);
  if (debugEnabled) {
    console.error(`[McpRegistry] Registry init: ${regOk ? "OK" : "FAILED"}`);
    if (regOk) console.error(registry.summarize());
  }

  const profilesLoaded = profileManager.loadAll();
  if (debugEnabled) {
    console.error(`[McpRegistry] Profiles loaded: ${profilesLoaded}`);
  }

  initialized = true;

  // Set default baseline filter
  activeFilter = { strategy: "tag-allow", tags: ["read", "search", "code"] };

  return regOk;
}

/**
 * Process a chat turn — analyze intent and update active tools.
 *
 * @param inputText  The user's message text
 * @returns Modified tools list for this turn
 */
export function processChatTurn(inputText: string): string[] {
  if (!initialized) initializePlugin();

  // 1. Profile takes priority over auto-intent
  if (profileManager.active) {
    const profileFilter = profileManager.toFilterConfig();
    if (profileFilter) {
      activeFilter = profileFilter;
    }
  } else {
    // 2. Auto-dispatch based on intent
    activeFilter = dispatchIntent(inputText);
  }

  // 3. Resolve to server names
  const filter = activeFilter ?? { strategy: "tag-allow" as const, tags: [] };
  const activeServers = resolveActiveServers(filter);
  const serverNames = activeServers.map((e) => e.name);

  if (debugEnabled) {
    console.error(
      `[McpRegistry] Filter: ${filter.strategy} tags=[${filter.tags?.join(",") ?? ""}]`,
    );
    console.error(`[McpRegistry] Active MCPs: ${serverNames.join(", ") || "(none)"}`);
  }

  return serverNames;
}

/**
 * Switch to a named profile.
 */
export function switchProfile(name: string): boolean {
  const ok = profileManager.activate(name);
  if (debugEnabled) {
    console.error(`[McpRegistry] Profile switch "${name}": ${ok ? "OK" : "NOT FOUND"}`);
  }
  return ok;
}

/**
 * Deactivate profile — back to auto-intent mode.
 */
export function deactivateProfile(): void {
  profileManager.deactivate();
  if (debugEnabled) {
    console.error(`[McpRegistry] Profile deactivated, back to auto-intent`);
  }
}

/**
 * Try to auto-activate a project-level profile from opencode.registry.json.
 * Only applies when no manual profile is active (manual wins).
 * Returns the activated profile name, or null.
 */
export function tryAutoProfile(projectDir: string): string | null {
  if (profileManager.active) return null; // manual override
  const detected = detectProfile(projectDir);
  if (detected && profileManager.activate(detected)) {
    if (debugEnabled) {
      console.error(`[McpRegistry] Auto-profile activated: ${detected}`);
    }
    return detected;
  }
  return null;
}

/** Current allowed server names (from active profile or last intent). */
export function getActiveServers(): string[] {
  const filter = activeFilter ?? { strategy: "tag-allow" as const, tags: [] };
  return resolveActiveServers(filter).map((e) => e.name);
}

/** Active profile name, or null when in auto-intent mode. */
export function getActiveProfileName(): string | null {
  return profileManager.active;
}

/** Capability tags driving the current filter. */
export function getActiveIntentTags(): CapabilityTag[] {
  return activeFilter?.tags ?? [];
}

/** Get current plugin state for dashboard. */
export function getPluginState(): PluginState {
  return {
    ready: initialized && registry.ready,
    registry: {
      entries: registry.entries.length,
      tags: registry.availableTags,
    },
    profiles: {
      loaded: profileManager.list().length,
      names: profileManager.list(),
      active: profileManager.active,
    },
    filter: {
      active: activeFilter !== null,
      strategy: activeFilter?.strategy ?? "none",
      tags: activeFilter?.tags ?? [],
    },
    debug: debugEnabled,
  };
}

/**
 * @jimmyyen/opencode-registry-plugin — library barrel.
 *
 * The OpenCode plugin entry point is `plugins/registry.ts` (run by
 * Bun directly). This barrel re-exports the core engine for
 * programmatic use and node-based tests.
 */

export { registry, RegistryEngine } from "./registry/registry.js";
export type {
  CapabilityTag,
  RegistryEntry,
  McpConfigEntry,
  McpToolMetadata,
  TagFilter,
  RegistrySnapshot,
} from "./registry/types.js";

export { scanRegistry } from "./registry/scanner.js";

export { ProfileManager } from "./profile/manager.js";
export type { McpProfile, McpProfileServer, McpProfileManifest } from "./profile/types.js";

export {
  resolveActiveServers,
  buildToolOverride,
  type FilterConfig,
  type FilterStrategy,
} from "./dispatch/filter.js";
export { dispatchIntent } from "./dispatch/intent.js";

export {
  initializePlugin,
  processChatTurn,
  switchProfile,
  deactivateProfile,
  tryAutoProfile,
  getActiveServers,
  getActiveProfileName,
  getActiveIntentTags,
  getPluginState,
} from "./integration/middleware.js";
export type { PluginState } from "./integration/middleware.js";

export {
  buildSystemHint,
  rewriteToolDescription,
  parseServerFromToolID,
} from "./integration/adapter.js";
export { failOpen, writeDebugDump } from "./integration/safety.js";
export {
  detectProfile,
  resolveRegistryConfig,
  loadRegistryConfig,
  globalConfigPath,
  type RegistryConfig,
  type AutoProfileRule,
} from "./integration/autoprofile.js";

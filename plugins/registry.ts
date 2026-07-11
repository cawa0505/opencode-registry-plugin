/**
 * OpenCode plugin entry — @jimmyyen/opencode-registry-plugin
 *
 * Wires the registry engine to OpenCode's real plugin hooks:
 *   - experimental.chat.system.transform : inject active tool-scope hint
 *   - tool.definition                    : down-rank out-of-scope MCP tools
 *   - chat.message                      : capture intent + auto-profile
 *   - tool.execute.before/after        : observability (fail-open)
 *   - tool "registry"                  : /registry switch|reload|list|status
 *
 * Every hook is wrapped in failOpen(): a registry error never blocks
 * the provider request (S03 fail-open contract).
 */

import { tool, type Hooks, type PluginInput } from "@opencode-ai/plugin";
import { z } from "zod/v4";

import {
  initializePlugin,
  processChatTurn,
  switchProfile,
  deactivateProfile,
  tryAutoProfile,
  getPluginState,
  getActiveServers,
  getActiveProfileName,
  getActiveIntentTags,
} from "../src/integration/middleware.js";
import { buildSystemHint, rewriteToolDescription } from "../src/integration/adapter.js";
import { failOpen, writeDebugDump } from "../src/integration/safety.js";

export const RegistryPlugin = async (
  input: PluginInput,
): Promise<Hooks> => {
  const { directory } = input;
  const debug = !!process.env.MCP_REGISTRY_DEBUG;
  initializePlugin(debug);

  // ── /registry command family ──────────────────────────────────────
  const registryTool = tool({
    description:
      "MCP Registry control: switch profile, reload config, list profiles, or show status. " +
      "Usage: /registry <action> [profile]",
    args: {
      action: z
        .enum(["switch", "reload", "list", "status", "off"])
        .describe("switch=activate a profile; reload=rescan; list=profiles; status=state; off=deactivate"),
      profile: z.string().optional().describe("Profile name for switch/reload"),
    },
    execute: async (
      { action, profile },
      ctx,
    ): Promise<string> => {
      return (await failOpen(() => {
        switch (action) {
          case "switch": {
            if (!profile) return "registry: switch requires a profile name. Try /registry list.";
            const ok = switchProfile(profile);
            return ok
              ? `registry: activated profile "${profile}".`
              : `registry: profile "${profile}" not found. Try /registry list.`;
          }
          case "off": {
            deactivateProfile();
            return "registry: profile deactivated, back to auto-intent.";
          }
          case "reload": {
            initializePlugin(debug);
            if (profile) switchProfile(profile);
            else tryAutoProfile(directory);
            return "registry: reloaded. " + JSON.stringify(getPluginState().profiles);
          }
          case "list": {
            const names = getPluginState().profiles.names;
            return names.length
              ? `registry profiles: ${names.join(", ")}`
              : "registry: no profiles loaded.";
          }
          case "status":
          default: {
            const s = getPluginState();
            return [
              `ready=${s.ready}`,
              `active=${s.profiles.active ?? "auto-intent"}`,
              `servers=${s.registry.entries}`,
              `tags=[${s.filter.tags.join(",")}]`,
            ].join(" | ");
          }
        }
      }, "registry.tool")) ?? "registry: error";
    },
  });

  // ── Hooks ──────────────────────────────────────────────────────────

  return {
    tool: { registry: registryTool },

    /**
     * Capture user intent + auto-profile on each user message.
     * Does NOT modify the message — only updates internal filter state.
     */
    "chat.message": async (_input, output) => {
      await failOpen(async () => {
        // Auto-profile (only if no manual profile active)
        tryAutoProfile(directory);

        // Capture intent from user text
        const text = (output.parts ?? [])
          .filter((p: any) => p.type === "text" && p.text)
          .map((p: any) => p.text ?? "")
          .join("\n");
        if (text) processChatTurn(text);
      }, "chat.message");
    },

    /**
     * Inject the active tool-scope hint into the system prompt.
     */
    "experimental.chat.system.transform": async (_input, output) => {
      await failOpen(async () => {
        const hint = buildSystemHint(
          getActiveServers(),
          getActiveProfileName(),
          getActiveIntentTags(),
        );
        if (hint) output.system.push(hint);
      }, "system.transform");
    },

    /**
     * Down-rank out-of-scope MCP tools by rewriting their description.
     * Built-in tools (no "__" namespace) are never touched.
     */
    "tool.definition": async (input, output) => {
      await failOpen(async () => {
        const next = rewriteToolDescription(
          input.toolID,
          output.description,
          getActiveServers(),
          getActiveProfileName(),
        );
        if (next) output.description = next;
      }, "tool.definition");
    },

    /**
     * Observability: log which MCP tools fire (fail-open).
     */
    "tool.execute.before": async (input) => {
      await failOpen(async () => {
        const server = input.tool?.split("__")[0];
        if (debug) console.error(`[McpRegistry] tool.before: ${input.tool} (server=${server})`);
        writeDebugDump(input.sessionID ?? "global", getPluginState() as unknown as Record<string, unknown>);
      }, "tool.execute.before");
    },
  };
};

export default RegistryPlugin;

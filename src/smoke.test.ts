/**
 * Smoke test — end-to-end integration check.
 *
 * Verifies that all modules load, the registry scans the user's
 * actual opencode.json, and the plugin entry exports correctly.
 */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { registry } from "./registry/registry.js";
import { dispatchIntent } from "./dispatch/intent.js";
import { resolveActiveServers } from "./dispatch/filter.js";
import { initializePlugin, getPluginState } from "./integration/middleware.js";

describe("Smoke: full pipeline", () => {
  it("registry scans and produces entries with tags", () => {
    const ok = registry.initialize();
    if (!ok) {
      console.log("  ⚠ No opencode.json found — skipping");
      return;
    }
    assert.ok(registry.ready);
    assert.ok(registry.entries.length > 0);
    assert.ok(registry.availableTags.length > 0);
    console.log(`  MCP servers: ${registry.entries.length}`);
    console.log(`  Tags: ${registry.availableTags.join(", ")}`);
  });

  it("intent dispatch produces a valid filter config", () => {
    const filter = dispatchIntent("fix the login bug");
    assert.equal(filter.strategy, "tag-allow");
    assert.ok(filter.tags!.includes("debug"));
    assert.ok(filter.tags!.includes("code"));
    assert.ok(filter.tags!.includes("search"));
    assert.ok(filter.tags!.includes("read"));
  });

  it("filter resolves to active servers", () => {
    const ok = registry.initialize();
    if (!ok) return;

    const servers = resolveActiveServers({
      strategy: "tag-allow",
      tags: ["code", "search"],
    });
    assert.ok(servers.length > 0);
    console.log(`  Active servers [code+search]: ${servers.map((s) => s.name).join(", ")}`);
  });

  it("plugin initializes without error", () => {
    const ok = initializePlugin();
    assert.ok(ok);
    const state = getPluginState();
    assert.equal(state.ready, true);
    console.log(`  Registry entries: ${state.registry.entries}`);
    console.log(`  Tags: ${state.registry.tags.join(", ")}`);
  });

  it("library barrel exports the core API", async () => {
    const mod = await import("./index.js");
    assert.equal(typeof mod.registry, "object");
    assert.equal(typeof mod.ProfileManager, "function");
    assert.equal(typeof mod.dispatchIntent, "function");
    assert.equal(typeof mod.initializePlugin, "function");
    assert.equal(typeof mod.buildSystemHint, "function");
    assert.equal(typeof mod.rewriteToolDescription, "function");
  });
});

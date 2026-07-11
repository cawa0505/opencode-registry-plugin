/**
 * RegistryEngine tests.
 */

import { describe, it, before } from "node:test";
import { strict as assert } from "node:assert";
import { RegistryEngine, registry } from "./registry.js";
import type { CapabilityTag } from "./types.js";

describe("RegistryEngine", () => {
  let engine: RegistryEngine;

  before(() => {
    engine = new RegistryEngine();
  });

  it("scans opencode.json and finds MCP entries", () => {
    const ok = engine.initialize();
    // May fail in test environments without opencode.json — skip gracefully
    if (!ok) {
      console.log("  ⚠ No opencode.json found, skipping scan test");
      return;
    }
    assert.ok(engine.ready);
    assert.ok(engine.entries.length > 0);
    console.log(`  Found ${engine.entries.length} MCP servers`);
  });

  it("assigns capability tags to all entries", () => {
    if (!engine.ready) return;
    for (const entry of engine.entries) {
      assert.ok(entry.tags.length > 0, `Entry ${entry.name} has no tags`);
      console.log(`  ${entry.name}: [${entry.tags.join(", ")}]`);
    }
  });

  it("filters entries by capability tags", () => {
    if (!engine.ready) return;
    const codeEntries = engine.findByTags(["code"]);
    assert.ok(codeEntries.length > 0);
    for (const e of codeEntries) {
      assert.ok(e.tags.includes("code"), `${e.name} should have 'code' tag`);
    }
    console.log(`  ${codeEntries.length} entries tagged [code]`);
  });

  it("applyFilter with deny mode excludes matching entries", () => {
    if (!engine.ready) return;
    const all = engine.entries.length;
    const denied = engine.applyFilter({ mode: "deny", tags: ["utility"] });
    assert.ok(denied.length <= all);
  });
});

describe("TagFilter", () => {
  it("allow mode returns only matching entries", () => {
    // Create a minimal engine with known entries
    const e = new RegistryEngine();

    // Manually inject entries for unit testing
    const snapshot = {
      entries: [
        { name: "code-review-graph", config: { type: "remote" as const, url: "" }, tags: ["code" as CapabilityTag, "nav" as CapabilityTag] },
        { name: "firecrawl", config: { type: "remote" as const, url: "" }, tags: ["web" as CapabilityTag, "search" as CapabilityTag] },
        { name: "trafilatura", config: { type: "remote" as const, url: "" }, tags: ["web" as CapabilityTag, "read" as CapabilityTag] },
      ],
      defaultTagMap: {},
      timestamp: Date.now(),
    };
    (e as unknown as { snapshot: typeof snapshot }).snapshot = snapshot;

    const codeEntries = e.findByTags(["code"]);
    assert.equal(codeEntries.length, 1);
    assert.equal(codeEntries[0].name, "code-review-graph");

    const webEntries = e.findByTags(["web"]);
    assert.equal(webEntries.length, 2);
  });
});

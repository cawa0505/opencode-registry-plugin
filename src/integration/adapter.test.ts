/**
 * Tests for integration/adapter.ts — pure scoping helpers.
 */
import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import {
  parseServerFromToolID,
  rewriteToolDescription,
  buildSystemHint,
} from "./adapter.js";

describe("parseServerFromToolID", () => {
  it("parses mcp__server__tool", () => {
    assert.equal(parseServerFromToolID("mcp__code-review-graph__query"), "code-review-graph");
  });
  it("parses server__tool", () => {
    assert.equal(parseServerFromToolID("firecrawl__scrape"), "firecrawl");
  });
  it("returns null for built-in tools", () => {
    assert.equal(parseServerFromToolID("read"), null);
    assert.equal(parseServerFromToolID("bash"), null);
  });
});

describe("rewriteToolDescription", () => {
  const allowed = ["code-review-graph", "code-rag"];
  it("returns null for in-scope MCP tools", () => {
    assert.equal(
      rewriteToolDescription("mcp__code-review-graph__query", "does x", allowed, "bugfix"),
      null,
    );
  });
  it("returns null for built-in tools", () => {
    assert.equal(rewriteToolDescription("read", "reads files", allowed, "bugfix"), null);
  });
  it("tags out-of-scope MCP tools", () => {
    const out = rewriteToolDescription("mcp__firecrawl__scrape", "scrapes", allowed, "bugfix");
    assert.ok(out !== null);
    assert.match(out!, /\[registry: out-of-scope for "bugfix"\]/);
  });
  it("is idempotent when already tagged", () => {
    const tagged = '[registry: out-of-scope for "bugfix"] x';
    assert.equal(rewriteToolDescription("mcp__firecrawl__scrape", tagged, allowed, "bugfix"), null);
  });
});

describe("buildSystemHint", () => {
  it("returns null when no servers", () => {
    assert.equal(buildSystemHint([], null, []), null);
  });
  it("mentions active profile and servers", () => {
    const hint = buildSystemHint(["code-review-graph", "code-rag"], "bugfix", []);
    assert.ok(hint!.includes('profile "bugfix"'));
    assert.ok(hint!.includes("code-review-graph"));
  });
  it("falls back to intent tags when no profile", () => {
    const hint = buildSystemHint(["code-rag"], null, ["debug", "code"]);
    assert.ok(hint!.includes("[debug, code]"));
  });
});

/**
 * IntentDispatcher tests.
 */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { dispatchIntent } from "./intent.js";

describe("IntentDispatcher", () => {
  it("detects bug-fix intent and includes debug tags", () => {
    const filter = dispatchIntent("fix the bug in auth middleware");
    assert.ok(filter.tags!.includes("debug"));
    assert.ok(filter.tags!.includes("search"));
    assert.ok(filter.tags!.includes("read"));
  });

  it("detects code review intent", () => {
    const filter = dispatchIntent("review the PR changes");
    assert.ok(filter.tags!.includes("code"));
    assert.ok(filter.tags!.includes("read"));
  });

  it("detects web research intent", () => {
    const filter = dispatchIntent("fetch the latest docs from the web");
    assert.ok(filter.tags!.includes("web"));
  });

  it("always includes baseline tags (read, search)", () => {
    const filter = dispatchIntent("hello world");
    assert.ok(filter.tags!.includes("read"));
    assert.ok(filter.tags!.includes("search"));
  });

  it("detects implementation intent", () => {
    const filter = dispatchIntent("implement a new user registration endpoint");
    assert.ok(filter.tags!.includes("write"));
    assert.ok(filter.tags!.includes("code"));
  });
});

/**
 * Tests for integration/safety.ts — fail-open wrapper + debug dump.
 */
import { describe, it, mock } from "node:test";
import { strict as assert } from "node:assert";
import { failOpen, writeDebugDump } from "./safety.js";
import * as fs from "fs";

describe("failOpen", () => {
  it("returns the value on success", async () => {
    const out = await failOpen(() => 42, "t");
    assert.equal(out, 42);
  });

  it("returns undefined (not throw) when fn throws", async () => {
    const errSpy = mock.method(console, "error", () => {});
    try {
      const out = await failOpen(() => {
        throw new Error("boom");
      }, "t");
      assert.equal(out, undefined);
    } finally {
      errSpy.mock.restore();
    }
  });

  it("logs the error to stderr", async () => {
    const errSpy = mock.method(console, "error", () => {});
    try {
      await failOpen(() => {
        throw new Error("boom");
      }, "t");
      assert.ok(errSpy.mock.calls.length >= 1);
      assert.match(String(errSpy.mock.calls[0].arguments[1]), /boom/);
    } finally {
      errSpy.mock.restore();
    }
  });
});

describe("writeDebugDump", () => {
  it("writes parseable JSON to /tmp", () => {
    const file = "/tmp/opencode-registry-sess-1.json";
    if (fs.existsSync(file)) fs.rmSync(file);
    writeDebugDump("sess-1", { active: "bugfix", servers: ["a", "b"] });
    const raw = fs.readFileSync(file, "utf8");
    const parsed = JSON.parse(raw);
    assert.equal(parsed.active, "bugfix");
    assert.deepEqual(parsed.servers, ["a", "b"]);
    assert.ok(typeof parsed.ts === "number");
    fs.rmSync(file);
  });
});

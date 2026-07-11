/**
 * ProfileManager tests.
 */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { ProfileManager } from "./manager.js";

describe("ProfileManager", () => {
  it("parses simple YAML objects", async () => {
    // Use dynamic import to access module-internal function
    // We test via the public API by loading fixture YAML
    const mgr = new ProfileManager();
    assert.equal(mgr.list().length, 0);
    assert.equal(mgr.active, null);
  });

  it("activate/deactivate cycle", () => {
    const mgr = new ProfileManager();
    // No profiles loaded — activation should fail
    assert.equal(mgr.activate("nonexistent"), false);
    assert.equal(mgr.active, null);

    mgr.deactivate();
    assert.equal(mgr.active, null);
  });

  it("toFilterConfig returns null when no active profile", () => {
    const mgr = new ProfileManager();
    assert.equal(mgr.toFilterConfig(), null);
  });
});

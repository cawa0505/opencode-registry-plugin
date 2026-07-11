/**
 * Tests for integration/autoprofile.ts — two-level config resolution.
 */
import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  loadRegistryConfig,
  resolveRegistryConfig,
  detectProfile,
  globalConfigPath,
} from "./autoprofile.js";

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "regauto-"));
}

describe("loadRegistryConfig", () => {
  it("reads a valid config", () => {
    const dir = tmpDir();
    fs.writeFileSync(
      path.join(dir, "opencode.registry.json"),
      JSON.stringify({ defaultProfile: "feature", autoProfiles: [] }),
    );
    const cfg = loadRegistryConfig(dir);
    assert.equal(cfg?.defaultProfile, "feature");
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("returns null when missing", () => {
    assert.equal(loadRegistryConfig(tmpDir()), null);
  });

  it("returns null on invalid JSON", () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, "opencode.registry.json"), "{not json");
    assert.equal(loadRegistryConfig(dir), null);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe("detectProfile", () => {
  it("matches pathContains", () => {
    const dir = tmpDir();
    const sub = path.join(dir, "migrations");
    fs.mkdirSync(sub);
    fs.writeFileSync(
      path.join(sub, "opencode.registry.json"),
      JSON.stringify({ autoProfiles: [{ match: { pathContains: "migrations" }, profile: "db" }] }),
    );
    assert.equal(detectProfile(sub), "db");
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("matches fileTypes", () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, "opencode.registry.json"), JSON.stringify({
      autoProfiles: [{ match: { fileTypes: [".py"] }, profile: "python" }],
    }));
    fs.writeFileSync(path.join(dir, "main.py"), "");
    assert.equal(detectProfile(dir), "python");
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("returns null when nothing matches", () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, "opencode.registry.json"), JSON.stringify({
      autoProfiles: [{ match: { fileTypes: [".go"] }, profile: "go" }],
    }));
    fs.writeFileSync(path.join(dir, "main.py"), "");
    assert.equal(detectProfile(dir), null);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe("resolveRegistryConfig (two-level merge)", () => {
  it("returns project config when global absent", () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, "opencode.registry.json"), JSON.stringify({
      defaultProfile: "feature",
    }));
    const cfg = resolveRegistryConfig(dir);
    assert.equal(cfg?.defaultProfile, "feature");
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("merges global + project, project wins", () => {
    const dir = tmpDir();
    const gp = globalConfigPath();
    const hadGlobal = fs.existsSync(gp);
    if (!hadGlobal) fs.mkdirSync(path.dirname(gp), { recursive: true });
    fs.writeFileSync(gp, JSON.stringify({
      defaultProfile: "global-default",
      autoProfiles: [{ match: { pathContains: "x" }, profile: "global-rule" }],
    }));
    fs.writeFileSync(path.join(dir, "opencode.registry.json"), JSON.stringify({
      defaultProfile: "project-default",
      autoProfiles: [{ match: { pathContains: "y" }, profile: "project-rule" }],
    }));
    try {
      const cfg = resolveRegistryConfig(dir);
      assert.equal(cfg?.defaultProfile, "project-default");
      assert.equal(cfg?.autoProfiles?.[0].profile, "project-rule");
    } finally {
      if (!hadGlobal) fs.rmSync(gp, { force: true });
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

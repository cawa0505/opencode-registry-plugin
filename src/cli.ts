#!/usr/bin/env node
/**
 * CLI entry point for registry management commands.
 *
 * Usage:
 *   registry scan              — Scan and print MCP registry summary
 *   registry list              — List all profiles
 *   registry status            — Show current plugin state
 *   registry tags              — Show available capability tags
 *
 * When installed globally or linked, `registry` becomes available
 * as a shell command. For now, run via:
 *   npx tsx src/cli.ts scan
 */

import { registry } from "./registry/registry.js";
import { ProfileManager } from "./profile/manager.js";
import { getPluginState } from "./integration/middleware.js";

const cmd = process.argv[2];
const args = process.argv.slice(3);

function help(): void {
  console.log(`
Usage:
  registry scan              — Scan MCP config and show capability-map
  registry list              — List all loaded profiles
  registry status            — Show current plugin state
  registry tags              — Show available capability tags
  registry help              — Show this help
`);
}

async function main(): Promise<void> {
  switch (cmd) {
    case "scan": {
      registry.initialize();
      if (!registry.ready) {
        console.log("No opencode.json found.");
        process.exit(1);
      }
      console.log(registry.summarize());
      break;
    }
    case "list": {
      const mgr = new ProfileManager();
      const n = mgr.loadAll();
      console.log(`Profiles loaded: ${n}`);
      for (const name of mgr.list()) {
        const marker = name === mgr.active ? " *" : "  ";
        console.log(`  ${marker}${name}`);
      }
      break;
    }
    case "status": {
      const state = getPluginState();
      console.log(JSON.stringify(state, null, 2));
      break;
    }
    case "tags": {
      registry.initialize();
      console.log("Available capability tags:", registry.availableTags.join(", "));
      break;
    }
    case "help":
    default:
      help();
      break;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

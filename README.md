# @jimmyyen/opencode-registry-plugin

Intent-driven MCP resource scheduling for [OpenCode](https://github.com/opencode-ai/opencode).

Scans your MCP servers, tags them by capability, and — per active profile or
detected intent — steers the model toward the relevant tools and away from
the noise. Goal: fewer irrelevant tools in context, lower token waste, sharper
tool use on big projects.

> **How it works (and its limit).** OpenCode has no hook that can *delete*
> MCP tools at request time. This plugin uses the real, supported hooks:
> - `experimental.chat.system.transform` — injects a short note naming the
>   active scope and in-scope MCP servers.
> - `tool.definition` — down-ranks out-of-scope MCP tools by rewriting
>   their description (soft-gating: the model is steered, not blocked).
> - `chat.message` — captures user intent + applies auto-profile.
> - `tool` — the `registry` tool; slash command `/x-dispatch` (see Commands).
>
> Every hook is wrapped in **fail-open**: a registry error never blocks the
> provider request.

## Install

```bash
npm i -g @jimmyyen/opencode-registry-plugin
```

Then add to your `opencode.json`:

```json
{
  "plugins": ["@jimmyyen/opencode-registry-plugin"]
}
```

## Config

### Profiles (YAML)

Define scenes as YAML. Loaded from both global and project dirs:

- `~/.config/opencode/profiles/*.yaml`
- `<project>/.opencode/profiles/*.yaml` or `<project>/profiles/*.yaml`

```yaml
# profiles/bugfix.yaml
name: bugfix
description: Fix bugs — code, search, read, debug only
includeTags: [code, search, read, debug]
excludeTags: [web, db, doc]
```

### Project auto-switch — `opencode.registry.json`

Drop one in your project root (or `~/.config/opencode/opencode.registry.json`
for a global default). Project overrides global.

```json
{
  "defaultProfile": "feature",
  "autoProfiles": [
    { "match": { "pathContains": "migrations" }, "profile": "db" },
    { "match": { "fileTypes": [".py"] }, "profile": "python" }
  ]
}
```

## Commands

The plugin exposes a `registry` tool and registers a **`/x-dispatch`** slash
command via the plugin's `config` hook (the same working pattern as the
speak-human-tw reference plugin). If your opencode version doesn't pick up
the hook-registered command, drop `examples/x-dispatch.md` into
`~/.config/opencode/commands/` as a fallback (see below).

| Command | Effect |
|---|---|
| `/x-dispatch list` | List loaded profiles |
| `/x-dispatch status` | Show active scope, servers, tags |
| `/x-dispatch switch <name>` | Activate a profile |
| `/x-dispatch off` | Deactivate; fall back to auto-intent |
| `/x-dispatch reload` | Re-scan registry + profiles |

### Slash command setup (fallback)

OpenCode loads slash commands from a `commands/` directory (project
`.opencode/commands/` or global `~/.config/opencode/commands/`) or a
`command` entry in `opencode.json`. A plugin package's own
`.opencode/commands/` is **not** scanned when installed elsewhere, so the
hook-registered `/x-dispatch` is the primary path; the markdown below is a
manual fallback.

Create `~/.config/opencode/commands/x-dispatch.md` with this content (also at
`examples/x-dispatch.md` in the repo):

```markdown
---
description: Tool dispatch — switch/reload/list/status/off tool profiles
---

Use the `registry` tool to manage tool scoping and dispatch profiles. Parse the request below and call the tool with action (switch|reload|list|status|off) and profile if needed.
```

Restart opencode; `/x-dispatch` appears in the palette and routes to the
`registry` tool.

Set `MCP_REGISTRY_DEBUG=1` to write a debug snapshot to
`/tmp/opencode-registry-<session>.json`.

## License

MIT

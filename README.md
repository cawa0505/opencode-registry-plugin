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
> - `tool` — the `/registry` command family.
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

| Command | Effect |
|---|---|
| `/registry list` | List loaded profiles |
| `/registry status` | Show active scope, servers, tags |
| `/registry switch <name>` | Activate a profile |
| `/registry off` | Deactivate; fall back to auto-intent |
| `/registry reload` | Re-scan registry + profiles |

Set `MCP_REGISTRY_DEBUG=1` to write a debug snapshot to
`/tmp/opencode-registry-<session>.json`.

## License

MIT

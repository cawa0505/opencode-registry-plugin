# @jimmyyen/opencode-registry-plugin

**Attention management for [OpenCode](https://github.com/opencode-ai/opencode) MCP tools.**

Scans your MCP servers, tags them by capability, and — per active profile or
detected intent — *soft-steers* the model toward the relevant tools and away
from the noise. The goal is to cut **tool-use hallucination**: the model picking
the wrong tool, or freezing up, because it's staring at a wall of unrelated MCP
tools every single turn.

> **⚠️ Unstable / experimental.** Early, and the slash-command registration
> path is still being ironed out. Don't rely on it in production yet — see
> [Commands](#commands).

> **What it does — and its hard limit.** OpenCode has no hook that can *delete*
> MCP tools at request time, so this plugin does **not** remove tools. It uses
> the real, supported hooks to *steer attention*:
> - `experimental.chat.system.transform` — injects a short note naming the
>   active scope and the in-scope MCP servers.
> - `tool.definition` — down-ranks out-of-scope MCP tools by rewriting their
>   description (soft-gating: the model is steered, not blocked).
> - `chat.message` — captures user intent and applies the auto-profile.
> - `tool` — the `registry` tool; slash command `/registry` (see Commands).
>
> Every hook is wrapped in **fail-open**: a registry error never blocks the
> provider request.

## Install

```bash
npm install @jimmyyen/opencode-registry-plugin
# or
bun add @jimmyyen/opencode-registry-plugin
```

Then register it in your `opencode.json` (see
[`example/opencode.json`](example/opencode.json)):

```json
{
  "plugin": [
    "@jimmyyen/opencode-registry-plugin"
  ]
}
```

## Config

- **[Profiles](docs/profiles.md)** — scene presets (YAML) that soft-steer tool
  scope via capability tags. Shipped examples in
  [`example/profiles/`](example/profiles/).
- **[Auto-profile](docs/auto-profile.md)** — auto-activate a profile per project
  via `opencode.registry.json`. Example in
  [`example/opencode.registry.json`](example/opencode.registry.json).

## Examples

Ready-to-copy examples live in [`example/`](example/):

| File | What it shows |
|------|---------------|
| `example/profiles/*.yaml` | `bugfix` / `feature` / `review` / `db` profile presets |
| `example/opencode.registry.json` | auto-profile by path / file type |
| `example/opencode.json` | plugin registration snippet |

## Commands

- **`/registry` tool** (in-session): `switch <profile>`, `deactivate`, `status`,
  `list`, `tags`. Switching here actually changes live plugin state.
- **Standalone CLI** (`registry scan | list | status | tags`): read-only
  diagnostics. The old `registry switch` subcommand was removed — the CLI runs
  in a separate process and can't reach the live plugin state, so it was dead
  code that only pretended to switch.

## License

MIT

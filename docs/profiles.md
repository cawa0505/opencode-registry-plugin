# Profiles

Profiles are scene presets that soft-steer the model toward the right tools.
They live in `profiles/*.yaml` — searched in this order: project `profiles/`,
`.opencode/profiles/`, then `~/.config/opencode/profiles/`. Every `.yaml` found
is loaded; activate one by name.

Shipped examples: [`example/profiles/`](../example/profiles/)
(`bugfix`, `feature`, `review`, `db`). Copy, edit, or write your own.

## Schema

```yaml
name: bugfix                      # required — profile id for /registry switch
description: "..."                # shown in /registry list / status
tags:                             # capability tags this profile steers toward
  - code
  - search
servers:
  include:                        # explicit allow-list (overrides tags); optional
    - code-review-graph
  exclude:                        # server names to down-rank; optional
    - media
```

- **`name`** — profile id. Activate with `/registry switch <name>`.
- **`description`** — human label, surfaced in `/registry list` / `status`.
- **`tags`** — capability tags the profile targets. Resolved to in-scope MCP
  servers; the model is steered toward them (see tag table below).
- **`servers.include`** — hard allow-list of server names. When set, *only*
  these stay in scope and `tags` is ignored. Use for precise control.
- **`servers.exclude`** — server names to down-rank regardless of tags. Use to
  keep noisy or expensive servers out of the model's focus.

## Capability tags

| Tag | Meaning |
|-----|---------|
| `code` | code intelligence (AST, symbols, references) |
| `search` | semantic / vector search over code |
| `read` | file & document reading |
| `web` | web fetch / scrape |
| `nav` | repo navigation & impact / blast-radius |
| `write` | file mutation / editing |
| `debug` | debugging & diagnostics |
| `media` | image / media handling |
| `utility` | misc helpers |

Run `registry tags` (or `/registry tags`) to see what's available in your setup.

## Shipped examples

- **`bugfix`** — debugging & code analysis. Targets `code`/`search`/`read`/
  `debug`/`web`; down-ranks `media` & `utility` so the model doesn't wander into
  image or helper tools mid-debug.
- **`feature`** — building new features. Full toolset (`code`/`search`/`read`/
  `write`/`web`/`nav`), no exclusions — everything on hand.
- **`review`** — code review & architecture. Read-only + navigation
  (`code`/`search`/`read`/`nav`); excludes `write`/`web`/`media`/`utility` so the
  model analyzes without editing or fetching.
- **`db`** — focused code-search session. `servers.include` hard-limits scope to
  a single server (`code-rag`), ignoring `tags` — shows the allow-list pattern.

## Activating a profile

- **In-session:** `/registry switch bugfix` — changes live plugin state for the
  current session.
- **Auto (per project):** drop an `opencode.registry.json` (see
  [Auto-profile](auto-profile.md)) to activate by path or file type, no manual
  switch needed.

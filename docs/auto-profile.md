# Auto-profile

Auto-profile activates a profile automatically from the project context (current
directory or edited file type), so you never switch manually.

Configure it with an `opencode.registry.json` in your project root or
`~/.config/opencode/`. Example: [`example/opencode.registry.json`](../example/opencode.registry.json).

## Schema

```json
{
  "defaultProfile": "feature",
  "autoProfiles": [
    { "match": { "pathContains": "migrations" }, "profile": "db" },
    { "match": { "fileTypes": [".ts", ".tsx"] }, "profile": "feature" }
  ]
}
```

- **`defaultProfile`** — profile used when no `autoProfiles` rule matches.
- **`autoProfiles`** — ordered list of rules; the first matching rule wins.
  - **`match.pathContains`** — substring matched against the project/path.
  - **`match.fileTypes`** — list of file extensions, e.g. `[".py"]`.
  - **`profile`** — name of the profile to activate.

## How it applies

On each chat turn the plugin receives the `directory` OpenCode passes in and
evaluates the rules top-down. The first match activates that profile; otherwise
`defaultProfile` is used. Project config wins over global. This runs every turn,
so switching projects (or file types) re-steers automatically — no more guessing
where the project root is.

> An explicitly activated profile (via `/registry switch`) overrides auto-profile
> until deactivated.

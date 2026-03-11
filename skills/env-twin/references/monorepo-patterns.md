# Monorepo Environment Patterns with env-twin

This guide covers common patterns for managing environment variables in JavaScript/TypeScript monorepos using `env-twin`.

## Goals

- Keep environment files **consistent** across apps and packages.
- Avoid leaking **secrets** into version control.
- Make it easy for **new developers** to get started.
- Support **CI/CD** and deployment workflows cleanly.

## Recommended Folder Layouts

### 1. Per-app Env Files (Recommended)

```text
monorepo-root/
├── apps/
│   ├── web/
│   │   ├── .env
│   │   └── .env.example
│   └── api/
│       ├── .env
│       └── .env.example
├── packages/
│   └── shared/
│       └── .env.example
└── package.json
```

**Characteristics:**
- Each app (`web`, `api`, etc.) owns its own `.env` and `.env.example`.
- Shared libraries (`packages/shared`) generally only need `.env.example` for documenting expectations.
- `env-twin` runs in each app’s directory to sync `.env` → `.env.example`.

**Pros:**
- Clear ownership of variables per app.
- Easier per-app deployment configuration.
- Minimal coupling between apps.

**Cons:**
- Some duplication of variable names across apps.

### 2. Root-level Shared Variables

```text
monorepo-root/
├── .env
├── .env.example
├── apps/
│   ├── web/
│   │   ├── .env
│   │   └── .env.example
│   └── api/
│       ├── .env
│       └── .env.example
└── package.json
```

**Use when:**
- You have many **global** variables (e.g. `LOG_LEVEL`, `SENTRY_DSN`, `GLOBAL_API_URL`).
- You want a single place to document organization-wide env requirements.

**Pattern:**
- Use root `.env` / `.env.example` for **global** variables.
- Use per-app `.env` / `.env.example` for **app-specific** variables.
- In CI or dev scripts, you can load both root and app env files if needed.

### 3. Hybrid Pattern

Combine the two:

- Root: baseline global envs.
- Apps: extend/override with app-specific envs.

Example:

```text
monorepo-root/
├── .env                       # Global defaults for all apps
├── .env.example
├── apps/
│   ├── web/
│   │   ├── .env               # Specific to web
│   │   └── .env.example
│   └── api/
│       ├── .env               # Specific to api
│       └── .env.example
└── package.json
```

You can then:

- Run `env-twin` at root to sync `.env` → `.env.example`.
- Run `env-twin` in each app to sync app-specific envs.

## Turborepo Integration

Turborepo encourages per-app scripts. Example root `package.json`:

```json
{
  "scripts": {
    "env:sync": "npm run env:sync:root && npm run env:sync:apps",
    "env:sync:root": "env-twin sync",
    "env:sync:apps": "npm run env:sync:web && npm run env:sync:api",
    "env:sync:web": "cd apps/web && env-twin sync",
    "env:sync:api": "cd apps/api && env-twin sync",
    "env:sync:all": "turbo run env:sync"
  }
}
```

Within `apps/web/package.json`:

```json
{
  "scripts": {
    "env:sync": "env-twin sync --source .env --dest .env.example"
  }
}
```

**Tips:**
- Add `env:sync` to `dev` or `build` pipelines (`"dev": "env-twin sync && next dev"`).
- Use `turbo run env:sync` to run all app syncs in parallel.

## Nx Integration

Nx encourages project-level configuration:

1. Define targets in `project.json` or `workspace.json`:

```json
{
  "targets": {
    "env-sync": {
      "executor": "nx:run-commands",
      "options": {
        "command": "env-twin sync"
      }
    }
  }
}
```

2. Run for a single app:

```bash
npx nx run web:env-sync
```

3. Run across multiple projects:

```bash
npx nx run-many --target=env-sync --all
```

## pnpm Workspaces

With `pnpm`, you can use recursive commands:

```bash
pnpm -r run env:sync
```

Where each workspace `package.json` defines:

```json
{
  "scripts": {
    "env:sync": "env-twin sync"
  }
}
```

## Best Practices for Monorepos

- **Document ownership**: For each env variable, note which app/package owns it.
- **Avoid divergence**: Use `env-twin` regularly in CI to prevent drift between `.env` and `.env.example`.
- **Keep examples clean**: Never commit real secrets. Let `env-twin` sanitize into `input_<VARIABLE>` placeholders.
- **Automate**: Add env sync to dev, build, or pre-commit hooks to keep the repo reliable.


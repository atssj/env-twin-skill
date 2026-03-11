# Single Repo Setup with env-twin

This guide walks through setting up `env-twin` in a single repository, from initial configuration to team onboarding and migration from manual `.env.example` maintenance.

## Initial Project Setup

### 1. Create Base Env Files

From your project root:

```bash
touch .env
touch .env.example
```

Update `.gitignore`:

```gitignore
.env
.env.local
.env.*.local
!.env.example
.env-backup-*
```

### 2. Install env-twin

```bash
npm install --save-dev env-twin
# or
yarn add -D env-twin
# or
pnpm add -D env-twin
```

### 3. Add Scripts

In `package.json`:

```json
{
  "scripts": {
    "env:sync": "env-twin sync",
    "env:restore": "env-twin restore",
    "env:clean": "env-twin clean-backups --keep 5",
    "dev": "env-twin sync && next dev",
    "build": "env-twin sync --no-backup && next build"
  }
}
```

## Environment File Organization

Recommended layout:

```text
project-root/
├── .env                    # Main secrets (gitignored)
├── .env.example            # Template with placeholders (committed)
├── .env.local              # Local overrides (gitignored)
├── .env.development        # Dev-specific vars (optional)
├── .env.test               # Test env (optional)
└── .env.staging            # Staging env (optional)
```

**Guidelines:**
- `.env`: local production-like values; never committed.
- `.env.example`: key list and example placeholders (`input_<NAME>`); committed.
- `.env.local`: machine-specific overrides.
- `.env.development` / `.env.test` / `.env.staging`: environment-specific configuration.

## Team Onboarding Workflow

When a new developer joins:

1. **Clone the repo**.
2. **Copy `.env.example` to `.env`**:

   ```bash
   cp .env.example .env
   ```

3. **Fill in real values** for each `input_<VARIABLE>` placeholder.
4. **Run sync** to ensure keys are up to date:

   ```bash
   npm run env:sync
   ```

5. **Start the dev server**:

   ```bash
   npm run dev
   ```

As new variables are added by the team:

- Update `.env` with new keys.
- Run `npm run env:sync`.
- Commit only `.env.example`.

## Migration from Manual .env.example Maintenance

If you currently maintain `.env.example` by hand:

1. **Back up existing files**:

   ```bash
   cp .env .env.bak || true
   cp .env.example .env.example.bak || true
   ```

2. **Ensure `.env` is the source of truth**:
   - Add any missing keys that exist only in `.env.example`.
   - Remove obviously obsolete keys if desired.

3. **Run env-twin sync**:

   ```bash
   npx env-twin sync
   ```

   This will:
   - Ensure `.env.example` has **all keys** that `.env` has.
   - Replace sensitive values with `input_<VARIABLE>` placeholders.

4. **Review the diff** for `.env.example`:
   - Adjust placeholder strings if you want clearer hints for teammates.

5. **Commit only `.env.example`** and update `.gitignore` if needed.

## Daily Developer Workflow

- **Adding a variable**:
  1. Add it to `.env`.
  2. Run `npm run env:sync`.
  3. Commit `.env.example`.

- **Removing a variable**:
  - Option A: Keep it in `.env` and `.env.example` until it’s safe to remove everywhere.
  - Option B: Remove from both and ensure no references remain in code.

- **Switching branches**:
  - When switching to a branch that changes env keys, run `npm run env:sync` again to keep `.env.example` synced.

## Troubleshooting and Tips

- **"No source file found"**:

  ```bash
  touch .env
  npx env-twin sync
  ```

- **Backups taking too much space**:

  ```bash
  npx env-twin clean-backups --keep 5
  ```

- **Ensure CI uses sanitized files**:
  - CI should never depend on your local `.env`.
  - Use `.env.example` as a contract and feed real secrets through your CI’s secret store.

## Summary

Using `env-twin` in a single repo:

- Eliminates manual `.env.example` maintenance.
- Keeps sensitive values out of the repository.
- Provides a repeatable, documented onboarding path for new developers.


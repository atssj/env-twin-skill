---
name: env-twin
version: 1.0.0
description: Complete guide for managing environment variables with env-twin across single repo and monorepo projects
author: atssj
tags: [env-twin, environment-variables, monorepo, configuration-management, devops]
---

# env-twin Environment Management

## Overview
env-twin is a CLI tool that synchronizes environment variable keys across all .env* files while sanitizing sensitive data in .env.example files.

## Core Philosophy
- **Non-destructive**: Only adds missing keys, never overwrites existing values.
- **Union approach**: Preserves all existing values, fills gaps with empty values.
- **Automatic sanitization**: Replaces real values with `input_<variable_name>` placeholders in .env.example.

## When to Use This Skill
- Setting up new projects with environment configuration.
- Maintaining consistency between .env and .env.example files.
- Working with monorepos that have multiple environment files.
- Onboarding new developers with standardized env setup.
- CI/CD pipelines that need env validation.

## Quick Start

### Installation
```bash
npm install --save-dev env-twin
# or
yarn add -D env-twin
# or
pnpm add -D env-twin
```

### Basic Usage
```bash
# Sync .env to .env.example (default behavior)
npx env-twin sync

# Sync specific files
npx env-twin sync --source .env.development --dest .env.staging.example

# Preview changes without applying
npx env-twin sync --dry-run

# Restore from backup
npx env-twin restore 20241125-143022
```

## Available Commands

### sync
Synchronizes environment variable keys across .env files.

Options:
- `--source`, `-s`: Source env file (default: `.env`).
- `--dest`, `-d`: Destination env file (default: `.env.example`).
- `--no-backup`: Skip backup creation (use only in CI).
- `--dry-run`: Preview changes without applying.

### restore \<timestamp>
Restores .env files from a specific backup.

Options:
- `--yes`, `-y`: Skip confirmation prompts.
- `--target`, `-t`: Restore specific file only.

### clean-backups
Removes old backup files.

Options:
- `--keep`, `-k`: Number of recent backups to preserve (default: 10).
- `--all`: Remove all backups.

## Single Repo Setup

### File Structure
```text
project-root/
├── .env                    # Secrets (gitignored)
├── .env.example            # Template (committed)
├── .env.local              # Local overrides (gitignored)
└── .env.development        # Dev-specific vars
```

### Recommended package.json scripts
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

### Workflow
1. Add new variables to `.env`.
2. Run `npm run env:sync`.
3. Review `.env.example` changes.
4. Commit `.env.example` only.
5. Other developers pull and fill in their `.env`.

## Monorepo Setup

### Turborepo/Nx Structure
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

### Root package.json scripts
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

### Per-app package.json
```json
{
  "scripts": {
    "env:sync": "env-twin sync --source .env --dest .env.example"
  }
}
```

## CI/CD Integration

### GitHub Actions
```yaml
name: Environment Check
on:
  pull_request:
    paths: ['.env*', '**/.env*']

jobs:
  check-env:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx env-twin sync --dry-run
      - run: npx env-twin sync --no-backup
```

### Pre-commit Hook
```bash
#!/bin/sh
if ! npx env-twin sync --dry-run > /dev/null 2>&1; then
  echo "⚠️  Environment files out of sync! Run 'npm run env:sync'"
  exit 1
fi
```

## Best Practices

### Security
- Never commit `.env` files.
- Always review `.env.example` before committing.
- Use `--no-backup` only in CI environments.
- Regular backup cleanup: `npx env-twin clean-backups --keep 5`.

### File Naming
- `.env` - Production/secrets (gitignored).
- `.env.example` - Template with placeholders (committed).
- `.env.local` - Local overrides (gitignored).
- `.env.development` - Dev-specific vars.
- `.env.test` - Test environment.
- `.env.staging` - Staging environment.

### Gitignore Configuration
```gitignore
.env
.env.local
.env.*.local
!.env.example
!.env.development.example
.env-backup-*
```

## Troubleshooting

### "No source file found"
Create the source file first:
```bash
touch .env
npx env-twin sync
```

### Backups filling up disk
Set up automatic cleanup:
```bash
# package.json
{
  "scripts": {
    "postenv:sync": "env-twin clean-backups --keep 5"
  }
}
```

### Wrong values in .env.example
Regenerate from source:
```bash
rm .env.example
npx env-twin sync
```

## Advanced Usage

### Custom Workflows
```bash
# Sync with custom placeholder format (post-process)
npx env-twin sync && sed -i 's/input_/YOUR_PREFIX_/g' .env.example

# Integration with dotenv-vault
npm run env:sync && npx dotenv-vault push
```

### Docker Integration
```dockerfile
COPY package.json ./
RUN npm ci
COPY .env.example .env
RUN npx env-twin sync --no-backup
```

## References
- @file ./references/monorepo-patterns.md
- @file ./references/single-repo-setup.md
- @file ./references/cicd-integration.md


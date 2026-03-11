# CI/CD Integration with env-twin

This guide focuses on using `env-twin` in automated pipelines (CI/CD) and pre-commit workflows.

## Principles

- **Never** commit real secrets.
- Use `env-twin sync --dry-run` to **validate** environment consistency without modifying files.
- Use `env-twin sync --no-backup` in CI to avoid unnecessary backup files.

## GitHub Actions

### Basic Environment Check Workflow

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
      - name: Dry-run env sync
        run: npx env-twin sync --dry-run
      - name: Enforce env sync (optional)
        run: npx env-twin sync --no-backup
```

**Notes:**
- The dry-run step fails if `.env` and `.env.example` are out of sync, catching issues early.
- The enforcing step is optional—some teams prefer to require developers to sync locally.

## GitLab CI

Example `.gitlab-ci.yml`:

```yaml
stages:
  - test

env_check:
  stage: test
  image: node:20
  script:
    - npm ci
    - npx env-twin sync --dry-run
```

You can add `npx env-twin sync --no-backup` in deployments if you want to ensure `.env.example` is aligned with `.env` on the deployment branch.

## Azure DevOps Pipelines

Example `azure-pipelines.yml` snippet:

```yaml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'
  - script: |
      npm ci
      npx env-twin sync --dry-run
    displayName: 'Check env files'
```

## Jenkins Pipelines

Declarative pipeline example:

```groovy
pipeline {
  agent any

  stages {
    stage('Env Check') {
      steps {
        sh 'npm ci'
        sh 'npx env-twin sync --dry-run'
      }
    }
  }
}
```

## Pre-commit Hooks

Use pre-commit hooks to prevent committing out-of-sync env files.

### Simple Shell Hook (Git)

Create `.git/hooks/pre-commit`:

```bash
#!/bin/sh
if ! npx env-twin sync --dry-run > /dev/null 2>&1; then
  echo "Environment files out of sync! Run 'npm run env:sync'"
  exit 1
fi
```

Make it executable:

```bash
chmod +x .git/hooks/pre-commit
```

### Using `husky`

```bash
npm install --save-dev husky
npx husky install
npx husky add .husky/pre-commit "npx env-twin sync --dry-run"
```

This will block commits when env files are out of sync.

## Automated Env Validation

In more advanced setups, you can:

- Parse the output of `env-twin sync --dry-run` and fail with a custom message.
- Run `env-twin` in multiple subdirectories in a monorepo:

  ```bash
  (cd apps/web && npx env-twin sync --dry-run) &&
  (cd apps/api && npx env-twin sync --dry-run)
  ```

## Security Considerations

- Make sure CI/CD systems **do not** write real secrets into `.env.example`.
- Use `--no-backup` in CI to avoid backup files ending up in build artifacts.
- Prefer secret stores (GitHub Actions secrets, GitLab variables, Azure Key Vault, etc.) to inject real values at runtime.

## Summary

Integrating `env-twin` into CI/CD:

- Guarantees that `.env` and `.env.example` stay in sync.
- Prevents accidental drift and missing variables in new environments.
- Provides fast feedback on pull requests and commits that change env files.


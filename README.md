# env-twin-skill

[![npm version](https://img.shields.io/npm/v/env-twin-skill.svg)](https://www.npmjs.com/package/env-twin-skill)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**env-twin-skill** is a powerful [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server and AI Agent Skill designed to seamlessly manage, synchronize, and template your environment variables (`.env`) across both single-repository and complex monorepo projects using the robust `env-twin` CLI.

Whether you're using Claude, Cursor, or other modern AI coding assistants, this tool ensures your development environment configurations stay consistently structured, securely sanitized, and perfectly synced without manual intervention.

## 🚀 Key Features

*   **Intelligent Synchronization (`sync_env`)**: Automatically populates `.env.example` templates with keys from your actual `.env` files, ensuring developers always have a complete template without exposing sensitive values.
*   **Safety First (`restore_env` & `clean_backups`)**: Built-in backup mechanisms allow AI agents to safely manipulate configuration files. Easily rollback to previous states using timestamped backups.
*   **Proactive Validation (`check_sync`)**: Dry-run capabilities allow agents to identify missing configuration keys or discrepancies before applying changes, ideal for CI/CD checks.
*   **Monorepo Native**: Designed to handle complex workspace structures (Turborepo, Nx, Yarn Workspaces) out-of-the-box.
*   **Agent Ready**: Provides comprehensive skill documentation (`SKILL.md`) giving AI assistants precise context on your project's environment setup philosophy.

## 📦 Installation

To use `env-twin-skill` in your project, install it as a development dependency:

```bash
npm install -D env-twin-skill
# or
yarn add -D env-twin-skill
# or
pnpm add -D env-twin-skill
```

## 🛠️ Usage as an AI Agent Skill

By registering `env-twin-skill`, your AI assistant (e.g., Cursor, Claude) gains deep knowledge of how to manage environment variables safely and efficiently.

1.  Point your agent configuration (e.g., `.cursor/rules` or agent settings) to the bundled skill directory:
    ```json
    {
      "agents": {
        "skills": ["./node_modules/env-twin-skill/skills/env-twin"]
      }
    }
    ```
2.  Interact naturally with your assistant:
    *   *"Hey Agent, run the env-twin sync to make sure my `.env.example` is up to date."*
    *   *"@env-twin check if my staging environment is missing any variables."*

## 🔌 Usage as an MCP Server

The package includes a fully compliant MCP server, exposing tools directly to your AI client via stdio.

### Starting the Server

```bash
npx env-twin-mcp
```

### Available MCP Tools

*   `sync_env`: Synchronizes environment keys from a source file to a destination template.
    *   *Parameters*: `source` (default `.env`), `dest` (default `.env.example`), `noBackup`, `dryRun`.
*   `restore_env`: Rolls back a `.env` file to a previously created backup timestamp.
    *   *Parameters*: `timestamp` (required), `target`, `yes`.
*   `clean_backups`: Prunes old backup files to keep your workspace clean.
    *   *Parameters*: `keep` (default 10), `all`.
*   `check_sync`: Performs a dry-run sync to detect and report missing keys without modifying files.
    *   *Parameters*: `source`, `dest`.

## 👨‍💻 Development

If you want to contribute or build the MCP server locally:

```bash
# Install dependencies
npm install

# Build the TypeScript code
npm run build

# Run the MCP inspector to test tools locally
npm run inspect
```

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

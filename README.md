## env-twin-skill

`env-twin-skill` is an Agent skill package and MCP server that helps AI coding assistants manage environment variables using the `env-twin` CLI across both single-repo and monorepo projects.

It provides:
- **Skill documentation** via `skills/env-twin/SKILL.md` and reference guides.
- **MCP tools** for invoking `env-twin` commands (`sync`, `restore`, `clean-backups`, dry-run checks) from agents.

### Installation

```bash
npm install env-twin-skill
```

### Using as an Agent Skill

- Point your agent configuration to the bundled skill directory:
  - `agents.skills: ["./skills/env-twin"]`
- Invoke via commands like `/env-twin` or `@env-twin` depending on your assistant.

### Using the MCP Server

The MCP server is exposed as a Node binary:

```bash
npx env-twin-mcp
```

Clients connect over stdio and can call tools:
- `sync_env`: Sync `.env` keys to `.env.example` (Supports `source`, `dest`, `noBackup`, `dryRun` parameters).
- `restore_env`: Restore an environment file from a backup timestamp (Supports `timestamp`, `target`, `yes` parameters).
- `clean_backups`: Remove older backup files (Supports `keep`, `all` parameters).
- `check_sync`: Run a sync dry-run to check for missing keys (Supports `source`, `dest` parameters).

### Development

```bash
npm install
npm run build
npm run inspect   # run MCP inspector against the built server
```

### License

This project is licensed under the MIT License. See `LICENSE` for details.

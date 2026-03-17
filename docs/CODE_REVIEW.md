# Code Review: env-twin-skill

## Overview

The `env-twin-skill` project acts as a Model Context Protocol (MCP) server for managing and syncing environment variables across projects via the `env-twin` CLI. Overall, the implementation correctly utilizes child processes to interface with `env-twin` and parses inputs using Zod. However, the manual implementation of the MCP (Model Context Protocol) JSON-RPC over stdio has some significant gaps and issues that hinder full MCP compliance and robustness.

## 1. MCP Implementation Gaps

### Not Using the Official SDK
The `package.json` includes `@modelcontextprotocol/sdk` as a dependency (`^1.27.1`), but `mcp-server/index.ts` does not use it. Instead, it manually implements a JSON-RPC over stdio server.
- **Issue**: Manual JSON-RPC parsing is error-prone, hard to maintain, and completely misses out on the SDK's built-in robust request/response handling, lifecycle management, and protocol updates.
- **Recommendation**: Refactor `mcp-server/index.ts` to utilize `@modelcontextprotocol/sdk/server` and `@modelcontextprotocol/sdk/server/stdio`.

### Missing Essential Protocol Methods
The manual JSON-RPC implementation handles `initialize`, `ping`, and `tools/call`, but completely omits other required or expected protocol methods for a Tool server:
- **`tools/list`**: Currently, there is no implementation for listing the available tools (`sync_env`, `restore_env`, `clean_backups`, `check_sync`). The client has no way to dynamically discover the tools.
- **Recommendation**: Implement `tools/list` to return the tool definitions (schemas, names, descriptions).

### Manual Buffer Parsing is Fragile
The manual buffer parsing for JSON-RPC messages (looking for `\r\n\r\n` and `Content-Length`) is functional but inherently risky:
- **Issue**: Handling incomplete chunks, very large messages, or malformed HTTP-style headers is difficult to get right in a manual loop.
- **Recommendation**: This is entirely resolved by switching to the official MCP SDK.

## 2. CLI Execution & Distribution Issues

### Missing Shebang in Entry Point
The `package.json` defines a `bin` entry: `"env-twin-mcp": "./dist/mcp-server/index.js"`.
- **Issue**: The compiled `index.js` (from `index.ts`) will not have a Node.js shebang (`#!/usr/bin/env node`). When a user runs `npx env-twin-mcp`, it might fail because the system won't know it's a Node script.
- **Recommendation**: Add `#!/usr/bin/env node` to the top of `mcp-server/index.ts` or configure the build step to inject it.

### Hardcoded `npx` in Child Process
- **Issue**: Tools use `spawn("npx", ["env-twin", ...args], ...)` which assumes `npx` is available and `env-twin` is globally installable/resolvable. In environments like pnpm or yarn, this might exhibit inconsistent behaviors or download the package repeatedly if not cached.
- **Recommendation**: Consider checking if `env-twin` is available locally in `node_modules/.bin` first, or provide an option to configure the executable path.

## 3. Code Quality & Error Handling

### Child Process Error Handling
- **Issue**: The `runEnvTwin` promise wrapper catches `.on("error")` but `stderr` could contain critical errors while `code` is still `0` (or `stderr` might not be captured if the process crashes outright).
- **Recommendation**: Improve error parsing and log surfacing. Returning raw STDOUT/STDERR inside the Tool Result text is okay, but could be formatted better for AI consumption.

### Strict Typing Gaps
- **Issue**: The `ToolsCallParams` `arguments` is typed as `unknown` and passed into `.parse()`. While Zod handles it, providing a bit more type safety or wrapping the tool registry might clean up the massive `switch` statement in `handleToolsCall`.
- **Recommendation**: Map tools to handlers using an object registry rather than a switch-case.

## 4. Testing & CI

### Missing Test Suite
- **Issue**: There are no automated tests (`test` script is missing in `package.json`, no `__tests__` or `*.test.ts` files).
- **Recommendation**: Introduce a testing framework (e.g., Jest or Vitest) to test the tool schema validations, and mock `runEnvTwin` to test expected stdout/stderr behaviors.

## Summary of Action Items
1. Rewrite `mcp-server/index.ts` to use `@modelcontextprotocol/sdk`.
2. Add the `tools/list` endpoint so the MCP server advertises its capabilities.
3. Add `#!/usr/bin/env node` to the server entry file.
4. Set up a basic testing framework to ensure schema validation and child process logic are correct.

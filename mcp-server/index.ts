#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import { z } from "zod";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";

export const syncEnvInputSchema = z.object({
  source: z.string().optional().describe("Source env file path (default: .env)"),
  dest: z
    .string()
    .optional()
    .describe("Destination env file path (default: .env.example)"),
  noBackup: z
    .boolean()
    .optional()
    .describe("If true, pass --no-backup to env-twin"),
  dryRun: z
    .boolean()
    .optional()
    .describe("If true, pass --dry-run to env-twin"),
});

export const restoreEnvInputSchema = z.object({
  timestamp: z
    .string()
    .describe("Backup timestamp to restore, e.g. 20241125-143022"),
  target: z
    .string()
    .optional()
    .describe("Optional specific file to restore (passed via --target)"),
  yes: z
    .boolean()
    .optional()
    .describe("If true, pass --yes to skip confirmation"),
});

export const cleanBackupsInputSchema = z.object({
  keep: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Number of recent backups to preserve (default: 10)"),
  all: z
    .boolean()
    .optional()
    .describe("If true, remove all backups (--all)"),
});

export const checkSyncInputSchema = z.object({
  source: z.string().optional(),
  dest: z.string().optional(),
});

type SyncEnvInput = z.infer<typeof syncEnvInputSchema>;
type RestoreEnvInput = z.infer<typeof restoreEnvInputSchema>;
type CleanBackupsInput = z.infer<typeof cleanBackupsInputSchema>;
type CheckSyncInput = z.infer<typeof checkSyncInputSchema>;

type TextContentBlock = {
  type: "text";
  text: string;
};

type ToolResult = {
  isError?: boolean;
  content: TextContentBlock[];
};

function runEnvTwin(args: string[]): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const isLocal = require("fs").existsSync("node_modules/.bin/env-twin");
    const cmd = isLocal ? "node_modules/.bin/env-twin" : "npx";
    const spawnArgs = isLocal ? args : ["env-twin", ...args];
    const child = spawn(cmd, spawnArgs, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      resolve({ stdout, stderr, code });
    });
  });
}

async function handleSyncEnv(input: SyncEnvInput): Promise<ToolResult> {
  const args: string[] = ["sync"];

  if (input.source) {
    args.push("--source", input.source);
  }
  if (input.dest) {
    args.push("--dest", input.dest);
  }
  if (input.noBackup) {
    args.push("--no-backup");
  }
  if (input.dryRun) {
    args.push("--dry-run");
  }

  const { stdout, stderr, code } = await runEnvTwin(args);

  if (code !== 0) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text:
            `env-twin sync failed with code ${code}.\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`,
        },
      ],
    };
  }

  return {
    isError: false,
    content: [
      {
        type: "text",
        text: (stdout || "env-twin sync completed successfully.") + (stderr ? "\n\nSTDERR:\n" + stderr : ""),
      },
    ],
  };
}

async function handleRestoreEnv(input: RestoreEnvInput): Promise<ToolResult> {
  const args: string[] = ["restore", input.timestamp];

  if (input.target) {
    args.push("--target", input.target);
  }
  if (input.yes) {
    args.push("--yes");
  }

  const { stdout, stderr, code } = await runEnvTwin(args);

  if (code !== 0) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text:
            `env-twin restore failed with code ${code}.\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`,
        },
      ],
    };
  }

  return {
    isError: false,
    content: [
      {
        type: "text",
        text: (stdout || "env-twin restore completed successfully.") + (stderr ? "\n\nSTDERR:\n" + stderr : ""),
      },
    ],
  };
}

async function handleCleanBackups(input: CleanBackupsInput): Promise<ToolResult> {
  const args: string[] = ["clean-backups"];

  if (input.all) {
    args.push("--all");
  } else if (typeof input.keep === "number") {
    args.push("--keep", String(input.keep));
  }

  const { stdout, stderr, code } = await runEnvTwin(args);

  if (code !== 0) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text:
            `env-twin clean-backups failed with code ${code}.\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`,
        },
      ],
    };
  }

  return {
    isError: false,
    content: [
      {
        type: "text",
        text: (stdout || "env-twin clean-backups completed successfully.") + (stderr ? "\n\nSTDERR:\n" + stderr : ""),
      },
    ],
  };
}

async function handleCheckSync(input: CheckSyncInput): Promise<ToolResult> {
  const args: string[] = ["sync", "--dry-run"];

  if (input.source) {
    args.push("--source", input.source);
  }
  if (input.dest) {
    args.push("--dest", input.dest);
  }

  const { stdout, stderr, code } = await runEnvTwin(args);

  if (code !== 0) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text:
            `env-twin sync --dry-run reported issues (code ${code}).\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`,
        },
      ],
    };
  }

  return {
    isError: false,
    content: [
      {
        type: "text",
        text: (stdout || "env-twin sync --dry-run reported no issues.") + (stderr ? "\n\nSTDERR:\n" + stderr : ""),
      },
    ],
  };
}

const server = new Server(
  {
    name: "env-twin-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "sync_env",
        description: "Synchronize environment variables from a source to a destination.",
        inputSchema: zodToJsonSchema(syncEnvInputSchema) as any,
      },
      {
        name: "restore_env",
        description: "Restore environment variables from a previous backup.",
        inputSchema: zodToJsonSchema(restoreEnvInputSchema) as any,
      },
      {
        name: "clean_backups",
        description: "Clean up old environment variable backups.",
        inputSchema: zodToJsonSchema(cleanBackupsInputSchema) as any,
      },
      {
        name: "check_sync",
        description: "Check if environment variables are in sync (dry run).",
        inputSchema: zodToJsonSchema(checkSyncInputSchema) as any,
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "sync_env": {
        const parsed = syncEnvInputSchema.parse(args);
        return await handleSyncEnv(parsed);
      }
      case "restore_env": {
        const parsed = restoreEnvInputSchema.parse(args);
        return await handleRestoreEnv(parsed);
      }
      case "clean_backups": {
        const parsed = cleanBackupsInputSchema.parse(args);
        return await handleCleanBackups(parsed);
      }
      case "check_sync": {
        const parsed = checkSyncInputSchema.parse(args);
        return await handleCheckSync(parsed);
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error running tool";
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});

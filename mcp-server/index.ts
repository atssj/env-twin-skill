import { spawn } from "node:child_process";
import process from "node:process";
import { z } from "zod";

const syncEnvInputSchema = z.object({
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

const restoreEnvInputSchema = z.object({
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

const cleanBackupsInputSchema = z.object({
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

const checkSyncInputSchema = z.object({
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
    const child = spawn("npx", ["env-twin", ...args], {
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
        text: stdout || "env-twin sync completed successfully.",
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
        text: stdout || "env-twin restore completed successfully.",
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
        text: stdout || "env-twin clean-backups completed successfully.",
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
        text: stdout || "env-twin sync --dry-run reported no issues.",
      },
    ],
  };
}

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: unknown;
};

type JsonRpcResponse =
  | {
      jsonrpc: "2.0";
      id: JsonRpcId;
      result: unknown;
    }
  | {
      jsonrpc: "2.0";
      id: JsonRpcId;
      error: {
        code: number;
        message: string;
        data?: unknown;
      };
    };

type ToolsCallParams = {
  name: string;
  arguments?: unknown;
};

function writeMessage(message: JsonRpcResponse) {
  const json = JSON.stringify(message);
  // JSON-RPC over stdio convention: Content-Length header + payload
  const buffer = Buffer.from(json, "utf8");
  const header = `Content-Length: ${buffer.length}\r\n\r\n`;
  process.stdout.write(header);
  process.stdout.write(buffer);
}

async function handleToolsCall(id: JsonRpcId, params: ToolsCallParams) {
  const toolName = params.name;
  const args = params.arguments ?? {};

  try {
    let result: ToolResult;

    switch (toolName) {
      case "sync_env": {
        const parsed = syncEnvInputSchema.parse(args);
        result = await handleSyncEnv(parsed);
        break;
      }
      case "restore_env": {
        const parsed = restoreEnvInputSchema.parse(args);
        result = await handleRestoreEnv(parsed);
        break;
      }
      case "clean_backups": {
        const parsed = cleanBackupsInputSchema.parse(args);
        result = await handleCleanBackups(parsed);
        break;
      }
      case "check_sync": {
        const parsed = checkSyncInputSchema.parse(args);
        result = await handleCheckSync(parsed);
        break;
      }
      default: {
        writeMessage({
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Unknown tool: ${toolName}`,
          },
        });
        return;
      }
    }

    writeMessage({
      jsonrpc: "2.0",
      id,
      result: {
        content: result.content,
        isError: result.isError ?? false,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error running tool";
    writeMessage({
      jsonrpc: "2.0",
      id,
      error: {
        code: -32000,
        message,
      },
    });
  }
}

function handleInitialize(id: JsonRpcId) {
  writeMessage({
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {},
      },
    },
  });
}

function handlePing(id: JsonRpcId) {
  writeMessage({
    jsonrpc: "2.0",
    id,
    result: {
      ok: true,
    },
  });
}

function startServer() {
  let buffer = Buffer.alloc(0);

  process.stdin.on("data", (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);

    for (;;) {
      const headerEnd = buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) break;

      const header = buffer.slice(0, headerEnd).toString("utf8");
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      if (!match) {
        buffer = buffer.slice(headerEnd + 4);
        continue;
      }

      const length = parseInt(match[1], 10);
      const total = headerEnd + 4 + length;
      if (buffer.length < total) break;

      const body = buffer.slice(headerEnd + 4, total).toString("utf8");
      buffer = buffer.slice(total);

      try {
        const message = JSON.parse(body) as JsonRpcRequest;
        const id = message.id ?? null;

        if (message.method === "initialize") {
          handleInitialize(id);
        } else if (message.method === "ping") {
          handlePing(id);
        } else if (message.method === "tools/call") {
          const params = (message.params ?? {}) as ToolsCallParams;
          void handleToolsCall(id, params);
        } else {
          writeMessage({
            jsonrpc: "2.0",
            id,
            error: {
              code: -32601,
              message: `Unknown method: ${message.method}`,
            },
          });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Invalid JSON-RPC message";
        writeMessage({
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32700,
            message,
          },
        });
      }
    }
  });

  process.stdin.on("error", (error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Unknown stdin error";
    // eslint-disable-next-line no-console
    console.error("env-twin MCP server stdin error:", message);
    process.exit(1);
  });
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}



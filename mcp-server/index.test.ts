import { describe, it, expect } from "vitest";
import { syncEnvInputSchema, restoreEnvInputSchema } from "./index.js";

describe("Schema Validations", () => {
  it("validates syncEnvInputSchema correctly", () => {
    expect(() => syncEnvInputSchema.parse({})).not.toThrow();
    expect(() => syncEnvInputSchema.parse({ source: ".env", dest: ".env.example", noBackup: true, dryRun: false })).not.toThrow();
    expect(() => syncEnvInputSchema.parse({ source: 123 })).toThrow();
  });

  it("validates restoreEnvInputSchema correctly", () => {
    expect(() => restoreEnvInputSchema.parse({ timestamp: "20241125-143022" })).not.toThrow();
    expect(() => restoreEnvInputSchema.parse({ timestamp: "20241125-143022", target: ".env", yes: true })).not.toThrow();
    expect(() => restoreEnvInputSchema.parse({})).toThrow(); // timestamp is required
  });
});

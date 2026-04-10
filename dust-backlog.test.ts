import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const breakdownPath = join(root, "IMPLEMENTATION_BREAKDOWN.md");
const tasksDir = join(root, ".dust", "tasks");

describe("dust implementation backlog", () => {
  test("creates one task file for each breakdown task", () => {
    const breakdown = readFileSync(breakdownPath, "utf8");
    const breakdownTaskCount = [...breakdown.matchAll(/^### Task \d+:/gm)].length;
    const taskFiles = readdirSync(tasksDir).filter((file) => file.endsWith(".md"));

    expect(taskFiles.length).toBe(breakdownTaskCount);
  });

  test("references API_SKETCHES.md in every task", () => {
    const taskFiles = readdirSync(tasksDir).filter((file) => file.endsWith(".md"));

    for (const taskFile of taskFiles) {
      const content = readFileSync(join(tasksDir, taskFile), "utf8");
      expect(content).toContain("API_SKETCHES.md");
    }
  });
});

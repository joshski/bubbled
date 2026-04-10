import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const breakdownPath = join(root, "IMPLEMENTATION_BREAKDOWN.md");
const tasksDir = join(root, ".dust", "tasks");

describe("dust implementation backlog", () => {
  test("keeps task files scoped to documented breakdown tasks", () => {
    const breakdown = readFileSync(breakdownPath, "utf8");
    const taskFiles = readdirSync(tasksDir).filter((file) => file.endsWith(".md"));
    const breakdownTaskNumbers = new Set(
      [...breakdown.matchAll(/^### Task (\d+):/gm)].map((match) => match[1]),
    );

    for (const taskFile of taskFiles) {
      const taskNumber = /^task-(\d+)-/.exec(taskFile)?.[1];
      expect(taskNumber).toBeDefined();
      expect(breakdownTaskNumbers.has(taskNumber!)).toBe(true);
    }
  });

  test("references API_SKETCHES.md in every task", () => {
    const taskFiles = readdirSync(tasksDir).filter((file) => file.endsWith(".md"));

    for (const taskFile of taskFiles) {
      const content = readFileSync(join(tasksDir, taskFile), "utf8");
      expect(content).toContain("API_SKETCHES.md");
    }
  });
});

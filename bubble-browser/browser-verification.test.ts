import { expect, test } from "bun:test";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";

import { chromium } from "playwright";

async function launchBrowser() {
  if (process.platform === "darwin") {
    const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

    try {
      await access(chromePath);
      return await chromium.launch({ executablePath: chromePath });
    } catch {
      // Fall through to the Playwright-managed browser when Chrome is unavailable.
    }
  }

  return chromium.launch();
}

test("real browser verifies popover placement against actual projected DOM layout", async () => {
  const tempDir = await mkdtemp(join(process.cwd(), ".tmp-browser-verification-"));
  const entryPath = join(tempDir, "entry.ts");
  const bundlePath = join(tempDir, "entry.js");
  const browser = await launchBrowser();

  try {
    await Bun.write(
      entryPath,
      [
        'import { createBubble } from "../bubble-core/index.ts";',
        'import { createDomLayout, createDomProjector, measureAndPlacePopover } from "../bubble-browser/index.ts";',
        "",
        "export function run() {",
        "  document.body.innerHTML = '';",
        "  document.body.style.margin = '0';",
        "  const container = document.createElement('div');",
        "  document.body.appendChild(container);",
        "  let projector;",
        "  const bubble = createBubble({",
        "    capabilities: {",
        "      layout: {",
        "        measureElement(nodeId) {",
        "          return createDomLayout({ projector }).measureElement(nodeId);",
        "        },",
        "      },",
        "      viewport: {",
        "        getState() {",
        "          return {",
        "            width: window.innerWidth,",
        "            height: window.innerHeight,",
        "            scrollX: window.scrollX,",
        "            scrollY: window.scrollY,",
        "          };",
        "        },",
        "      },",
        "    },",
        "  });",
        "  let anchorId = '';",
        "  let overlayId = '';",
        "  bubble.transact((tx) => {",
        "    anchorId = tx.createElement({ tag: 'button' });",
        "    overlayId = tx.createElement({ tag: 'div' });",
        "    tx.setAttribute({",
        "      nodeId: anchorId,",
        "      name: 'style',",
        "      value: 'position:fixed;left:32px;top:120px;width:40px;height:20px;padding:0;border:0;',",
        "    });",
        "    tx.setAttribute({ nodeId: anchorId, name: 'id', value: 'anchor' });",
        "    tx.setAttribute({",
        "      nodeId: overlayId,",
        "      name: 'style',",
        "      value: 'position:fixed;left:0;top:0;width:80px;height:50px;',",
        "    });",
        "    tx.setAttribute({ nodeId: overlayId, name: 'id', value: 'overlay' });",
        "    tx.insertChild({ parentId: bubble.rootId, childId: anchorId });",
        "    tx.insertChild({ parentId: bubble.rootId, childId: overlayId });",
        "  });",
        "  projector = createDomProjector({ bubble });",
        "  projector.mount(container);",
        "  const placement = measureAndPlacePopover(bubble, anchorId, overlayId);",
        "  const anchorRect = document.getElementById('anchor').getBoundingClientRect();",
        "  const overlayRect = document.getElementById('overlay').getBoundingClientRect();",
        "  return {",
        "    placement,",
        "    anchorRect: {",
        "      x: anchorRect.x,",
        "      y: anchorRect.y,",
        "      width: anchorRect.width,",
        "      height: anchorRect.height,",
        "    },",
        "    overlayRect: {",
        "      x: overlayRect.x,",
        "      y: overlayRect.y,",
        "      width: overlayRect.width,",
        "      height: overlayRect.height,",
        "    },",
        "  };",
        "}",
      ].join("\n"),
    );

    const buildResult = await Bun.build({
      entrypoints: [entryPath],
      format: "esm",
      outdir: tempDir,
      target: "browser",
    });

    if (!buildResult.success) {
      throw new Error(buildResult.logs.map((log) => log.message).join("\n"));
    }

    const moduleSource = await readFile(bundlePath, "utf8");
    const page = await browser.newPage({
      viewport: {
        width: 300,
        height: 180,
      },
    });

    const result = await page.evaluate(async (source) => {
      const moduleUrl = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));

      try {
        const module = await import(moduleUrl);

        return module.run();
      } finally {
        URL.revokeObjectURL(moduleUrl);
      }
    }, moduleSource);

    expect(result.placement.placement).toBe("top");
    expect(result.placement.x).toBeCloseTo(result.anchorRect.x, 5);
    expect(result.placement.y).toBeCloseTo(
      result.anchorRect.y - result.overlayRect.height,
      5,
    );
  } finally {
    await browser.close();
    await rm(tempDir, { force: true, recursive: true });
  }
}, 20_000);

test("real browser verifies native label clicks move focus to the associated input", async () => {
  const tempDir = await mkdtemp(join(process.cwd(), ".tmp-browser-verification-"));
  const entryPath = join(tempDir, "entry.ts");
  const bundlePath = join(tempDir, "entry.js");
  const browser = await launchBrowser();

  try {
    await Bun.write(
      entryPath,
      [
        'import { createBubble } from "../bubble-core/index.ts";',
        'import { createDomProjector } from "../bubble-browser/index.ts";',
        "",
        "export function run() {",
        "  document.body.innerHTML = '';",
        "  const container = document.createElement('div');",
        "  document.body.appendChild(container);",
        "  const bubble = createBubble();",
        "  let labelId = '';",
        "  let inputId = '';",
        "  bubble.transact((tx) => {",
        "    labelId = tx.createElement({ tag: 'label' });",
        "    inputId = tx.createElement({ tag: 'input' });",
        "    const textId = tx.createText({ value: 'Email' });",
        "    tx.setAttribute({ nodeId: labelId, name: 'id', value: 'email-label' });",
        "    tx.setAttribute({ nodeId: labelId, name: 'for', value: 'email-input' });",
        "    tx.setAttribute({ nodeId: inputId, name: 'id', value: 'email-input' });",
        "    tx.setAttribute({ nodeId: inputId, name: 'type', value: 'text' });",
        "    tx.insertChild({ parentId: bubble.rootId, childId: labelId });",
        "    tx.insertChild({ parentId: labelId, childId: textId });",
        "    tx.insertChild({ parentId: bubble.rootId, childId: inputId });",
        "  });",
        "  createDomProjector({ bubble, syncFocus: true }).mount(container);",
        "  (window as typeof window & { __getFocusedNodeId?: () => string | null }).__getFocusedNodeId = () => bubble.getFocusedNodeId();",
        "  return { labelId, inputId };",
        "}",
      ].join("\n"),
    );

    const buildResult = await Bun.build({
      entrypoints: [entryPath],
      format: "esm",
      outdir: tempDir,
      target: "browser",
    });

    if (!buildResult.success) {
      throw new Error(buildResult.logs.map((log) => log.message).join("\n"));
    }

    const moduleSource = await readFile(bundlePath, "utf8");
    const page = await browser.newPage();

    const nodeIds = await page.evaluate(async (source) => {
      const moduleUrl = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));

      try {
        const module = await import(moduleUrl);

        return module.run();
      } finally {
        URL.revokeObjectURL(moduleUrl);
      }
    }, moduleSource);

    await page.locator("#email-label").click();

    const result = await page.evaluate(() => {
      const activeElement = document.activeElement as HTMLElement | null;
      const getFocusedNodeId = (
        window as typeof window & { __getFocusedNodeId?: () => string | null }
      ).__getFocusedNodeId;

      return {
        activeElementId: activeElement?.id ?? null,
        focusedNodeId: getFocusedNodeId?.() ?? null,
      };
    });

    expect(result).toEqual({
      activeElementId: "email-input",
      focusedNodeId: nodeIds.inputId,
    });
  } finally {
    await browser.close();
    await rm(tempDir, { force: true, recursive: true });
  }
}, 20_000);

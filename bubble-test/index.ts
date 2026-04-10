import { createBubble, type BubbleRuntime } from "../bubble-core";

export interface BubbleHarness {
  readonly bubble: BubbleRuntime;
  tab(options?: { shift?: boolean }): void;
}

export function createHarness(bubble: BubbleRuntime = createBubble()): BubbleHarness {
  return {
    bubble,
    tab(options = {}) {
      const tabOrder = bubble.getTabOrder();

      if (tabOrder.length === 0) {
        return;
      }

      const currentFocusId = bubble.getFocusedNodeId();
      const currentIndex = currentFocusId === null ? -1 : tabOrder.indexOf(currentFocusId);

      if (options.shift) {
        if (currentIndex === -1) {
          bubble.focus(tabOrder.at(-1) as string);
          return;
        }

        if (currentIndex === 0) {
          return;
        }

        bubble.focus(tabOrder[currentIndex - 1]);
        return;
      }

      if (currentIndex === -1) {
        bubble.focus(tabOrder[0]);
        return;
      }

      if (currentIndex === tabOrder.length - 1) {
        return;
      }

      bubble.focus(tabOrder[currentIndex + 1]);
    },
  };
}

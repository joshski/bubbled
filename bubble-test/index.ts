import { createBubble, type BubbleRuntime } from "../bubble-core";

export interface BubbleHarness {
  readonly bubble: BubbleRuntime;
  getByRole(role: string, options?: { name?: string | RegExp }): string;
  tab(options?: { shift?: boolean }): void;
}

function formatNameMatcher(name: string | RegExp): string {
  return typeof name === "string" ? JSON.stringify(name) : name.toString();
}

function formatNodeName(name: string | null): string {
  return name === null ? "<unnamed>" : JSON.stringify(name);
}

export function createHarness(bubble: BubbleRuntime = createBubble()): BubbleHarness {
  return {
    bubble,
    getByRole(role, options) {
      const snapshot = bubble.snapshot();
      const nodesByRole = snapshot.query.getByRole(role);
      const matchingNode = nodesByRole.find((node) => {
        if (options?.name === undefined) {
          return true;
        }

        if (typeof options.name === "string") {
          return node.name === options.name;
        }

        return node.name !== null && options.name.test(node.name);
      });

      if (matchingNode !== undefined) {
        return matchingNode.id;
      }

      const queryDescription =
        options?.name === undefined
          ? `role ${JSON.stringify(role)}`
          : `role ${JSON.stringify(role)} and name ${formatNameMatcher(options.name)}`;
      const nodesByRoleDescription =
        nodesByRole.length === 0
          ? "No nodes with that role exist in the current bubble snapshot."
          : `Nodes with role ${JSON.stringify(role)}: ${nodesByRole
              .map((node) => `${node.id} (${formatNodeName(node.name)})`)
              .join(", ")}`;

      throw new Error(`Unable to find a node with ${queryDescription}. ${nodesByRoleDescription}`);
    },
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

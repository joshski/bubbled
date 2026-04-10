import { describe, expect, test } from "bun:test";

import { createBubble, serializeBubbleSnapshot } from "../bubble-core";
import { createBubbleReactRoot } from "./index";

function readSnapshot(bubble: ReturnType<typeof createBubble>) {
  return JSON.parse(serializeBubbleSnapshot(bubble.snapshot()));
}

describe("createBubbleReactRoot", () => {
  test("renders a static host element into the bubble root", () => {
    const bubble = createBubble();
    const root = createBubbleReactRoot({ bubble });

    root.render(<button />);

    expect(readSnapshot(bubble)).toEqual({
      kind: "root",
      children: [
        {
          kind: "element",
          tag: "button",
          namespace: "html",
          attributes: {},
          properties: {},
          children: [],
        },
      ],
    });
  });

  test("renders nested host elements into the bubble tree", () => {
    const bubble = createBubble();
    const root = createBubbleReactRoot({ bubble });

    root.render(
      <section>
        <button />
      </section>,
    );

    expect(readSnapshot(bubble)).toEqual({
      kind: "root",
      children: [
        {
          kind: "element",
          tag: "section",
          namespace: "html",
          attributes: {},
          properties: {},
          children: [
            {
              kind: "element",
              tag: "button",
              namespace: "html",
              attributes: {},
              properties: {},
              children: [],
            },
          ],
        },
      ],
    });
  });

  test("renders text children into text nodes", () => {
    const bubble = createBubble();
    const root = createBubbleReactRoot({ bubble });

    root.render(<button>Save</button>);

    expect(readSnapshot(bubble)).toEqual({
      kind: "root",
      children: [
        {
          kind: "element",
          tag: "button",
          namespace: "html",
          attributes: {},
          properties: {},
          children: [
            {
              kind: "text",
              value: "Save",
            },
          ],
        },
      ],
    });
  });

  test("unmount removes the rendered tree from the bubble root", () => {
    const bubble = createBubble();
    const root = createBubbleReactRoot({ bubble });

    root.render(<button>Save</button>);
    root.unmount();

    expect(readSnapshot(bubble)).toEqual({
      kind: "root",
      children: [],
    });
  });

  test("throws for unsupported React component types without mutating the bubble", () => {
    const bubble = createBubble();
    const root = createBubbleReactRoot({ bubble });

    function Button() {
      return <button />;
    }

    expect(() => root.render(<Button />)).toThrow(
      "bubble-react only supports host elements and text nodes in this slice",
    );
    expect(readSnapshot(bubble)).toEqual({
      kind: "root",
      children: [],
    });
  });
});

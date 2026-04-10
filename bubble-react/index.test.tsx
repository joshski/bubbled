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

  test("updates bubble attributes, properties, and text in place", () => {
    const bubble = createBubble();
    const root = createBubbleReactRoot({ bubble });
    const mutationTypes: string[] = [];

    bubble.subscribe((event) => {
      if (event.type === "transaction-committed") {
        mutationTypes.push(...event.record.mutations.map((mutation) => mutation.type));
      }
    });

    root.render(
      <label htmlFor="email" data-state="idle">
        <input type="text" value="first@example.com" />
        Email
      </label>,
    );

    const labelId = bubble.getRoot().children[0]!;
    const labelNode = bubble.getNode(labelId);

    if (labelNode === null || labelNode.kind !== "element") {
      throw new Error("Expected a rendered label element");
    }

    const inputId = labelNode.children[0]!;
    const textId = labelNode.children[1]!;

    mutationTypes.length = 0;

    root.render(
      <label htmlFor="name" data-state="ready">
        <input type="text" value="second@example.com" />
        Name
      </label>,
    );

    expect(readSnapshot(bubble)).toEqual({
      kind: "root",
      children: [
        {
          kind: "element",
          tag: "label",
          namespace: "html",
          attributes: {
            "data-state": "ready",
            for: "name",
          },
          properties: {},
          children: [
            {
              kind: "element",
              tag: "input",
              namespace: "html",
              attributes: {
                type: "text",
              },
              properties: {
                value: "second@example.com",
              },
              children: [],
            },
            {
              kind: "text",
              value: "Name",
            },
          ],
        },
      ],
    });
    expect(bubble.getRoot().children[0]).toBe(labelId);
    expect((bubble.getNode(labelId) as { kind: string; children: string[] }).children[0]).toBe(inputId);
    expect((bubble.getNode(labelId) as { kind: string; children: string[] }).children[1]).toBe(textId);
    expect(mutationTypes).toEqual(["attribute-set", "attribute-set", "property-set", "text-set"]);
  });

  test("removes omitted attributes from the bubble tree", () => {
    const bubble = createBubble();
    const root = createBubbleReactRoot({ bubble });

    root.render(<button aria-label="Save" className="primary" />);
    root.render(<button className="primary" />);

    expect(readSnapshot(bubble)).toEqual({
      kind: "root",
      children: [
        {
          kind: "element",
          tag: "button",
          namespace: "html",
          attributes: {
            class: "primary",
          },
          properties: {},
          children: [],
        },
      ],
    });
  });

  test("keeps unchanged nodes stable across prop and text updates", () => {
    const bubble = createBubble();
    const root = createBubbleReactRoot({ bubble });

    root.render(
      <section>
        <button aria-label="Save">Save</button>
        <span>Static</span>
      </section>,
    );

    const sectionId = bubble.getRoot().children[0]!;
    const sectionNode = bubble.getNode(sectionId);

    if (sectionNode === null || sectionNode.kind !== "element") {
      throw new Error("Expected a rendered section element");
    }

    const buttonId = sectionNode.children[0]!;
    const spanId = sectionNode.children[1]!;
    const buttonNode = bubble.getNode(buttonId);
    const spanNode = bubble.getNode(spanId);

    if (
      buttonNode === null ||
      buttonNode.kind !== "element" ||
      spanNode === null ||
      spanNode.kind !== "element"
    ) {
      throw new Error("Expected rendered element children");
    }

    const buttonTextId = buttonNode.children[0]!;
    const spanTextId = spanNode.children[0]!;

    root.render(
      <section>
        <button aria-label="Submit">Submit</button>
        <span>Static</span>
      </section>,
    );

    const updatedSectionNode = bubble.getNode(sectionId);
    const updatedButtonNode = bubble.getNode(buttonId);
    const updatedSpanNode = bubble.getNode(spanId);

    if (
      updatedSectionNode === null ||
      updatedSectionNode.kind !== "element" ||
      updatedButtonNode === null ||
      updatedButtonNode.kind !== "element" ||
      updatedSpanNode === null ||
      updatedSpanNode.kind !== "element"
    ) {
      throw new Error("Expected updated element children");
    }

    expect(bubble.getRoot().children[0]).toBe(sectionId);
    expect(updatedSectionNode.children[0]).toBe(buttonId);
    expect(updatedSectionNode.children[1]).toBe(spanId);
    expect(updatedButtonNode.children[0]).toBe(buttonTextId);
    expect(updatedSpanNode.children[0]).toBe(spanTextId);
  });

  test("resets omitted properties to their default bubble values", () => {
    const bubble = createBubble();
    const root = createBubbleReactRoot({ bubble });

    root.render(<input type="text" value="Draft" disabled />);
    root.render(<input type="text" />);

    expect(readSnapshot(bubble)).toEqual({
      kind: "root",
      children: [
        {
          kind: "element",
          tag: "input",
          namespace: "html",
          attributes: {
            type: "text",
          },
          properties: {
            disabled: false,
            value: "",
          },
          children: [],
        },
      ],
    });
  });

  test("replaces host nodes when their type changes", () => {
    const bubble = createBubble();
    const root = createBubbleReactRoot({ bubble });

    root.render(<button>Save</button>);

    const originalId = bubble.getRoot().children[0]!;

    root.render(<a href="/docs">Save</a>);

    expect(bubble.getRoot().children[0]).not.toBe(originalId);
    expect(readSnapshot(bubble)).toEqual({
      kind: "root",
      children: [
        {
          kind: "element",
          tag: "a",
          namespace: "html",
          attributes: {
            href: "/docs",
          },
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

  test("fires click handlers from bubble events", () => {
    const bubble = createBubble();
    const root = createBubbleReactRoot({ bubble });
    const calls: string[] = [];

    root.render(
      <button
        onClick={() => {
          calls.push("clicked");
        }}
      >
        Save
      </button>,
    );

    const buttonId = bubble.getRoot().children[0]!;

    expect(bubble.dispatchEvent({ type: "click", targetId: buttonId })).toEqual({
      defaultPrevented: false,
      delivered: true,
    });
    expect(calls).toEqual(["clicked"]);
  });

  test("passes the bubble event shape to click handlers", () => {
    const bubble = createBubble();
    const root = createBubbleReactRoot({ bubble });
    let receivedEvent: Parameters<NonNullable<JSX.IntrinsicElements["button"]["onClick"]>>[0] | null =
      null;

    root.render(
      <button
        onClick={(event) => {
          receivedEvent = event;
        }}
      >
        Save
      </button>,
    );

    const buttonId = bubble.getRoot().children[0]!;

    bubble.dispatchEvent({ type: "click", targetId: buttonId });

    expect(receivedEvent).toEqual({
      type: "click",
      targetId: buttonId,
      currentTargetId: buttonId,
      phase: "target",
      cancelable: false,
      defaultPrevented: false,
      data: {},
      preventDefault: expect.any(Function),
      stopPropagation: expect.any(Function),
    });
  });

  test("keeps an unchanged click handler attached across re-renders", () => {
    const bubble = createBubble();
    const root = createBubbleReactRoot({ bubble });
    const calls: string[] = [];
    const handleClick = () => {
      calls.push("clicked");
    };

    root.render(<button onClick={handleClick}>Save</button>);

    const buttonId = bubble.getRoot().children[0]!;

    root.render(<button onClick={handleClick}>Submit</button>);

    expect(bubble.dispatchEvent({ type: "click", targetId: buttonId })).toEqual({
      defaultPrevented: false,
      delivered: true,
    });
    expect(calls).toEqual(["clicked"]);
  });

  test("replaces click handlers when the prop changes", () => {
    const bubble = createBubble();
    const root = createBubbleReactRoot({ bubble });
    const calls: string[] = [];

    root.render(
      <button
        onClick={() => {
          calls.push("first");
        }}
      >
        Save
      </button>,
    );

    const buttonId = bubble.getRoot().children[0]!;

    root.render(
      <button
        onClick={() => {
          calls.push("second");
        }}
      >
        Save
      </button>,
    );

    expect(bubble.dispatchEvent({ type: "click", targetId: buttonId })).toEqual({
      defaultPrevented: false,
      delivered: true,
    });
    expect(calls).toEqual(["second"]);
  });

  test("removes click handlers when the prop is omitted", () => {
    const bubble = createBubble();
    const root = createBubbleReactRoot({ bubble });
    let callCount = 0;

    root.render(
      <button
        onClick={() => {
          callCount += 1;
        }}
      >
        Save
      </button>,
    );

    const buttonId = bubble.getRoot().children[0]!;

    expect(bubble.dispatchEvent({ type: "click", targetId: buttonId })).toEqual({
      defaultPrevented: false,
      delivered: true,
    });

    root.render(<button>Save</button>);

    expect(bubble.dispatchEvent({ type: "click", targetId: buttonId })).toEqual({
      defaultPrevented: false,
      delivered: false,
    });
    expect(callCount).toBe(1);
  });

  test("cleans up click handlers when a handled node is replaced", () => {
    const bubble = createBubble();
    const root = createBubbleReactRoot({ bubble });
    let callCount = 0;

    root.render(
      <button
        onClick={() => {
          callCount += 1;
        }}
      >
        Save
      </button>,
    );

    const buttonId = bubble.getRoot().children[0]!;

    root.render(<a href="/docs">Save</a>);

    expect(bubble.dispatchEvent({ type: "click", targetId: buttonId })).toEqual({
      defaultPrevented: false,
      delivered: false,
    });
    expect(callCount).toBe(0);
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

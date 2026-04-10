import { describe, expect, test } from "bun:test";
import { useEffect, useState, type ReactNode } from "react";

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

  test("keyed reorder preserves node identity through child moves", () => {
    const bubble = createBubble();
    const root = createBubbleReactRoot({ bubble });
    const mutationTypes: string[] = [];

    bubble.subscribe((event) => {
      if (event.type === "transaction-committed") {
        mutationTypes.push(...event.record.mutations.map((mutation) => mutation.type));
      }
    });

    root.render(
      <ul>
        <li key="alpha">Alpha</li>
        <li key="beta">Beta</li>
        <li key="gamma">Gamma</li>
      </ul>,
    );

    const listId = bubble.getRoot().children[0]!;
    const listNode = bubble.getNode(listId);

    if (listNode === null || listNode.kind !== "element") {
      throw new Error("Expected a rendered list element");
    }

    const alphaId = listNode.children[0]!;
    const betaId = listNode.children[1]!;
    const gammaId = listNode.children[2]!;

    mutationTypes.length = 0;

    root.render(
      <ul>
        <li key="gamma">Gamma</li>
        <li key="alpha">Alpha</li>
        <li key="beta">Beta</li>
      </ul>,
    );

    const updatedListNode = bubble.getNode(listId);

    if (updatedListNode === null || updatedListNode.kind !== "element") {
      throw new Error("Expected an updated list element");
    }

    expect(bubble.getRoot().children[0]).toBe(listId);
    expect(updatedListNode.children).toEqual([gammaId, alphaId, betaId]);
    expect(mutationTypes).toEqual(["child-moved"]);
  });

  test("removed key detaches node cleanly", () => {
    const bubble = createBubble();
    const root = createBubbleReactRoot({ bubble });

    root.render(
      <ul>
        <li key="alpha">Alpha</li>
        <li key="beta">Beta</li>
      </ul>,
    );

    const listId = bubble.getRoot().children[0]!;
    const listNode = bubble.getNode(listId);

    if (listNode === null || listNode.kind !== "element") {
      throw new Error("Expected a rendered list element");
    }

    const alphaId = listNode.children[0]!;
    const betaId = listNode.children[1]!;

    root.render(
      <ul>
        <li key="alpha">Alpha</li>
      </ul>,
    );

    expect((bubble.getNode(listId) as { kind: string; children: string[] }).children).toEqual([alphaId]);
    expect(bubble.getNode(betaId)).toMatchObject({
      id: betaId,
      kind: "element",
      tag: "li",
      namespace: "html",
      parentId: null,
      attributes: {},
      properties: {},
      value: null,
      checked: null,
      role: null,
      name: "Beta",
    });
  });

  test("mixed keyed and unkeyed children still reconcile", () => {
    const bubble = createBubble();
    const root = createBubbleReactRoot({ bubble });

    root.render(
      <ul>
        <li key="alpha">Alpha</li>
        <li>Beta</li>
      </ul>,
    );

    root.render(
      <ul>
        <li key="alpha">Alpha</li>
        <li>Beta</li>
      </ul>,
    );

    expect(readSnapshot(bubble)).toEqual({
      kind: "root",
      children: [
        {
          kind: "element",
          tag: "ul",
          namespace: "html",
          attributes: {},
          properties: {},
          children: [
            {
              kind: "element",
              tag: "li",
              namespace: "html",
              attributes: {},
              properties: {},
              children: [
                {
                  kind: "text",
                  value: "Alpha",
                },
              ],
            },
            {
              kind: "element",
              tag: "li",
              namespace: "html",
              attributes: {},
              properties: {},
              children: [
                {
                  kind: "text",
                  value: "Beta",
                },
              ],
            },
          ],
        },
      ],
    });
  });

  test("unkeyed child replacement and removal update nested children correctly", () => {
    const bubble = createBubble();
    const root = createBubbleReactRoot({ bubble });

    root.render(
      <section>
        <button>Save</button>
        <span>Extra</span>
      </section>,
    );

    const sectionId = bubble.getRoot().children[0]!;
    const sectionNode = bubble.getNode(sectionId);

    if (sectionNode === null || sectionNode.kind !== "element") {
      throw new Error("Expected a rendered section element");
    }

    const originalButtonId = sectionNode.children[0]!;
    const originalSpanId = sectionNode.children[1]!;

    root.render(
      <section>
        <a href="/docs">Docs</a>
      </section>,
    );

    const updatedSectionNode = bubble.getNode(sectionId);

    if (updatedSectionNode === null || updatedSectionNode.kind !== "element") {
      throw new Error("Expected an updated section element");
    }

    expect(updatedSectionNode.children).toHaveLength(1);
    expect(updatedSectionNode.children[0]).not.toBe(originalButtonId);
    expect(bubble.getNode(originalButtonId)).toMatchObject({
      id: originalButtonId,
      kind: "element",
      parentId: null,
    });
    expect(bubble.getNode(originalSpanId)).toMatchObject({
      id: originalSpanId,
      kind: "element",
      parentId: null,
    });
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
              tag: "a",
              namespace: "html",
              attributes: {
                href: "/docs",
              },
              properties: {},
              children: [
                {
                  kind: "text",
                  value: "Docs",
                },
              ],
            },
          ],
        },
      ],
    });
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

  test("state change updates text", () => {
    const bubble = createBubble();
    const root = createBubbleReactRoot({ bubble });

    function Counter() {
      const [count, setCount] = useState(0);

      return (
        <button
          onClick={() => {
            setCount((value) => value + 1);
          }}
        >
          Count: {count}
        </button>
      );
    }

    root.render(<Counter />);

    const buttonId = bubble.getRoot().children[0]!;

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
              value: "Count: ",
            },
            {
              kind: "text",
              value: "0",
            },
          ],
        },
      ],
    });

    bubble.dispatchEvent({ type: "click", targetId: buttonId });

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
              value: "Count: ",
            },
            {
              kind: "text",
              value: "1",
            },
          ],
        },
      ],
    });
  });

  test("multiple state updates settle deterministically", () => {
    const bubble = createBubble();
    const root = createBubbleReactRoot({ bubble });

    function Counter() {
      const [count, setCount] = useState(0);

      return (
        <button
          onClick={() => {
            setCount((value) => value + 1);
            setCount((value) => value + 1);
          }}
        >
          Count: {count}
        </button>
      );
    }

    root.render(<Counter />);

    const buttonId = bubble.getRoot().children[0]!;

    bubble.dispatchEvent({ type: "click", targetId: buttonId });

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
              value: "Count: ",
            },
            {
              kind: "text",
              value: "2",
            },
          ],
        },
      ],
    });
  });

  test("ignores state updates that resolve to the current value", () => {
    const bubble = createBubble();
    const root = createBubbleReactRoot({ bubble });
    let commitCount = 0;

    bubble.subscribe((event) => {
      if (event.type === "transaction-committed") {
        commitCount += 1;
      }
    });

    function Counter() {
      const [count, setCount] = useState(0);

      return (
        <button
          onClick={() => {
            setCount(0);
          }}
        >
          Count: {count}
        </button>
      );
    }

    root.render(<Counter />);

    const buttonId = bubble.getRoot().children[0]!;

    bubble.dispatchEvent({ type: "click", targetId: buttonId });

    expect(commitCount).toBe(1);
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
              value: "Count: ",
            },
            {
              kind: "text",
              value: "0",
            },
          ],
        },
      ],
    });
  });

  test("settles render-phase state updates deterministically", () => {
    const bubble = createBubble();
    const root = createBubbleReactRoot({ bubble });

    function Counter() {
      const [count, setCount] = useState(0);

      if (count === 0) {
        setCount(1);
      }

      return <span>{count}</span>;
    }

    root.render(<Counter />);

    expect(readSnapshot(bubble)).toEqual({
      kind: "root",
      children: [
        {
          kind: "element",
          tag: "span",
          namespace: "html",
          attributes: {},
          properties: {},
          children: [
            {
              kind: "text",
              value: "1",
            },
          ],
        },
      ],
    });
  });

  test("settles re-entrant root renders deterministically", () => {
    const bubble = createBubble();
    const root = createBubbleReactRoot({ bubble });
    let hasReRendered = false;

    function ReentrantRender() {
      if (!hasReRendered) {
        hasReRendered = true;
        root.render(<span>Second</span>);
      }

      return <span>First</span>;
    }

    root.render(<ReentrantRender />);

    expect(readSnapshot(bubble)).toEqual({
      kind: "root",
      children: [
        {
          kind: "element",
          tag: "span",
          namespace: "html",
          attributes: {},
          properties: {},
          children: [
            {
              kind: "text",
              value: "Second",
            },
          ],
        },
      ],
    });
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

  test("throws for unsupported non-element React nodes without mutating the bubble", () => {
    const bubble = createBubble();
    const root = createBubbleReactRoot({ bubble });

    expect(() => root.render(1n as unknown as ReactNode)).toThrow(
      "bubble-react only supports host elements and text nodes in this slice",
    );
    expect(readSnapshot(bubble)).toEqual({
      kind: "root",
      children: [],
    });
  });

  test("throws for unsupported fragment elements without mutating the bubble", () => {
    const bubble = createBubble();
    const root = createBubbleReactRoot({ bubble });

    expect(() =>
      root.render(
        <>
          <button />
        </>,
      )).toThrow("bubble-react only supports host elements and text nodes in this slice");
    expect(readSnapshot(bubble)).toEqual({
      kind: "root",
      children: [],
    });
  });

  test("throws for unsupported React hooks without mutating the bubble", () => {
    const bubble = createBubble();
    const root = createBubbleReactRoot({ bubble });

    function Button() {
      useEffect(() => {});
      return <button />;
    }

    expect(() => root.render(<Button />)).toThrow(
      "bubble-react only supports useState in this slice",
    );
    expect(readSnapshot(bubble)).toEqual({
      kind: "root",
      children: [],
    });
  });
});

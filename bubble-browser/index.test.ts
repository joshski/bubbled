import { describe, expect, test } from "bun:test";

import { createBubble } from "../bubble-core";
import { createDomProjector } from "./index";

abstract class FakeDomNode {
  parentNode: FakeDomElement | null = null;

  remove() {
    this.parentNode?.removeChild(this);
  }

  abstract toMarkup(): string;
}

class FakeDomText extends FakeDomNode {
  constructor(readonly data: string) {
    super();
  }

  toMarkup(): string {
    return this.data;
  }
}

class FakeDomElement extends FakeDomNode {
  readonly childNodes: FakeDomNode[] = [];
  readonly attributes = new Map<string, string>();

  constructor(
    readonly ownerDocument: FakeDomDocument,
    readonly tagName: string,
  ) {
    super();
  }

  appendChild(node: FakeDomNode): FakeDomNode {
    node.parentNode = this;
    this.childNodes.push(node);
    return node;
  }

  removeChild(node: FakeDomNode): FakeDomNode {
    const childIndex = this.childNodes.indexOf(node);

    if (childIndex >= 0) {
      this.childNodes.splice(childIndex, 1);
      node.parentNode = null;
    }

    return node;
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  toMarkup(): string {
    const serializedAttributes = Array.from(this.attributes.entries())
      .map(([name, value]) => ` ${name}="${value}"`)
      .join("");
    const serializedChildren = this.childNodes.map((child) => child.toMarkup()).join("");

    return `<${this.tagName}${serializedAttributes}>${serializedChildren}</${this.tagName}>`;
  }
}

class FakeDomDocument {
  createElement(tag: string): FakeDomElement {
    return new FakeDomElement(this, tag);
  }

  createTextNode(value: string): FakeDomText {
    return new FakeDomText(value);
  }
}

function createContainer() {
  const document = new FakeDomDocument();
  const container = document.createElement("div");

  return {
    container,
    markup() {
      return container.childNodes.map((child) => child.toMarkup()).join("");
    },
  };
}

describe("createDomProjector", () => {
  test("initial mount creates the expected DOM", () => {
    const bubble = createBubble();

    bubble.transact((tx) => {
      const sectionId = tx.createElement({ tag: "section" });
      const buttonId = tx.createElement({ tag: "button" });
      const textId = tx.createText({ value: "Save" });

      tx.insertChild({ parentId: bubble.rootId, childId: sectionId });
      tx.insertChild({ parentId: sectionId, childId: buttonId });
      tx.insertChild({ parentId: buttonId, childId: textId });
    });

    const projector = createDomProjector({ bubble });
    const { container, markup } = createContainer();

    projector.mount(container as unknown as HTMLElement);

    expect(markup()).toBe("<section><button>Save</button></section>");
    expect(container.childNodes).toHaveLength(1);
  });

  test("projects text and attributes into the mounted container", () => {
    const bubble = createBubble();

    bubble.transact((tx) => {
      const buttonId = tx.createElement({ tag: "button" });
      const textId = tx.createText({ value: "Publish" });

      tx.setAttribute({ nodeId: buttonId, name: "type", value: "button" });
      tx.setAttribute({ nodeId: buttonId, name: "aria-label", value: "Publish entry" });
      tx.insertChild({ parentId: bubble.rootId, childId: buttonId });
      tx.insertChild({ parentId: buttonId, childId: textId });
    });

    const projector = createDomProjector({ bubble });
    const { container, markup } = createContainer();

    projector.mount(container as unknown as HTMLElement);

    const button = container.childNodes[0];

    expect(markup()).toBe('<button type="button" aria-label="Publish entry">Publish</button>');
    expect(button).toBeInstanceOf(FakeDomElement);
    expect((button as FakeDomElement).getAttribute("type")).toBe("button");
    expect((button as FakeDomElement).getAttribute("aria-label")).toBe("Publish entry");
  });

  test("cleanup removes only the projected nodes", () => {
    const bubble = createBubble();

    bubble.transact((tx) => {
      const textId = tx.createText({ value: "Mounted" });
      tx.insertChild({ parentId: bubble.rootId, childId: textId });
    });

    const projector = createDomProjector({ bubble });
    const { container, markup } = createContainer();
    const existingNode = container.ownerDocument.createElement("p");

    existingNode.appendChild(container.ownerDocument.createTextNode("Existing"));
    container.appendChild(existingNode);

    projector.unmount();
    projector.mount(container as unknown as HTMLElement);

    expect(markup()).toBe("<p>Existing</p>Mounted");

    projector.unmount();

    expect(markup()).toBe("<p>Existing</p>");
    expect(container.childNodes).toHaveLength(1);
  });

  test("rejects mounting the same projector twice without cleanup", () => {
    const bubble = createBubble();
    const projector = createDomProjector({ bubble });
    const { container } = createContainer();

    projector.mount(container as unknown as HTMLElement);

    expect(() => projector.mount(container as unknown as HTMLElement)).toThrow(
      "Bubble DOM projector is already mounted.",
    );
  });
});

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
  constructor(data: string) {
    super();
    this.data = data;
  }

  data: string;

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
    return this.insertBefore(node, null);
  }

  insertBefore(node: FakeDomNode, referenceNode: FakeDomNode | null): FakeDomNode {
    node.parentNode?.removeChild(node);
    node.parentNode = this;

    if (referenceNode === null) {
      this.childNodes.push(node);
      return node;
    }

    const referenceIndex = this.childNodes.indexOf(referenceNode);

    if (referenceIndex === -1) {
      this.childNodes.push(node);
      return node;
    }

    this.childNodes.splice(referenceIndex, 0, node);

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

  removeAttribute(name: string) {
    this.attributes.delete(name);
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

  test("applies insert, remove, move, and text updates incrementally", () => {
    const bubble = createBubble();
    let listId = "";
    let alphaId = "";
    let betaId = "";
    let gammaId = "";
    let alphaTextId = "";
    let betaTextId = "";
    let gammaTextId = "";

    bubble.transact((tx) => {
      listId = tx.createElement({ tag: "ul" });
      alphaId = tx.createElement({ tag: "li" });
      betaId = tx.createElement({ tag: "li" });
      gammaId = tx.createElement({ tag: "li" });
      alphaTextId = tx.createText({ value: "Alpha" });
      betaTextId = tx.createText({ value: "Beta" });
      gammaTextId = tx.createText({ value: "Gamma" });

      tx.insertChild({ parentId: bubble.rootId, childId: listId });
      tx.insertChild({ parentId: listId, childId: alphaId });
      tx.insertChild({ parentId: alphaId, childId: alphaTextId });
      tx.insertChild({ parentId: listId, childId: betaId });
      tx.insertChild({ parentId: betaId, childId: betaTextId });
    });

    const projector = createDomProjector({ bubble });
    const { container, markup } = createContainer();

    projector.mount(container as unknown as HTMLElement);

    bubble.transact((tx) => {
      tx.insertChild({ parentId: listId, childId: gammaId, index: 1 });
      tx.insertChild({ parentId: gammaId, childId: gammaTextId });
      tx.moveChild({ parentId: listId, childId: betaId, index: 0 });
      tx.setText({ nodeId: gammaTextId, value: "Delta" });
      tx.removeChild({ parentId: listId, childId: alphaId });
    });

    expect(markup()).toBe("<ul><li>Beta</li><li>Delta</li></ul>");
  });

  test("preserves projected node identity across in-place updates", () => {
    const bubble = createBubble();
    let listId = "";
    let firstItemId = "";
    let secondItemId = "";
    let firstTextId = "";

    bubble.transact((tx) => {
      listId = tx.createElement({ tag: "ul" });
      firstItemId = tx.createElement({ tag: "li" });
      secondItemId = tx.createElement({ tag: "li" });
      firstTextId = tx.createText({ value: "First" });
      const secondTextId = tx.createText({ value: "Second" });

      tx.insertChild({ parentId: bubble.rootId, childId: listId });
      tx.insertChild({ parentId: listId, childId: firstItemId });
      tx.insertChild({ parentId: firstItemId, childId: firstTextId });
      tx.insertChild({ parentId: listId, childId: secondItemId });
      tx.insertChild({ parentId: secondItemId, childId: secondTextId });
    });

    const projector = createDomProjector({ bubble });
    const { container, markup } = createContainer();

    projector.mount(container as unknown as HTMLElement);

    const list = container.childNodes[0] as FakeDomElement;
    const firstItemNode = list.childNodes[0];
    const firstTextNode = (firstItemNode as FakeDomElement).childNodes[0];

    bubble.transact((tx) => {
      tx.moveChild({ parentId: listId, childId: firstItemId, index: 1 });
      tx.setText({ nodeId: firstTextId, value: "Updated" });
    });

    expect(markup()).toBe("<ul><li>Second</li><li>Updated</li></ul>");
    expect(list.childNodes[1]).toBe(firstItemNode);
    expect((list.childNodes[1] as FakeDomElement).childNodes[0]).toBe(firstTextNode);
  });

  test("applies mounted attribute updates and ignores projected property-only mutations", () => {
    const bubble = createBubble();
    let inputId = "";

    bubble.transact((tx) => {
      inputId = tx.createElement({ tag: "input" });
      tx.insertChild({ parentId: bubble.rootId, childId: inputId });
    });

    const projector = createDomProjector({ bubble });
    const { container, markup } = createContainer();

    projector.mount(container as unknown as HTMLElement);

    bubble.transact((tx) => {
      tx.setAttribute({ nodeId: inputId, name: "type", value: "text" });
      tx.removeAttribute({ nodeId: inputId, name: "type" });
      tx.setProperty({ nodeId: inputId, name: "value", value: "Ignored in DOM projection" });
    });

    expect(markup()).toBe("<input></input>");
  });

  test("inserts root children incrementally before existing projected siblings", () => {
    const bubble = createBubble();
    let existingId = "";
    let existingTextId = "";
    let insertedId = "";
    let insertedTextId = "";

    bubble.transact((tx) => {
      existingId = tx.createElement({ tag: "main" });
      existingTextId = tx.createText({ value: "Existing" });
      insertedId = tx.createElement({ tag: "aside" });
      insertedTextId = tx.createText({ value: "Inserted" });

      tx.insertChild({ parentId: bubble.rootId, childId: existingId });
      tx.insertChild({ parentId: existingId, childId: existingTextId });
    });

    const projector = createDomProjector({ bubble });
    const { container, markup } = createContainer();

    projector.mount(container as unknown as HTMLElement);

    bubble.transact((tx) => {
      tx.insertChild({ parentId: bubble.rootId, childId: insertedId, index: 0 });
      tx.insertChild({ parentId: insertedId, childId: insertedTextId });
    });

    expect(markup()).toBe("<aside>Inserted</aside><main>Existing</main>");
  });
});

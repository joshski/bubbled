import { describe, expect, test } from "bun:test";

import type { BubbleStorage } from "../../bubble-capabilities";

import {
  appendSampleTodo,
  createTodoStore,
  DEFAULT_STORAGE_KEY,
  INITIAL_TODOS,
  removeTodo,
  SAMPLE_TODO_LABELS,
  summarizeTodos,
  toggleTodo,
  type TodoItem,
} from "./todo-store.ts";

function createInMemoryStorage(seed: Record<string, string> = {}): BubbleStorage {
  const entries = new Map<string, string>(Object.entries(seed));

  return {
    getItem(key) {
      return entries.get(key) ?? null;
    },
    setItem(key, value) {
      entries.set(key, value);
    },
    removeItem(key) {
      entries.delete(key);
    },
    clear() {
      entries.clear();
    },
  };
}

describe("pure todo helpers", () => {
  test("toggleTodo flips done for the matching item only", () => {
    const todos: readonly TodoItem[] = [
      { id: "a", label: "Alpha", done: false },
      { id: "b", label: "Beta", done: true },
    ];

    expect(toggleTodo(todos, "a")).toEqual([
      { id: "a", label: "Alpha", done: true },
      { id: "b", label: "Beta", done: true },
    ]);
  });

  test("removeTodo drops the matching item and keeps the rest", () => {
    const todos: readonly TodoItem[] = [
      { id: "a", label: "Alpha", done: false },
      { id: "b", label: "Beta", done: false },
    ];

    expect(removeTodo(todos, "a")).toEqual([{ id: "b", label: "Beta", done: false }]);
  });

  test("appendSampleTodo cycles through sample labels using the cycle index", () => {
    const firstTodos = appendSampleTodo([], 0);
    expect(firstTodos).toHaveLength(1);
    expect(firstTodos[0]?.label).toBe(SAMPLE_TODO_LABELS[0] ?? "");

    const wrappedTodos = appendSampleTodo(firstTodos, SAMPLE_TODO_LABELS.length);
    expect(wrappedTodos).toHaveLength(2);
    expect(wrappedTodos[1]?.label).toBe(SAMPLE_TODO_LABELS[0] ?? "");
  });

  test("summarizeTodos reports empty, partial, and complete states", () => {
    expect(summarizeTodos([])).toBe("No todos yet");
    expect(
      summarizeTodos([
        { id: "a", label: "A", done: false },
        { id: "b", label: "B", done: true },
      ]),
    ).toBe("1 of 2 remaining");
    expect(summarizeTodos([{ id: "a", label: "A", done: true }])).toBe("All done");
  });
});

describe("createTodoStore", () => {
  test("starts with INITIAL_TODOS when the storage is empty and no override is given", () => {
    const storage = createInMemoryStorage();
    const store = createTodoStore({ storage });

    expect(store.get()).toEqual([...INITIAL_TODOS]);
  });

  test("starts with the provided initialTodos when the storage is empty", () => {
    const storage = createInMemoryStorage();
    const initialTodos: readonly TodoItem[] = [{ id: "x", label: "X", done: false }];
    const store = createTodoStore({ storage, initialTodos });

    expect(store.get()).toEqual([...initialTodos]);
  });

  test("hydrates from a previously persisted payload at the default key", () => {
    const persisted: readonly TodoItem[] = [{ id: "p", label: "Persisted", done: true }];
    const storage = createInMemoryStorage({
      [DEFAULT_STORAGE_KEY]: JSON.stringify(persisted),
    });

    const store = createTodoStore({ storage });

    expect(store.get()).toEqual([...persisted]);
  });

  test("respects a custom storage key for reads and writes", () => {
    const storage = createInMemoryStorage();
    const store = createTodoStore({
      storage,
      storageKey: "custom-key",
      initialTodos: [{ id: "a", label: "A", done: false }],
    });

    store.toggle("a");

    expect(storage.getItem("custom-key")).not.toBeNull();
    expect(storage.getItem(DEFAULT_STORAGE_KEY)).toBeNull();
  });

  test("toggle, remove, and addSample persist the next state and notify subscribers", () => {
    const storage = createInMemoryStorage();
    const store = createTodoStore({
      storage,
      initialTodos: [
        { id: "a", label: "Alpha", done: false },
        { id: "b", label: "Beta", done: true },
      ],
    });
    const notifications: number[] = [];
    store.subscribe(() => {
      notifications.push(notifications.length + 1);
    });

    store.toggle("a");
    expect(store.get()[0]?.done).toBe(true);

    store.remove("b");
    expect(store.get()).toHaveLength(1);

    store.addSample();
    store.addSample();
    expect(store.get()).toHaveLength(3);
    expect(store.get()[1]?.label).toBe(SAMPLE_TODO_LABELS[0] ?? "");
    expect(store.get()[2]?.label).toBe(SAMPLE_TODO_LABELS[1] ?? "");

    expect(notifications).toHaveLength(4);

    const persisted = storage.getItem(DEFAULT_STORAGE_KEY);
    expect(persisted).not.toBeNull();
    expect(JSON.parse(persisted as string)).toEqual([...store.get()]);
  });

  test("subscribe returns an unsubscribe that stops further notifications", () => {
    const storage = createInMemoryStorage();
    const store = createTodoStore({
      storage,
      initialTodos: [{ id: "a", label: "Alpha", done: false }],
    });

    let notified = 0;
    const unsubscribe = store.subscribe(() => {
      notified += 1;
    });

    store.toggle("a");
    expect(notified).toBe(1);

    unsubscribe();
    store.toggle("a");
    expect(notified).toBe(1);
  });
});

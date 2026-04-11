import { describe, expect, test } from 'vitest'

import {
  appendTodo,
  normalizeTodoLabel,
  removeTodo,
  summarizeTodos,
  toggleTodo,
  type TodoItem,
} from './todos.ts'

describe('todo domain helpers', () => {
  test('normalizes labels by trimming and collapsing whitespace', () => {
    expect(normalizeTodoLabel('  Ship   it  ')).toBe('Ship it')
  })

  test('appends a new incomplete todo with a normalized label', () => {
    const todos: readonly TodoItem[] = [
      { id: 't1', label: 'Alpha', done: false },
    ]

    expect(appendTodo(todos, '  Write   tests  ')).toEqual([
      { id: 't1', label: 'Alpha', done: false },
      { id: 't2', label: 'Write tests', done: false },
    ])
  })

  test('returns the same array when asked to append a blank todo', () => {
    const todos: readonly TodoItem[] = [
      { id: 't1', label: 'Alpha', done: false },
    ]

    expect(appendTodo(todos, '   ')).toBe(todos)
  })

  test('toggles only the matching todo', () => {
    expect(
      toggleTodo(
        [
          { id: 't1', label: 'Alpha', done: false },
          { id: 't2', label: 'Beta', done: true },
        ],
        't1'
      )
    ).toEqual([
      { id: 't1', label: 'Alpha', done: true },
      { id: 't2', label: 'Beta', done: true },
    ])
  })

  test('removes only the matching todo', () => {
    expect(
      removeTodo(
        [
          { id: 't1', label: 'Alpha', done: false },
          { id: 't2', label: 'Beta', done: true },
        ],
        't2'
      )
    ).toEqual([{ id: 't1', label: 'Alpha', done: false }])
  })

  test('summarizes empty, complete, and incomplete lists', () => {
    expect(summarizeTodos([])).toBe('No todos yet')
    expect(summarizeTodos([{ id: 't1', label: 'Alpha', done: true }])).toBe(
      'All done'
    )
    expect(
      summarizeTodos([
        { id: 't1', label: 'Alpha', done: false },
        { id: 't2', label: 'Beta', done: true },
      ])
    ).toBe('1 of 2 remaining')
  })
})

import type { BubbleNetwork } from '../../../bubble-capabilities'

import { mountBubbleApp } from '../../../bubble-browser'
import { createBubble } from '../../../bubble-core'
import {
  startTodoApp,
  type TodoAppContainer,
  type TodoStartHost,
} from '../app/start-todo-app.ts'

const network: BubbleNetwork = {
  async fetch(request) {
    const response = await globalThis.fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    })
    const body = await response.text()
    const headers: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      headers[key] = value
    })
    return { status: response.status, headers, body }
  },
}

const bubble = createBubble({ capabilities: { network } })

const host: TodoStartHost = {
  getAppContainer(): TodoAppContainer | null {
    const element = globalThis.document.getElementById('app')

    if (!(element instanceof HTMLElement)) return null

    return {
      replaceChildren: () => element.replaceChildren(),
      appendChild: node => {
        element.appendChild(node as unknown as Node)
      },
    }
  },
  mountApp(container, app) {
    const mount = mountBubbleApp({
      app,
      container: container as unknown as HTMLElement,
      bridgeEvents: true,
      syncFocus: true,
    })
    return () => mount.unmount()
  },
  onBeforeUnload(listener): void {
    globalThis.addEventListener('beforeunload', listener, { once: true })
  },
  createErrorMessage(text) {
    const paragraph = globalThis.document.createElement('p')
    paragraph.textContent = text
    return paragraph
  },
  logError(error): void {
    console.error(error)
  },
}

await startTodoApp(host, bubble)

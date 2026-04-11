import type {
  BubbleDispatchResult,
  BubbleNamespace,
  BubbleNodeId,
  BubbleRuntime,
} from '../bubble-core'

export interface BubbleRenderElement {
  readonly tag: string
  readonly namespace?: BubbleNamespace
  readonly attributes?: Readonly<Record<string, string>>
  readonly properties?: Readonly<Record<string, unknown>>
  readonly children?: readonly BubbleRenderContent[]
}

export type BubbleRenderContent = string | BubbleRenderElement

export interface BubbleHarnessContext {
  readonly bubble: BubbleRuntime
}

export interface BubbleRenderHarness extends BubbleHarnessContext {
  render(content: BubbleRenderContent | readonly BubbleRenderContent[]): void
  cleanup(): void
  click(target: BubbleNodeId): BubbleDispatchResult
  tab(options?: { shift?: boolean }): void
}

export interface BubbleSemanticQueries {
  getByRole(role: string, options?: { name?: string | RegExp }): string
  getByText(text: string | RegExp): string
}

export interface BubbleSemanticAssertions {
  expectRole(target: BubbleNodeId, role: string): void
  expectName(target: BubbleNodeId, name: string | null): void
  expectText(target: BubbleNodeId, value: string): void
  expectFocused(target: BubbleNodeId): void
  expectValue(target: BubbleNodeId, value: string): void
  expectChecked(target: BubbleNodeId, checked: boolean): void
}

export type BubbleHarness = BubbleRenderHarness &
  BubbleSemanticQueries &
  BubbleSemanticAssertions

export interface BubbleClock {
  now(): number;
}

export interface BubbleTimerHandle {
  id: string;
}

export interface BubbleTimers {
  setTimeout(callback: () => void, delayMs: number): BubbleTimerHandle;
  clearTimeout(handle: BubbleTimerHandle): void;
}

export interface BubbleFrameHandle {
  id: string;
}

export interface BubbleScheduler {
  queueMicrotask(task: () => void): void;
  requestFrame(task: (time: number) => void): BubbleFrameHandle;
  cancelFrame(handle: BubbleFrameHandle): void;
}

export interface BubbleRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BubbleLayout {
  measureElement(nodeId: string): BubbleRect;
}

export interface BubbleViewportState {
  width: number;
  height: number;
  scrollX: number;
  scrollY: number;
}

export type BubbleViewportListener = (state: BubbleViewportState) => void;

export interface BubbleViewport {
  getState(): BubbleViewportState;
  subscribe?(listener: BubbleViewportListener): () => void;
}

export interface BubbleStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

export interface BubbleNetworkRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface BubbleNetworkResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface BubbleNetwork {
  fetch(request: BubbleNetworkRequest): Promise<BubbleNetworkResponse>;
}

export interface BubbleCapabilities {
  clock: BubbleClock;
  timers: BubbleTimers;
  scheduler: BubbleScheduler;
  layout: BubbleLayout;
  viewport: BubbleViewport;
  storage: BubbleStorage;
  network: BubbleNetwork;
}

export type BubbleCapabilityName = keyof BubbleCapabilities;

export class BubbleUnsupportedCapabilityError extends Error {
  readonly capabilityName: BubbleCapabilityName;

  constructor(capabilityName: BubbleCapabilityName) {
    super(`Bubble capability ${JSON.stringify(capabilityName)} is not supported by this runtime.`);
    this.name = "BubbleUnsupportedCapabilityError";
    this.capabilityName = capabilityName;
  }
}

export interface BubbleCapabilityRegistry {
  resolveCapability<Name extends BubbleCapabilityName>(name: Name): BubbleCapabilities[Name];
}

export function createCapabilityRegistry(
  capabilities: Partial<BubbleCapabilities> = {},
): BubbleCapabilityRegistry {
  const registeredCapabilities = { ...capabilities };

  return Object.freeze({
    resolveCapability(name) {
      const capability = registeredCapabilities[name];

      if (capability === undefined) {
        throw new BubbleUnsupportedCapabilityError(name);
      }

      return capability;
    },
  });
}

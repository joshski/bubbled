import type {
  BubbleLayout,
  BubbleRect,
  BubbleViewportState,
} from '../../bubble-capabilities'
import type { BubbleNodeId, BubbleRuntime } from '../../bubble-core'

import { getDomProjectionState } from './projection-state'

export interface PlacementInput {
  anchor: BubbleRect
  overlay: BubbleRect
  viewport: BubbleViewportState
}

export interface PlacementOutput {
  x: number
  y: number
  placement: 'top' | 'bottom'
}

interface DomProjectorLike {
  mount(container: HTMLElement): void
  unmount(): void
}

export function placePopover(input: PlacementInput): PlacementOutput {
  const fitsBelow =
    input.anchor.y + input.anchor.height + input.overlay.height <=
    input.viewport.height

  if (fitsBelow) {
    return {
      x: input.anchor.x,
      y: input.anchor.y + input.anchor.height,
      placement: 'bottom',
    }
  }

  return {
    x: input.anchor.x,
    y: input.anchor.y - input.overlay.height,
    placement: 'top',
  }
}

export function measureAndPlacePopover(
  bubble: Pick<BubbleRuntime, 'measureElement' | 'getViewportState'>,
  anchorId: BubbleNodeId,
  overlayId: BubbleNodeId
): PlacementOutput {
  return placePopover({
    anchor: bubble.measureElement(anchorId),
    overlay: bubble.measureElement(overlayId),
    viewport: bubble.getViewportState(),
  })
}

export function createDomLayout(options: {
  projector: DomProjectorLike
}): BubbleLayout {
  return Object.freeze({
    measureElement(nodeId: BubbleNodeId) {
      const projectionState = getDomProjectionState(options.projector)

      if (projectionState === undefined) {
        throw new Error(
          'Bubble DOM projector does not support DOM-backed layout measurement.'
        )
      }

      const element = projectionState.getProjectedElement(nodeId)

      if (element === undefined) {
        throw new Error(
          `Bubble DOM projector has no projected element for node ${nodeId}.`
        )
      }

      if (element.parentNode === null) {
        throw new Error(
          `Bubble DOM projector cannot measure detached node ${nodeId}.`
        )
      }

      const rect = element.getBoundingClientRect()

      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      }
    },
  })
}

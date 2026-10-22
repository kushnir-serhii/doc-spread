import type { DocumentPage } from '@/lib/mock/types'
import type { PointingSel } from './pointing-types'
import { tokensInRect, unionBBox } from './token-hit-test'
import type { ViewerSelection } from './viewer-types'

/** turn a pointing state into the payload: whole tokens in reading order, bbox in page coordinates */
export const resolveSelection = (page: DocumentPage, sel: PointingSel): ViewerSelection => {
  switch (sel.kind) {
    case 'words': {
      const tokens = page.tokens.slice(Math.min(sel.anchor, sel.focus), Math.max(sel.anchor, sel.focus) + 1)
      return { page: page.index, bbox: unionBBox(tokens.map((t) => t.bbox)), tokens, text: tokens.map((t) => t.text).join(' ') }
    }
    case 'region': {
      const tokens = tokensInRect(page.tokens, sel.rect).map((i) => page.tokens[i])
      return { page: page.index, bbox: sel.rect, tokens, text: tokens.map((t) => t.text).join(' ') }
    }
    default: {
      const unreachable: never = sel
      return unreachable
    }
  }
}

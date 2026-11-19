import { loadImage } from '@napi-rs/canvas'
import { createWorker, type Worker } from 'tesseract.js'
import { normalizeBox, tokenId, type OcrPage, type Token } from './page-types.js'

// English and Ukrainian. The language data is downloaded at runtime and cached in /tmp for the warm container.
const LANGUAGES = ['eng', 'ukr']
const CACHE_PATH = '/tmp'

let worker: Promise<Worker> | undefined
const getWorker = (): Promise<Worker> => {
  worker ??= createWorker(LANGUAGES, 1, { cachePath: CACHE_PATH })
  return worker
}

/** Word boxes of one page image (PNG or JPEG bytes), normalized by the image size. */
export const recognizeImage = async (image: Buffer, pageIndex: number): Promise<OcrPage> => {
  const decoded = await loadImage(image)
  const width = decoded.width
  const height = decoded.height
  const result = await (await getWorker()).recognize(image, {}, { blocks: true })
  const tokens: Token[] = []
  for (const block of result.data.blocks ?? []) {
    for (const paragraph of block.paragraphs) {
      for (const line of paragraph.lines) {
        for (const word of line.words) {
          const text = word.text.trim()
          if (text === '') continue
          const { x0, y0, x1, y1 } = word.bbox
          tokens.push({ id: tokenId(pageIndex, tokens.length), text, bbox: normalizeBox(x0, y0, x1, y1, width, height) })
        }
      }
    }
  }
  return { index: pageIndex, width, height, tokens }
}

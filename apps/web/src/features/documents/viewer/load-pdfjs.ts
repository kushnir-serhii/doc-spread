import type { PDFDocumentProxy } from 'pdfjs-dist'

type PdfJs = typeof import('pdfjs-dist')

let pdfjsPromise: Promise<PdfJs> | null = null
const documents = new Map<string, Promise<PDFDocumentProxy>>()

/** pdf.js and its worker are separate chunks: they load on first use, only where the viewer is mounted. */
export const loadPdfjs = (): Promise<PdfJs> => {
  pdfjsPromise ??= Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]).then(([pdfjs, worker]) => {
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
    return pdfjs
  })
  pdfjsPromise.catch(() => {
    pdfjsPromise = null
  })
  return pdfjsPromise
}

/** One PDFDocumentProxy per URL; a failed load is not cached, so retry works. */
export const loadPdfDocument = (url: string): Promise<PDFDocumentProxy> => {
  let doc = documents.get(url)
  if (!doc) {
    doc = loadPdfjs().then((pdfjs) => pdfjs.getDocument({ url }).promise)
    documents.set(url, doc)
    doc.catch(() => documents.delete(url))
  }
  return doc
}

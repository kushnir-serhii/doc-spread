import type { GlossaryKey } from './glossary'

/** Sequence diagram: one document from sign-in to export (specs 022 and 023: Vercel Functions, Supabase). */
export const PIPELINE_DIAGRAM = `sequenceDiagram
  participant B as Browser (web app)
  participant A as Vercel Function /api
  participant ST as Supabase Storage (documents)
  participant AU as Supabase Auth
  participant DB as Postgres (Supabase, pgmq)
  participant CR as pg_cron + pg_net
  participant O as Vercel Function /api/pipeline/ocr
  participant X as Vercel Function /api/pipeline/extract
  participant C as Claude API

  B->>AU: sign in (publishable key), then every read below runs with the user's session under RLS
  B->>A: POST /api/uploads
  A->>A: verify token, scope to the caller's company
  A->>DB: create the document row (status uploaded)
  A-->>B: document id and signed upload URL
  B->>ST: upload the file
  B->>A: POST /api/uploads/:id/complete
  A->>DB: status processing, enqueue in pgmq queue ocr
  loop every 30 s
    CR->>O: POST with x-pipeline-secret
  end
  O->>DB: read a message from queue ocr
  O->>ST: read the file
  O->>O: read the PDF text layer (pdfjs), or tesseract.js for scans and photos
  O->>DB: write pages and word boxes
  O->>DB: enqueue in queue extract
  CR->>X: POST with x-pipeline-secret
  X->>DB: read a message from queue extract
  X->>C: classify (Claude Haiku)
  C-->>X: document type and confidence
  X->>ST: read the file
  X->>C: extract fields (Claude Opus, file and words)
  C-->>X: values, confidence, cited words
  X->>DB: write status (needs_review, or unclassified when unsure), values
  loop every 3 s until status is needs_review (or unclassified, error)
    B->>DB: read the document row (RLS: own company only)
    DB-->>B: current status
  end
  B->>DB: read document_pages (words, boxes) and the type version
  B->>ST: signed URL of the file (RLS: own company only)
  Note over B,DB: review: edit values (update with the version check, edited values get confidence 1), approve or reject (status update)
  B->>A: POST /api/exports (type, format xlsx or csv)
  A->>DB: read approved documents, build the rows from the type's export mapping
  A->>ST: write exports/company/job (bucket exports)
  A->>DB: export_jobs row, documents become exported
  A-->>B: job id and signed download link (10 min)
  B->>ST: download the file

  alt a step fails
    Note over O,X: the message stays and is read again after its visibility timeout
    O->>DB: after 3 failed reads archive the message, status error
    X->>DB: after 3 failed reads archive the message, status error
  end
`

/** Mermaid participant id → glossary entry. */
export const PIPELINE_ITEMS: Record<string, GlossaryKey> = {
  B: 'browserApp',
  AU: 'supabaseAuth',
  A: 'fnApiRouter',
  ST: 'storageDocuments',
  DB: 'supabasePostgres',
  CR: 'pgCronPgNet',
  O: 'fnPipelineOcr',
  X: 'fnPipelineExtract',
  C: 'claudeApi',
}

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
  participant K as classifyAndExtract (extract-core.ts)
  participant C as Claude API
  participant E as eval-extract (services/api/scripts)
  participant R as Eval runner (evals/, Python)

  B->>AU: sign in (publishable key), then every read below runs with the user's session under RLS
  B->>A: POST /api/uploads
  A->>A: verify token, scope to the caller's company
  A->>DB: create the document row (status uploaded; a database trigger checks the monthly limit)
  alt the company is at its monthly document limit (spec 031)
    DB-->>A: error limit_reached
    A-->>B: 409 limit_reached with limit, used and resetsAt (nothing stored)
  else under the limit
    A-->>B: document id and signed upload URL
  end
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
  X->>ST: read the file
  X->>K: pages, file, the company's types
  K->>C: classify (Claude Haiku)
  C-->>K: document type and confidence
  K->>C: extract fields (Claude Opus, file and words)
  C-->>K: values, confidence, cited words
  K-->>X: outcome, values, overall confidence, usage per call
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

  Note over B,K: change of type (spec 032): from needs_review, unclassified, approved or rejected
  B->>A: POST /api/documents/:id/type (type id)
  A->>DB: check company, status, type and the 3-change limit
  alt wrong status, foreign document or type, or the limit is reached
    A-->>B: 404 not_found, 404 type_not_found, 409 wrong_status or 409 too_many_changes
  else allowed
    A->>DB: status processing, new type and version, values cleared, changes + 1
    A->>DB: enqueue in queue extract (OCR is not run again)
    A-->>B: 202 processing
    X->>DB: read the message, the document already has a type
    X->>K: pages, file, the chosen type (no classify)
    K->>C: extract fields (Claude Opus, file and words)
    X->>DB: write status needs_review, values (unclassified if the type was deleted meanwhile)
  end

  Note over R,C: eval path (spec 026): the same core, with no database, Storage or queue
  R->>E: one process per dataset document: file, types, model overrides
  E->>E: read the local file, readPages (the OCR step's code)
  E->>K: pages, file, types
  K->>C: classify, then extract
  C-->>K: values, confidence
  K-->>E: outcome, values, usage per call
  E-->>R: one JSON result on stdout (the runner scores it against the truth file)

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
  K: 'coreClassifyAndExtract',
  E: 'scriptEvalExtract',
  R: 'evalsProject',
  C: 'claudeApi',
}

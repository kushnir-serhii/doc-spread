/** Sequence diagram: one document from upload to review (spec 022: Vercel Functions, Supabase). */
export const PIPELINE_DIAGRAM = `sequenceDiagram
  participant B as Browser (web app)
  participant A as Vercel Function /api
  participant ST as Supabase Storage (documents)
  participant DB as Postgres (Supabase, pgmq)
  participant CR as pg_cron + pg_net
  participant O as Vercel Function /api/pipeline/ocr
  participant X as Vercel Function /api/pipeline/extract
  participant C as Claude API

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
  loop until status is needs_review
    B->>A: poll the document status
    A->>DB: read status
    A-->>B: current status
  end

  alt a step fails
    Note over O,X: the message stays and is read again after its visibility timeout
    O->>DB: after 3 failed reads archive the message, status error
    X->>DB: after 3 failed reads archive the message, status error
  end
`

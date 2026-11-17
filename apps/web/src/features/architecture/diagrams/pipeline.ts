/** Sequence diagram: one document from upload to review (spec 020, slice 6). */
export const PIPELINE_DIAGRAM = `sequenceDiagram
  participant B as Browser (web app)
  participant A as API (Lambda)
  participant S3 as S3 documents bucket
  participant Q as SQS ingest queue
  participant O as OCR worker (Lambda)
  participant QE as SQS extract queue
  participant X as Extract worker (Lambda)
  participant C as Claude API
  participant DB as Postgres (Supabase)

  B->>A: ask for an upload URL
  A->>A: verify token, scope to the caller's company
  A->>DB: create the document row (status uploaded)
  A-->>B: document id and presigned upload (key, size and type pinned)
  B->>S3: upload the file
  S3->>Q: object created event
  Q->>O: start job
  O->>DB: status processing
  O->>S3: read the file
  O->>O: read the PDF text layer, or Tesseract for scans and photos
  O->>DB: write words with boxes
  O->>QE: OCR done
  QE->>X: start extraction
  X->>C: classify (Claude Haiku)
  C-->>X: document type and confidence
  X->>S3: read the file
  X->>C: extract fields (Claude Opus, file and words)
  C-->>X: values, confidence, cited words
  X->>DB: write status (needs_review, or unclassified when unsure), values
  loop until status is needs_review
    B->>A: poll the document status
    A->>DB: read status
    A-->>B: current status
  end

  alt a step fails
    Q-->>Q: retries, then dead-letter queue
    O->>DB: status error (unreadable file)
    X->>DB: status error
  end
`

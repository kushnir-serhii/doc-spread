/** Sequence diagram: one document from upload to review (planned, spec 020 pipeline line). */
export const PIPELINE_DIAGRAM = `sequenceDiagram
  participant B as Browser (web app)
  participant A as API (Lambda)
  participant S3 as S3 documents bucket
  participant Q as SQS
  participant W as Pipeline worker (Lambda)
  participant T as Textract
  participant N as SNS
  participant C as Claude API
  participant DB as Postgres (Supabase)

  B->>A: ask for an upload URL
  A->>A: verify token, scope to the caller's company
  A-->>B: presigned upload URL
  B->>S3: upload the file
  S3->>Q: object created event
  Q->>W: start job
  W->>DB: status processing
  W->>T: start text detection
  T-->>N: job completed
  N->>Q: completion message
  Q->>W: job finished
  W->>T: read words with boxes
  W->>C: classify (Claude Haiku)
  C-->>W: document type
  W->>C: extract fields (Claude Opus)
  C-->>W: values and confidence
  W->>DB: write status, values, word boxes
  loop until status is needs_review
    B->>A: poll the document status
    A->>DB: read status
    A-->>B: current status
  end

  alt a step fails
    Q-->>Q: retries, then dead-letter queue
    W->>DB: status error
  end
`

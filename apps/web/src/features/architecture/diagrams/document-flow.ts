import type { GlossaryKey } from './glossary'

/**
 * Activity diagram with swimlanes: one file from upload to download. Statuses are values of DOCUMENT_STATUSES
 * (src/lib/mock/types.ts); the steps follow services/api/src/ and apps/web/api/ (same as the Pipeline tab).
 */
export const DOCUMENT_FLOW_DIAGRAM = `flowchart TB
  subgraph browser["Browser"]
    b1["1. POST /api/uploads: file name, type, size"]
    b2["3. Signed upload of the file"]
    b3["4. POST /api/uploads/:id/complete"]
    b4["Poll the document row every 3 s (RLS)"]
    b5["Review: edit values, approve or reject"]
    b6["POST /api/exports: xlsx or csv"]
    b7["Download from the signed link (10 min)"]
  end

  subgraph fns["Vercel Functions"]
    f1["api/router: verify token, create the row, sign the upload"]
    f2["api/router: check the file exists, enqueue"]
    f3["pipeline/ocr: PDF text layer, or tesseract.js for scans"]
    f4["pipeline/extract: classify, then extract"]
    f5["api/router: build XLSX or CSV from the type's export mapping"]
  end

  subgraph supa["Supabase"]
    s1["Postgres documents: status uploaded"]
    s2[("Storage: documents")]
    s3["Postgres documents: status processing"]
    s4["pgmq queue: ocr"]
    s5["pg_cron + pg_net: every 30 s, POST to the pipeline functions"]
    s6["Postgres: pages and tokens"]
    s7["pgmq queue: extract"]
    s8["Postgres documents: status needs_review, values"]
    s9["Postgres documents: status unclassified"]
    s10["Postgres documents: status error"]
    s11["Postgres documents: status approved"]
    s12[("Storage: exports")]
    s13["Postgres: export job, documents status exported"]
  end

  subgraph anth["Anthropic"]
    a1["Claude Haiku: classify"]
    a2["Claude Opus: extract"]
  end

  b1 --> f1
  f1 -->|"2. row"| s1
  f1 -->|"signed upload URL"| b2
  b2 --> s2
  b2 --> b3
  b3 --> f2
  f2 --> s3
  f2 -->|"enqueue"| s4
  s5 -->|"POST x-pipeline-secret"| f3
  s5 -->|"POST x-pipeline-secret"| f4
  s4 -->|"read a message"| f3
  f3 --> s6
  f3 -->|"enqueue"| s7
  f3 -->|"unreadable file, or 3 failed reads"| s10
  s7 -->|"read a message"| f4
  f4 <-->|"first page text, types: type, confidence"| a1
  f4 <-->|"file and words: values, cited words"| a2
  f4 --> s8
  f4 -->|"no type matched"| s9
  f4 -->|"3 failed reads"| s10
  s8 -.-> b4
  s9 -.-> b4
  s10 -.-> b4
  b4 --> b5
  b5 --> s11
  s11 --> b6
  b6 --> f5
  f5 -->|"writes exports/company/job"| s12
  f5 --> s13
  f5 -->|"signed link"| b7
  b7 --> s12
`

/** Mermaid node id → glossary entry. */
export const DOCUMENT_FLOW_ITEMS: Record<string, GlossaryKey> = {
  b1: 'flowUploadRequest',
  b2: 'flowSignedPut',
  b3: 'flowComplete',
  b4: 'flowPoll',
  b5: 'screenReview',
  b6: 'flowExportRequest',
  b7: 'flowDownload',
  f1: 'fnApiRouter',
  f2: 'fnApiRouter',
  f3: 'fnPipelineOcr',
  f4: 'fnPipelineExtract',
  f5: 'flowExportApi',
  s1: 'statusUploaded',
  s2: 'storageDocuments',
  s3: 'statusProcessing',
  s4: 'pgmqOcr',
  s5: 'pgCronPgNet',
  s6: 'dbPages',
  s7: 'pgmqExtract',
  s8: 'statusNeedsReview',
  s9: 'statusUnclassified',
  s10: 'statusError',
  s11: 'statusApproved',
  s12: 'storageExports',
  s13: 'statusExported',
  a1: 'claudeClassify',
  a2: 'claudeExtract',
}

/** Deployment diagram: what runs where, from the Architecture table of spec 020 (planned). */
export const DEPLOYMENT_DIAGRAM = `flowchart LR
  subgraph user["User device"]
    browser["Browser (web app)"]
  end

  subgraph aws["AWS (eu-north-1, Stockholm)"]
    cdn["CloudFront"]
    webBucket["S3 web bucket"]
    api["API (Lambda Function URL)"]
    ocr["OCR Lambda (PDF text layer + Tesseract)"]
    extract["Extract Lambda"]
    docs[("S3 documents bucket, private")]
    exports[("S3 exports bucket, private")]
    sqs["SQS ingest queue + dead-letter queue"]
    sqsExtract["SQS extract queue + dead-letter queue"]
    ses["SES (email, on hold)"]
    ssm["SSM Parameter Store (secrets)"]
  end

  subgraph supa["Supabase"]
    pg[("Postgres with row-level security")]
    auth["Auth"]
  end

  subgraph anth["Anthropic"]
    claude["Claude API"]
  end

  subgraph gh["GitHub Actions"]
    deploy["Deploy jobs"]
  end

  browser -->|"HTTPS: app files"| cdn
  cdn -->|"origin access"| webBucket
  browser -->|"HTTPS: API calls"| api
  browser -->|"sign in"| auth
  browser -->|"presigned upload"| docs
  api -->|"verify token (JWKS)"| auth
  api -->|"SQL"| pg
  api -->|"presign"| docs
  api -->|"presign downloads"| exports
  docs -->|"object created event"| sqs
  sqs -->|"trigger"| ocr
  ocr -->|"read file"| docs
  ocr -->|"OCR done"| sqsExtract
  sqsExtract -->|"trigger"| extract
  extract -->|"read file"| docs
  extract -->|"HTTPS: classify, extract"| claude
  ocr -->|"SQL: words with boxes"| pg
  extract -->|"SQL: status, values"| pg
  api -->|"send export mail"| ses
  auth -->|"SMTP for auth email"| ses
  api -.->|"read secrets"| ssm
  ocr -.->|"read secrets"| ssm
  extract -.->|"read secrets"| ssm
  deploy -->|"OIDC role"| aws
  deploy -->|"migrations"| pg
`

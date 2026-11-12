/** Deployment diagram: what runs where, from the Architecture table of spec 020 (planned). */
export const DEPLOYMENT_DIAGRAM = `flowchart LR
  subgraph user["User device"]
    browser["Browser (web app)"]
  end

  subgraph aws["AWS"]
    cdn["CloudFront"]
    webBucket["S3 web bucket"]
    api["API (Lambda)"]
    worker["Pipeline Lambdas"]
    docs[("S3 documents bucket, private")]
    exports[("S3 exports bucket, private")]
    sqs["SQS queues + dead-letter queues"]
    sns["SNS topic"]
    textract["Textract (OCR)"]
    ses["SES (email)"]
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
  docs -->|"object created event"| sqs
  sqs -->|"trigger"| worker
  worker -->|"start job"| textract
  textract -->|"read file"| docs
  textract -->|"job completed"| sns
  sns -->|"message"| sqs
  worker -->|"HTTPS: classify, extract"| claude
  worker -->|"SQL"| pg
  worker -->|"write files"| exports
  api -->|"send export mail"| ses
  auth -->|"SMTP for auth email"| ses
  api -.->|"read secrets"| ssm
  worker -.->|"read secrets"| ssm
  deploy -->|"OIDC role"| aws
  deploy -->|"migrations"| pg
`

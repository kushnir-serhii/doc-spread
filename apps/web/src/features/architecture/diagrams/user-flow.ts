import type { GlossaryKey } from './glossary'

/**
 * Activity diagram with swimlanes: a user from sign-up to a downloaded spreadsheet. Routes are those of router.tsx.
 * Only the real path with VITE_USE_MOCKS=false is drawn: onboarding and assigning a type are mock only
 * (lib/api, lib/real/not-available.ts) and left out.
 */
export const USER_FLOW_DIAGRAM = `flowchart TB
  subgraph user["User"]
    open["Open /sign-up (new company) or /sign-in"]
    createtype["Create a document type on /types/new"]
    choose["Choose files on /upload"]
    inbox["Wait, watching /inbox"]
    review["Review and edit values on /documents/:documentId"]
    verdict{"Approve or reject?"}
    rejected["Rejected: kept with its reason"]
    exportpick["Pick a type and format on /export"]
    download["Download the spreadsheet"]
  end

  subgraph web["Web app"]
    submit["Submit the form"]
    taken["Error: company or email taken"]
    wrongpw["Error: wrong email or password"]
    savetype["Save the type (Supabase client, RLS)"]
    filecheck{"File accepted? PDF, JPG or PNG, up to 20 MB"}
    refused["Error: file refused, with the reason"]
    uploadwait["Upload the file and poll the document every 3 s"]
    statuscheck{"Which status?"}
    errorstate["Status error: processing failed"]
    savereview["Save edits and the decision (Supabase client, RLS)"]
    showlink["Show the download link"]
  end

  subgraph backend["Backend"]
    signup["POST /api/signup: create user, company, owner"]
    auth["Supabase Auth: sign in, session"]
    pipeline["Pipeline: OCR, then Claude (see Document flow)"]
    exportapi["POST /api/exports: build XLSX or CSV"]
  end

  open --> submit
  submit -->|"sign up"| signup
  submit -->|"sign in"| auth
  signup -->|"409 company_taken or email_taken"| taken
  taken --> open
  signup -->|"created, then sign in"| auth
  auth -->|"wrong password"| wrongpw
  wrongpw --> open
  auth -->|"session"| createtype
  createtype --> savetype
  savetype --> choose
  choose --> filecheck
  filecheck -->|"no"| refused
  refused --> choose
  filecheck -->|"yes"| uploadwait
  uploadwait -->|"uploaded, processing"| pipeline
  pipeline --> statuscheck
  statuscheck -->|"processing"| inbox
  inbox -->|"every 3 s"| statuscheck
  statuscheck -->|"needs_review"| review
  statuscheck -->|"unclassified: can be rejected"| rejected
  statuscheck -->|"error"| errorstate
  review --> savereview
  savereview --> verdict
  verdict -->|"approve: approved"| exportpick
  verdict -->|"reject: rejected"| rejected
  rejected -->|"approve again"| verdict
  exportpick --> exportapi
  exportapi -->|"exported"| showlink
  showlink --> download
`

/** Mermaid node id → glossary entry. */
export const USER_FLOW_ITEMS: Record<string, GlossaryKey> = {
  open: 'flowOpenAuth',
  createtype: 'screenTypesNew',
  choose: 'screenUpload',
  inbox: 'screenInbox',
  review: 'screenReview',
  verdict: 'flowApproveOrReject',
  rejected: 'statusRejected',
  exportpick: 'screenExport',
  download: 'flowDownload',
  submit: 'flowSubmitAuth',
  taken: 'flowCompanyTaken',
  wrongpw: 'flowWrongPassword',
  savetype: 'flowSaveType',
  filecheck: 'flowFileCheck',
  refused: 'flowFileRefused',
  uploadwait: 'flowUploadPoll',
  statuscheck: 'flowStatusCheck',
  errorstate: 'statusError',
  savereview: 'flowSaveReview',
  showlink: 'flowDownload',
  signup: 'flowSignupApi',
  auth: 'supabaseAuth',
  pipeline: 'flowBackendPipeline',
  exportapi: 'flowExportApi',
}

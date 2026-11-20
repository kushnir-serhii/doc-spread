import type { GlossaryKey } from './glossary'

/** State diagram: every value of DOCUMENT_STATUSES and its transitions (src/lib/mock/types.ts, api.ts). */
export const LIFECYCLE_DIAGRAM = `stateDiagram-v2
  direction TB
  state "Uploaded" as uploaded
  state "Processing" as processing
  state "Unclassified" as unclassified
  state "Needs review" as needs_review
  state "Approved" as approved
  state "Exported" as exported
  state "Rejected" as rejected
  state "Error" as error

  [*] --> uploaded : file transferred (uploadDocument)
  uploaded --> processing : pipeline starts (runPipeline)
  processing --> needs_review : type chosen or classified, fields extracted (applyExtraction)
  processing --> unclassified : no type matched (runPipeline)
  unclassified --> processing : user assigns a type (reassignDocumentType)
  needs_review --> processing : user changes the type (reassignDocumentType)
  needs_review --> approved : user approves (approveDocuments)
  needs_review --> rejected : user rejects (rejectDocument)
  unclassified --> rejected : user rejects (rejectDocument)
  approved --> rejected : user rejects (rejectDocument)
  rejected --> approved : user approves again (approveDocuments)
  approved --> exported : export job created (createExportJob)
  approved --> processing : user changes the type (reassignDocumentType)
  rejected --> processing : user changes the type (reassignDocumentType)
  error --> processing : user assigns a type (reassignDocumentType)
  exported --> [*]
`

/** Mermaid node id → glossary entry. */
export const LIFECYCLE_ITEMS: Record<string, GlossaryKey> = {
  uploaded: 'statusUploaded',
  processing: 'statusProcessing',
  unclassified: 'statusUnclassified',
  needs_review: 'statusNeedsReview',
  approved: 'statusApproved',
  exported: 'statusExported',
  rejected: 'statusRejected',
  error: 'statusError',
}

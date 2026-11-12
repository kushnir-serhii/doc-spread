import { Template } from 'aws-cdk-lib/assertions'
import { Stack } from 'aws-cdk-lib'
import { createApp } from '../lib/app.ts'
import { STAGES, type StageName } from '../lib/stage-config.ts'

interface Statement {
  Effect: string
  Action: string | string[]
  Resource?: unknown
  Principal?: unknown
  Condition?: unknown
}
interface Resource {
  Type: string
  Properties?: Record<string, unknown>
}

const failures: string[] = []
const fail = (message: string) => failures.push(message)
const asArray = <T>(value: T | T[]): T[] => (Array.isArray(value) ? value : [value])
const statementsOf = (document: unknown): Statement[] =>
  // The shape of a policy document is fixed by CloudFormation; this script only reads it.
  asArray((document as { Statement: Statement | Statement[] }).Statement)

const app = createApp()
const stages = Object.keys(STAGES) as StageName[]
const resourcesByStage = new Map<StageName, Record<string, Resource>>()
for (const stage of stages) {
  const stack = app.node.findChild(`DocSpread-${stage}`)
  if (!(stack instanceof Stack)) throw new Error(`stack DocSpread-${stage} not found`)
  // The template JSON always has a Resources map for a stack with resources.
  const json = Template.fromStack(stack).toJSON() as { Resources: Record<string, Resource> }
  resourcesByStage.set(stage, json.Resources)
}

/** Logical ids that a policy resource points at (Ref / Fn::GetAtt), ignoring pseudo parameters. */
function referencedIds(value: unknown): string[] {
  const ids: string[] = []
  const walk = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(walk)
    else if (node && typeof node === 'object') {
      for (const [key, inner] of Object.entries(node)) {
        if (key === 'Ref' && typeof inner === 'string' && !inner.startsWith('AWS::')) ids.push(inner)
        else if (key === 'Fn::GetAtt' && Array.isArray(inner)) ids.push(String(inner[0]))
        else walk(inner)
      }
    }
  }
  walk(value)
  return ids
}

for (const stage of stages) {
  const resources = resourcesByStage.get(stage) ?? {}
  const prefix = STAGES[stage].namePrefix
  const label = `[${stage}]`

  const idByName = (type: string, nameProp: string, name: string): string => {
    const found = Object.entries(resources).find(([, r]) => r.Type === type && r.Properties?.[nameProp] === name)
    if (!found) {
      fail(`${label} no ${type} named ${name}`)
      return `missing:${name}`
    }
    return found[0]
  }

  // Criterion 2: buckets are private; web files are readable only through CloudFront.
  const buckets = Object.entries(resources).filter(([, r]) => r.Type === 'AWS::S3::Bucket')
  if (buckets.length !== 3) fail(`${label} expected 3 buckets, found ${buckets.length}`)
  for (const [id, bucket] of buckets) {
    const block = bucket.Properties?.PublicAccessBlockConfiguration as Record<string, unknown> | undefined // CloudFormation shape
    const keys = ['BlockPublicAcls', 'BlockPublicPolicy', 'IgnorePublicAcls', 'RestrictPublicBuckets']
    if (!block || keys.some((key) => block[key] !== true)) fail(`${label} bucket ${id} lacks a full PublicAccessBlock`)
  }
  for (const [id, policy] of Object.entries(resources).filter(([, r]) => r.Type === 'AWS::S3::BucketPolicy')) {
    for (const statement of statementsOf(policy.Properties?.PolicyDocument)) {
      if (statement.Effect !== 'Allow') continue
      const principal = JSON.stringify(statement.Principal)
      if (principal === '"*"' || principal === '{"AWS":"*"}') fail(`${label} bucket policy ${id} allows a public principal`)
      if (principal.includes('cloudfront.amazonaws.com') && !JSON.stringify(statement.Condition).includes('AWS:SourceArn')) {
        fail(`${label} bucket policy ${id} lets CloudFront in without a distribution condition`)
      }
    }
  }
  const webBucketId = idByName('AWS::S3::Bucket', 'BucketName', `${prefix}-web`)
  const cloudFrontReads = Object.values(resources).filter(
    (r) =>
      r.Type === 'AWS::S3::BucketPolicy' &&
      referencedIds(r.Properties?.Bucket).includes(webBucketId) &&
      JSON.stringify(r.Properties?.PolicyDocument).includes('cloudfront.amazonaws.com'),
  )
  if (cloudFrontReads.length === 0) fail(`${label} web bucket has no CloudFront-only read policy`)

  // Criterion 3: each Lambda role reaches only its own buckets, queues and parameters.
  const documents = idByName('AWS::S3::Bucket', 'BucketName', `${prefix}-documents`)
  const exportsBucket = idByName('AWS::S3::Bucket', 'BucketName', `${prefix}-exports`)
  const ingestQueue = idByName('AWS::SQS::Queue', 'QueueName', `${prefix}-ingest`)
  const resultsQueue = idByName('AWS::SQS::Queue', 'QueueName', `${prefix}-textract-results`)
  const textractRole =
    Object.entries(resources).find(
      ([, r]) => r.Type === 'AWS::IAM::Role' && JSON.stringify(r.Properties?.AssumeRolePolicyDocument).includes('textract.amazonaws.com'),
    )?.[0] ?? 'missing:textract-role'

  const lambdas: Record<string, { allowed: string[]; textract: string[]; queues: string[] }> = {
    [`${prefix}-api`]: { allowed: [documents, exportsBucket], textract: [], queues: [] },
    [`${prefix}-pipeline-ingest`]: {
      allowed: [documents, ingestQueue, textractRole],
      textract: ['textract:StartDocumentTextDetection', 'textract:StartDocumentAnalysis'],
      queues: [ingestQueue],
    },
    [`${prefix}-pipeline-results`]: {
      allowed: [documents, exportsBucket, resultsQueue],
      textract: ['textract:GetDocumentTextDetection', 'textract:GetDocumentAnalysis'],
      queues: [resultsQueue],
    },
  }
  const policies = Object.values(resources).filter((r) => r.Type === 'AWS::IAM::Policy')
  for (const [name, spec] of Object.entries(lambdas)) {
    const fnId = idByName('AWS::Lambda::Function', 'FunctionName', name)
    const roleId = referencedIds(resources[fnId]?.Properties?.Role)[0] ?? 'missing:role'
    const rolePolicies = policies.filter((p) => referencedIds(p.Properties?.Roles).includes(roleId))
    const statements = rolePolicies.flatMap((p) => statementsOf(p.Properties?.PolicyDocument))
    if (statements.length === 0) fail(`${label} ${name} has no policy statements`)
    for (const statement of statements) {
      const actions = asArray(statement.Action)
      const text = JSON.stringify(statement.Resource)
      if (text === '"*"' || text === '["*"]') {
        if (!actions.every((action) => spec.textract.includes(action))) fail(`${label} ${name}: "*" resource on ${actions.join(',')}`)
        continue
      }
      const ids = referencedIds(statement.Resource)
      const stray = ids.filter((id) => !spec.allowed.includes(id))
      if (stray.length > 0) fail(`${label} ${name}: ${actions.join(',')} reaches ${stray.join(',')}`)
      if (actions.some((a) => a.startsWith('ssm:'))) {
        if (!text.includes(`parameter/docspread/${stage}/*`)) fail(`${label} ${name}: ssm outside /docspread/${stage}/*`)
      } else if (ids.length === 0) {
        fail(`${label} ${name}: ${actions.join(',')} has a resource outside its own set`)
      }
      if (actions.some((a) => a.startsWith('sqs:')) && !ids.every((id) => spec.queues.includes(id))) {
        fail(`${label} ${name}: queue access outside its own queues`)
      }
    }
    if (!JSON.stringify(statements).includes('ssm:GetParameter')) fail(`${label} ${name} cannot read its parameters`)
  }
}

// Criterion 4: the stages differ only in names, sizes and removal handling. Dev adds the
// autoDeleteObjects helper resources (removal policy); everything else must match in type and count.
function typeCounts(resources: Record<string, Resource>): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const [id, resource] of Object.entries(resources)) {
    if (id.startsWith('CustomS3AutoDeleteObjects') || resource.Type === 'Custom::S3AutoDeleteObjects') continue
    counts[resource.Type] = (counts[resource.Type] ?? 0) + 1
  }
  return counts
}
const devCounts = typeCounts(resourcesByStage.get('dev') ?? {})
const prodCounts = typeCounts(resourcesByStage.get('prod') ?? {})
for (const type of new Set([...Object.keys(devCounts), ...Object.keys(prodCounts)])) {
  if (devCounts[type] !== prodCounts[type]) fail(`resource type ${type}: dev ${devCounts[type] ?? 0}, prod ${prodCounts[type] ?? 0}`)
}

if (failures.length > 0) {
  console.error(`synth check failed:\n${failures.map((f) => `  - ${f}`).join('\n')}`)
  process.exit(1)
}
console.log('synth check passed for dev and prod')

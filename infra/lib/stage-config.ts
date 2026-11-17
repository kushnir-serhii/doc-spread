import { Duration, RemovalPolicy } from 'aws-cdk-lib'
import { RetentionDays } from 'aws-cdk-lib/aws-logs'

export type StageName = 'dev' | 'prod'

/** The AWS project is locked to Stockholm (free plan); Textract does not exist there. */
export const REGION = 'eu-north-1'
export const GITHUB_REPO = 'kushnir-serhii/doc-spread'

/** Everything that differs between stages. Nothing else in the stack may branch on the stage. */
export interface StageConfig {
  stage: StageName
  /** Prefix of the explicit resource names (bucket names are global, so they carry the project name). */
  namePrefix: string
  /** Memory of the api and extract Lambdas, in MB. */
  lambdaMemoryMb: number
  lambdaTimeout: Duration
  /**
   * Memory of the OCR Lambda, in MB (Tesseract and page rendering are heavy). New AWS accounts are
   * capped at 512 MB per function until the Lambda quota is raised; go higher once it is.
   */
  ocrMemoryMb: number
  /** Timeout of the pipeline Lambdas; their queues use at least 6x this as visibility timeout. */
  workerTimeout: Duration
  logRetention: RetentionDays
  /** dev: DESTROY (+ autoDeleteObjects on buckets); prod: RETAIN. */
  removalPolicy: RemovalPolicy
  /** Origins allowed besides the CloudFront domain. */
  extraAllowedOrigins: string[]
  /** TODO (J6): custom domain for CloudFront, taken from context `domain` and `certificateArn`. Not wired yet. */
  customDomain?: { domain: string; certificateArn: string }
}

export const STAGES: Record<StageName, StageConfig> = {
  dev: {
    stage: 'dev',
    namePrefix: 'docspread-dev',
    lambdaMemoryMb: 256,
    lambdaTimeout: Duration.seconds(60),
    ocrMemoryMb: 512,
    workerTimeout: Duration.minutes(5),
    logRetention: RetentionDays.TWO_WEEKS,
    removalPolicy: RemovalPolicy.DESTROY,
    extraAllowedOrigins: ['http://localhost:5173'],
  },
  prod: {
    stage: 'prod',
    namePrefix: 'docspread-prod',
    lambdaMemoryMb: 512,
    lambdaTimeout: Duration.seconds(60),
    ocrMemoryMb: 512,
    workerTimeout: Duration.minutes(5),
    logRetention: RetentionDays.ONE_YEAR,
    removalPolicy: RemovalPolicy.RETAIN,
    extraAllowedOrigins: [],
  },
}

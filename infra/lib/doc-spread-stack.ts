import { Aws, CfnOutput, Duration, RemovalPolicy, Stack, Tags, type StackProps } from 'aws-cdk-lib'
import { Distribution, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront'
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins'
import {
  OidcProviderNative,
  PolicyStatement,
  Role,
  WebIdentityPrincipal,
  type IOidcProvider,
} from 'aws-cdk-lib/aws-iam'
import { Architecture, Code, Function as LambdaFunction, FunctionUrlAuthType, HttpMethod, Runtime } from 'aws-cdk-lib/aws-lambda'
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources'
import { LogGroup } from 'aws-cdk-lib/aws-logs'
import { BlockPublicAccess, Bucket, BucketEncryption, EventType, HttpMethods, type BucketProps } from 'aws-cdk-lib/aws-s3'
import { SqsDestination } from 'aws-cdk-lib/aws-s3-notifications'
import { EmailIdentity, Identity } from 'aws-cdk-lib/aws-ses'
import { Queue, QueueEncryption } from 'aws-cdk-lib/aws-sqs'
import type { Construct } from 'constructs'
import { API_PLACEHOLDER, WORKER_PLACEHOLDER } from './placeholder-code.ts'
import { GITHUB_REPO, type StageConfig } from './stage-config.ts'

interface DocSpreadStackProps extends StackProps {
  config: StageConfig
}

const GITHUB_OIDC_HOST = 'token.actions.githubusercontent.com'

export class DocSpreadStack extends Stack {
  constructor(scope: Construct, id: string, props: DocSpreadStackProps) {
    super(scope, id, props)
    const { config } = props
    const { stage, namePrefix } = config
    const destroy = config.removalPolicy === RemovalPolicy.DESTROY

    Tags.of(this).add('project', 'docspread')
    Tags.of(this).add('stage', stage)

    // Optional context, set when J6 (domain and email) is done. Nothing is created without it.
    const domain: unknown = this.node.tryGetContext('domain')
    const githubOidcProviderArn: unknown = this.node.tryGetContext('githubOidcProviderArn')
    // Off by default: the AWS free plan's policy forbids creating an OIDC provider, so deploys run from
    // the owner's machine. Pass context githubDeploy=true on an account that allows it (slice 7).
    const githubDeploy: unknown = this.node.tryGetContext('githubDeploy')
    const withGithubDeploy = githubDeploy === true || githubDeploy === 'true'

    const privateBucket = (bucketId: string, suffix: string, extra: Partial<BucketProps> = {}) =>
      new Bucket(this, bucketId, {
        bucketName: `${namePrefix}-${suffix}`,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        enforceSSL: true,
        encryption: BucketEncryption.S3_MANAGED,
        removalPolicy: config.removalPolicy,
        autoDeleteObjects: destroy,
        ...extra,
      })

    // ---- Web: private bucket, only CloudFront (origin access control) can read it ----
    // Context cdn=false skips CloudFront: AWS refuses new distributions until the account is verified.
    const cdn: unknown = this.node.tryGetContext('cdn')
    const withCdn = cdn !== false && cdn !== 'false'
    const webBucket = privateBucket('WebBucket', 'web')
    const distribution = withCdn ? new Distribution(this, 'WebDistribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(webBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      // SPA fallback: unknown paths (and the 403 S3 returns for missing keys) serve the app shell.
      errorResponses: [403, 404].map((httpStatus) => ({
        httpStatus,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
        ttl: Duration.seconds(0),
      })),
    }) : undefined
    const webOrigin = distribution ? `https://${distribution.distributionDomainName}` : undefined
    const allowedOrigins = [...(webOrigin ? [webOrigin] : []), ...config.extraAllowedOrigins]

    // ---- Files: objects are keyed <company-id>/... ----
    const documentsBucket = privateBucket('DocumentsBucket', 'documents', {
      cors: [
        {
          allowedMethods: [HttpMethods.GET, HttpMethods.HEAD, HttpMethods.PUT],
          allowedOrigins,
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3000,
        },
      ],
    })
    const exportsBucket = privateBucket('ExportsBucket', 'exports', {
      lifecycleRules: [{ expiration: Duration.days(30) }],
    })

    // ---- Queues ----
    const queueWithDlq = (queueId: string, suffix: string, consumerTimeout: Duration) => {
      const dlq = new Queue(this, `${queueId}Dlq`, {
        queueName: `${namePrefix}-${suffix}-dlq`,
        encryption: QueueEncryption.SQS_MANAGED,
        enforceSSL: true,
        retentionPeriod: Duration.days(14),
      })
      return new Queue(this, queueId, {
        queueName: `${namePrefix}-${suffix}`,
        encryption: QueueEncryption.SQS_MANAGED,
        enforceSSL: true,
        visibilityTimeout: Duration.seconds(consumerTimeout.toSeconds() * 6),
        deadLetterQueue: { queue: dlq, maxReceiveCount: 3 },
      })
    }
    const ingestQueue = queueWithDlq('IngestQueue', 'ingest', config.workerTimeout)
    const extractQueue = queueWithDlq('ExtractQueue', 'extract', config.workerTimeout)
    documentsBucket.addEventNotification(EventType.OBJECT_CREATED, new SqsDestination(ingestQueue))

    // ---- Lambdas ----
    const ssmPrefix = `/docspread/${stage}`
    const secretParams = {
      SSM_SUPABASE_SECRET_KEY_PARAM: `${ssmPrefix}/supabase-secret-key`,
      SSM_ANTHROPIC_API_KEY_PARAM: `${ssmPrefix}/anthropic-api-key`,
    }
    // CDK never creates these parameters (scripts/put-secrets.ts does); only their names reach the Lambdas.
    // The SecureString default key (alias/aws/ssm) needs no kms statement: its key policy already
    // lets principals of this account decrypt through SSM.
    const ssmReadStatement = () =>
      new PolicyStatement({
        actions: ['ssm:GetParameter'],
        resources: [this.formatArn({ service: 'ssm', resource: 'parameter', resourceName: `docspread/${stage}/*` })],
      })
    const objectsIn = (bucket: Bucket) => `${bucket.bucketArn}/*`

    const makeFunction = (
      fnId: string,
      name: string,
      code: string,
      environment: Record<string, string>,
      sizing: { memorySize: number; timeout: Duration } = { memorySize: config.lambdaMemoryMb, timeout: config.lambdaTimeout },
    ) => {
      const logGroup = new LogGroup(this, `${fnId}Logs`, {
        logGroupName: `/aws/lambda/${namePrefix}-${name}`,
        retention: config.logRetention,
        removalPolicy: config.removalPolicy,
      })
      return new LambdaFunction(this, fnId, {
        functionName: `${namePrefix}-${name}`,
        runtime: Runtime.NODEJS_22_X,
        architecture: Architecture.ARM_64,
        handler: 'index.handler',
        code: Code.fromInline(code),
        memorySize: sizing.memorySize,
        timeout: sizing.timeout,
        logGroup,
        environment: { STAGE: stage, ...environment },
      })
    }

    const apiFn = makeFunction('ApiFunction', 'api', API_PLACEHOLDER, {
      S3_DOCUMENTS_BUCKET: documentsBucket.bucketName,
      S3_EXPORTS_BUCKET: exportsBucket.bucketName,
      ...secretParams,
    })
    apiFn.addToRolePolicy(
      new PolicyStatement({ actions: ['s3:PutObject', 's3:GetObject'], resources: [objectsIn(documentsBucket)] }),
    )
    apiFn.addToRolePolicy(new PolicyStatement({ actions: ['s3:GetObject'], resources: [objectsIn(exportsBucket)] }))
    apiFn.addToRolePolicy(ssmReadStatement())
    // Auth NONE at the URL: the function verifies the Supabase JWT itself.
    const apiUrl = apiFn.addFunctionUrl({
      authType: FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins,
        allowedMethods: [HttpMethod.GET, HttpMethod.POST, HttpMethod.PUT, HttpMethod.PATCH, HttpMethod.DELETE],
        allowedHeaders: ['authorization', 'content-type'],
        maxAge: Duration.hours(1),
      },
    })

    // OCR: reads the PDF text layer, or runs Tesseract for scans and photos; writes words with boxes
    // to Supabase and page images next to the file (same <company-id>/ prefix).
    // TODO (slice 6): switch this to a DockerImageFunction (Tesseract container image from ECR).
    const ocrFn = makeFunction(
      'PipelineOcrFunction',
      'pipeline-ocr',
      WORKER_PLACEHOLDER,
      {
        S3_DOCUMENTS_BUCKET: documentsBucket.bucketName,
        EXTRACT_QUEUE_URL: extractQueue.queueUrl,
        ...secretParams,
      },
      { memorySize: config.ocrMemoryMb, timeout: config.workerTimeout },
    )
    ocrFn.addToRolePolicy(
      new PolicyStatement({ actions: ['s3:GetObject', 's3:PutObject'], resources: [objectsIn(documentsBucket)] }),
    )
    extractQueue.grantSendMessages(ocrFn)
    ocrFn.addToRolePolicy(ssmReadStatement())
    ocrFn.addEventSource(new SqsEventSource(ingestQueue, { batchSize: 1 }))

    // Extract: classifies and extracts with Claude, from the OCR words and page images.
    const extractFn = makeFunction(
      'PipelineExtractFunction',
      'pipeline-extract',
      WORKER_PLACEHOLDER,
      {
        S3_DOCUMENTS_BUCKET: documentsBucket.bucketName,
        ...secretParams,
      },
      { memorySize: config.lambdaMemoryMb, timeout: config.workerTimeout },
    )
    extractFn.addToRolePolicy(new PolicyStatement({ actions: ['s3:GetObject'], resources: [objectsIn(documentsBucket)] }))
    extractFn.addToRolePolicy(ssmReadStatement())
    extractFn.addEventSource(new SqsEventSource(extractQueue, { batchSize: 1 }))

    // ---- SES: only once a domain is chosen (J6) ----
    if (typeof domain === 'string' && domain !== '') {
      new EmailIdentity(this, 'EmailIdentity', { identity: Identity.domain(domain) })
    }

    // ---- GitHub OIDC deploy role (optional, see githubDeploy above) ----
    let deployRoleArn: string | undefined
    if (withGithubDeploy) {
      // Only one provider can exist per account: pass context githubOidcProviderArn to reuse an existing one.
      const provider: IOidcProvider =
        typeof githubOidcProviderArn === 'string' && githubOidcProviderArn !== ''
          ? OidcProviderNative.fromOidcProviderArn(this, 'GithubOidcProvider', githubOidcProviderArn)
          : new OidcProviderNative(this, 'GithubOidcProvider', {
              url: `https://${GITHUB_OIDC_HOST}`,
              clientIds: ['sts.amazonaws.com'],
            })
      const deployRole = new Role(this, 'DeployRole', {
        assumedBy: new WebIdentityPrincipal(provider.oidcProviderArn, {
          StringEquals: {
            [`${GITHUB_OIDC_HOST}:aud`]: 'sts.amazonaws.com',
            [`${GITHUB_OIDC_HOST}:sub`]: `repo:${GITHUB_REPO}:environment:${stage}`,
          },
        }),
        maxSessionDuration: Duration.hours(1),
      })
      deployRole.addToPolicy(
        new PolicyStatement({
          actions: ['sts:AssumeRole'],
          resources: [`arn:${Aws.PARTITION}:iam::${this.account}:role/cdk-*`],
        }),
      )
      deployRole.addToPolicy(
        new PolicyStatement({ actions: ['s3:ListBucket', 's3:GetBucketLocation'], resources: [webBucket.bucketArn] }),
      )
      deployRole.addToPolicy(
        new PolicyStatement({
          actions: ['s3:PutObject', 's3:DeleteObject', 's3:GetObject'],
          resources: [objectsIn(webBucket)],
        }),
      )
      if (distribution) {
        deployRole.addToPolicy(
          new PolicyStatement({
            actions: ['cloudfront:CreateInvalidation'],
            resources: [
              this.formatArn({
                service: 'cloudfront',
                region: '',
                resource: 'distribution',
                resourceName: distribution.distributionId,
              }),
            ],
          }),
        )
      }
      deployRoleArn = deployRole.roleArn
    }

    // ---- Outputs ----
    const outputs: Record<string, string> = {
      WebBucketName: webBucket.bucketName,
      DocumentsBucketName: documentsBucket.bucketName,
      ExportsBucketName: exportsBucket.bucketName,
      IngestQueueUrl: ingestQueue.queueUrl,
      ExtractQueueUrl: extractQueue.queueUrl,
      ApiUrl: apiUrl.url,
    }
    if (webOrigin !== undefined) outputs.WebUrl = webOrigin
    if (deployRoleArn !== undefined) outputs.DeployRoleArn = deployRoleArn
    for (const [key, value] of Object.entries(outputs)) new CfnOutput(this, key, { value })
  }
}

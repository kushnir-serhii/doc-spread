import { Aws, CfnOutput, Duration, RemovalPolicy, Stack, Tags, type StackProps } from 'aws-cdk-lib'
import { Distribution, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront'
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins'
import {
  OidcProviderNative,
  PolicyStatement,
  Role,
  ServicePrincipal,
  WebIdentityPrincipal,
  type IOidcProvider,
} from 'aws-cdk-lib/aws-iam'
import { Architecture, Code, Function as LambdaFunction, FunctionUrlAuthType, HttpMethod, Runtime } from 'aws-cdk-lib/aws-lambda'
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources'
import { LogGroup } from 'aws-cdk-lib/aws-logs'
import { BlockPublicAccess, Bucket, BucketEncryption, EventType, HttpMethods, type BucketProps } from 'aws-cdk-lib/aws-s3'
import { SqsDestination } from 'aws-cdk-lib/aws-s3-notifications'
import { EmailIdentity, Identity } from 'aws-cdk-lib/aws-ses'
import { Topic } from 'aws-cdk-lib/aws-sns'
import { SqsSubscription } from 'aws-cdk-lib/aws-sns-subscriptions'
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
    const webBucket = privateBucket('WebBucket', 'web')
    const distribution = new Distribution(this, 'WebDistribution', {
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
    })
    const webOrigin = `https://${distribution.distributionDomainName}`
    const allowedOrigins = [webOrigin, ...config.extraAllowedOrigins]

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
    const queueWithDlq = (queueId: string, suffix: string) => {
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
        visibilityTimeout: Duration.seconds(config.lambdaTimeout.toSeconds() * 6),
        deadLetterQueue: { queue: dlq, maxReceiveCount: 3 },
      })
    }
    const ingestQueue = queueWithDlq('IngestQueue', 'ingest')
    const resultsQueue = queueWithDlq('TextractResultsQueue', 'textract-results')
    documentsBucket.addEventNotification(EventType.OBJECT_CREATED, new SqsDestination(ingestQueue))

    // ---- Textract: topic name must start with AmazonTextract; the role may only publish to it ----
    const textractTopic = new Topic(this, 'TextractTopic', {
      topicName: `AmazonTextract-${namePrefix}-results`,
      enforceSSL: true,
    })
    textractTopic.addSubscription(new SqsSubscription(resultsQueue))
    const textractRole = new Role(this, 'TextractRole', {
      assumedBy: new ServicePrincipal('textract.amazonaws.com'),
    })
    textractRole.addToPolicy(new PolicyStatement({ actions: ['sns:Publish'], resources: [textractTopic.topicArn] }))

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

    const makeFunction = (fnId: string, name: string, code: string, environment: Record<string, string>) => {
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
        memorySize: config.lambdaMemoryMb,
        timeout: config.lambdaTimeout,
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

    const ingestFn = makeFunction('PipelineIngestFunction', 'pipeline-ingest', WORKER_PLACEHOLDER, {
      S3_DOCUMENTS_BUCKET: documentsBucket.bucketName,
      TEXTRACT_SNS_TOPIC_ARN: textractTopic.topicArn,
      TEXTRACT_ROLE_ARN: textractRole.roleArn,
      ...secretParams,
    })
    ingestFn.addToRolePolicy(new PolicyStatement({ actions: ['s3:GetObject'], resources: [objectsIn(documentsBucket)] }))
    ingestFn.addToRolePolicy(
      new PolicyStatement({
        // The Textract start actions do not support resource-level permissions, so "*" is the only option.
        actions: ['textract:StartDocumentTextDetection', 'textract:StartDocumentAnalysis'],
        resources: ['*'],
      }),
    )
    ingestFn.addToRolePolicy(new PolicyStatement({ actions: ['iam:PassRole'], resources: [textractRole.roleArn] }))
    ingestFn.addToRolePolicy(ssmReadStatement())
    ingestFn.addEventSource(new SqsEventSource(ingestQueue, { batchSize: 1 }))

    const resultsFn = makeFunction('PipelineResultsFunction', 'pipeline-results', WORKER_PLACEHOLDER, {
      S3_DOCUMENTS_BUCKET: documentsBucket.bucketName,
      S3_EXPORTS_BUCKET: exportsBucket.bucketName,
      TEXTRACT_SNS_TOPIC_ARN: textractTopic.topicArn,
      ...secretParams,
    })
    resultsFn.addToRolePolicy(new PolicyStatement({ actions: ['s3:GetObject'], resources: [objectsIn(documentsBucket)] }))
    resultsFn.addToRolePolicy(
      new PolicyStatement({
        // The Textract result actions do not support resource-level permissions, so "*" is the only option.
        actions: ['textract:GetDocumentTextDetection', 'textract:GetDocumentAnalysis'],
        resources: ['*'],
      }),
    )
    resultsFn.addToRolePolicy(new PolicyStatement({ actions: ['s3:PutObject'], resources: [objectsIn(exportsBucket)] }))
    resultsFn.addToRolePolicy(ssmReadStatement())
    resultsFn.addEventSource(new SqsEventSource(resultsQueue, { batchSize: 1 }))

    // ---- SES: only once a domain is chosen (J6) ----
    if (typeof domain === 'string' && domain !== '') {
      new EmailIdentity(this, 'EmailIdentity', { identity: Identity.domain(domain) })
    }

    // ---- GitHub OIDC deploy role ----
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

    // ---- Outputs ----
    const outputs: Record<string, string> = {
      WebUrl: webOrigin,
      WebBucketName: webBucket.bucketName,
      DocumentsBucketName: documentsBucket.bucketName,
      ExportsBucketName: exportsBucket.bucketName,
      IngestQueueUrl: ingestQueue.queueUrl,
      TextractResultsQueueUrl: resultsQueue.queueUrl,
      TextractTopicArn: textractTopic.topicArn,
      TextractRoleArn: textractRole.roleArn,
      ApiUrl: apiUrl.url,
      DeployRoleArn: deployRole.roleArn,
    }
    for (const [key, value] of Object.entries(outputs)) new CfnOutput(this, key, { value })
  }
}

import { EC2Client } from '@aws-sdk/client-ec2';
import { RDSClient } from '@aws-sdk/client-rds';
import { S3Client } from '@aws-sdk/client-s3';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { ElastiCacheClient } from '@aws-sdk/client-elasticache';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { KMSClient } from '@aws-sdk/client-kms';
import { CloudFrontClient } from '@aws-sdk/client-cloudfront';
import { APIGatewayClient } from '@aws-sdk/client-api-gateway';
import { ElasticLoadBalancingV2Client } from '@aws-sdk/client-elastic-load-balancing-v2';
import { Route53Client } from '@aws-sdk/client-route-53';
import { SNSClient } from '@aws-sdk/client-sns';
import { SESv2Client } from '@aws-sdk/client-sesv2';
import { ACMClient } from '@aws-sdk/client-acm';
import { WAFV2Client } from '@aws-sdk/client-wafv2';
import type { AwsCredentials } from '../providers/types.js';
import type { AwsClientKey } from './resource-registry.js';

const CLIENT_CONSTRUCTORS: Record<AwsClientKey, new (config: any) => any> = {
  ec2: EC2Client,
  rds: RDSClient,
  s3: S3Client,
  lambda: LambdaClient,
  cloudwatch: CloudWatchClient,
  sts: EC2Client, // placeholder, STS is used separately in provider routes
  elasticache: ElastiCacheClient,
  secretsManager: SecretsManagerClient,
  kms: KMSClient,
  cloudfront: CloudFrontClient,
  apiGateway: APIGatewayClient,
  elbv2: ElasticLoadBalancingV2Client,
  route53: Route53Client,
  sns: SNSClient,
  ses: SESv2Client,
  acm: ACMClient,
  wafv2: WAFV2Client,
};

// Cache keyed by "providerId:clientKey"
const clientCache = new Map<string, any>();

export function getClient<T>(
  providerId: number,
  creds: AwsCredentials,
  region: string,
  clientKey: AwsClientKey
): T {
  const cacheKey = `${providerId}:${clientKey}`;
  if (clientCache.has(cacheKey)) return clientCache.get(cacheKey) as T;

  const Constructor = CLIENT_CONSTRUCTORS[clientKey];
  const client = new Constructor({
    region,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
      ...(creds.sessionToken ? { sessionToken: creds.sessionToken } : {}),
    },
  });

  clientCache.set(cacheKey, client);
  return client as T;
}

export function clearClientCache(providerId: number) {
  for (const key of clientCache.keys()) {
    if (key.startsWith(`${providerId}:`)) {
      clientCache.delete(key);
    }
  }
}

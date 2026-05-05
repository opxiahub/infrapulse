import type { InfraNode } from './types.js';
import type { AwsResourceType, AwsClientKey } from './resource-registry.js';
import { AWS_REGISTRY } from './resource-registry.js';
import { getClient } from './client-factory.js';
import type { AwsCredentials } from '../providers/types.js';

// Lazy-import discovery functions keyed by resource type
import { discoverEc2 } from './resources/ec2.js';
import { discoverRds } from './resources/rds.js';
import { discoverS3 } from './resources/s3.js';
import { discoverLambda } from './resources/lambda.js';
import { discoverVpc, discoverSubnet, discoverRouteTable, discoverTransitGateway, discoverVpcEndpoint, discoverIgw, discoverNatGateway, discoverEip, discoverDhcpOptions, discoverNacl, discoverVpn } from './resources/networking.js';
import { discoverElasticache } from './resources/elasticache.js';
import { discoverSecretsManager } from './resources/secrets-manager.js';
import { discoverKms } from './resources/kms.js';
import { discoverAcm } from './resources/acm.js';
import { discoverWaf } from './resources/waf.js';
import { discoverCloudfront } from './resources/cloudfront.js';
import { discoverApiGateway } from './resources/api-gateway.js';
import { discoverElb } from './resources/elb.js';
import { discoverRoute53 } from './resources/route53.js';
import { discoverSns } from './resources/sns.js';
import { discoverSes } from './resources/ses.js';

// Map each resource type to its discovery function and client key
const DISCOVERY_MAP: Record<AwsResourceType, { fn: (client: any, fetchTags?: boolean) => Promise<InfraNode[]>; clientKey: AwsClientKey }> = {
  ec2:              { fn: discoverEc2,              clientKey: 'ec2' },
  lambda:           { fn: discoverLambda,           clientKey: 'lambda' },
  rds:              { fn: discoverRds,              clientKey: 'rds' },
  s3:               { fn: discoverS3,               clientKey: 's3' },
  vpc:              { fn: discoverVpc,              clientKey: 'ec2' },
  subnet:           { fn: discoverSubnet,           clientKey: 'ec2' },
  'route-table':    { fn: discoverRouteTable,       clientKey: 'ec2' },
  'transit-gateway': { fn: discoverTransitGateway,  clientKey: 'ec2' },
  'vpc-endpoint':   { fn: discoverVpcEndpoint,      clientKey: 'ec2' },
  igw:              { fn: discoverIgw,              clientKey: 'ec2' },
  'nat-gateway':    { fn: discoverNatGateway,       clientKey: 'ec2' },
  eip:              { fn: discoverEip,              clientKey: 'ec2' },
  'dhcp-options':   { fn: discoverDhcpOptions,      clientKey: 'ec2' },
  nacl:             { fn: discoverNacl,             clientKey: 'ec2' },
  vpn:              { fn: discoverVpn,              clientKey: 'ec2' },
  elasticache:      { fn: discoverElasticache,      clientKey: 'elasticache' },
  'secrets-manager': { fn: discoverSecretsManager,  clientKey: 'secretsManager' },
  kms:              { fn: discoverKms,              clientKey: 'kms' },
  acm:              { fn: discoverAcm,              clientKey: 'acm' },
  waf:              { fn: discoverWaf,              clientKey: 'wafv2' },
  cloudfront:       { fn: discoverCloudfront,       clientKey: 'cloudfront' },
  'api-gateway':    { fn: discoverApiGateway,       clientKey: 'apiGateway' },
  elb:              { fn: discoverElb,              clientKey: 'elbv2' },
  route53:          { fn: discoverRoute53,          clientKey: 'route53' },
  sns:              { fn: discoverSns,              clientKey: 'sns' },
  ses:              { fn: discoverSes,              clientKey: 'ses' },
};

export async function discoverResources(
  providerId: number,
  creds: AwsCredentials,
  region: string,
  resourceTypes: AwsResourceType[],
  fetchTags?: boolean
): Promise<InfraNode[]> {
  const promises: Promise<InfraNode[]>[] = [];

  for (const type of resourceTypes) {
    const entry = DISCOVERY_MAP[type];
    if (!entry) continue;
    const client = getClient(providerId, creds, region, entry.clientKey);
    promises.push(entry.fn(client, fetchTags));
  }

  const results = await Promise.allSettled(promises);
  const nodes: InfraNode[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      nodes.push(...result.value);
    }
  }

  return nodes;
}

export type { AwsResourceType as ResourceType };

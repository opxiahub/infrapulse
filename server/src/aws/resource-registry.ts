export const AWS_RESOURCE_TYPES = [
  'ec2', 'lambda', 'rds', 's3',
  'vpc', 'subnet', 'route-table', 'transit-gateway', 'vpc-endpoint',
  'igw', 'nat-gateway', 'eip', 'dhcp-options', 'nacl', 'vpn',
  'elasticache',
  'secrets-manager', 'kms', 'acm', 'waf',
  'cloudfront', 'api-gateway', 'elb', 'route53', 'sns', 'ses',
] as const;

export type AwsResourceType = (typeof AWS_RESOURCE_TYPES)[number];

export interface AwsResourceConfig {
  type: AwsResourceType;
  label: string;
  group: ResourceGroup;
  clientKey: AwsClientKey;
}

export type ResourceGroup =
  | 'Compute'
  | 'Networking'
  | 'Database & Cache'
  | 'Storage'
  | 'Security'
  | 'Content & API'
  | 'Messaging';

export type AwsClientKey =
  | 'ec2' | 'rds' | 's3' | 'lambda' | 'cloudwatch' | 'sts'
  | 'elasticache' | 'secretsManager' | 'kms' | 'acm' | 'wafv2'
  | 'cloudfront' | 'apiGateway' | 'elbv2' | 'route53' | 'sns' | 'ses';

export const AWS_REGISTRY: Record<AwsResourceType, AwsResourceConfig> = {
  ec2:              { type: 'ec2',              label: 'EC2 Instances',      group: 'Compute',          clientKey: 'ec2' },
  lambda:           { type: 'lambda',           label: 'Lambda Functions',   group: 'Compute',          clientKey: 'lambda' },
  rds:              { type: 'rds',              label: 'RDS Databases',      group: 'Database & Cache', clientKey: 'rds' },
  elasticache:      { type: 'elasticache',      label: 'ElastiCache',        group: 'Database & Cache', clientKey: 'elasticache' },
  s3:               { type: 's3',               label: 'S3 Buckets',         group: 'Storage',          clientKey: 's3' },
  vpc:              { type: 'vpc',              label: 'VPCs',               group: 'Networking',       clientKey: 'ec2' },
  subnet:           { type: 'subnet',           label: 'Subnets',            group: 'Networking',       clientKey: 'ec2' },
  'route-table':    { type: 'route-table',      label: 'Route Tables',       group: 'Networking',       clientKey: 'ec2' },
  'transit-gateway': { type: 'transit-gateway', label: 'Transit Gateways',   group: 'Networking',       clientKey: 'ec2' },
  'vpc-endpoint':   { type: 'vpc-endpoint',     label: 'VPC Endpoints',      group: 'Networking',       clientKey: 'ec2' },
  igw:              { type: 'igw',              label: 'Internet Gateways',  group: 'Networking',       clientKey: 'ec2' },
  'nat-gateway':    { type: 'nat-gateway',      label: 'NAT Gateways',       group: 'Networking',       clientKey: 'ec2' },
  eip:              { type: 'eip',              label: 'Elastic IPs',        group: 'Networking',       clientKey: 'ec2' },
  'dhcp-options':   { type: 'dhcp-options',     label: 'DHCP Options',       group: 'Networking',       clientKey: 'ec2' },
  nacl:             { type: 'nacl',             label: 'Network ACLs',       group: 'Networking',       clientKey: 'ec2' },
  vpn:              { type: 'vpn',              label: 'Site-to-Site VPN',   group: 'Networking',       clientKey: 'ec2' },
  'secrets-manager': { type: 'secrets-manager', label: 'Secrets Manager',    group: 'Security',         clientKey: 'secretsManager' },
  kms:              { type: 'kms',              label: 'KMS Keys',           group: 'Security',         clientKey: 'kms' },
  acm:              { type: 'acm',              label: 'Certificates',       group: 'Security',         clientKey: 'acm' },
  waf:              { type: 'waf',              label: 'WAF Rules',          group: 'Security',         clientKey: 'wafv2' },
  cloudfront:       { type: 'cloudfront',       label: 'CloudFront',         group: 'Content & API',    clientKey: 'cloudfront' },
  'api-gateway':    { type: 'api-gateway',      label: 'API Gateway',        group: 'Content & API',    clientKey: 'apiGateway' },
  elb:              { type: 'elb',              label: 'Load Balancers',     group: 'Content & API',    clientKey: 'elbv2' },
  route53:          { type: 'route53',          label: 'Route 53',           group: 'Content & API',    clientKey: 'route53' },
  sns:              { type: 'sns',              label: 'SNS Topics',         group: 'Messaging',        clientKey: 'sns' },
  ses:              { type: 'ses',              label: 'SES Identities',     group: 'Messaging',        clientKey: 'ses' },
};

export const RESOURCE_GROUPS: ResourceGroup[] = [
  'Compute', 'Networking', 'Database & Cache', 'Storage', 'Security', 'Content & API', 'Messaging',
];

export function getResourcesByGroup(): Record<ResourceGroup, AwsResourceConfig[]> {
  const result: Record<string, AwsResourceConfig[]> = {};
  for (const group of RESOURCE_GROUPS) {
    result[group] = Object.values(AWS_REGISTRY).filter(r => r.group === group);
  }
  return result as Record<ResourceGroup, AwsResourceConfig[]>;
}

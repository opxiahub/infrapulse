import {
  Server, Zap, Database, HardDrive, Network, Globe, Router,
  ArrowRightLeft, Plug, GanttChart, MapPin, Radio, Hash, Shield,
  Lock, Key, Award, ShieldCheck, Cloud, Webhook, Scale, Map, Bell,
  Mail,
} from 'lucide-react';

export type ResourceGroup =
  | 'Compute'
  | 'Networking'
  | 'Database & Cache'
  | 'Storage'
  | 'Security'
  | 'Content & API'
  | 'Messaging';

export interface AwsResourceConfig {
  type: string;
  label: string;
  group: ResourceGroup;
  icon: typeof Server;
  iconColor: string;
  groupColor: string;
  activeStatuses: string[];
  subtitle?: (m: Record<string, any>) => string;
}

export const AWS_RESOURCES: AwsResourceConfig[] = [
  // Compute
  { type: 'ec2',       label: 'EC2 Instances',     group: 'Compute',          icon: Server,         iconColor: 'text-neon-blue',   groupColor: '#04D9FF', activeStatuses: ['running'] },
  { type: 'lambda',    label: 'Lambda Functions',  group: 'Compute',          icon: Zap,            iconColor: 'text-orange-400',  groupColor: '#FB923C', activeStatuses: ['Active', 'active'] },

  // Networking
  { type: 'vpc',              label: 'VPCs',               group: 'Networking',       icon: Network,        iconColor: 'text-cyan-400',    groupColor: '#22D3EE', activeStatuses: ['available'] },
  { type: 'subnet',           label: 'Subnets',            group: 'Networking',       icon: GanttChart,     iconColor: 'text-cyan-300',    groupColor: '#67E8F9', activeStatuses: ['available'] },
  { type: 'route-table',      label: 'Route Tables',       group: 'Networking',       icon: Router,         iconColor: 'text-sky-400',     groupColor: '#38BDF8', activeStatuses: ['active'] },
  { type: 'transit-gateway',  label: 'Transit Gateways',   group: 'Networking',       icon: ArrowRightLeft, iconColor: 'text-sky-300',     groupColor: '#7DD3FC', activeStatuses: ['available'] },
  { type: 'vpc-endpoint',     label: 'VPC Endpoints',      group: 'Networking',       icon: Plug,           iconColor: 'text-sky-200',     groupColor: '#BAE6FD', activeStatuses: ['available'] },
  { type: 'igw',              label: 'Internet Gateways',  group: 'Networking',       icon: Globe,          iconColor: 'text-emerald-400', groupColor: '#34D399', activeStatuses: ['available', 'attached'] },
  { type: 'nat-gateway',      label: 'NAT Gateways',       group: 'Networking',       icon: MapPin,         iconColor: 'text-emerald-300', groupColor: '#6EE7B7', activeStatuses: ['available'] },
  { type: 'eip',              label: 'Elastic IPs',        group: 'Networking',       icon: Radio,          iconColor: 'text-teal-400',    groupColor: '#2DD4BF', activeStatuses: ['associated'] },
  { type: 'dhcp-options',     label: 'DHCP Options',       group: 'Networking',       icon: Hash,           iconColor: 'text-teal-300',    groupColor: '#5EEAD4', activeStatuses: ['active'] },
  { type: 'nacl',             label: 'Network ACLs',       group: 'Networking',       icon: Shield,         iconColor: 'text-teal-200',    groupColor: '#99F6E4', activeStatuses: ['default', 'custom'] },
  { type: 'vpn',              label: 'Site-to-Site VPN',   group: 'Networking',       icon: Lock,           iconColor: 'text-indigo-400',  groupColor: '#818CF8', activeStatuses: ['available'] },

  // Database & Cache
  { type: 'rds',         label: 'RDS Databases',  group: 'Database & Cache', icon: Database,   iconColor: 'text-neon-purple',  groupColor: '#BC13FE', activeStatuses: ['available'] },
  { type: 'elasticache', label: 'ElastiCache',    group: 'Database & Cache', icon: Database,   iconColor: 'text-purple-400',   groupColor: '#A78BFA', activeStatuses: ['available'] },

  // Storage
  { type: 's3', label: 'S3 Buckets', group: 'Storage', icon: HardDrive, iconColor: 'text-yellow-500', groupColor: '#EAB308', activeStatuses: ['active'] },

  // Security
  { type: 'secrets-manager', label: 'Secrets Manager', group: 'Security', icon: Key,         iconColor: 'text-rose-400',   groupColor: '#FB7185', activeStatuses: ['active'] },
  { type: 'kms',             label: 'KMS Keys',        group: 'Security', icon: ShieldCheck, iconColor: 'text-rose-300',   groupColor: '#FDA4AF', activeStatuses: ['Enabled'] },
  { type: 'acm',             label: 'Certificates',    group: 'Security', icon: Award,       iconColor: 'text-pink-400',   groupColor: '#F472B6', activeStatuses: ['ISSUED'] },
  { type: 'waf',             label: 'WAF Rules',       group: 'Security', icon: Shield,      iconColor: 'text-pink-300',   groupColor: '#F9A8D4', activeStatuses: ['active'] },

  // Content & API
  { type: 'cloudfront',   label: 'CloudFront',      group: 'Content & API', icon: Cloud,   iconColor: 'text-amber-400',  groupColor: '#FBBF24', activeStatuses: ['enabled', 'Deployed'] },
  { type: 'api-gateway',  label: 'API Gateway',     group: 'Content & API', icon: Webhook, iconColor: 'text-amber-300',  groupColor: '#FCD34D', activeStatuses: ['active'] },
  { type: 'elb',           label: 'Load Balancers',  group: 'Content & API', icon: Scale,   iconColor: 'text-lime-400',   groupColor: '#A3E635', activeStatuses: ['active'] },
  { type: 'route53',      label: 'Route 53',        group: 'Content & API', icon: Map,     iconColor: 'text-lime-300',   groupColor: '#BEF264', activeStatuses: ['public', 'private'] },

  // Messaging
  { type: 'sns', label: 'SNS Topics',    group: 'Messaging', icon: Bell, iconColor: 'text-violet-400', groupColor: '#A78BFA', activeStatuses: ['active'] },
  { type: 'ses', label: 'SES Identities', group: 'Messaging', icon: Mail, iconColor: 'text-violet-300', groupColor: '#C4B5FD', activeStatuses: ['enabled'] },
];

export const RESOURCE_GROUPS: ResourceGroup[] = [
  'Compute', 'Networking', 'Database & Cache', 'Storage', 'Security', 'Content & API', 'Messaging',
];

export function getResourcesByGroup(): Record<ResourceGroup, AwsResourceConfig[]> {
  const result: Partial<Record<ResourceGroup, AwsResourceConfig[]>> = {};
  for (const group of RESOURCE_GROUPS) {
    result[group] = AWS_RESOURCES.filter(r => r.group === group);
  }
  return result as Record<ResourceGroup, AwsResourceConfig[]>;
}

export function getResourceConfig(type: string): AwsResourceConfig | undefined {
  return AWS_RESOURCES.find(r => r.type === type);
}

import {
  Server, Zap, Database, HardDrive, Network, Globe, Router,
  GanttChart, Radio, Shield, Lock, Key, ShieldCheck,
  Scale, Map, Bell, Workflow,
} from 'lucide-react';

// Mirrors client/src/config/aws-resources.ts but for GCP. The two configs are
// independent so each cloud can carry its own icons / colors / activeStatuses
// without coupling to AWS resource keys.

export type GcpResourceGroup =
  | 'Compute'
  | 'Networking'
  | 'Database & Cache'
  | 'Storage'
  | 'Security'
  | 'Content & API'
  | 'Messaging';

export interface GcpResourceConfig {
  type: string;
  label: string;
  group: GcpResourceGroup;
  icon: typeof Server;
  iconColor: string;
  groupColor: string;
  activeStatuses: string[];
  subtitle?: (m: Record<string, any>) => string;
}

export const GCP_RESOURCES: GcpResourceConfig[] = [
  // Compute
  { type: 'gce-instance',   label: 'Compute Engine VMs', group: 'Compute',          icon: Server,    iconColor: 'text-neon-blue',   groupColor: '#04D9FF', activeStatuses: ['running'] },
  { type: 'cloud-function', label: 'Cloud Functions',    group: 'Compute',          icon: Zap,       iconColor: 'text-orange-400',  groupColor: '#FB923C', activeStatuses: ['active'] },
  { type: 'cloud-run',      label: 'Cloud Run Services', group: 'Compute',          icon: Workflow,  iconColor: 'text-orange-300',  groupColor: '#FDBA74', activeStatuses: ['condition_succeeded', 'true', 'active'] },

  // Networking
  { type: 'vpc-network',    label: 'VPC Networks',       group: 'Networking',       icon: Network,        iconColor: 'text-cyan-400',    groupColor: '#22D3EE', activeStatuses: ['active'] },
  { type: 'subnetwork',     label: 'Subnetworks',        group: 'Networking',       icon: GanttChart,     iconColor: 'text-cyan-300',    groupColor: '#67E8F9', activeStatuses: ['active'] },
  { type: 'firewall',       label: 'Firewall Rules',     group: 'Networking',       icon: Shield,         iconColor: 'text-sky-400',     groupColor: '#38BDF8', activeStatuses: ['active'] },
  { type: 'route',          label: 'Routes',             group: 'Networking',       icon: Router,         iconColor: 'text-sky-300',     groupColor: '#7DD3FC', activeStatuses: ['active'] },
  { type: 'cloud-router',   label: 'Cloud Routers',      group: 'Networking',       icon: Router,         iconColor: 'text-sky-200',     groupColor: '#BAE6FD', activeStatuses: ['active'] },
  { type: 'cloud-nat',      label: 'Cloud NAT',          group: 'Networking',       icon: Globe,          iconColor: 'text-emerald-400', groupColor: '#34D399', activeStatuses: ['active'] },
  { type: 'external-ip',    label: 'External IPs',       group: 'Networking',       icon: Radio,          iconColor: 'text-teal-400',    groupColor: '#2DD4BF', activeStatuses: ['in_use', 'reserved'] },

  // Database & Cache
  { type: 'cloud-sql',      label: 'Cloud SQL',          group: 'Database & Cache', icon: Database,   iconColor: 'text-neon-purple', groupColor: '#BC13FE', activeStatuses: ['runnable', 'running'] },
  { type: 'memorystore',    label: 'Memorystore Redis',  group: 'Database & Cache', icon: Database,   iconColor: 'text-purple-400',  groupColor: '#A78BFA', activeStatuses: ['ready'] },

  // Storage
  { type: 'gcs-bucket',     label: 'Cloud Storage',      group: 'Storage',          icon: HardDrive,  iconColor: 'text-yellow-500',  groupColor: '#EAB308', activeStatuses: ['active'] },

  // Security
  { type: 'kms-keyring',    label: 'KMS Keys',           group: 'Security',         icon: ShieldCheck, iconColor: 'text-rose-300',   groupColor: '#FDA4AF', activeStatuses: ['active'] },
  { type: 'secret-manager', label: 'Secret Manager',     group: 'Security',         icon: Key,         iconColor: 'text-rose-400',   groupColor: '#FB7185', activeStatuses: ['active'] },
  { type: 'cloud-armor',    label: 'Cloud Armor',        group: 'Security',         icon: Lock,        iconColor: 'text-pink-400',   groupColor: '#F472B6', activeStatuses: ['active'] },

  // Content & API
  { type: 'load-balancer',  label: 'Load Balancers',     group: 'Content & API',    icon: Scale,   iconColor: 'text-lime-400',   groupColor: '#A3E635', activeStatuses: ['active'] },
  { type: 'cloud-dns',      label: 'Cloud DNS',          group: 'Content & API',    icon: Map,     iconColor: 'text-lime-300',   groupColor: '#BEF264', activeStatuses: ['public', 'private'] },

  // Messaging
  { type: 'pubsub-topic',   label: 'Pub/Sub Topics',     group: 'Messaging',        icon: Bell,    iconColor: 'text-violet-400', groupColor: '#A78BFA', activeStatuses: ['active'] },
];

export const GCP_RESOURCE_GROUPS: GcpResourceGroup[] = [
  'Compute', 'Networking', 'Database & Cache', 'Storage', 'Security', 'Content & API', 'Messaging',
];

export function getGcpResourcesByGroup(): Record<GcpResourceGroup, GcpResourceConfig[]> {
  const result: Partial<Record<GcpResourceGroup, GcpResourceConfig[]>> = {};
  for (const group of GCP_RESOURCE_GROUPS) {
    result[group] = GCP_RESOURCES.filter(r => r.group === group);
  }
  return result as Record<GcpResourceGroup, GcpResourceConfig[]>;
}

export function getGcpResourceConfig(type: string): GcpResourceConfig | undefined {
  return GCP_RESOURCES.find(r => r.type === type);
}

export const GCP_DEFAULT_TYPES = ['gce-instance', 'cloud-sql', 'gcs-bucket', 'cloud-function'];

// GCP regions for the Add Provider modal dropdown.
export const GCP_REGIONS = [
  'us-central1', 'us-east1', 'us-east4', 'us-west1', 'us-west2', 'us-west3', 'us-west4',
  'europe-west1', 'europe-west2', 'europe-west3', 'europe-west4', 'europe-north1',
  'asia-east1', 'asia-east2', 'asia-northeast1', 'asia-northeast2', 'asia-northeast3',
  'asia-south1', 'asia-southeast1', 'asia-southeast2',
  'australia-southeast1', 'southamerica-east1', 'global',
];


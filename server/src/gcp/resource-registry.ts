// GCP resource catalog. Mirrors the structure of aws/resource-registry.ts so
// the rest of the system can treat both providers uniformly.
//
// Note: GKE clusters are intentionally excluded from this initial GCP rollout
// — they will be added as a follow-up alongside the existing Kubernetes
// integration.
export const GCP_RESOURCE_TYPES = [
  // Compute
  'gce-instance',
  'cloud-function',
  'cloud-run',
  // Networking
  'vpc-network',
  'subnetwork',
  'firewall',
  'route',
  'cloud-router',
  'cloud-nat',
  'external-ip',
  // Database & Cache
  'cloud-sql',
  'memorystore',
  // Storage
  'gcs-bucket',
  // Security
  'kms-keyring',
  'secret-manager',
  'cloud-armor',
  // Content & API
  'load-balancer',
  'cloud-dns',
  // Messaging
  'pubsub-topic',
] as const;

export type GcpResourceType = (typeof GCP_RESOURCE_TYPES)[number];

export type GcpResourceGroup =
  | 'Compute'
  | 'Networking'
  | 'Database & Cache'
  | 'Storage'
  | 'Security'
  | 'Content & API'
  | 'Messaging';

export interface GcpResourceConfig {
  type: GcpResourceType;
  label: string;
  group: GcpResourceGroup;
}

export const GCP_REGISTRY: Record<GcpResourceType, GcpResourceConfig> = {
  'gce-instance':   { type: 'gce-instance',   label: 'Compute Engine VMs', group: 'Compute' },
  'cloud-function': { type: 'cloud-function', label: 'Cloud Functions',    group: 'Compute' },
  'cloud-run':      { type: 'cloud-run',      label: 'Cloud Run Services', group: 'Compute' },

  'vpc-network':    { type: 'vpc-network',    label: 'VPC Networks',       group: 'Networking' },
  subnetwork:       { type: 'subnetwork',     label: 'Subnetworks',        group: 'Networking' },
  firewall:         { type: 'firewall',       label: 'Firewall Rules',     group: 'Networking' },
  route:            { type: 'route',          label: 'Routes',             group: 'Networking' },
  'cloud-router':   { type: 'cloud-router',   label: 'Cloud Routers',      group: 'Networking' },
  'cloud-nat':      { type: 'cloud-nat',      label: 'Cloud NAT',          group: 'Networking' },
  'external-ip':    { type: 'external-ip',    label: 'External IPs',       group: 'Networking' },

  'cloud-sql':      { type: 'cloud-sql',      label: 'Cloud SQL',          group: 'Database & Cache' },
  memorystore:      { type: 'memorystore',    label: 'Memorystore Redis',  group: 'Database & Cache' },

  'gcs-bucket':     { type: 'gcs-bucket',     label: 'Cloud Storage',      group: 'Storage' },

  'kms-keyring':    { type: 'kms-keyring',    label: 'KMS Keys',           group: 'Security' },
  'secret-manager': { type: 'secret-manager', label: 'Secret Manager',     group: 'Security' },
  'cloud-armor':    { type: 'cloud-armor',    label: 'Cloud Armor',        group: 'Security' },

  'load-balancer':  { type: 'load-balancer',  label: 'Load Balancers',     group: 'Content & API' },
  'cloud-dns':      { type: 'cloud-dns',      label: 'Cloud DNS',          group: 'Content & API' },

  'pubsub-topic':   { type: 'pubsub-topic',   label: 'Pub/Sub Topics',     group: 'Messaging' },
};

export const GCP_RESOURCE_GROUPS: GcpResourceGroup[] = [
  'Compute', 'Networking', 'Database & Cache', 'Storage', 'Security', 'Content & API', 'Messaging',
];

export function getGcpResourcesByGroup(): Record<GcpResourceGroup, GcpResourceConfig[]> {
  const result: Record<string, GcpResourceConfig[]> = {};
  for (const group of GCP_RESOURCE_GROUPS) {
    result[group] = Object.values(GCP_REGISTRY).filter(r => r.group === group);
  }
  return result as Record<GcpResourceGroup, GcpResourceConfig[]>;
}

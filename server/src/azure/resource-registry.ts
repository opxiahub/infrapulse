export const AZURE_RESOURCE_TYPES = [
  // Compute
  'azure-vm',
  'azure-function',
  'azure-app-service',

  // Networking
  'azure-vnet',
  'azure-subnet',
  'azure-nsg',
  'azure-public-ip',
  'azure-load-balancer',
  'azure-application-gateway',

  // Database & Cache
  'azure-sql-server',
  'azure-redis',

  // Storage
  'azure-storage-account',

  // Security
  'azure-key-vault',

  // Content & API
  'azure-dns-zone',

  // Messaging
  'azure-service-bus',
] as const;

export type AzureResourceType = (typeof AZURE_RESOURCE_TYPES)[number];

export type AzureResourceGroup =
  | 'Compute'
  | 'Networking'
  | 'Database & Cache'
  | 'Storage'
  | 'Security'
  | 'Content & API'
  | 'Messaging';

export interface AzureResourceConfig {
  type: AzureResourceType;
  label: string;
  group: AzureResourceGroup;
}

export const AZURE_REGISTRY: Record<AzureResourceType, AzureResourceConfig> = {
  'azure-vm':                  { type: 'azure-vm',                  label: 'Virtual Machines',      group: 'Compute' },
  'azure-function':            { type: 'azure-function',            label: 'Function Apps',         group: 'Compute' },
  'azure-app-service':         { type: 'azure-app-service',         label: 'App Services',          group: 'Compute' },

  'azure-vnet':                { type: 'azure-vnet',                label: 'Virtual Networks',      group: 'Networking' },
  'azure-subnet':              { type: 'azure-subnet',              label: 'Subnets',               group: 'Networking' },
  'azure-nsg':                 { type: 'azure-nsg',                 label: 'Network Security Groups', group: 'Networking' },
  'azure-public-ip':           { type: 'azure-public-ip',           label: 'Public IPs',            group: 'Networking' },
  'azure-load-balancer':       { type: 'azure-load-balancer',       label: 'Load Balancers',        group: 'Networking' },
  'azure-application-gateway': { type: 'azure-application-gateway', label: 'Application Gateways',  group: 'Networking' },

  'azure-sql-server':          { type: 'azure-sql-server',          label: 'SQL Servers',           group: 'Database & Cache' },
  'azure-redis':               { type: 'azure-redis',               label: 'Azure Cache for Redis', group: 'Database & Cache' },

  'azure-storage-account':     { type: 'azure-storage-account',     label: 'Storage Accounts',      group: 'Storage' },

  'azure-key-vault':           { type: 'azure-key-vault',           label: 'Key Vaults',            group: 'Security' },

  'azure-dns-zone':            { type: 'azure-dns-zone',            label: 'DNS Zones',             group: 'Content & API' },

  'azure-service-bus':         { type: 'azure-service-bus',         label: 'Service Bus Namespaces', group: 'Messaging' },
};

export const AZURE_RESOURCE_GROUPS: AzureResourceGroup[] = [
  'Compute', 'Networking', 'Database & Cache', 'Storage', 'Security', 'Content & API', 'Messaging',
];

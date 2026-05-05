import {
  Server, Zap, Workflow, Network, GanttChart, Shield, Radio,
  Scale, Database, HardDrive, Key, Map, Bell, Lock,
} from 'lucide-react';

export type AzureResourceGroup =
  | 'Compute'
  | 'Networking'
  | 'Database & Cache'
  | 'Storage'
  | 'Security'
  | 'Content & API'
  | 'Messaging';

export interface AzureResourceConfig {
  type: string;
  label: string;
  group: AzureResourceGroup;
  icon: typeof Server;
  iconColor: string;
  groupColor: string;
  activeStatuses: string[];
  subtitle?: (m: Record<string, any>) => string;
}

export const AZURE_RESOURCES: AzureResourceConfig[] = [
  // Compute
  { type: 'azure-vm',          label: 'Virtual Machines', group: 'Compute', icon: Server,   iconColor: 'text-blue-400',   groupColor: '#60A5FA', activeStatuses: ['succeeded', 'running', 'active'] },
  { type: 'azure-function',    label: 'Function Apps',    group: 'Compute', icon: Zap,      iconColor: 'text-sky-300',    groupColor: '#7DD3FC', activeStatuses: ['running', 'active', 'succeeded'] },
  { type: 'azure-app-service', label: 'App Services',     group: 'Compute', icon: Workflow, iconColor: 'text-cyan-300',   groupColor: '#67E8F9', activeStatuses: ['running', 'active', 'succeeded'] },

  // Networking
  { type: 'azure-vnet',                label: 'Virtual Networks',        group: 'Networking', icon: Network,    iconColor: 'text-indigo-300', groupColor: '#A5B4FC', activeStatuses: ['succeeded', 'active'] },
  { type: 'azure-subnet',              label: 'Subnets',                 group: 'Networking', icon: GanttChart, iconColor: 'text-indigo-200', groupColor: '#C7D2FE', activeStatuses: ['succeeded', 'active'] },
  { type: 'azure-nsg',                 label: 'Network Security Groups', group: 'Networking', icon: Shield,     iconColor: 'text-violet-300', groupColor: '#C4B5FD', activeStatuses: ['succeeded', 'active'] },
  { type: 'azure-public-ip',           label: 'Public IPs',              group: 'Networking', icon: Radio,      iconColor: 'text-teal-300',   groupColor: '#5EEAD4', activeStatuses: ['succeeded', 'active'] },
  { type: 'azure-load-balancer',       label: 'Load Balancers',          group: 'Networking', icon: Scale,      iconColor: 'text-emerald-300', groupColor: '#6EE7B7', activeStatuses: ['succeeded', 'active'] },
  { type: 'azure-application-gateway', label: 'Application Gateways',    group: 'Networking', icon: Lock,       iconColor: 'text-lime-300',   groupColor: '#BEF264', activeStatuses: ['succeeded', 'running', 'active'] },

  // Database & Cache
  { type: 'azure-sql-server', label: 'SQL Servers',           group: 'Database & Cache', icon: Database, iconColor: 'text-purple-300', groupColor: '#C084FC', activeStatuses: ['ready', 'active', 'succeeded'] },
  { type: 'azure-redis',      label: 'Azure Cache for Redis', group: 'Database & Cache', icon: Database, iconColor: 'text-fuchsia-300', groupColor: '#F0ABFC', activeStatuses: ['succeeded', 'running', 'active'] },

  // Storage
  { type: 'azure-storage-account', label: 'Storage Accounts', group: 'Storage', icon: HardDrive, iconColor: 'text-yellow-300', groupColor: '#FDE047', activeStatuses: ['succeeded', 'active'] },

  // Security
  { type: 'azure-key-vault', label: 'Key Vaults', group: 'Security', icon: Key, iconColor: 'text-rose-300', groupColor: '#FDA4AF', activeStatuses: ['succeeded', 'active'] },

  // Content & API
  { type: 'azure-dns-zone', label: 'DNS Zones', group: 'Content & API', icon: Map, iconColor: 'text-orange-300', groupColor: '#FDBA74', activeStatuses: ['active'] },

  // Messaging
  { type: 'azure-service-bus', label: 'Service Bus Namespaces', group: 'Messaging', icon: Bell, iconColor: 'text-pink-300', groupColor: '#F9A8D4', activeStatuses: ['active', 'succeeded'] },
];

export const AZURE_RESOURCE_GROUPS: AzureResourceGroup[] = [
  'Compute', 'Networking', 'Database & Cache', 'Storage', 'Security', 'Content & API', 'Messaging',
];

export function getAzureResourcesByGroup(): Record<AzureResourceGroup, AzureResourceConfig[]> {
  const result: Partial<Record<AzureResourceGroup, AzureResourceConfig[]>> = {};
  for (const group of AZURE_RESOURCE_GROUPS) {
    result[group] = AZURE_RESOURCES.filter(r => r.group === group);
  }
  return result as Record<AzureResourceGroup, AzureResourceConfig[]>;
}

export function getAzureResourceConfig(type: string): AzureResourceConfig | undefined {
  return AZURE_RESOURCES.find(r => r.type === type);
}

export const AZURE_DEFAULT_TYPES = ['azure-vm', 'azure-sql-server', 'azure-storage-account', 'azure-function'];

export const AZURE_REGIONS = [
  'global',
  'eastus', 'eastus2', 'centralus', 'northcentralus', 'southcentralus', 'westcentralus',
  'westus', 'westus2', 'westus3',
  'canadacentral', 'canadaeast',
  'brazilsouth',
  'northeurope', 'westeurope', 'uksouth', 'ukwest', 'francecentral', 'germanywestcentral',
  'switzerlandnorth', 'norwayeast', 'swedencentral',
  'eastasia', 'southeastasia', 'japaneast', 'japanwest', 'koreacentral',
  'centralindia', 'southindia', 'australiaeast', 'australiasoutheast',
  'uaenorth', 'southafricanorth',
];

import { Box, Network, Globe, Key, Cpu, FileText, Layers, Radio, HardDrive, Server, Briefcase, Clock } from 'lucide-react';

export interface K8sResourceConfig {
  type: string;
  label: string;
  group: string;
  groupOrder: number;
  icon: any;
  iconColor: string;
  groupColor: string;
}

export const K8S_RESOURCES: K8sResourceConfig[] = [
  // Workloads
  { type: 'k8s-deployment',  label: 'Deployments',  group: 'Workloads',       groupOrder: 0,  icon: Box,      iconColor: 'text-neon-purple', groupColor: '#BC13FE' },
  { type: 'k8s-statefulset', label: 'StatefulSets', group: 'Workloads',       groupOrder: 1,  icon: Layers,   iconColor: 'text-violet-400',  groupColor: '#8B5CF6' },
  { type: 'k8s-daemonset',   label: 'DaemonSets',   group: 'Workloads',       groupOrder: 2,  icon: Radio,    iconColor: 'text-indigo-400',  groupColor: '#6366F1' },
  { type: 'k8s-pod',         label: 'Pods',         group: 'Workloads',       groupOrder: 3,  icon: Cpu,      iconColor: 'text-neon-green',  groupColor: '#39FF14' },
  { type: 'k8s-job',         label: 'Jobs',         group: 'Workloads',       groupOrder: 4,  icon: Briefcase,iconColor: 'text-lime-400',    groupColor: '#A3E635' },
  { type: 'k8s-cronjob',     label: 'CronJobs',     group: 'Workloads',       groupOrder: 5,  icon: Clock,    iconColor: 'text-lime-300',    groupColor: '#BEF264' },
  // Networking
  { type: 'k8s-service',     label: 'Services',     group: 'Networking',      groupOrder: 6,  icon: Network,  iconColor: 'text-neon-blue',   groupColor: '#04D9FF' },
  { type: 'k8s-ingress',     label: 'Ingress',      group: 'Networking',      groupOrder: 7,  icon: Globe,    iconColor: 'text-amber-400',   groupColor: '#FBBF24' },
  // Config & Secrets
  { type: 'k8s-configmap',   label: 'ConfigMaps',   group: 'Config',          groupOrder: 8,  icon: FileText, iconColor: 'text-teal-400',    groupColor: '#2DD4BF' },
  { type: 'k8s-secret',      label: 'Secrets',      group: 'Config',          groupOrder: 9,  icon: Key,      iconColor: 'text-rose-400',    groupColor: '#FB7185' },
  // Storage
  { type: 'k8s-pvc',         label: 'PersistentVolumeClaims', group: 'Storage', groupOrder: 10, icon: HardDrive, iconColor: 'text-yellow-400', groupColor: '#FACC15' },
  // Infrastructure
  { type: 'k8s-node',        label: 'Nodes',        group: 'Infrastructure',  groupOrder: 11, icon: Server,   iconColor: 'text-gray-300',    groupColor: '#9CA3AF' },
];

export const K8S_RESOURCE_GROUPS = ['Workloads', 'Networking', 'Config', 'Storage', 'Infrastructure'] as const;
export type K8sResourceGroup = typeof K8S_RESOURCE_GROUPS[number];

export function getK8sResourceConfig(type: string): K8sResourceConfig | undefined {
  return K8S_RESOURCES.find(r => r.type === type);
}

export function getK8sResourcesByGroup(): Record<K8sResourceGroup, K8sResourceConfig[]> {
  const result: Partial<Record<K8sResourceGroup, K8sResourceConfig[]>> = {};
  for (const group of K8S_RESOURCE_GROUPS) {
    result[group] = K8S_RESOURCES.filter(r => r.group === group);
  }
  return result as Record<K8sResourceGroup, K8sResourceConfig[]>;
}

export const K8S_DEFAULT_TYPES = [
  'k8s-deployment', 'k8s-pod', 'k8s-service', 'k8s-ingress', 'k8s-secret', 'k8s-configmap',
];

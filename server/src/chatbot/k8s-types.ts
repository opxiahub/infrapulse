export type K8sResourceType =
  | 'k8s-deployment'
  | 'k8s-pod'
  | 'k8s-service'
  | 'k8s-ingress'
  | 'k8s-secret'
  | 'k8s-configmap'
  | 'k8s-statefulset'
  | 'k8s-daemonset'
  | 'k8s-pvc'
  | 'k8s-node'
  | 'k8s-job'
  | 'k8s-cronjob';

export interface K8sInfraNode {
  id: string;
  type: string;
  label: string;
  status: string;
  isManual: boolean;
  metadata: Record<string, any>;
}

export interface K8sInfraEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

export interface K8sGraphData {
  nodes: K8sInfraNode[];
  edges: K8sInfraEdge[];
}

export interface K8sIntentAnalysisResult {
  resourceTypes: K8sResourceType[];
  queryType: 'count' | 'list' | 'filter' | 'info' | 'general';
  filters?: {
    status?: string;
    healthy?: boolean;
    [key: string]: any;
  };
  isAnswerable: boolean;
  unavailableFields?: string[];
  reason?: string;
}

export interface K8sResourceSchema {
  queryable: string[];
  notAvailable: string[];
  description: string;
}

export const K8S_RESOURCE_SCHEMAS: Record<K8sResourceType, K8sResourceSchema> = {
  'k8s-deployment': {
    queryable: ['name', 'status', 'replicas', 'readyReplicas', 'image', 'createdAt', 'namespace'],
    notAvailable: ['live CPU', 'live memory', 'pod logs', 'runtime errors', 'real-time metrics'],
    description: 'Deployment configuration, rollout status, and image metadata',
  },
  'k8s-pod': {
    queryable: ['name', 'status', 'restarts', 'nodeName', 'containers', 'createdAt', 'namespace'],
    notAvailable: ['pod logs', 'live CPU', 'live memory', 'runtime errors', 'container exit traces'],
    description: 'Pod phase, placement, restart count, and container metadata',
  },
  'k8s-service': {
    queryable: ['name', 'type', 'clusterIP', 'ports', 'selector', 'createdAt', 'namespace'],
    notAvailable: ['traffic metrics', 'request count', 'latency', 'error rate'],
    description: 'Service networking configuration and selectors',
  },
  'k8s-ingress': {
    queryable: ['name', 'hosts', 'lbHostnames', 'rules', 'annotations', 'createdAt', 'namespace'],
    notAvailable: ['request metrics', 'latency', 'access logs', 'error rate'],
    description: 'Ingress hosts, backends, and annotations',
  },
  'k8s-secret': {
    queryable: ['name', 'secretType', 'createdAt', 'namespace'],
    notAvailable: ['secret values', 'decoded contents', 'access logs'],
    description: 'Secret type metadata only',
  },
  'k8s-configmap': {
    queryable: ['name', 'dataKeys', 'createdAt', 'namespace'],
    notAvailable: ['full config values unless already modeled', 'runtime usage'],
    description: 'ConfigMap key metadata',
  },
  'k8s-statefulset': {
    queryable: ['name', 'status', 'replicas', 'readyReplicas', 'image', 'createdAt', 'namespace'],
    notAvailable: ['live CPU', 'live memory', 'pod logs', 'runtime errors'],
    description: 'StatefulSet desired and ready replica configuration',
  },
  'k8s-daemonset': {
    queryable: ['name', 'status', 'desiredNumberScheduled', 'numberReady', 'image', 'createdAt', 'namespace'],
    notAvailable: ['live CPU', 'live memory', 'pod logs', 'runtime errors'],
    description: 'DaemonSet scheduling and readiness metadata',
  },
  'k8s-pvc': {
    queryable: ['name', 'phase', 'storageClass', 'capacity', 'accessModes', 'createdAt', 'namespace'],
    notAvailable: ['real disk usage', 'iops', 'throughput', 'storage metrics'],
    description: 'PersistentVolumeClaim storage metadata',
  },
  'k8s-node': {
    queryable: ['name', 'status', 'nodeRole', 'osImage', 'kubernetesVersion', 'cpuCapacity', 'memoryCapacity', 'createdAt'],
    notAvailable: ['live CPU', 'live memory', 'node pressure metrics', 'system logs'],
    description: 'Cluster node role, version, and capacity metadata',
  },
  'k8s-job': {
    queryable: ['name', 'status', 'completions', 'succeeded', 'failed', 'active', 'createdAt', 'namespace'],
    notAvailable: ['job logs', 'runtime traces', 'live execution metrics'],
    description: 'Job completion and failure metadata',
  },
  'k8s-cronjob': {
    queryable: ['name', 'schedule', 'lastScheduleTime', 'active', 'createdAt', 'namespace'],
    notAvailable: ['job logs', 'runtime traces', 'execution duration metrics'],
    description: 'CronJob schedule and recent execution metadata',
  },
};

export const K8S_RESOURCE_TYPES = Object.keys(K8S_RESOURCE_SCHEMAS) as K8sResourceType[];

export function getAvailableK8sFieldsMessage(resourceTypes: K8sResourceType[]): string {
  const messages: string[] = [];

  for (const type of resourceTypes) {
    const schema = K8S_RESOURCE_SCHEMAS[type];
    if (!schema) continue;
    messages.push(
      `**${type.replace('k8s-', '').toUpperCase()}**: ${schema.description}\nAvailable: ${schema.queryable.slice(0, 8).join(', ')}${schema.queryable.length > 8 ? ', ...' : ''}`
    );
  }

  return messages.join('\n\n');
}

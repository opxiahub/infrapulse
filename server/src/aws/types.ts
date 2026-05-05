// `type` is widened to `string` so the same node shape can be used for AWS,
// GCP, Azure, and any future provider. The provider-specific resource registries
// (aws/resource-registry.ts, gcp/resource-registry.ts, azure/resource-registry.ts) constrain it for their
// own discovery and rendering paths.
export interface InfraNode {
  id: string;
  type: string;
  label: string;
  status: string;
  isManual: boolean;
  metadata: Record<string, any>;
  metrics?: MetricData;
  tags?: Record<string, string>;
}

export interface InfraEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

export interface MetricData {
  cpuUtilization?: number;
  connections?: number;
  invocations?: number;
  objectCount?: number;
  timestamp?: string;
}

export interface MetricPulse {
  nodeId: string;
  metrics: MetricData;
  timestamp: string;
}

export interface GraphData {
  nodes: InfraNode[];
  edges: InfraEdge[];
}

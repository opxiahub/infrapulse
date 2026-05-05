import { gcpFetch } from '../gcp/auth.js';
import type { GcpCredentials } from '../providers/types.js';

interface GkeClusterResponse {
  name?: string;
  location?: string;
  status?: string;
  endpoint?: string;
  currentMasterVersion?: string;
  releaseChannel?: { channel?: string };
  masterAuth?: { clusterCaCertificate?: string };
}

interface GkeListResponse {
  clusters?: GkeClusterResponse[];
}

export interface GkeClusterOption {
  name: string;
  location: string;
  status: string;
  endpoint: string;
  masterVersion: string;
  releaseChannel: string;
}

function containerApiBase(projectId: string): string {
  return `https://container.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/locations`;
}

function normalizeEndpoint(endpoint?: string): string {
  if (!endpoint) return '';
  if (endpoint.startsWith('https://') || endpoint.startsWith('http://')) return endpoint;
  return `https://${endpoint}`;
}

export async function listGkeClusters(creds: GcpCredentials): Promise<GkeClusterOption[]> {
  const data = await gcpFetch<GkeListResponse>(
    creds,
    `${containerApiBase(creds.project_id)}/-/clusters`
  );

  return (data.clusters || [])
    .filter((cluster): cluster is GkeClusterResponse & { name: string; location: string } =>
      Boolean(cluster.name && cluster.location)
    )
    .map(cluster => ({
      name: cluster.name,
      location: cluster.location,
      status: cluster.status || 'UNKNOWN',
      endpoint: normalizeEndpoint(cluster.endpoint),
      masterVersion: cluster.currentMasterVersion || 'unknown',
      releaseChannel: cluster.releaseChannel?.channel || 'UNSPECIFIED',
    }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.location.localeCompare(b.location));
}

export async function getGkeCluster(
  creds: GcpCredentials,
  location: string,
  clusterName: string
): Promise<GkeClusterResponse> {
  return gcpFetch<GkeClusterResponse>(
    creds,
    `${containerApiBase(creds.project_id)}/${encodeURIComponent(location)}/clusters/${encodeURIComponent(clusterName)}`
  );
}

export function getGkeClusterServer(cluster: { endpoint?: string }): string {
  return normalizeEndpoint(cluster.endpoint);
}

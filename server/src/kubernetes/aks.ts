import { azureFetch, azureList } from '../azure/auth.js';
import type { AzureCredentials } from '../providers/types.js';

const ARM = 'https://management.azure.com';
const AKS_API_VERSION = '2025-04-01';
const DEFAULT_AKS_SERVER_APP_ID = '6dae42f8-4368-4678-94ff-3960e28e3630';

interface AksManagedCluster {
  id?: string;
  name?: string;
  location?: string;
  properties?: {
    provisioningState?: string;
    fqdn?: string;
    privateFQDN?: string;
    kubernetesVersion?: string;
    dnsPrefix?: string;
    aadProfile?: {
      serverAppID?: string;
      managed?: boolean;
      enableAzureRBAC?: boolean;
    };
    agentPoolProfiles?: Array<{
      name?: string;
      count?: number;
      vmSize?: string;
      mode?: string;
    }>;
  };
}

interface AksCredentialResults {
  kubeconfigs?: Array<{
    name?: string;
    value?: string;
  }>;
}

export interface AksClusterOption {
  name: string;
  resourceGroup: string;
  location: string;
  status: string;
  endpoint: string;
  version: string;
  nodePools: number;
  azureRbac: boolean;
}

export interface AksClusterConnectionDetails {
  apiServerUrl: string;
  ca: string;
  serverAppId: string;
}

function resourceGroupFromId(id?: string): string {
  return id?.match(/\/resourceGroups\/([^/]+)/i)?.[1] || '';
}

function normalizeEndpoint(endpoint?: string): string {
  if (!endpoint) return '';
  if (endpoint.startsWith('https://') || endpoint.startsWith('http://')) return endpoint;
  return `https://${endpoint}`;
}

function clusterPath(creds: AzureCredentials, resourceGroup: string, clusterName: string): string {
  return `${ARM}/subscriptions/${encodeURIComponent(creds.subscriptionId)}` +
    `/resourceGroups/${encodeURIComponent(resourceGroup)}` +
    `/providers/Microsoft.ContainerService/managedClusters/${encodeURIComponent(clusterName)}`;
}

function getLineValue(kubeconfig: string, key: string): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = kubeconfig.match(new RegExp(`\\b${escaped}:\\s*["']?([^"'\\n]+)["']?`));
  return match?.[1]?.trim() || '';
}

function parseKubeconfigDetails(kubeconfig: string): AksClusterConnectionDetails {
  const apiServerUrl = getLineValue(kubeconfig, 'server');
  const ca = getLineValue(kubeconfig, 'certificate-authority-data');
  const serverAppId = getLineValue(kubeconfig, 'apiserver-id') || getLineValue(kubeconfig, 'server-id') || DEFAULT_AKS_SERVER_APP_ID;

  if (!apiServerUrl || !ca) {
    throw new Error('AKS kubeconfig is missing server or certificate-authority-data');
  }

  return {
    apiServerUrl: normalizeEndpoint(apiServerUrl),
    ca,
    serverAppId,
  };
}

export async function listAksClusters(creds: AzureCredentials): Promise<AksClusterOption[]> {
  const clusters = await azureList<AksManagedCluster>(
    creds,
    `${ARM}/subscriptions/${encodeURIComponent(creds.subscriptionId)}` +
      `/providers/Microsoft.ContainerService/managedClusters?api-version=${AKS_API_VERSION}`
  );

  return clusters
    .filter((cluster): cluster is AksManagedCluster & { name: string; id: string } =>
      Boolean(cluster.name && cluster.id)
    )
    .map(cluster => ({
      name: cluster.name,
      resourceGroup: resourceGroupFromId(cluster.id),
      location: cluster.location || 'unknown',
      status: cluster.properties?.provisioningState || 'UNKNOWN',
      endpoint: normalizeEndpoint(cluster.properties?.fqdn || cluster.properties?.privateFQDN),
      version: cluster.properties?.kubernetesVersion || 'unknown',
      nodePools: cluster.properties?.agentPoolProfiles?.length || 0,
      azureRbac: cluster.properties?.aadProfile?.enableAzureRBAC === true,
    }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.resourceGroup.localeCompare(b.resourceGroup));
}

export async function getAksCluster(
  creds: AzureCredentials,
  resourceGroup: string,
  clusterName: string
): Promise<AksManagedCluster> {
  return azureFetch<AksManagedCluster>(
    creds,
    `${clusterPath(creds, resourceGroup, clusterName)}?api-version=${AKS_API_VERSION}`
  );
}

export async function getAksClusterConnectionDetails(
  creds: AzureCredentials,
  resourceGroup: string,
  clusterName: string
): Promise<AksClusterConnectionDetails> {
  const data = await azureFetch<AksCredentialResults>(
    creds,
    `${clusterPath(creds, resourceGroup, clusterName)}/listClusterUserCredential?api-version=${AKS_API_VERSION}&format=azure`,
    { method: 'POST' }
  );

  const encoded = data.kubeconfigs?.[0]?.value;
  if (!encoded) {
    throw new Error('AKS did not return a kubeconfig for the selected cluster');
  }

  return parseKubeconfigDetails(Buffer.from(encoded, 'base64').toString('utf8'));
}

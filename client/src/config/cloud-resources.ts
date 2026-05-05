// Provider-agnostic accessors that resolve a resource's display config from
// the AWS, GCP, or Azure catalog. Used by shared graph components so they don't
// need to know which cloud the data came from.
import { AWS_RESOURCES, getResourceConfig as getAwsConfig, type AwsResourceConfig } from './aws-resources';
import { GCP_RESOURCES, getGcpResourceConfig, type GcpResourceConfig } from './gcp-resources';
import { AZURE_RESOURCES, getAzureResourceConfig, type AzureResourceConfig } from './azure-resources';

export type CloudProvider = 'aws' | 'gcp' | 'azure';

export type CloudResourceConfig = AwsResourceConfig | GcpResourceConfig | AzureResourceConfig;

export function getCloudResourceConfig(type: string, provider?: CloudProvider): CloudResourceConfig | undefined {
  if (provider === 'azure') return getAzureResourceConfig(type);
  if (provider === 'gcp') return getGcpResourceConfig(type);
  if (provider === 'aws') return getAwsConfig(type);
  // No provider hint — cloud-specific types don't collide, so try all catalogs.
  return getAzureResourceConfig(type) || getGcpResourceConfig(type) || getAwsConfig(type);
}

export function getCloudResources(provider: CloudProvider): CloudResourceConfig[] {
  if (provider === 'azure') return AZURE_RESOURCES;
  return provider === 'gcp' ? GCP_RESOURCES : AWS_RESOURCES;
}

export const RESOURCE_GROUPS_ORDER = [
  'Compute', 'Networking', 'Database & Cache', 'Storage', 'Security', 'Content & API', 'Messaging',
] as const;

import type { InfraNode } from '../../aws/types.js';
import type { GcpCredentials } from '../../providers/types.js';
import { gcpFetch } from '../auth.js';

// Cloud Functions v2 API. Use locations/- to fetch across all regions in one call.
interface CloudFunction {
  name?: string; // projects/{project}/locations/{location}/functions/{name}
  state?: string;
  buildConfig?: { runtime?: string; entryPoint?: string };
  serviceConfig?: {
    availableMemory?: string;
    timeoutSeconds?: number;
    uri?: string;
    serviceAccountEmail?: string;
    environmentVariables?: Record<string, string>;
  };
  labels?: Record<string, string>;
  updateTime?: string;
}

interface FunctionsListResponse {
  functions?: CloudFunction[];
  nextPageToken?: string;
}

function shortName(resource?: string): string | undefined {
  if (!resource) return undefined;
  return resource.split('/').pop();
}

function locationFrom(resource?: string): string | undefined {
  if (!resource) return undefined;
  const parts = resource.split('/');
  const idx = parts.indexOf('locations');
  return idx >= 0 ? parts[idx + 1] : undefined;
}

function isManagedByLabels(labels?: Record<string, string>): boolean {
  if (!labels) return false;
  return Object.keys(labels).some(k => {
    const lower = k.toLowerCase();
    return lower.includes('terraform') || lower.includes('deployment-manager') || lower.includes('managed-by');
  });
}

export async function discoverCloudFunctions(creds: GcpCredentials): Promise<InfraNode[]> {
  try {
    const data = await gcpFetch<FunctionsListResponse>(
      creds,
      `https://cloudfunctions.googleapis.com/v2/projects/${encodeURIComponent(creds.project_id)}/locations/-/functions`
    );
    return (data.functions || []).map(f => ({
      id: `fn-${shortName(f.name)}-${locationFrom(f.name)}`,
      type: 'cloud-function',
      label: shortName(f.name) || 'Unknown Function',
      status: (f.state || 'unknown').toLowerCase(),
      isManual: !isManagedByLabels(f.labels),
      tags: f.labels || {},
      metadata: {
        name: shortName(f.name),
        location: locationFrom(f.name),
        runtime: f.buildConfig?.runtime,
        entryPoint: f.buildConfig?.entryPoint,
        memory: f.serviceConfig?.availableMemory,
        timeoutSeconds: f.serviceConfig?.timeoutSeconds,
        uri: f.serviceConfig?.uri,
        serviceAccount: f.serviceConfig?.serviceAccountEmail,
        updateTime: f.updateTime,
        subtitle: `${f.buildConfig?.runtime || ''} · ${locationFrom(f.name) || ''}`,
      },
    }));
  } catch (e: any) {
    console.error('Cloud Functions discovery error:', e.message);
    return [];
  }
}

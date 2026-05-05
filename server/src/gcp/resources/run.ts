import type { InfraNode } from '../../aws/types.js';
import type { GcpCredentials } from '../../providers/types.js';
import { gcpFetch } from '../auth.js';

// Cloud Run v2 — locations/- lists across every region.
interface CloudRunService {
  name?: string;
  uri?: string;
  uid?: string;
  generation?: string;
  conditions?: Array<{ type?: string; state?: string }>;
  template?: {
    containers?: Array<{ image?: string; resources?: { limits?: Record<string, string> } }>;
    serviceAccount?: string;
  };
  labels?: Record<string, string>;
  updateTime?: string;
}

interface RunListResponse {
  services?: CloudRunService[];
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

export async function discoverCloudRunServices(creds: GcpCredentials): Promise<InfraNode[]> {
  try {
    const data = await gcpFetch<RunListResponse>(
      creds,
      `https://run.googleapis.com/v2/projects/${encodeURIComponent(creds.project_id)}/locations/-/services`
    );
    return (data.services || []).map(s => {
      const ready = s.conditions?.find(c => c.type === 'Ready');
      const container = s.template?.containers?.[0];
      return {
        id: `run-${shortName(s.name)}-${locationFrom(s.name)}`,
        type: 'cloud-run',
        label: shortName(s.name) || 'Unknown Service',
        status: (ready?.state || 'unknown').toLowerCase(),
        isManual: !isManagedByLabels(s.labels),
        tags: s.labels || {},
        metadata: {
          name: shortName(s.name),
          location: locationFrom(s.name),
          uri: s.uri,
          uid: s.uid,
          image: container?.image,
          memory: container?.resources?.limits?.memory,
          cpu: container?.resources?.limits?.cpu,
          serviceAccount: s.template?.serviceAccount,
          updateTime: s.updateTime,
          subtitle: `${locationFrom(s.name) || ''}`,
        },
      };
    });
  } catch (e: any) {
    console.error('Cloud Run discovery error:', e.message);
    return [];
  }
}

import type { InfraNode } from '../../aws/types.js';
import type { GcpCredentials } from '../../providers/types.js';
import { gcpFetch } from '../auth.js';

interface Secret {
  name?: string; // projects/{p}/secrets/{name}
  createTime?: string;
  labels?: Record<string, string>;
  replication?: {
    automatic?: object;
    userManaged?: { replicas?: Array<{ location?: string }> };
  };
}

interface SecretListResponse {
  secrets?: Secret[];
  nextPageToken?: string;
}

function shortName(resource?: string): string | undefined {
  if (!resource) return undefined;
  return resource.split('/').pop();
}

function isManagedByLabels(labels?: Record<string, string>): boolean {
  if (!labels) return false;
  return Object.keys(labels).some(k => {
    const lower = k.toLowerCase();
    return lower.includes('terraform') || lower.includes('deployment-manager') || lower.includes('managed-by');
  });
}

export async function discoverSecrets(creds: GcpCredentials): Promise<InfraNode[]> {
  try {
    const data = await gcpFetch<SecretListResponse>(
      creds,
      `https://secretmanager.googleapis.com/v1/projects/${encodeURIComponent(creds.project_id)}/secrets`
    );
    return (data.secrets || []).map(s => {
      const replication = s.replication?.automatic
        ? 'automatic'
        : s.replication?.userManaged
          ? `user-managed (${s.replication.userManaged.replicas?.length || 0})`
          : 'unknown';
      return {
        id: `secret-${shortName(s.name)}`,
        type: 'secret-manager',
        label: shortName(s.name) || 'Unknown Secret',
        status: 'active',
        isManual: !isManagedByLabels(s.labels),
        tags: s.labels || {},
        metadata: {
          name: shortName(s.name),
          replication,
          createTime: s.createTime,
          subtitle: replication,
        },
      };
    });
  } catch (e: any) {
    console.error('Secret Manager discovery error:', e.message);
    return [];
  }
}

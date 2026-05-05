import type { InfraNode } from '../../aws/types.js';
import type { GcpCredentials } from '../../providers/types.js';
import { gcpFetch } from '../auth.js';

interface GcsBucket {
  id?: string;
  name?: string;
  location?: string;
  locationType?: string;
  storageClass?: string;
  timeCreated?: string;
  labels?: Record<string, string>;
}

interface GcsListResponse {
  items?: GcsBucket[];
  nextPageToken?: string;
}

function isManagedByLabels(labels?: Record<string, string>): boolean {
  if (!labels) return false;
  return Object.keys(labels).some(k => {
    const lower = k.toLowerCase();
    return lower.includes('terraform') || lower.includes('deployment-manager') || lower.includes('managed-by');
  });
}

export async function discoverGcsBuckets(creds: GcpCredentials): Promise<InfraNode[]> {
  try {
    const data = await gcpFetch<GcsListResponse>(
      creds,
      `https://storage.googleapis.com/storage/v1/b?project=${encodeURIComponent(creds.project_id)}`
    );
    return (data.items || []).map(b => ({
      id: `gcs-${b.name}`,
      type: 'gcs-bucket',
      label: b.name || 'Unknown Bucket',
      status: 'active',
      isManual: !isManagedByLabels(b.labels),
      tags: b.labels || {},
      metadata: {
        bucketName: b.name,
        location: b.location,
        locationType: b.locationType,
        storageClass: b.storageClass,
        creationTimestamp: b.timeCreated,
        subtitle: `${b.location || ''} · ${b.storageClass || ''}`,
      },
    }));
  } catch (e: any) {
    console.error('GCS bucket discovery error:', e.message);
    return [];
  }
}

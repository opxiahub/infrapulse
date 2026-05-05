import type { InfraNode } from '../../aws/types.js';
import type { GcpCredentials } from '../../providers/types.js';
import { gcpFetch } from '../auth.js';

interface KmsKeyRing {
  name?: string; // projects/{p}/locations/{loc}/keyRings/{name}
  createTime?: string;
}

interface KmsListResponse {
  keyRings?: KmsKeyRing[];
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

export async function discoverKmsKeyRings(creds: GcpCredentials): Promise<InfraNode[]> {
  try {
    const data = await gcpFetch<KmsListResponse>(
      creds,
      // The KMS API supports the wildcard `-` location which fans out across all locations.
      `https://cloudkms.googleapis.com/v1/projects/${encodeURIComponent(creds.project_id)}/locations/-/keyRings`
    );
    return (data.keyRings || []).map(k => ({
      id: `kms-${shortName(k.name)}-${locationFrom(k.name)}`,
      type: 'kms-keyring',
      label: shortName(k.name) || 'Unknown KeyRing',
      status: 'active',
      isManual: true,
      tags: {},
      metadata: {
        name: shortName(k.name),
        location: locationFrom(k.name),
        createTime: k.createTime,
        subtitle: locationFrom(k.name),
      },
    }));
  } catch (e: any) {
    console.error('KMS keyring discovery error:', e.message);
    return [];
  }
}

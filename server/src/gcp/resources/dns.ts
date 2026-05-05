import type { InfraNode } from '../../aws/types.js';
import type { GcpCredentials } from '../../providers/types.js';
import { gcpFetch } from '../auth.js';

interface ManagedZone {
  id?: string;
  name?: string;
  dnsName?: string;
  description?: string;
  visibility?: string;
  nameServers?: string[];
  creationTime?: string;
  labels?: Record<string, string>;
}

interface ZoneListResponse {
  managedZones?: ManagedZone[];
  nextPageToken?: string;
}

function isManagedByLabels(labels?: Record<string, string>): boolean {
  if (!labels) return false;
  return Object.keys(labels).some(k => {
    const lower = k.toLowerCase();
    return lower.includes('terraform') || lower.includes('deployment-manager') || lower.includes('managed-by');
  });
}

export async function discoverCloudDns(creds: GcpCredentials): Promise<InfraNode[]> {
  try {
    const data = await gcpFetch<ZoneListResponse>(
      creds,
      `https://dns.googleapis.com/dns/v1/projects/${encodeURIComponent(creds.project_id)}/managedZones`
    );
    return (data.managedZones || []).map(z => ({
      id: `dns-${z.name}`,
      type: 'cloud-dns',
      label: z.name || 'Unknown Zone',
      status: (z.visibility || 'public').toLowerCase(),
      isManual: !isManagedByLabels(z.labels),
      tags: z.labels || {},
      metadata: {
        zoneId: z.id,
        name: z.name,
        dnsName: z.dnsName,
        description: z.description,
        visibility: z.visibility,
        nameServers: z.nameServers,
        creationTime: z.creationTime,
        subtitle: z.dnsName,
      },
    }));
  } catch (e: any) {
    console.error('Cloud DNS discovery error:', e.message);
    return [];
  }
}

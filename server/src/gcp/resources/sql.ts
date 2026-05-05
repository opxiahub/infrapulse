import type { InfraNode } from '../../aws/types.js';
import type { GcpCredentials } from '../../providers/types.js';
import { gcpFetch } from '../auth.js';

interface SqlInstance {
  name?: string;
  databaseVersion?: string;
  region?: string;
  state?: string;
  settings?: {
    tier?: string;
    storageAutoResize?: boolean;
    dataDiskSizeGb?: string;
    availabilityType?: string;
    userLabels?: Record<string, string>;
  };
  ipAddresses?: Array<{ type?: string; ipAddress?: string }>;
  connectionName?: string;
  createTime?: string;
}

interface SqlListResponse {
  items?: SqlInstance[];
  nextPageToken?: string;
}

function isManagedByLabels(labels?: Record<string, string>): boolean {
  if (!labels) return false;
  return Object.keys(labels).some(k => {
    const lower = k.toLowerCase();
    return lower.includes('terraform') || lower.includes('deployment-manager') || lower.includes('managed-by');
  });
}

export async function discoverCloudSql(creds: GcpCredentials): Promise<InfraNode[]> {
  try {
    const data = await gcpFetch<SqlListResponse>(
      creds,
      `https://sqladmin.googleapis.com/v1/projects/${encodeURIComponent(creds.project_id)}/instances`
    );
    return (data.items || []).map(i => {
      const primaryIp = i.ipAddresses?.find(ip => ip.type === 'PRIMARY')?.ipAddress
        || i.ipAddresses?.[0]?.ipAddress;
      return {
        id: `sql-${i.name}`,
        type: 'cloud-sql',
        label: i.name || 'Unknown SQL Instance',
        status: (i.state || 'unknown').toLowerCase(),
        isManual: !isManagedByLabels(i.settings?.userLabels),
        tags: i.settings?.userLabels || {},
        metadata: {
          name: i.name,
          databaseVersion: i.databaseVersion,
          region: i.region,
          tier: i.settings?.tier,
          availabilityType: i.settings?.availabilityType,
          storageGb: i.settings?.dataDiskSizeGb,
          autoResize: i.settings?.storageAutoResize,
          ipAddress: primaryIp,
          connectionName: i.connectionName,
          createTime: i.createTime,
          subtitle: `${i.databaseVersion || ''} · ${i.region || ''}`,
        },
      };
    });
  } catch (e: any) {
    console.error('Cloud SQL discovery error:', e.message);
    return [];
  }
}

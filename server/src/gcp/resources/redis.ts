import type { InfraNode } from '../../aws/types.js';
import type { GcpCredentials } from '../../providers/types.js';
import { gcpFetch } from '../auth.js';

// Memorystore for Redis. locations/- lists across every region.
interface RedisInstance {
  name?: string; // projects/{p}/locations/{loc}/instances/{name}
  displayName?: string;
  redisVersion?: string;
  tier?: string;
  memorySizeGb?: number;
  state?: string;
  host?: string;
  port?: number;
  authorizedNetwork?: string;
  labels?: Record<string, string>;
  createTime?: string;
}

interface RedisListResponse {
  instances?: RedisInstance[];
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

export async function discoverMemorystore(creds: GcpCredentials): Promise<InfraNode[]> {
  try {
    const data = await gcpFetch<RedisListResponse>(
      creds,
      `https://redis.googleapis.com/v1/projects/${encodeURIComponent(creds.project_id)}/locations/-/instances`
    );
    return (data.instances || []).map(i => ({
      id: `redis-${shortName(i.name)}-${locationFrom(i.name)}`,
      type: 'memorystore',
      label: i.displayName || shortName(i.name) || 'Unknown Redis',
      status: (i.state || 'unknown').toLowerCase(),
      isManual: !isManagedByLabels(i.labels),
      tags: i.labels || {},
      metadata: {
        name: shortName(i.name),
        location: locationFrom(i.name),
        redisVersion: i.redisVersion,
        tier: i.tier,
        memorySizeGb: i.memorySizeGb,
        host: i.host,
        port: i.port,
        authorizedNetwork: shortName(i.authorizedNetwork),
        createTime: i.createTime,
        subtitle: `${i.tier || ''} · ${i.memorySizeGb ?? 0}GB`,
      },
    }));
  } catch (e: any) {
    console.error('Memorystore discovery error:', e.message);
    return [];
  }
}

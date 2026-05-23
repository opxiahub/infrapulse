import { getDb } from '../db/connection.js';
import { getDecryptedCredentials } from '../providers/routes.js';
import { discoverResources } from '../aws/discovery.js';
import { discoverGcpResources } from '../gcp/discovery.js';
import { discoverAzureResources } from '../azure/discovery.js';
import { buildGraph } from '../graph/builder.js';
import type { GraphData } from '../aws/types.js';
import type { AwsResourceType } from '../aws/resource-registry.js';
import type { GcpResourceType } from '../gcp/resource-registry.js';
import type { AzureResourceType } from '../azure/resource-registry.js';
import type { AwsCredentials, GcpCredentials, AzureCredentials } from '../providers/types.js';

const DEFAULT_TYPES: Record<string, string[]> = {
  aws: ['ec2', 'rds', 's3', 'lambda'],
  gcp: ['gce-instance', 'cloud-sql', 'gcs-bucket', 'cloud-function'],
  azure: ['azure-vm', 'azure-sql-server', 'azure-storage-account', 'azure-function'],
};

export interface CloudChatData {
  graphData: GraphData;
  scannedTypes: string[];
  fetchTags: boolean;
  scannedAt: string | null;
  refreshed: boolean;
}

function persist(userId: number, providerId: number, types: string[], graph: GraphData, fetchTags: boolean) {
  getDb().prepare(`
    INSERT INTO cached_graphs (user_id, provider_id, resource_types, graph_data, scanned_at, fetch_tags)
    VALUES (?, ?, ?, ?, datetime('now'), ?)
    ON CONFLICT(user_id, provider_id) DO UPDATE SET
      resource_types = excluded.resource_types,
      graph_data     = excluded.graph_data,
      scanned_at     = excluded.scanned_at,
      fetch_tags     = excluded.fetch_tags
  `).run(userId, providerId, types.join(','), JSON.stringify(graph), fetchTags ? 1 : 0);
}

/**
 * Runs a live discovery for a provider and persists the result. Reuses the
 * resource-type set / tag preference from the previous scan when available so a
 * chat-triggered refresh stays consistent with what the user last scanned.
 */
async function liveScan(
  userId: number,
  providerId: number,
  provider: string,
  types: string[],
  fetchTags: boolean,
): Promise<GraphData> {
  const result = getDecryptedCredentials(providerId, userId);
  if (!result) throw new Error('Provider credentials not found');

  let nodes;
  if (provider === 'gcp') {
    nodes = await discoverGcpResources(result.creds as GcpCredentials, types as GcpResourceType[]);
  } else if (provider === 'azure') {
    nodes = await discoverAzureResources(result.creds as AzureCredentials, types as AzureResourceType[]);
  } else {
    nodes = await discoverResources(providerId, result.creds as AwsCredentials, result.region, types as AwsResourceType[], fetchTags);
  }

  const graph = buildGraph(nodes);
  persist(userId, providerId, types, graph, fetchTags);
  return graph;
}

/**
 * Returns the graph the chat should reason over. Pulls the cached scan, and
 * transparently re-scans the live environment when there is no cached data, a
 * refresh was requested, or a tag question arrived for a scan that didn't fetch
 * tags (so the assistant can actually answer it instead of refusing).
 */
export async function getCloudChatData(
  userId: number,
  providerId: number,
  provider: string,
  opts: { forceRefresh?: boolean; needTags?: boolean } = {},
): Promise<CloudChatData> {
  const row = getDb().prepare(
    'SELECT graph_data, resource_types, scanned_at, fetch_tags FROM cached_graphs WHERE user_id = ? AND provider_id = ?'
  ).get(userId, providerId) as any;

  const cachedTypes: string[] = row?.resource_types ? String(row.resource_types).split(',').filter(Boolean) : [];
  const cachedFetchTags = row?.fetch_tags === 1;
  const types = cachedTypes.length > 0 ? cachedTypes : (DEFAULT_TYPES[provider] || DEFAULT_TYPES.aws);

  // AWS is the only path that can fetch tags during discovery.
  const wantTags = provider === 'aws' && opts.needTags ? true : cachedFetchTags;
  const tagUpgrade = wantTags && !cachedFetchTags;

  if (!row || opts.forceRefresh || tagUpgrade) {
    const graphData = await liveScan(userId, providerId, provider, types, wantTags);
    return { graphData, scannedTypes: types, fetchTags: wantTags, scannedAt: new Date().toISOString(), refreshed: true };
  }

  return {
    graphData: JSON.parse(row.graph_data) as GraphData,
    scannedTypes: types,
    fetchTags: cachedFetchTags,
    scannedAt: row.scanned_at || null,
    refreshed: false,
  };
}

const REFRESH_PATTERNS = [
  /\b(refresh|re-?scan|re-?fetch|reload|latest|current(ly)?|right now|as of now|up[- ]?to[- ]?date|live)\b/i,
];

export function wantsRefresh(message: string): boolean {
  return REFRESH_PATTERNS.some(re => re.test(message));
}

export function mentionsTags(message: string): boolean {
  return /\btag(s|ged|ging)?\b|\blabel(s|led|ing)?\b/i.test(message);
}

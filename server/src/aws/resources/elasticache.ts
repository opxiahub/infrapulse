import { DescribeCacheClustersCommand, ListTagsForResourceCommand } from '@aws-sdk/client-elasticache';
import type { ElastiCacheClient } from '@aws-sdk/client-elasticache';
import type { InfraNode } from '../types.js';

export async function discoverElasticache(client: ElastiCacheClient, fetchTags?: boolean): Promise<InfraNode[]> {
  try {
    const res = await client.send(new DescribeCacheClustersCommand({ ShowCacheNodeInfo: true }));
    const nodes: InfraNode[] = [];
    for (const c of res.CacheClusters || []) {
      let tags: Record<string, string> = {};
      if (fetchTags && c.ARN) {
        try {
          const tagRes = await client.send(new ListTagsForResourceCommand({ ResourceName: c.ARN }));
          for (const t of tagRes.TagList || []) {
            if (t.Key) tags[t.Key] = t.Value ?? '';
          }
        } catch { /* ignore */ }
      }
      nodes.push({
        id: `elasticache-${c.CacheClusterId}`,
        type: 'elasticache' as const,
        label: c.CacheClusterId || 'Unknown Cache',
        status: c.CacheClusterStatus || 'unknown',
        isManual: true,
        tags,
        metadata: { cacheClusterId: c.CacheClusterId, engine: c.Engine, engineVersion: c.EngineVersion, nodeType: c.CacheNodeType, numNodes: c.NumCacheNodes, subtitle: `${c.Engine} ${c.EngineVersion}` },
      });
    }
    return nodes;
  } catch (e: any) { console.error('ElastiCache discovery error:', e.message); return []; }
}

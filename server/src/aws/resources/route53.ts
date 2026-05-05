import { ListHostedZonesCommand, ListTagsForResourcesCommand } from '@aws-sdk/client-route-53';
import type { Route53Client } from '@aws-sdk/client-route-53';
import type { InfraNode } from '../types.js';

export async function discoverRoute53(client: Route53Client, fetchTags?: boolean): Promise<InfraNode[]> {
  try {
    const res = await client.send(new ListHostedZonesCommand({}));
    const zones = res.HostedZones || [];

    // Batch fetch tags (up to 10 IDs per call)
    const tagsById: Record<string, Record<string, string>> = {};
    if (fetchTags) {
      const ids = zones.map(z => z.Id?.split('/').pop()).filter(Boolean) as string[];
      for (let i = 0; i < ids.length; i += 10) {
        try {
          const tagRes = await client.send(new ListTagsForResourcesCommand({ ResourceType: 'hostedzone', ResourceIds: ids.slice(i, i + 10) }));
          for (const rt of tagRes.ResourceTagSets || []) {
            const record: Record<string, string> = {};
            for (const t of rt.Tags || []) {
              if (t.Key) record[t.Key] = t.Value ?? '';
            }
            if (rt.ResourceId) tagsById[rt.ResourceId] = record;
          }
        } catch { /* ignore */ }
      }
    }

    return zones.map(z => {
      const shortId = z.Id?.split('/').pop() || '';
      return {
        id: `r53-${shortId}`,
        type: 'route53' as const,
        label: z.Name || 'Unknown Zone',
        status: z.Config?.PrivateZone ? 'private' : 'public',
        isManual: true,
        tags: tagsById[shortId] ?? {},
        metadata: { hostedZoneId: z.Id, name: z.Name, recordCount: z.ResourceRecordSetCount, isPrivate: z.Config?.PrivateZone, subtitle: z.Config?.PrivateZone ? 'Private Zone' : 'Public Zone' },
      };
    });
  } catch (e: any) { console.error('Route 53 discovery error:', e.message); return []; }
}

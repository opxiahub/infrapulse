import { ListDistributionsCommand, ListTagsForResourceCommand } from '@aws-sdk/client-cloudfront';
import type { CloudFrontClient } from '@aws-sdk/client-cloudfront';
import type { InfraNode } from '../types.js';

export async function discoverCloudfront(client: CloudFrontClient, fetchTags?: boolean): Promise<InfraNode[]> {
  try {
    const res = await client.send(new ListDistributionsCommand({}));
    const nodes: InfraNode[] = [];
    for (const d of res.DistributionList?.Items || []) {
      const origins = d.Origins?.Items?.map(o => o.DomainName) || [];
      let tags: Record<string, string> = {};
      if (fetchTags && d.ARN) {
        try {
          const tagRes = await client.send(new ListTagsForResourceCommand({ Resource: d.ARN }));
          for (const t of tagRes.Tags?.Items || []) {
            if (t.Key) tags[t.Key] = t.Value ?? '';
          }
        } catch { /* ignore */ }
      }
      nodes.push({
        id: `cf-${d.Id}`,
        type: 'cloudfront' as const,
        label: d.Comment || d.DomainName || 'Unknown CF',
        status: d.Enabled ? 'enabled' : 'disabled',
        isManual: true,
        tags,
        metadata: { distributionId: d.Id, domainName: d.DomainName, status: d.Status, origins, webAclId: d.WebACLId, subtitle: d.DomainName },
      });
    }
    return nodes;
  } catch (e: any) { console.error('CloudFront discovery error:', e.message); return []; }
}

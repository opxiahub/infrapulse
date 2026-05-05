import { ListWebACLsCommand, ListTagsForResourceCommand } from '@aws-sdk/client-wafv2';
import type { WAFV2Client } from '@aws-sdk/client-wafv2';
import type { InfraNode } from '../types.js';

export async function discoverWaf(client: WAFV2Client, fetchTags?: boolean): Promise<InfraNode[]> {
  try {
    const res = await client.send(new ListWebACLsCommand({ Scope: 'REGIONAL' }));
    const nodes: InfraNode[] = [];
    for (const acl of res.WebACLs || []) {
      let tags: Record<string, string> = {};
      if (fetchTags && acl.ARN) {
        try {
          const tagRes = await client.send(new ListTagsForResourceCommand({ ResourceARN: acl.ARN }));
          for (const t of tagRes.TagInfoForResource?.TagList || []) {
            if (t.Key) tags[t.Key] = t.Value ?? '';
          }
        } catch { /* ignore */ }
      }
      nodes.push({
        id: `waf-${acl.Id}`,
        type: 'waf' as const,
        label: acl.Name || 'Unknown WAF',
        status: 'active',
        isManual: true,
        tags,
        metadata: { webAclId: acl.Id, arn: acl.ARN, name: acl.Name, subtitle: 'Regional WAF' },
      });
    }
    return nodes;
  } catch (e: any) { console.error('WAF discovery error:', e.message); return []; }
}

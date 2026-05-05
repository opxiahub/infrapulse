import { ListTopicsCommand, ListTagsForResourceCommand } from '@aws-sdk/client-sns';
import type { SNSClient } from '@aws-sdk/client-sns';
import type { InfraNode } from '../types.js';

export async function discoverSns(client: SNSClient, fetchTags?: boolean): Promise<InfraNode[]> {
  try {
    const res = await client.send(new ListTopicsCommand({}));
    const nodes: InfraNode[] = [];
    for (const t of res.Topics || []) {
      const name = t.TopicArn?.split(':').pop();
      let tags: Record<string, string> = {};
      if (fetchTags && t.TopicArn) {
        try {
          const tagRes = await client.send(new ListTagsForResourceCommand({ ResourceArn: t.TopicArn }));
          for (const tag of tagRes.Tags || []) {
            if (tag.Key) tags[tag.Key] = tag.Value ?? '';
          }
        } catch { /* ignore */ }
      }
      nodes.push({
        id: `sns-${name}`,
        type: 'sns' as const,
        label: name || 'Unknown Topic',
        status: 'active',
        isManual: true,
        tags,
        metadata: { topicArn: t.TopicArn, name, subtitle: 'SNS Topic' },
      });
    }
    return nodes;
  } catch (e: any) { console.error('SNS discovery error:', e.message); return []; }
}

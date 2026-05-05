import { ListKeysCommand, DescribeKeyCommand, ListResourceTagsCommand } from '@aws-sdk/client-kms';
import type { KMSClient } from '@aws-sdk/client-kms';
import type { InfraNode } from '../types.js';

export async function discoverKms(client: KMSClient, fetchTags?: boolean): Promise<InfraNode[]> {
  try {
    const res = await client.send(new ListKeysCommand({}));
    const nodes: InfraNode[] = [];
    for (const key of (res.Keys || []).slice(0, 50)) { // limit to avoid rate limiting
      try {
        const desc = await client.send(new DescribeKeyCommand({ KeyId: key.KeyId }));
        const m = desc.KeyMetadata;
        if (!m || m.KeyManager === 'AWS') continue; // skip AWS-managed keys
        let tags: Record<string, string> = {};
        if (fetchTags && m.KeyId) {
          try {
            const tagRes = await client.send(new ListResourceTagsCommand({ KeyId: m.KeyId }));
            for (const t of tagRes.Tags || []) {
              if (t.TagKey) tags[t.TagKey] = t.TagValue ?? '';
            }
          } catch { /* ignore */ }
        }
        nodes.push({
          id: `kms-${m.KeyId}`,
          type: 'kms' as const,
          label: m.Description || m.KeyId || 'Unknown Key',
          status: m.KeyState || 'unknown',
          isManual: m.Origin === 'AWS_KMS',
          tags,
          metadata: { keyId: m.KeyId, arn: m.Arn, keyUsage: m.KeyUsage, keySpec: m.KeySpec, keyManager: m.KeyManager, subtitle: m.KeyUsage },
        });
      } catch { /* skip keys we can't describe */ }
    }
    return nodes;
  } catch (e: any) { console.error('KMS discovery error:', e.message); return []; }
}

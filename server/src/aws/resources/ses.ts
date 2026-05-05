import { ListEmailIdentitiesCommand, GetEmailIdentityCommand } from '@aws-sdk/client-sesv2';
import type { SESv2Client } from '@aws-sdk/client-sesv2';
import type { InfraNode } from '../types.js';

export async function discoverSes(client: SESv2Client, fetchTags?: boolean): Promise<InfraNode[]> {
  try {
    const res = await client.send(new ListEmailIdentitiesCommand({}));
    const nodes: InfraNode[] = [];
    for (const e of res.EmailIdentities || []) {
      let tags: Record<string, string> = {};
      if (fetchTags && e.IdentityName) {
        try {
          const detail = await client.send(new GetEmailIdentityCommand({ EmailIdentity: e.IdentityName }));
          for (const t of detail.Tags || []) {
            if (t.Key) tags[t.Key] = t.Value ?? '';
          }
        } catch { /* ignore */ }
      }
      nodes.push({
        id: `ses-${e.IdentityName}`,
        type: 'ses' as const,
        label: e.IdentityName || 'Unknown Identity',
        status: e.SendingEnabled ? 'enabled' : 'disabled',
        isManual: true,
        tags,
        metadata: { identityName: e.IdentityName, identityType: e.IdentityType, sendingEnabled: e.SendingEnabled, subtitle: e.IdentityType },
      });
    }
    return nodes;
  } catch (e: any) { console.error('SES discovery error:', e.message); return []; }
}

import { ListCertificatesCommand, ListTagsForCertificateCommand } from '@aws-sdk/client-acm';
import type { ACMClient } from '@aws-sdk/client-acm';
import type { InfraNode } from '../types.js';

export async function discoverAcm(client: ACMClient, fetchTags?: boolean): Promise<InfraNode[]> {
  try {
    const res = await client.send(new ListCertificatesCommand({}));
    const nodes: InfraNode[] = [];
    for (const cert of res.CertificateSummaryList || []) {
      let tags: Record<string, string> = {};
      if (fetchTags && cert.CertificateArn) {
        try {
          const tagRes = await client.send(new ListTagsForCertificateCommand({ CertificateArn: cert.CertificateArn }));
          for (const t of tagRes.Tags || []) {
            if (t.Key) tags[t.Key] = t.Value ?? '';
          }
        } catch { /* ignore */ }
      }
      nodes.push({
        id: `acm-${cert.CertificateArn?.split('/').pop()}`,
        type: 'acm' as const,
        label: cert.DomainName || 'Unknown Cert',
        status: cert.Status || 'unknown',
        isManual: true,
        tags,
        metadata: { arn: cert.CertificateArn, domainName: cert.DomainName, status: cert.Status, type: cert.Type, subtitle: cert.Type },
      });
    }
    return nodes;
  } catch (e: any) { console.error('ACM discovery error:', e.message); return []; }
}

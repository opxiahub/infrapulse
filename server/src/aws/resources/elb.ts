import { DescribeLoadBalancersCommand, DescribeTagsCommand } from '@aws-sdk/client-elastic-load-balancing-v2';
import type { ElasticLoadBalancingV2Client } from '@aws-sdk/client-elastic-load-balancing-v2';
import type { InfraNode } from '../types.js';

export async function discoverElb(client: ElasticLoadBalancingV2Client, fetchTags?: boolean): Promise<InfraNode[]> {
  try {
    const res = await client.send(new DescribeLoadBalancersCommand({}));
    const lbs = res.LoadBalancers || [];

    // Batch fetch tags (up to 20 ARNs per call)
    const tagsByArn: Record<string, Record<string, string>> = {};
    if (fetchTags) {
      const arns = lbs.map(lb => lb.LoadBalancerArn).filter(Boolean) as string[];
      for (let i = 0; i < arns.length; i += 20) {
        try {
          const tagRes = await client.send(new DescribeTagsCommand({ ResourceArns: arns.slice(i, i + 20) }));
          for (const desc of tagRes.TagDescriptions || []) {
            const record: Record<string, string> = {};
            for (const t of desc.Tags || []) {
              if (t.Key) record[t.Key] = t.Value ?? '';
            }
            if (desc.ResourceArn) tagsByArn[desc.ResourceArn] = record;
          }
        } catch { /* ignore */ }
      }
    }

    return lbs.map(lb => ({
      id: `elb-${lb.LoadBalancerName}`,
      type: 'elb' as const,
      label: lb.LoadBalancerName || 'Unknown LB',
      status: lb.State?.Code || 'unknown',
      isManual: true,
      tags: lb.LoadBalancerArn ? tagsByArn[lb.LoadBalancerArn] ?? {} : {},
      metadata: { loadBalancerArn: lb.LoadBalancerArn, dnsName: lb.DNSName, type: lb.Type, scheme: lb.Scheme, vpcId: lb.VpcId, az: lb.AvailabilityZones?.map(a => a.ZoneName), subtitle: `${lb.Type} · ${lb.Scheme}` },
    }));
  } catch (e: any) { console.error('ELB discovery error:', e.message); return []; }
}

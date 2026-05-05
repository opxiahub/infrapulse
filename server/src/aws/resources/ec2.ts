import { DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import type { EC2Client } from '@aws-sdk/client-ec2';
import type { InfraNode } from '../types.js';

export async function discoverEc2(client: EC2Client): Promise<InfraNode[]> {
  const nodes: InfraNode[] = [];

  try {
    const response = await client.send(new DescribeInstancesCommand({}));
    for (const reservation of response.Reservations || []) {
      for (const instance of reservation.Instances || []) {
        const tags = instance.Tags || [];
        const nameTag = tags.find(t => t.Key === 'Name');
        const hasManagedTag = tags.some(t =>
          t.Key?.toLowerCase().includes('terraform') ||
          t.Key?.toLowerCase().includes('cloudformation') ||
          t.Key?.toLowerCase() === 'aws:cloudformation:stack-name'
        );
        const tagRecord: Record<string, string> = {};
        for (const t of tags) {
          if (t.Key) tagRecord[t.Key] = t.Value ?? '';
        }

        nodes.push({
          id: `ec2-${instance.InstanceId}`,
          type: 'ec2',
          label: nameTag?.Value || instance.InstanceId || 'Unknown EC2',
          status: instance.State?.Name || 'unknown',
          isManual: !hasManagedTag,
          tags: tagRecord,
          metadata: {
            instanceId: instance.InstanceId,
            instanceType: instance.InstanceType,
            availabilityZone: instance.Placement?.AvailabilityZone,
            vpcId: instance.VpcId,
            subnetId: instance.SubnetId,
            privateIp: instance.PrivateIpAddress,
            publicIp: instance.PublicIpAddress,
            securityGroups: instance.SecurityGroups?.map(sg => ({
              id: sg.GroupId,
              name: sg.GroupName,
            })),
            launchTime: instance.LaunchTime?.toISOString(),
          },
        });
      }
    }
  } catch (err: any) {
    console.error('EC2 discovery error:', err.message);
  }

  return nodes;
}

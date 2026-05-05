import { DescribeDBInstancesCommand } from '@aws-sdk/client-rds';
import type { RDSClient } from '@aws-sdk/client-rds';
import type { InfraNode } from '../types.js';

export async function discoverRds(client: RDSClient): Promise<InfraNode[]> {
  const nodes: InfraNode[] = [];

  try {
    const response = await client.send(new DescribeDBInstancesCommand({}));
    for (const db of response.DBInstances || []) {
      const dbTags = db.TagList || [];
      const hasManagedTag = dbTags.some(t =>
        t.Key?.toLowerCase().includes('terraform') ||
        t.Key?.toLowerCase().includes('cloudformation') ||
        t.Key?.toLowerCase() === 'aws:cloudformation:stack-name'
      );
      const tagRecord: Record<string, string> = {};
      for (const t of dbTags) {
        if (t.Key) tagRecord[t.Key] = t.Value ?? '';
      }

      nodes.push({
        id: `rds-${db.DBInstanceIdentifier}`,
        type: 'rds',
        label: db.DBInstanceIdentifier || 'Unknown RDS',
        status: db.DBInstanceStatus || 'unknown',
        isManual: !hasManagedTag,
        tags: tagRecord,
        metadata: {
          dbInstanceId: db.DBInstanceIdentifier,
          engine: db.Engine,
          engineVersion: db.EngineVersion,
          instanceClass: db.DBInstanceClass,
          vpcId: db.DBSubnetGroup?.VpcId,
          endpoint: db.Endpoint?.Address,
          port: db.Endpoint?.Port,
          multiAZ: db.MultiAZ,
          storageType: db.StorageType,
          allocatedStorage: db.AllocatedStorage,
          securityGroups: db.VpcSecurityGroups?.map(sg => ({
            id: sg.VpcSecurityGroupId,
            status: sg.Status,
          })),
        },
      });
    }
  } catch (err: any) {
    console.error('RDS discovery error:', err.message);
  }

  return nodes;
}

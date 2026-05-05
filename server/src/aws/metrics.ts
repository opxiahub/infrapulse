import {
  GetMetricDataCommand,
  type MetricDataQuery,
} from '@aws-sdk/client-cloudwatch';
import type { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import type { InfraNode, MetricPulse } from './types.js';

export async function fetchMetrics(
  cloudwatch: CloudWatchClient,
  nodes: InfraNode[]
): Promise<MetricPulse[]> {
  const pulses: MetricPulse[] = [];
  const now = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);

  const queries: MetricDataQuery[] = [];

  for (const node of nodes) {
    if (node.type === 'ec2' && node.metadata.instanceId) {
      queries.push({
        Id: `cpu_${node.metadata.instanceId.replace(/-/g, '_')}`,
        MetricStat: {
          Metric: {
            Namespace: 'AWS/EC2',
            MetricName: 'CPUUtilization',
            Dimensions: [{ Name: 'InstanceId', Value: node.metadata.instanceId }],
          },
          Period: 300,
          Stat: 'Average',
        },
      });
    } else if (node.type === 'rds' && node.metadata.dbInstanceId) {
      queries.push({
        Id: `conn_${node.metadata.dbInstanceId.replace(/-/g, '_')}`,
        MetricStat: {
          Metric: {
            Namespace: 'AWS/RDS',
            MetricName: 'DatabaseConnections',
            Dimensions: [{ Name: 'DBInstanceIdentifier', Value: node.metadata.dbInstanceId }],
          },
          Period: 300,
          Stat: 'Average',
        },
      });
    } else if (node.type === 'lambda' && node.metadata.functionName) {
      queries.push({
        Id: `inv_${node.metadata.functionName.replace(/[^a-zA-Z0-9_]/g, '_')}`,
        MetricStat: {
          Metric: {
            Namespace: 'AWS/Lambda',
            MetricName: 'Invocations',
            Dimensions: [{ Name: 'FunctionName', Value: node.metadata.functionName }],
          },
          Period: 300,
          Stat: 'Sum',
        },
      });
    }
  }

  if (queries.length === 0) return pulses;

  // CloudWatch limits to 500 queries per request; batch if needed
  const batchSize = 500;
  for (let i = 0; i < queries.length; i += batchSize) {
    try {
      const batch = queries.slice(i, i + batchSize);
      const response = await cloudwatch.send(new GetMetricDataCommand({
        MetricDataQueries: batch,
        StartTime: fiveMinAgo,
        EndTime: now,
      }));

      for (const result of response.MetricDataResults || []) {
        const id = result.Id || '';
        const value = result.Values?.[0] ?? 0;

        let nodeId = '';
        if (id.startsWith('cpu_')) {
          const instanceId = id.replace('cpu_', '').replace(/_/g, '-');
          nodeId = `ec2-${instanceId}`;
          pulses.push({ nodeId, metrics: { cpuUtilization: value }, timestamp: now.toISOString() });
        } else if (id.startsWith('conn_')) {
          const dbId = id.replace('conn_', '').replace(/_/g, '-');
          nodeId = `rds-${dbId}`;
          pulses.push({ nodeId, metrics: { connections: value }, timestamp: now.toISOString() });
        } else if (id.startsWith('inv_')) {
          const fnName = id.replace('inv_', '').replace(/_/g, '-');
          nodeId = `lambda-${fnName}`;
          pulses.push({ nodeId, metrics: { invocations: value }, timestamp: now.toISOString() });
        }
      }
    } catch (err: any) {
      console.error('CloudWatch metrics error:', err.message);
    }
  }

  return pulses;
}

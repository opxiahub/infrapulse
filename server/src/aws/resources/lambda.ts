import { ListFunctionsCommand, ListTagsCommand } from '@aws-sdk/client-lambda';
import type { LambdaClient } from '@aws-sdk/client-lambda';
import type { InfraNode } from '../types.js';

export async function discoverLambda(client: LambdaClient): Promise<InfraNode[]> {
  const nodes: InfraNode[] = [];

  try {
    const response = await client.send(new ListFunctionsCommand({}));
    for (const fn of response.Functions || []) {
      let hasManagedTag = false;
      let fetchedTags: Record<string, string> = {};
      try {
        if (fn.FunctionArn) {
          const tagsResponse = await client.send(new ListTagsCommand({ Resource: fn.FunctionArn }));
          fetchedTags = tagsResponse.Tags || {};
          hasManagedTag = Object.keys(fetchedTags).some(k =>
            k.toLowerCase().includes('terraform') ||
            k.toLowerCase().includes('cloudformation') ||
            k.toLowerCase() === 'aws:cloudformation:stack-name'
          );
        }
      } catch {
        // Tags fetch failed, default to manual
      }

      // Extract S3/RDS references from env vars for edge inference
      const envVars = fn.Environment?.Variables || {};
      const referencedBuckets: string[] = [];
      const referencedEndpoints: string[] = [];
      for (const val of Object.values(envVars)) {
        if (val.includes('.s3.') || val.match(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/)) {
          referencedBuckets.push(val);
        }
        if (val.includes('.rds.amazonaws.com')) {
          referencedEndpoints.push(val);
        }
      }

      nodes.push({
        id: `lambda-${fn.FunctionName}`,
        type: 'lambda',
        label: fn.FunctionName || 'Unknown Lambda',
        status: fn.State || 'active',
        isManual: !hasManagedTag,
        tags: fetchedTags,
        metadata: {
          functionName: fn.FunctionName,
          runtime: fn.Runtime,
          memorySize: fn.MemorySize,
          timeout: fn.Timeout,
          handler: fn.Handler,
          lastModified: fn.LastModified,
          codeSize: fn.CodeSize,
          vpcId: fn.VpcConfig?.VpcId,
          subnetIds: fn.VpcConfig?.SubnetIds,
          referencedBuckets,
          referencedEndpoints,
        },
      });
    }
  } catch (err: any) {
    console.error('Lambda discovery error:', err.message);
  }

  return nodes;
}

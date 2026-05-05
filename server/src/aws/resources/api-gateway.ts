import { GetRestApisCommand } from '@aws-sdk/client-api-gateway';
import type { APIGatewayClient } from '@aws-sdk/client-api-gateway';
import type { InfraNode } from '../types.js';

export async function discoverApiGateway(client: APIGatewayClient): Promise<InfraNode[]> {
  try {
    const res = await client.send(new GetRestApisCommand({}));
    return (res.items || []).map(api => {
      const tags = api.tags || {};
      const hasManagedTag = Object.keys(tags).some(k =>
        k.toLowerCase().includes('terraform') ||
        k.toLowerCase().includes('cloudformation')
      );
      return {
        id: `apigw-${api.id}`,
        type: 'api-gateway' as const,
        label: api.name || 'Unknown API',
        status: 'active',
        isManual: !hasManagedTag,
        tags: tags as Record<string, string>,
        metadata: { apiId: api.id, name: api.name, description: api.description, endpointType: api.endpointConfiguration?.types?.join(', '), subtitle: api.endpointConfiguration?.types?.join(', ') || 'REST API' },
      };
    });
  } catch (e: any) { console.error('API Gateway discovery error:', e.message); return []; }
}

import { Router, Request, Response } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { getDb } from '../db/connection.js';
import type { User } from '../auth/passport.js';
import type { ChatRequest, ChatResponse } from './types.js';
import { analyzeIntent } from './intent-analyzer.js';
import { buildContext } from './context-builder.js';
import { callGlobantLLM } from './llm-service.js';
import type { GraphData } from '../aws/types.js';
import { analyzeK8sIntent } from './k8s-intent-analyzer.js';
import { buildK8sContext } from './k8s-context-builder.js';
import type { K8sGraphData } from './k8s-types.js';

const router = Router();

router.use(requireAuth);

/**
 * Provider-agnostic context builder used for GCP, Azure, and any future provider
 * where we don't yet have an intent analyzer with a typed schema. Groups all
 * nodes by type and emits the same metadata fields the AWS context-builder
 * surfaces — keeps the LLM input shape consistent across clouds.
 */
function buildFullGraphContext(graphData: GraphData): string {
  if (!graphData.nodes.length) return 'No resources found in the cached graph.';

  const parts: string[] = [];
  parts.push(`Total resources found: ${graphData.nodes.length}`);
  parts.push('');

  const byType = new Map<string, typeof graphData.nodes>();
  for (const node of graphData.nodes) {
    if (!byType.has(node.type)) byType.set(node.type, []);
    byType.get(node.type)!.push(node);
  }

  for (const [type, nodes] of byType.entries()) {
    parts.push(`${type.toUpperCase()} Resources (${nodes.length}):`);
    for (const node of nodes) {
      const lines: string[] = [];
      lines.push(`  - ${node.label} (${node.id})`);
      lines.push(`    Status: ${node.status}`);
      lines.push(`    Managed: ${node.isManual ? 'Manual' : 'IaC (Terraform/Deployment Manager)'}`);

      const metadata = node.metadata || {};
      for (const [key, val] of Object.entries(metadata)) {
        if (val === null || val === undefined) continue;
        if (key === 'subtitle') continue;
        if (typeof val === 'object' && !Array.isArray(val)) continue;
        const display = Array.isArray(val) ? val.slice(0, 5).join(', ') : String(val);
        if (display) lines.push(`    ${key}: ${display}`);
      }

      const tags = node.tags || {};
      const tagCount = Object.keys(tags).length;
      if (tagCount > 0) {
        const tagStrings = Object.entries(tags).slice(0, 5).map(([k, v]) => `${k}=${v}`);
        lines.push(`    Labels (${tagCount}): ${tagStrings.join(', ')}${tagCount > 5 ? '...' : ''}`);
      } else {
        lines.push(`    Labels: None`);
      }

      parts.push(lines.join('\n'));
    }
    parts.push('');
  }

  return parts.join('\n');
}

// POST /api/chat/message - Send a chat message
router.post('/message', async (req: Request, res: Response) => {
  const user = req.user as User;
  const {
    message,
    sourceType = 'aws',
    providerId,
    clusterId,
    namespace,
    conversationHistory,
  }: ChatRequest = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const db = getDb();
    let llmResponse = '';

    if (sourceType === 'k8s') {
      if (!clusterId || !namespace) {
        return res.status(400).json({ error: 'clusterId and namespace are required for Kubernetes chat' });
      }

      const cluster = db.prepare(
        'SELECT id, label, cluster_type FROM kubernetes_clusters WHERE id = ? AND user_id = ?'
      ).get(clusterId, user.id) as any;

      if (!cluster) {
        return res.status(404).json({ error: 'Cluster not found or access denied' });
      }

      const cachedGraph = db.prepare(
        `SELECT graph_data
         FROM cached_kubernetes_graphs
         WHERE user_id = ? AND cluster_id = ? AND namespace = ?`
      ).get(user.id, clusterId, namespace) as any;

      if (!cachedGraph) {
        return res.status(404).json({
          error: 'No Kubernetes namespace data found. Please fetch resources for this namespace first.',
        });
      }

      const graphData: K8sGraphData = JSON.parse(cachedGraph.graph_data);
      const intent = await analyzeK8sIntent(message);
      const { context, isRefusal, refusalMessage } = buildK8sContext(graphData, intent);

      if (isRefusal && refusalMessage) {
        const response: ChatResponse = {
          response: refusalMessage,
          timestamp: new Date().toISOString(),
        };
        return res.json(response);
      }

      const systemPrompt = `You are a Kubernetes infrastructure assistant for the "${cluster.label}" ${String(cluster.cluster_type).toUpperCase()} cluster.

Your role is to help users understand the scanned "${namespace}" namespace based on cached configuration metadata ONLY.

You have access to the following namespace context:
${context}

Guidelines:
1. Answer only from the provided cached Kubernetes context
2. Be concise but informative
3. Use bullet points for lists when helpful
4. Include specific workload, service, ingress, pod, node, or storage names when relevant
5. If asked about logs, live metrics, traffic, runtime health, or other unavailable data, explain that you only have scanned metadata
6. Do NOT invent cluster state that is not present in the context
7. Stay within the scope of the scanned namespace and related cluster-node metadata

Cluster context: ${cluster.label}
Cluster type: ${String(cluster.cluster_type).toUpperCase()}
Namespace context: ${namespace}`;

      llmResponse = await callGlobantLLM(systemPrompt, message, 'openai/gpt-5.4', false);
    } else {
      if (!providerId) {
        return res.status(400).json({ error: 'providerId is required for cloud chat' });
      }

      const provider = db.prepare(
        'SELECT id, label, region, provider FROM provider_credentials WHERE id = ? AND user_id = ?'
      ).get(providerId, user.id) as any;

      if (!provider) {
        return res.status(404).json({ error: 'Provider not found or access denied' });
      }

      const cachedGraph = db.prepare(
        'SELECT graph_data FROM cached_graphs WHERE user_id = ? AND provider_id = ?'
      ).get(user.id, providerId) as any;

      if (!cachedGraph) {
        return res.status(404).json({
          error: 'No infrastructure data found. Please scan your resources first.'
        });
      }

      const graphData: GraphData = JSON.parse(cachedGraph.graph_data);

      // The intent analyzer is AWS-aware. For GCP/Azure we skip intent analysis and
      // hand the LLM the full graph context — the language model is more than
      // capable of filtering on its own from a few hundred resources.
      const isGcp = provider.provider === 'gcp' || sourceType === 'gcp';
      const isAzure = provider.provider === 'azure' || sourceType === 'azure';
      let context: string;

      if (isGcp || isAzure) {
        context = buildFullGraphContext(graphData);
      } else {
        console.log(`Analyzing intent for: "${message}"`);
        const intent = await analyzeIntent(message);
        console.log('Intent analysis result:', intent);

        const built = buildContext(graphData, intent);
        if (built.isRefusal && built.refusalMessage) {
          const response: ChatResponse = {
            response: built.refusalMessage,
            timestamp: new Date().toISOString()
          };
          return res.json(response);
        }
        context = built.context;
      }

      const cloudName = isAzure ? 'Azure' : isGcp ? 'GCP' : 'AWS';
      const systemPrompt = `You are a ${cloudName} infrastructure assistant for the "${provider.label}" environment (${provider.region} region).

Your role is to help users understand their infrastructure based on configuration and metadata ONLY.

You have access to the following information about their resources:
${context}

Guidelines:
1. Answer questions accurately based on the provided context
2. Be concise but informative
3. Use bullet points for lists
4. Include specific resource names and details when relevant
5. If asked about something not in the context, politely explain you don't have that information
6. Do NOT make assumptions about data not provided
7. Stay within the scope of infrastructure configuration and metadata
8. Do NOT speculate about live metrics, logs, traffic, or runtime health — only configuration is available

Provider context: ${provider.label} in ${provider.region}`;

      llmResponse = await callGlobantLLM(
        systemPrompt,
        message,
        'openai/gpt-5.4',
        false
      );
    }

    const response: ChatResponse = {
      response: llmResponse,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Failed to process chat message',
      details: error.message
    });
  }
});

// GET /api/chat/health - Health check endpoint
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'chatbot' });
});

export default router;

import { Router, Request, Response } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { getDb } from '../db/connection.js';
import type { User } from '../auth/passport.js';
import type { ChatRequest, ChatResponse } from './types.js';
import { buildInfraContext } from './context-builder.js';
import { callOpenAILLM } from './llm-service.js';
import { getCloudChatData, wantsRefresh, mentionsTags } from './cloud-data.js';
import { buildFullK8sContext } from './k8s-context-builder.js';
import type { K8sGraphData } from './k8s-types.js';

const router = Router();

router.use(requireAuth);

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
      const context = buildFullK8sContext(graphData, namespace);

      const systemPrompt = `You are a Kubernetes infrastructure assistant for the "${cluster.label}" ${String(cluster.cluster_type).toUpperCase()} cluster, namespace "${namespace}".

You are given a COMPLETE snapshot of every scanned resource in this namespace below — counts, full per-resource metadata, and relationships. Reason over ALL of it to answer the user. You can list, count, group, filter, and cross-reference resources yourself (e.g. find every workload using a given image, or every resource of a given status).

NAMESPACE DATA:
${context}

Guidelines:
1. Answer directly and specifically using the data above — include concrete resource names, counts, images, ports, etc.
2. When listing matches, scan EVERY resource in the data; never guess or sample.
3. Use bullet points or compact tables for lists.
4. Live runtime data (current CPU/memory, live pod logs, traffic, real-time health) is NOT in this snapshot. If asked, say so briefly and offer the closest available metadata (e.g. restart counts, readiness, phase) — do not refuse the whole question.
5. Never invent resources or fields that are not present in the data.
6. The snapshot reflects the last scan of this namespace; if the user needs fresher data, tell them to re-fetch resources for this namespace from the dashboard.`;

      llmResponse = await callOpenAILLM(systemPrompt, message, 'gpt-5.4', false, conversationHistory || []);
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

      const isGcp = provider.provider === 'gcp' || sourceType === 'gcp';
      const isAzure = provider.provider === 'azure' || sourceType === 'azure';
      const cloudName = isAzure ? 'Azure' : isGcp ? 'GCP' : 'AWS';
      const tagWord = isGcp ? 'Labels' : 'Tags';

      // Fetch the snapshot — transparently re-scanning the live environment when
      // there's no cached data, the user asked for the latest, or a tag question
      // arrived for a scan that didn't capture tags.
      let data;
      try {
        data = await getCloudChatData(user.id, providerId, isAzure ? 'azure' : isGcp ? 'gcp' : 'aws', {
          forceRefresh: wantsRefresh(message),
          needTags: mentionsTags(message),
        });
      } catch (scanErr: any) {
        return res.status(502).json({
          error: `Could not load or refresh infrastructure data: ${scanErr.message}. Try scanning resources from the dashboard.`,
        });
      }

      const context = buildInfraContext(data.graphData, {
        scannedTypes: data.scannedTypes,
        fetchTags: data.fetchTags,
        scannedAt: data.scannedAt,
        tagWord,
      });

      const freshnessNote = data.refreshed
        ? 'This snapshot was just refreshed live for this question.'
        : `This is the most recent cached scan${data.scannedAt ? ` (captured ${data.scannedAt})` : ''}.`;

      const systemPrompt = `You are a ${cloudName} infrastructure assistant for the "${provider.label}" environment (${provider.region} region).

You are given a COMPLETE snapshot of the scanned environment below: an environment summary, counts by type, a ${tagWord.toLowerCase()} index, full per-resource metadata, and relationships. Reason over ALL of it. You can list, count, group, filter, and cross-reference resources yourself — for example "which resources are tagged Environment=production" or "which resources are not IaC-managed" — by scanning every resource in the data.

${freshnessNote}

ENVIRONMENT DATA:
${context}

Guidelines:
1. Answer directly and specifically using the data above; include concrete resource names, IDs, and relevant fields (VPC, region, engine, ${tagWord.toLowerCase()}, etc.).
2. For "which resources have X" questions, scan EVERY resource and the ${tagWord.toLowerCase()} index — list all matches with their type, and give a total count. Never sample or guess.
3. Use bullet points or compact tables for lists; be concise but complete.
4. Only configuration/metadata is available — not live metrics, logs, traffic, or runtime health. If asked for those, say so briefly and offer the closest available config detail instead of refusing the whole question.
5. The snapshot only includes these resource types: ${data.scannedTypes.join(', ')}. If asked about a type not listed, say it wasn't part of the scan and that they can broaden the scan from the dashboard (or ask you to refresh).
6. ${data.fetchTags ? `${tagWord} were captured in this scan.` : `${tagWord} were NOT captured in this scan; if the user needs ${tagWord.toLowerCase()}-based answers, tell them to enable "Fetch Tags" and rescan, or ask for the latest.`}
7. Never invent resources, fields, or values not present in the data.`;

      llmResponse = await callOpenAILLM(systemPrompt, message, 'gpt-5.4', false, conversationHistory || []);
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

import { callGlobantLLM } from './llm-service.js';
import { K8S_RESOURCE_SCHEMAS, K8S_RESOURCE_TYPES, type K8sIntentAnalysisResult, type K8sResourceType } from './k8s-types.js';

export async function analyzeK8sIntent(userMessage: string): Promise<K8sIntentAnalysisResult> {
  const systemPrompt = `You are an intent analyzer for Kubernetes infrastructure questions.
Analyze the user's message and determine:
1. Which Kubernetes resource types they are asking about
2. The query type (count, list, filter, info, general)
3. Whether they are asking about data not available from cached configuration metadata

Supported Kubernetes resource types:
- k8s-deployment (deployments)
- k8s-pod (pods)
- k8s-service (services)
- k8s-ingress (ingresses)
- k8s-secret (secrets)
- k8s-configmap (configmaps)
- k8s-statefulset (statefulsets)
- k8s-daemonset (daemonsets)
- k8s-pvc (persistent volume claims / pvcs)
- k8s-node (nodes)
- k8s-job (jobs)
- k8s-cronjob (cronjobs)

Unavailable data includes:
- live metrics such as CPU, memory, latency, traffic, or throughput
- logs or runtime output
- current errors not present in cached metadata

Respond ONLY with a valid JSON object in this format:
{
  "resourceTypes": ["k8s-pod"],
  "queryType": "list",
  "filters": {
    "status": "running"
  },
  "isAnswerable": true,
  "unavailableFields": [],
  "reason": ""
}`;

  try {
    const result = await callGlobantLLM(systemPrompt, userMessage, 'openai/gpt-5.4', true);
    if (!result) {
      return {
        resourceTypes: [],
        queryType: 'general',
        isAnswerable: true,
        reason: 'Could not parse Kubernetes intent',
      };
    }

    const validResourceTypes = (result.resourceTypes || []).filter((type: string) =>
      K8S_RESOURCE_TYPES.includes(type as K8sResourceType)
    ) as K8sResourceType[];

    const unavailableFields = detectUnavailableFields(userMessage, validResourceTypes);
    const isAnswerable = unavailableFields.length === 0 && !result.unavailableFields?.length;

    return {
      resourceTypes: validResourceTypes,
      queryType: result.queryType || 'general',
      filters: result.filters || {},
      isAnswerable,
      unavailableFields: unavailableFields.length > 0 ? unavailableFields : result.unavailableFields,
      reason: result.reason,
    };
  } catch (error: any) {
    console.error('Kubernetes intent analysis error:', error.message);
    return {
      resourceTypes: [],
      queryType: 'general',
      isAnswerable: true,
      reason: 'Error analyzing Kubernetes intent',
    };
  }
}

function detectUnavailableFields(message: string, resourceTypes: K8sResourceType[]): string[] {
  const lowerMessage = message.toLowerCase();
  const unavailableFields: string[] = [];

  const unavailableKeywords = [
    { keywords: ['log', 'logs', 'logging'], field: 'logs' },
    { keywords: ['cpu', 'cpu usage'], field: 'CPU metrics' },
    { keywords: ['memory', 'memory usage', 'ram'], field: 'memory metrics' },
    { keywords: ['latency', 'response time'], field: 'latency metrics' },
    { keywords: ['traffic', 'requests per second', 'rps'], field: 'traffic metrics' },
    { keywords: ['throughput', 'iops'], field: 'throughput metrics' },
    { keywords: ['live', 'real-time', 'realtime'], field: 'live runtime data' },
    { keywords: ['error', 'errors', 'exception', 'stack trace'], field: 'runtime errors' },
  ];

  for (const { keywords, field } of unavailableKeywords) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      unavailableFields.push(field);
    }
  }

  for (const resourceType of resourceTypes) {
    const schema = K8S_RESOURCE_SCHEMAS[resourceType];
    if (!schema) continue;
    for (const unavailable of schema.notAvailable) {
      if (lowerMessage.includes(unavailable.toLowerCase())) {
        unavailableFields.push(unavailable);
      }
    }
  }

  return [...new Set(unavailableFields)];
}

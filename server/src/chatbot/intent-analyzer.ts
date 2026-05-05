import { callGlobantLLM } from './llm-service.js';
import { RESOURCE_SCHEMAS, type IntentAnalysisResult } from './types.js';
import { AWS_RESOURCE_TYPES, type AwsResourceType } from '../aws/resource-registry.js';

export async function analyzeIntent(userMessage: string): Promise<IntentAnalysisResult> {
  const systemPrompt = `You are an intent analyzer for AWS infrastructure queries. 
Analyze the user's question and determine:
1. Which AWS resource types they're asking about (ec2, lambda, rds, s3, cloudfront, etc.)
2. The type of query (count, list, filter, info, general)
3. Any filters mentioned (tags, status, etc.)
4. Whether the question asks about unavailable data (metrics, errors, performance, logs)

Available resource types: ${AWS_RESOURCE_TYPES.join(', ')}

IMPORTANT: Check if the question asks about data that is NOT available:
- Metrics (CPU, memory, network, performance)
- Errors, logs, execution data
- Runtime information
- Storage metrics (object counts, sizes)
- Traffic/usage statistics

Respond ONLY with a valid JSON object in this format:
{
  "resourceTypes": ["ec2", "lambda"],
  "queryType": "count",
  "filters": {
    "tags": true,
    "missingTag": true,
    "status": "running"
  },
  "isAnswerable": true,
  "unavailableFields": [],
  "reason": ""
}

If the question asks about unavailable data, set "isAnswerable" to false and list "unavailableFields".`;

  try {
    const result = await callGlobantLLM(systemPrompt, userMessage, "openai/gpt-5.4", true);
    
    if (!result) {
      // Fallback to default
      return {
        resourceTypes: [],
        queryType: 'general',
        isAnswerable: true,
        reason: 'Could not parse intent'
      };
    }

    // Validate resource types
    const validResourceTypes = (result.resourceTypes || []).filter((type: string) =>
      AWS_RESOURCE_TYPES.includes(type as AwsResourceType)
    ) as AwsResourceType[];

    // Check if asking about unavailable fields
    const unavailableFields = detectUnavailableFields(userMessage, validResourceTypes);
    const isAnswerable = unavailableFields.length === 0 && !result.unavailableFields?.length;

    return {
      resourceTypes: validResourceTypes,
      queryType: result.queryType || 'general',
      filters: result.filters || {},
      isAnswerable: isAnswerable,
      unavailableFields: unavailableFields.length > 0 ? unavailableFields : result.unavailableFields,
      reason: result.reason
    };
  } catch (error: any) {
    console.error('Intent analysis error:', error.message);
    return {
      resourceTypes: [],
      queryType: 'general',
      isAnswerable: true,
      reason: 'Error analyzing intent'
    };
  }
}

function detectUnavailableFields(message: string, resourceTypes: AwsResourceType[]): string[] {
  const lowerMessage = message.toLowerCase();
  const unavailableFields: string[] = [];

  // Common unavailable keywords
  const unavailableKeywords = [
    { keywords: ['error', 'errors', 'failing', 'failed', 'exception'], field: 'errors/logs' },
    { keywords: ['cpu', 'cpu usage', 'processor'], field: 'CPU metrics' },
    { keywords: ['memory', 'ram', 'memory usage'], field: 'memory metrics' },
    { keywords: ['performance', 'latency', 'response time'], field: 'performance metrics' },
    { keywords: ['log', 'logs', 'logging'], field: 'logs' },
    { keywords: ['invocation', 'invocations', 'executions'], field: 'execution metrics' },
    { keywords: ['traffic', 'requests', 'hits'], field: 'traffic metrics' },
    { keywords: ['connection', 'connections', 'active connection'], field: 'connection metrics' },
    { keywords: ['cache hit', 'cache miss', 'cache ratio'], field: 'cache metrics' },
    { keywords: ['object count', 'number of objects', 'file count'], field: 'object count' },
    { keywords: ['size', 'storage size', 'bucket size'], field: 'storage metrics' },
    { keywords: ['bandwidth', 'data transfer'], field: 'bandwidth metrics' },
  ];

  for (const { keywords, field } of unavailableKeywords) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      unavailableFields.push(field);
    }
  }

  // Check against resource-specific unavailable fields
  for (const resourceType of resourceTypes) {
    const schema = RESOURCE_SCHEMAS[resourceType];
    if (schema) {
      for (const unavailable of schema.notAvailable) {
        const unavailableLower = unavailable.toLowerCase();
        if (lowerMessage.includes(unavailableLower)) {
          unavailableFields.push(unavailable);
        }
      }
    }
  }

  // Remove duplicates
  return [...new Set(unavailableFields)];
}

import type { InfraNode } from '../../aws/types.js';
import type { GcpCredentials } from '../../providers/types.js';
import { gcpFetch } from '../auth.js';

interface PubsubTopic {
  name?: string; // projects/{p}/topics/{name}
  labels?: Record<string, string>;
  kmsKeyName?: string;
  messageRetentionDuration?: string;
}

interface TopicListResponse {
  topics?: PubsubTopic[];
  nextPageToken?: string;
}

function shortName(resource?: string): string | undefined {
  if (!resource) return undefined;
  return resource.split('/').pop();
}

function isManagedByLabels(labels?: Record<string, string>): boolean {
  if (!labels) return false;
  return Object.keys(labels).some(k => {
    const lower = k.toLowerCase();
    return lower.includes('terraform') || lower.includes('deployment-manager') || lower.includes('managed-by');
  });
}

export async function discoverPubsubTopics(creds: GcpCredentials): Promise<InfraNode[]> {
  try {
    const data = await gcpFetch<TopicListResponse>(
      creds,
      `https://pubsub.googleapis.com/v1/projects/${encodeURIComponent(creds.project_id)}/topics`
    );
    return (data.topics || []).map(t => ({
      id: `topic-${shortName(t.name)}`,
      type: 'pubsub-topic',
      label: shortName(t.name) || 'Unknown Topic',
      status: 'active',
      isManual: !isManagedByLabels(t.labels),
      tags: t.labels || {},
      metadata: {
        name: shortName(t.name),
        kmsKey: t.kmsKeyName,
        messageRetention: t.messageRetentionDuration,
        subtitle: shortName(t.name),
      },
    }));
  } catch (e: any) {
    console.error('Pub/Sub discovery error:', e.message);
    return [];
  }
}

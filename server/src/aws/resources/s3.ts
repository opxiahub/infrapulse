import { ListBucketsCommand, GetBucketTaggingCommand } from '@aws-sdk/client-s3';
import type { S3Client } from '@aws-sdk/client-s3';
import type { InfraNode } from '../types.js';

export async function discoverS3(client: S3Client, fetchTags?: boolean): Promise<InfraNode[]> {
  const nodes: InfraNode[] = [];

  try {
    const response = await client.send(new ListBucketsCommand({}));
    for (const bucket of response.Buckets || []) {
      let tags: Record<string, string> = {};
      if (fetchTags && bucket.Name) {
        try {
          const tagRes = await client.send(new GetBucketTaggingCommand({ Bucket: bucket.Name }));
          for (const t of tagRes.TagSet || []) {
            if (t.Key) tags[t.Key] = t.Value ?? '';
          }
        } catch { /* bucket may have no tags */ }
      }
      nodes.push({
        id: `s3-${bucket.Name}`,
        type: 's3',
        label: bucket.Name || 'Unknown Bucket',
        status: 'active',
        isManual: true,
        tags,
        metadata: {
          bucketName: bucket.Name,
          creationDate: bucket.CreationDate?.toISOString(),
        },
      });
    }
  } catch (err: any) {
    console.error('S3 discovery error:', err.message);
  }

  return nodes;
}

import { Router, Request, Response } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { getDecryptedCredentials } from '../providers/routes.js';
import { discoverResources } from '../aws/discovery.js';
import { discoverGcpResources } from '../gcp/discovery.js';
import { discoverAzureResources } from '../azure/discovery.js';
import { buildGraph } from './builder.js';
import { getDb } from '../db/connection.js';
import type { User } from '../auth/passport.js';
import type { AwsResourceType } from '../aws/resource-registry.js';
import type { GcpResourceType } from '../gcp/resource-registry.js';
import type { AzureResourceType } from '../azure/resource-registry.js';
import type { AwsCredentials, GcpCredentials, AzureCredentials } from '../providers/types.js';

const router = Router();

router.use(requireAuth);

// GET cached graph (no live cloud call)
router.get('/:providerId/cached', (req: Request, res: Response) => {
  const user = req.user as User;
  const providerId = parseInt(req.params.providerId, 10);
  const db = getDb();

  const row = db.prepare(
    'SELECT graph_data, resource_types, scanned_at, fetch_tags FROM cached_graphs WHERE user_id = ? AND provider_id = ?'
  ).get(user.id, providerId) as any;

  if (!row) {
    return res.json({ cached: null });
  }

  res.json({
    cached: JSON.parse(row.graph_data),
    resourceTypes: row.resource_types.split(','),
    scannedAt: row.scanned_at,
    fetchTags: row.fetch_tags === 1,
  });
});

// GET scan (live cloud call, persists result)
router.get('/:providerId', async (req: Request, res: Response) => {
  const user = req.user as User;
  const providerId = parseInt(req.params.providerId, 10);
  const fetchTags = req.query.fetchTags === 'true';

  const result = getDecryptedCredentials(providerId, user.id);
  if (!result) {
    return res.status(404).json({ error: 'Provider not found' });
  }

  const requestedTypes = ((req.query.types as string) || '').split(',').filter(Boolean);

  let nodes;
  if (result.provider === 'gcp') {
    const resourceTypes = (requestedTypes.length > 0
      ? requestedTypes
      : ['gce-instance', 'cloud-sql', 'gcs-bucket', 'cloud-function']) as GcpResourceType[];
    nodes = await discoverGcpResources(result.creds as GcpCredentials, resourceTypes);
    // Persist with the provided types
    const graph = buildGraph(nodes);
    persistCachedGraph(user.id, providerId, resourceTypes, graph, fetchTags);
    return res.json(graph);
  }

  if (result.provider === 'azure') {
    const resourceTypes = (requestedTypes.length > 0
      ? requestedTypes
      : ['azure-vm', 'azure-sql-server', 'azure-storage-account', 'azure-function']) as AzureResourceType[];
    nodes = await discoverAzureResources(result.creds as AzureCredentials, resourceTypes);
    const graph = buildGraph(nodes);
    persistCachedGraph(user.id, providerId, resourceTypes, graph, fetchTags);
    return res.json(graph);
  }

  // AWS path
  const resourceTypes = (requestedTypes.length > 0
    ? requestedTypes
    : ['ec2', 'rds', 's3', 'lambda']) as AwsResourceType[];
  nodes = await discoverResources(providerId, result.creds as AwsCredentials, result.region, resourceTypes, fetchTags);
  const graph = buildGraph(nodes);
  persistCachedGraph(user.id, providerId, resourceTypes, graph, fetchTags);
  res.json(graph);
});

function persistCachedGraph(
  userId: number,
  providerId: number,
  resourceTypes: string[],
  graph: { nodes: unknown[]; edges: unknown[] },
  fetchTags: boolean
) {
  const db = getDb();
  db.prepare(`
    INSERT INTO cached_graphs (user_id, provider_id, resource_types, graph_data, scanned_at, fetch_tags)
    VALUES (?, ?, ?, ?, datetime('now'), ?)
    ON CONFLICT(user_id, provider_id) DO UPDATE SET
      resource_types = excluded.resource_types,
      graph_data     = excluded.graph_data,
      scanned_at     = excluded.scanned_at,
      fetch_tags     = excluded.fetch_tags
  `).run(userId, providerId, resourceTypes.join(','), JSON.stringify(graph), fetchTags ? 1 : 0);
}

export default router;

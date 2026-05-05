import { Router, Request, Response } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { getDb } from '../db/connection.js';
import { encrypt } from '../providers/encryption.js';
import { buildClients } from './client.js';
import type { K8sClients } from './client.js';
import {
  listNamespaces, listDeployments, listPods, listServices, listIngresses, listSecrets,
  listStatefulSets, listDaemonSets, listConfigMaps, listPersistentVolumeClaims,
  listK8sNodes, listJobs, listCronJobs, getDeploymentEnvVars,
} from './discovery.js';
import { getPodLogs } from './logs.js';
import type { KubernetesCluster, KubernetesCredentials } from './types.js';
import type { User } from '../auth/passport.js';
import { buildKubernetesGraphData } from './graph-builder.js';
import { getDecryptedCredentials } from '../providers/routes.js';
import type { AwsCredentials, GcpCredentials, AzureCredentials } from '../providers/types.js';
import { getGkeCluster, getGkeClusterServer, listGkeClusters } from './gke.js';
import { getEksCluster, getEksClusterServer, listEksClusters } from './eks.js';
import { getAksCluster, getAksClusterConnectionDetails, listAksClusters } from './aks.js';

const router = Router();
router.use(requireAuth);

// Map resource type → fetch function
type Fetcher = (clients: K8sClients, namespace: string) => Promise<any[]>;
const RESOURCE_FETCHERS: Record<string, Fetcher> = {
  'k8s-deployment':  (c, ns) => listDeployments(c, ns),
  'k8s-pod':         (c, ns) => listPods(c, ns),
  'k8s-service':     (c, ns) => listServices(c, ns),
  'k8s-ingress':     (c, ns) => listIngresses(c, ns),
  'k8s-secret':      (c, ns) => listSecrets(c, ns),
  'k8s-configmap':   (c, ns) => listConfigMaps(c, ns),
  'k8s-statefulset': (c, ns) => listStatefulSets(c, ns),
  'k8s-daemonset':   (c, ns) => listDaemonSets(c, ns),
  'k8s-pvc':         (c, ns) => listPersistentVolumeClaims(c, ns),
  'k8s-node':        (c, _ns) => listK8sNodes(c),
  'k8s-job':         (c, ns) => listJobs(c, ns),
  'k8s-cronjob':     (c, ns) => listCronJobs(c, ns),
};
const ALL_TYPES = Object.keys(RESOURCE_FETCHERS);

function isGcpProviderCreds(value: unknown): value is GcpCredentials {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'project_id' in value &&
    'client_email' in value &&
    'private_key' in value
  );
}

function isAwsProviderCreds(value: unknown): value is AwsCredentials {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'accessKeyId' in value &&
    'secretAccessKey' in value
  );
}

function isAzureProviderCreds(value: unknown): value is AzureCredentials {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'tenantId' in value &&
    'clientId' in value &&
    'clientSecret' in value &&
    'subscriptionId' in value
  );
}

async function verifyCluster(cluster: KubernetesCluster) {
  const clients = await buildClients(cluster);
  await listNamespaces(clients);
}

async function handleAddGkeCluster(req: Request, res: Response, user: User, label: string) {
  const providerId = Number(req.body.provider_id);
  const clusterName = String(req.body.cluster_name || '').trim();
  const location = String(req.body.location || '').trim();

  if (!providerId || !clusterName || !location) {
    return res.status(400).json({ error: 'provider_id, cluster_name, and location are required for GKE' });
  }

  const provider = getDecryptedCredentials(providerId, user.id);
  if (!provider || provider.provider !== 'gcp' || !isGcpProviderCreds(provider.creds)) {
    return res.status(400).json({ error: 'A valid GCP project connection is required for GKE' });
  }

  let gkeCluster;
  try {
    gkeCluster = await getGkeCluster(provider.creds, location, clusterName);
  } catch (err: any) {
    return res.status(400).json({ error: `Unable to load GKE cluster metadata: ${err.message}` });
  }

  const apiServerUrl = getGkeClusterServer(gkeCluster);
  const ca = gkeCluster.masterAuth?.clusterCaCertificate;
  if (!apiServerUrl || !ca) {
    return res.status(400).json({ error: 'Selected GKE cluster is missing a reachable API endpoint or CA certificate' });
  }

  const creds: KubernetesCredentials = {
    auth_provider: 'gke',
    service_account: provider.creds,
    project_id: provider.creds.project_id,
    location,
    cluster_name: clusterName,
    ca,
  };
  const encrypted = encrypt(JSON.stringify(creds));
  const clusterLabel = label || clusterName;

  const tempCluster = {
    id: 0,
    user_id: user.id,
    label: clusterLabel,
    cluster_type: 'gke',
    api_server_url: apiServerUrl,
    encrypted_credentials: encrypted,
    skip_tls_verify: 0,
    verified: 0,
    created_at: '',
  } as KubernetesCluster;

  try {
    await verifyCluster(tempCluster);
  } catch (err: any) {
    return res.status(400).json({ error: `Cluster verification failed: ${err.message}` });
  }

  const db = getDb();
  const result = db.prepare(
    `INSERT INTO kubernetes_clusters (user_id, label, cluster_type, api_server_url, encrypted_credentials, skip_tls_verify, verified)
     VALUES (?, ?, ?, ?, ?, ?, 1)`
  ).run(user.id, clusterLabel, 'gke', apiServerUrl, encrypted, 0);

  return res.json({
    id: result.lastInsertRowid,
    label: clusterLabel,
    cluster_type: 'gke',
    api_server_url: apiServerUrl,
    verified: true,
  });
}

async function handleAddEksCluster(req: Request, res: Response, user: User, label: string) {
  const providerId = Number(req.body.provider_id);
  const clusterName = String(req.body.cluster_name || '').trim();

  if (!providerId || !clusterName) {
    return res.status(400).json({ error: 'provider_id and cluster_name are required for EKS' });
  }

  const provider = getDecryptedCredentials(providerId, user.id);
  if (!provider || provider.provider !== 'aws' || !isAwsProviderCreds(provider.creds)) {
    return res.status(400).json({ error: 'A valid AWS account connection is required for EKS' });
  }

  let eksCluster;
  try {
    eksCluster = await getEksCluster(provider.creds, provider.region, clusterName);
  } catch (err: any) {
    return res.status(400).json({ error: `Unable to load EKS cluster metadata: ${err.message}` });
  }

  const apiServerUrl = getEksClusterServer(eksCluster);
  const ca = eksCluster.certificateAuthority?.data;
  if (!apiServerUrl || !ca) {
    return res.status(400).json({ error: 'Selected EKS cluster is missing a reachable API endpoint or CA certificate' });
  }

  const creds: KubernetesCredentials = {
    auth_provider: 'eks',
    aws_credentials: provider.creds,
    region: provider.region,
    cluster_name: clusterName,
    ca,
  };
  const encrypted = encrypt(JSON.stringify(creds));
  const clusterLabel = label || clusterName;

  const tempCluster = {
    id: 0,
    user_id: user.id,
    label: clusterLabel,
    cluster_type: 'eks',
    api_server_url: apiServerUrl,
    encrypted_credentials: encrypted,
    skip_tls_verify: 0,
    verified: 0,
    created_at: '',
  } as KubernetesCluster;

  try {
    await verifyCluster(tempCluster);
  } catch (err: any) {
    return res.status(400).json({ error: `Cluster verification failed: ${err.message}` });
  }

  const db = getDb();
  const result = db.prepare(
    `INSERT INTO kubernetes_clusters (user_id, label, cluster_type, api_server_url, encrypted_credentials, skip_tls_verify, verified)
     VALUES (?, ?, ?, ?, ?, ?, 1)`
  ).run(user.id, clusterLabel, 'eks', apiServerUrl, encrypted, 0);

  return res.json({
    id: result.lastInsertRowid,
    label: clusterLabel,
    cluster_type: 'eks',
    api_server_url: apiServerUrl,
    verified: true,
  });
}

async function handleAddAksCluster(req: Request, res: Response, user: User, label: string) {
  const providerId = Number(req.body.provider_id);
  const clusterName = String(req.body.cluster_name || '').trim();
  const resourceGroup = String(req.body.resource_group || '').trim();

  if (!providerId || !clusterName || !resourceGroup) {
    return res.status(400).json({ error: 'provider_id, cluster_name, and resource_group are required for AKS' });
  }

  const provider = getDecryptedCredentials(providerId, user.id);
  if (!provider || provider.provider !== 'azure' || !isAzureProviderCreds(provider.creds)) {
    return res.status(400).json({ error: 'A valid Azure subscription connection is required for AKS' });
  }

  try {
    await getAksCluster(provider.creds, resourceGroup, clusterName);
  } catch (err: any) {
    return res.status(400).json({ error: `Unable to load AKS cluster metadata: ${err.message}` });
  }

  let connectionDetails;
  try {
    connectionDetails = await getAksClusterConnectionDetails(provider.creds, resourceGroup, clusterName);
  } catch (err: any) {
    return res.status(400).json({ error: `Unable to load AKS cluster credentials: ${err.message}` });
  }

  const creds: KubernetesCredentials = {
    auth_provider: 'aks',
    azure_credentials: provider.creds,
    subscription_id: provider.creds.subscriptionId,
    resource_group: resourceGroup,
    cluster_name: clusterName,
    ca: connectionDetails.ca,
    server_app_id: connectionDetails.serverAppId,
  };
  const encrypted = encrypt(JSON.stringify(creds));
  const clusterLabel = label || clusterName;

  const tempCluster = {
    id: 0,
    user_id: user.id,
    label: clusterLabel,
    cluster_type: 'aks',
    api_server_url: connectionDetails.apiServerUrl,
    encrypted_credentials: encrypted,
    skip_tls_verify: 0,
    verified: 0,
    created_at: '',
  } as KubernetesCluster;

  try {
    await verifyCluster(tempCluster);
  } catch (err: any) {
    return res.status(400).json({ error: `Cluster verification failed: ${err.message}` });
  }

  const db = getDb();
  const result = db.prepare(
    `INSERT INTO kubernetes_clusters (user_id, label, cluster_type, api_server_url, encrypted_credentials, skip_tls_verify, verified)
     VALUES (?, ?, ?, ?, ?, ?, 1)`
  ).run(user.id, clusterLabel, 'aks', connectionDetails.apiServerUrl, encrypted, 0);

  return res.json({
    id: result.lastInsertRowid,
    label: clusterLabel,
    cluster_type: 'aks',
    api_server_url: connectionDetails.apiServerUrl,
    verified: true,
  });
}

// POST /api/kubernetes/clusters
router.post('/clusters', async (req: Request, res: Response) => {
  const user = req.user as User;
  const { label, cluster_type = 'rosa', api_server_url, token, ca, skip_tls_verify = false } = req.body;

  if (cluster_type === 'gke') {
    return handleAddGkeCluster(req, res, user, String(label || '').trim());
  }
  if (cluster_type === 'eks') {
    return handleAddEksCluster(req, res, user, String(label || '').trim());
  }
  if (cluster_type === 'aks') {
    return handleAddAksCluster(req, res, user, String(label || '').trim());
  }

  if (!label || !api_server_url || !token) {
    return res.status(400).json({ error: 'label, api_server_url, and token are required' });
  }

  const creds: KubernetesCredentials = { token, ...(ca ? { ca } : {}) };
  const encrypted = encrypt(JSON.stringify(creds));

  const tempCluster = {
    id: 0, user_id: user.id, label, cluster_type, api_server_url,
    encrypted_credentials: encrypted,
    skip_tls_verify: skip_tls_verify ? 1 : 0,
    verified: 0, created_at: '',
  } as KubernetesCluster;

  try {
    await verifyCluster(tempCluster);
  } catch (err: any) {
    return res.status(400).json({ error: `Cluster verification failed: ${err.message}` });
  }

  const db = getDb();
  const result = db.prepare(
    `INSERT INTO kubernetes_clusters (user_id, label, cluster_type, api_server_url, encrypted_credentials, skip_tls_verify, verified)
     VALUES (?, ?, ?, ?, ?, ?, 1)`
  ).run(user.id, label, cluster_type, api_server_url, encrypted, skip_tls_verify ? 1 : 0);

  res.json({ id: result.lastInsertRowid, label, cluster_type, api_server_url, verified: true });
});

// GET /api/kubernetes/aks/clusters?providerId=X
router.get('/aks/clusters', async (req: Request, res: Response) => {
  const user = req.user as User;
  const providerId = Number(req.query.providerId);

  if (!providerId) {
    return res.status(400).json({ error: 'providerId query param is required' });
  }

  const provider = getDecryptedCredentials(providerId, user.id);
  if (!provider || provider.provider !== 'azure' || !isAzureProviderCreds(provider.creds)) {
    return res.status(400).json({ error: 'A valid Azure subscription connection is required for AKS' });
  }

  try {
    const clusters = await listAksClusters(provider.creds);
    res.json({
      subscriptionId: provider.creds.subscriptionId,
      clusters,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/kubernetes/eks/clusters?providerId=X
router.get('/eks/clusters', async (req: Request, res: Response) => {
  const user = req.user as User;
  const providerId = Number(req.query.providerId);

  if (!providerId) {
    return res.status(400).json({ error: 'providerId query param is required' });
  }

  const provider = getDecryptedCredentials(providerId, user.id);
  if (!provider || provider.provider !== 'aws' || !isAwsProviderCreds(provider.creds)) {
    return res.status(400).json({ error: 'A valid AWS account connection is required for EKS' });
  }

  try {
    const clusters = await listEksClusters(provider.creds, provider.region);
    res.json({
      region: provider.region,
      clusters,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/kubernetes/gke/clusters?providerId=X
router.get('/gke/clusters', async (req: Request, res: Response) => {
  const user = req.user as User;
  const providerId = Number(req.query.providerId);

  if (!providerId) {
    return res.status(400).json({ error: 'providerId query param is required' });
  }

  const provider = getDecryptedCredentials(providerId, user.id);
  if (!provider || provider.provider !== 'gcp' || !isGcpProviderCreds(provider.creds)) {
    return res.status(400).json({ error: 'A valid GCP project connection is required for GKE' });
  }

  try {
    const clusters = await listGkeClusters(provider.creds);
    res.json({
      projectId: provider.creds.project_id,
      clusters,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/kubernetes/clusters
router.get('/clusters', (req: Request, res: Response) => {
  const user = req.user as User;
  const db = getDb();
  const clusters = db.prepare(
    'SELECT id, label, cluster_type, api_server_url, skip_tls_verify, verified, created_at FROM kubernetes_clusters WHERE user_id = ?'
  ).all(user.id);
  res.json({ clusters });
});

// DELETE /api/kubernetes/clusters/:id
router.delete('/clusters/:id', (req: Request, res: Response) => {
  const user = req.user as User;
  const db = getDb();
  const result = db.prepare(
    'DELETE FROM kubernetes_clusters WHERE id = ? AND user_id = ?'
  ).run(req.params.id, user.id);

  if (result.changes === 0) return res.status(404).json({ error: 'Cluster not found' });
  res.json({ ok: true });
});

function getCluster(id: string, userId: number): KubernetesCluster | null {
  const db = getDb();
  return db.prepare('SELECT * FROM kubernetes_clusters WHERE id = ? AND user_id = ?').get(id, userId) as KubernetesCluster | null;
}

// GET /api/kubernetes/clusters/:id/namespaces
router.get('/clusters/:id/namespaces', async (req: Request, res: Response) => {
  const user = req.user as User;
  const cluster = getCluster(req.params.id, user.id);
  if (!cluster) return res.status(404).json({ error: 'Cluster not found' });
  try {
    const clients = await buildClients(cluster);
    const namespaces = await listNamespaces(clients);
    res.json({ namespaces });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/kubernetes/clusters/:id/cached?namespace=X
router.get('/clusters/:id/cached', (req: Request, res: Response) => {
  const user = req.user as User;
  const cluster = getCluster(req.params.id, user.id);
  if (!cluster) return res.status(404).json({ error: 'Cluster not found' });

  const namespace = (req.query.namespace as string) || 'default';
  const db = getDb();
  const row = db.prepare(
    `SELECT graph_data, resource_types, scanned_at
     FROM cached_kubernetes_graphs
     WHERE user_id = ? AND cluster_id = ? AND namespace = ?`
  ).get(user.id, cluster.id, namespace) as any;

  if (!row) {
    return res.json({ cached: null });
  }

  res.json({
    cached: JSON.parse(row.graph_data),
    resourceTypes: row.resource_types.split(','),
    scannedAt: row.scanned_at,
  });
});

// GET /api/kubernetes/clusters/:id/resources?namespace=X&types=k8s-deployment,k8s-pod,...
router.get('/clusters/:id/resources', async (req: Request, res: Response) => {
  const user = req.user as User;
  const cluster = getCluster(req.params.id, user.id);
  if (!cluster) return res.status(404).json({ error: 'Cluster not found' });

  const namespace = (req.query.namespace as string) || 'default';
  const typesParam = req.query.types as string | undefined;
  const requestedTypes = typesParam ? typesParam.split(',').filter(t => RESOURCE_FETCHERS[t]) : ALL_TYPES;

  try {
    const clients = await buildClients(cluster);
    const results = await Promise.all(
      requestedTypes.map(async type => {
        const items = await RESOURCE_FETCHERS[type](clients, namespace);
        return [type, items] as [string, any[]];
      })
    );
    const rawData = Object.fromEntries(results);
    const graph = buildKubernetesGraphData(rawData, cluster.id, namespace);
    const db = getDb();

    db.prepare(`
      INSERT INTO cached_kubernetes_graphs (user_id, cluster_id, namespace, resource_types, graph_data, scanned_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, cluster_id, namespace) DO UPDATE SET
        resource_types = excluded.resource_types,
        graph_data     = excluded.graph_data,
        scanned_at     = excluded.scanned_at
    `).run(user.id, cluster.id, namespace, requestedTypes.join(','), JSON.stringify(graph));

    res.json(rawData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/kubernetes/clusters/:id/deployments/:name/envvars?namespace=X
router.get('/clusters/:id/deployments/:name/envvars', async (req: Request, res: Response) => {
  const user = req.user as User;
  const cluster = getCluster(req.params.id, user.id);
  if (!cluster) return res.status(404).json({ error: 'Cluster not found' });
  const namespace = (req.query.namespace as string) || 'default';
  try {
    const clients = await buildClients(cluster);
    const envVars = await getDeploymentEnvVars(clients, namespace, req.params.name);
    res.json({ envVars });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/kubernetes/clusters/:id/logs?namespace=X&pod=Y&container=Z&tail=100
router.get('/clusters/:id/logs', async (req: Request, res: Response) => {
  const user = req.user as User;
  const cluster = getCluster(req.params.id, user.id);
  if (!cluster) return res.status(404).json({ error: 'Cluster not found' });

  const namespace = (req.query.namespace as string) || 'default';
  const pod = req.query.pod as string;
  const container = req.query.container as string | undefined;
  const tail = parseInt((req.query.tail as string) || '100', 10);

  if (!pod) return res.status(400).json({ error: 'pod query param is required' });
  try {
    const clients = await buildClients(cluster);
    const logs = await getPodLogs(clients, namespace, pod, container, tail);
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

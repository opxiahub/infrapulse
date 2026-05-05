import type { K8sClients } from './client.js';

export async function getPodLogs(
  clients: K8sClients,
  namespace: string,
  podName: string,
  container?: string,
  tailLines = 100
): Promise<string> {
  const params: any = { name: podName, namespace, tailLines };
  if (container) params.container = container;

  const res = await clients.coreV1.readNamespacedPodLog(params);
  return typeof res === 'string' ? res : String(res);
}

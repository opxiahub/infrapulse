import * as k8s from '@kubernetes/client-node';
import { getAccessToken } from '../gcp/auth.js';
import { getAzureAksAccessToken } from '../azure/auth.js';
import { getEksAccessToken } from './eks.js';
import { decrypt } from '../providers/encryption.js';
import type {
  KubernetesCluster,
  KubernetesCredentials,
  EksClusterCredentials,
  GkeClusterCredentials,
  AksClusterCredentials,
  KubernetesTokenCredentials,
} from './types.js';

export interface K8sClients {
  appsV1: k8s.AppsV1Api;
  coreV1: k8s.CoreV1Api;
  networkingV1: k8s.NetworkingV1Api;
  batchV1: k8s.BatchV1Api;
}

function isGkeCredentials(creds: KubernetesCredentials): creds is GkeClusterCredentials {
  return 'auth_provider' in creds && creds.auth_provider === 'gke';
}

function isEksCredentials(creds: KubernetesCredentials): creds is EksClusterCredentials {
  return 'auth_provider' in creds && creds.auth_provider === 'eks';
}

function isAksCredentials(creds: KubernetesCredentials): creds is AksClusterCredentials {
  return 'auth_provider' in creds && creds.auth_provider === 'aks';
}

function asTokenCredentials(creds: KubernetesCredentials): KubernetesTokenCredentials {
  return creds as KubernetesTokenCredentials;
}

export async function buildClients(cluster: KubernetesCluster): Promise<K8sClients> {
  const creds: KubernetesCredentials = JSON.parse(decrypt(cluster.encrypted_credentials));
  const token = isGkeCredentials(creds)
    ? await getAccessToken(creds.service_account)
    : isEksCredentials(creds)
      ? await getEksAccessToken(creds.aws_credentials, creds.region, creds.cluster_name)
      : isAksCredentials(creds)
        ? await getAzureAksAccessToken(creds.azure_credentials, creds.server_app_id)
        : asTokenCredentials(creds).token;
  const caData = isGkeCredentials(creds) || isEksCredentials(creds) || isAksCredentials(creds)
    ? creds.ca
    : asTokenCredentials(creds).ca;
  const tokenCreds = asTokenCredentials(creds);

  const kc = new k8s.KubeConfig();

  const clusterEntry: k8s.Cluster = {
    name: `cluster-${cluster.id}`,
    server: cluster.api_server_url,
    skipTLSVerify: cluster.skip_tls_verify === 1,
    caData,
  };

  const user: k8s.User = {
    name: `user-${cluster.id}`,
    ...(token ? { token } : {}),
    ...(tokenCreds.clientCertificateData ? { certData: tokenCreds.clientCertificateData } : {}),
    ...(tokenCreds.clientKeyData ? { keyData: tokenCreds.clientKeyData } : {}),
  };

  const context: k8s.Context = {
    name: `context-${cluster.id}`,
    cluster: clusterEntry.name,
    user: user.name,
  };

  kc.loadFromOptions({
    clusters: [clusterEntry],
    users: [user],
    contexts: [context],
    currentContext: context.name,
  });

  return {
    appsV1: kc.makeApiClient(k8s.AppsV1Api),
    coreV1: kc.makeApiClient(k8s.CoreV1Api),
    networkingV1: kc.makeApiClient(k8s.NetworkingV1Api),
    batchV1: kc.makeApiClient(k8s.BatchV1Api),
  };
}

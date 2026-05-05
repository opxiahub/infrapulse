import { formatUrl } from '@aws-sdk/util-format-url';
import { Hash } from '@smithy/hash-node';
import { HttpRequest } from '@smithy/protocol-http';
import { SignatureV4 } from '@smithy/signature-v4';
import type { AwsCredentials } from '../providers/types.js';

interface EksListClustersResponse {
  clusters?: string[];
  nextToken?: string;
}

interface EksClusterResponse {
  name?: string;
  arn?: string;
  endpoint?: string;
  version?: string;
  platformVersion?: string;
  status?: string;
  certificateAuthority?: {
    data?: string;
  };
}

interface EksDescribeClusterResponse {
  cluster?: EksClusterResponse;
}

export interface EksClusterOption {
  name: string;
  region: string;
  status: string;
  endpoint: string;
  version: string;
  platformVersion: string;
}

function awsCredentials(creds: AwsCredentials) {
  return {
    accessKeyId: creds.accessKeyId,
    secretAccessKey: creds.secretAccessKey,
    ...(creds.sessionToken ? { sessionToken: creds.sessionToken } : {}),
  };
}

function normalizeEndpoint(endpoint?: string): string {
  if (!endpoint) return '';
  if (endpoint.startsWith('https://') || endpoint.startsWith('http://')) return endpoint;
  return `https://${endpoint}`;
}

async function signedAwsGet<T>(
  service: 'eks' | 'sts',
  region: string,
  creds: AwsCredentials,
  hostname: string,
  path: string,
  query: Record<string, string> = {},
  headers: Record<string, string> = {}
): Promise<T> {
  const signer = new SignatureV4({
    service,
    region,
    credentials: awsCredentials(creds),
    sha256: Hash.bind(null, 'sha256'),
  });

  const request = new HttpRequest({
    protocol: 'https:',
    hostname,
    method: 'GET',
    path,
    query,
    headers: {
      host: hostname,
      ...headers,
    },
  });

  const signed = await signer.sign(request);
  const response = await fetch(formatUrl(signed), {
    method: signed.method,
    headers: signed.headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AWS API ${response.status} ${response.statusText}: ${text.slice(0, 500)}`);
  }

  return response.json() as Promise<T>;
}

function eksApiHost(region: string): string {
  return `eks.${region}.amazonaws.com`;
}

export async function listEksClusters(creds: AwsCredentials, region: string): Promise<EksClusterOption[]> {
  const names: string[] = [];
  let nextToken = '';

  do {
    const query: Record<string, string> = {};
    if (nextToken) query.nextToken = nextToken;
    const page = await signedAwsGet<EksListClustersResponse>(
      'eks',
      region,
      creds,
      eksApiHost(region),
      '/clusters',
      query
    );
    names.push(...(page.clusters || []));
    nextToken = page.nextToken || '';
  } while (nextToken);

  const described = await Promise.all(names.map(name => getEksCluster(creds, region, name)));

  return described
    .map(cluster => ({
      name: cluster.name || 'unknown',
      region,
      status: cluster.status || 'UNKNOWN',
      endpoint: normalizeEndpoint(cluster.endpoint),
      version: cluster.version || 'unknown',
      platformVersion: cluster.platformVersion || 'unknown',
    }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.region.localeCompare(b.region));
}

export async function getEksCluster(
  creds: AwsCredentials,
  region: string,
  clusterName: string
): Promise<EksClusterResponse> {
  const response = await signedAwsGet<EksDescribeClusterResponse>(
    'eks',
    region,
    creds,
    eksApiHost(region),
    `/clusters/${encodeURIComponent(clusterName)}`
  );

  if (!response.cluster) {
    throw new Error(`EKS cluster "${clusterName}" was not returned by the AWS API`);
  }

  return response.cluster;
}

export function getEksClusterServer(cluster: { endpoint?: string }): string {
  return normalizeEndpoint(cluster.endpoint);
}

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export async function getEksAccessToken(
  creds: AwsCredentials,
  region: string,
  clusterName: string
): Promise<string> {
  const signer = new SignatureV4({
    service: 'sts',
    region,
    credentials: awsCredentials(creds),
    sha256: Hash.bind(null, 'sha256'),
  });

  const hostname = `sts.${region}.amazonaws.com`;
  const request = new HttpRequest({
    protocol: 'https:',
    hostname,
    method: 'GET',
    path: '/',
    query: {
      Action: 'GetCallerIdentity',
      Version: '2011-06-15',
    },
    headers: {
      host: hostname,
      'x-k8s-aws-id': clusterName,
    },
  });

  const presigned = await signer.presign(request, { expiresIn: 60 });
  return `k8s-aws-v1.${toBase64Url(formatUrl(presigned))}`;
}

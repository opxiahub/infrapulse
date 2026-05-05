import type { AzureCredentials } from '../providers/types.js';

interface CachedToken {
  token: string;
  expiresAt: number;
}

const tokenCache = new Map<string, CachedToken>();

async function mintAccessToken(creds: AzureCredentials, scope: string): Promise<CachedToken> {
  const body = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    grant_type: 'client_credentials',
    scope,
  });

  const response = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(creds.tenantId)}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    }
  );

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`Failed to mint Azure access token: ${response.status} ${txt.slice(0, 500)}`);
  }

  const data = await response.json() as { access_token: string; expires_in: number };
  return {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

export async function getAzureAccessToken(
  creds: AzureCredentials,
  scope = 'https://management.azure.com/.default'
): Promise<string> {
  const cacheKey = `${creds.tenantId}:${creds.clientId}:${creds.subscriptionId}:${scope}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  const minted = await mintAccessToken(creds, scope);
  tokenCache.set(cacheKey, minted);
  return minted.token;
}

export async function getAzureAksAccessToken(creds: AzureCredentials, serverAppId?: string): Promise<string> {
  const appId = serverAppId || '6dae42f8-4368-4678-94ff-3960e28e3630';
  const cacheKey = `${creds.tenantId}:${creds.clientId}:${creds.subscriptionId}:resource:${appId}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  const body = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    grant_type: 'client_credentials',
    resource: appId,
  });

  const response = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(creds.tenantId)}/oauth2/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    }
  );

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`Failed to mint AKS access token: ${response.status} ${txt.slice(0, 500)}`);
  }

  const data = await response.json() as { access_token: string; expires_in: string | number };
  const minted = {
    token: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in) * 1000,
  };
  tokenCache.set(cacheKey, minted);
  return minted.token;
}

export async function azureFetch<T = any>(
  creds: AzureCredentials,
  url: string,
  init?: RequestInit
): Promise<T> {
  const token = await getAzureAccessToken(creds);
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`Azure API ${response.status} ${response.statusText}: ${txt.slice(0, 500)}`);
  }

  return await response.json() as T;
}

export async function azureList<T = any>(creds: AzureCredentials, url: string): Promise<T[]> {
  const items: T[] = [];
  let nextUrl: string | undefined = url;

  while (nextUrl) {
    const page: { value?: T[]; nextLink?: string } = await azureFetch(creds, nextUrl);
    if (Array.isArray(page.value)) items.push(...page.value);
    nextUrl = page.nextLink;
  }

  return items;
}

export async function verifyAzureCredentials(creds: AzureCredentials): Promise<string> {
  if (!creds.tenantId || !creds.clientId || !creds.clientSecret || !creds.subscriptionId) {
    throw new Error('tenantId, clientId, clientSecret, and subscriptionId are required');
  }

  const subscription = await azureFetch<{ displayName?: string; subscriptionId?: string }>(
    creds,
    `https://management.azure.com/subscriptions/${encodeURIComponent(creds.subscriptionId)}?api-version=2020-01-01`
  );

  return subscription.displayName || subscription.subscriptionId || creds.subscriptionId;
}

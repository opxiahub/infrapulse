import crypto from 'crypto';
import type { GcpCredentials } from '../providers/types.js';

interface CachedToken {
  token: string;
  expiresAt: number;
}

// We only perform read operations, but GKE cluster discovery uses the
// Kubernetes Engine API scope family and GKE Kubernetes API auth expects the
// caller identity email to be present on the token.
const SCOPE = [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

const tokenCache = new Map<string, CachedToken>();

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function mintAccessToken(creds: GcpCredentials): Promise<CachedToken> {
  const now = Math.floor(Date.now() / 1000);
  const header: Record<string, unknown> = {
    alg: 'RS256',
    typ: 'JWT',
  };
  if (creds.private_key_id) header.kid = creds.private_key_id;

  const tokenUri = creds.token_uri || 'https://oauth2.googleapis.com/token';
  const claims = {
    iss: creds.client_email,
    scope: SCOPE,
    aud: tokenUri,
    exp: now + 3600,
    iat: now,
  };

  const headerB64 = base64url(JSON.stringify(header));
  const claimsB64 = base64url(JSON.stringify(claims));
  const signingInput = `${headerB64}.${claimsB64}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  // GCP service-account JSON encodes \n inside the private key string
  const privateKey = creds.private_key.replace(/\\n/g, '\n');
  const signature = signer.sign(privateKey);
  const sigB64 = base64url(signature);

  const jwt = `${signingInput}.${sigB64}`;

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  });

  const response = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`Failed to mint GCP access token: ${response.status} ${txt}`);
  }
  const data = (await response.json()) as { access_token: string; expires_in: number };
  return {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

export async function getAccessToken(creds: GcpCredentials): Promise<string> {
  const cacheKey = `${creds.client_email}:${creds.project_id}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }
  const minted = await mintAccessToken(creds);
  tokenCache.set(cacheKey, minted);
  return minted.token;
}

export function clearTokenCache(creds?: GcpCredentials) {
  if (!creds) {
    tokenCache.clear();
    return;
  }
  tokenCache.delete(`${creds.client_email}:${creds.project_id}`);
}

export async function gcpFetch<T = any>(
  creds: GcpCredentials,
  url: string,
  init?: RequestInit
): Promise<T> {
  const token = await getAccessToken(creds);
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
    throw new Error(`GCP API ${response.status} ${response.statusText}: ${txt.slice(0, 500)}`);
  }
  return (await response.json()) as T;
}

/**
 * Verify a GCP service account by minting a token and calling the
 * cloudresourcemanager projects.get API for the project_id in the JSON.
 * Returns the project display name on success.
 */
export async function verifyGcpCredentials(creds: GcpCredentials): Promise<string> {
  if (!creds.project_id || !creds.client_email || !creds.private_key) {
    throw new Error('Service account JSON is missing project_id, client_email, or private_key');
  }
  const url = `https://cloudresourcemanager.googleapis.com/v1/projects/${encodeURIComponent(creds.project_id)}`;
  const data = await gcpFetch<{ name?: string; projectId?: string }>(creds, url);
  return data.name || data.projectId || creds.project_id;
}

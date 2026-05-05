import { Router, Request, Response } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { getDb } from '../db/connection.js';
import { encrypt, decrypt } from './encryption.js';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { verifyGcpCredentials } from '../gcp/auth.js';
import { verifyAzureCredentials } from '../azure/auth.js';
import type {
  ProviderCredential,
  AwsCredentials,
  GcpCredentials,
  AzureCredentials,
  CloudCredentials,
  ProviderType,
} from './types.js';
import type { User } from '../auth/passport.js';

const router = Router();

router.use(requireAuth);

router.post('/', async (req: Request, res: Response) => {
  const user = req.user as User;
  const provider: ProviderType = (req.body.provider || 'aws') as ProviderType;
  const label = req.body.label;

  if (!label) {
    return res.status(400).json({ error: 'Label is required' });
  }

  if (provider === 'gcp') {
    return handleAddGcp(req, res, user, label);
  }
  if (provider === 'azure') {
    return handleAddAzure(req, res, user, label);
  }
  return handleAddAws(req, res, user, label);
});

async function handleAddAws(req: Request, res: Response, user: User, label: string) {
  const { region, accessKeyId, secretAccessKey, sessionToken } = req.body;

  if (!accessKeyId || !secretAccessKey) {
    return res.status(400).json({ error: 'accessKeyId and secretAccessKey are required' });
  }

  try {
    const stsClient = new STSClient({
      region: region || 'us-east-1',
      credentials: {
        accessKeyId,
        secretAccessKey,
        ...(sessionToken ? { sessionToken } : {}),
      },
    });
    const identity = await stsClient.send(new GetCallerIdentityCommand({}));
    console.log(`AWS identity verified: ${identity.Arn}`);
  } catch (err: any) {
    return res.status(400).json({ error: `AWS credential verification failed: ${err.message}` });
  }

  const credentialType = sessionToken ? 'temporary' : 'permanent';
  const creds: AwsCredentials = {
    accessKeyId,
    secretAccessKey,
    ...(sessionToken ? { sessionToken } : {}),
  };
  const encrypted = encrypt(JSON.stringify(creds));

  const db = getDb();
  const result = db.prepare(
    'INSERT INTO provider_credentials (user_id, label, provider, region, encrypted_credentials, verified, credential_type) VALUES (?, ?, ?, ?, ?, 1, ?)'
  ).run(user.id, label, 'aws', region || 'us-east-1', encrypted, credentialType);

  res.json({
    id: result.lastInsertRowid,
    label,
    provider: 'aws',
    region: region || 'us-east-1',
    verified: true,
    credentialType,
  });
}

async function handleAddGcp(req: Request, res: Response, user: User, label: string) {
  const { region, serviceAccountJson } = req.body;

  if (!serviceAccountJson) {
    return res.status(400).json({ error: 'serviceAccountJson is required for GCP' });
  }

  let creds: GcpCredentials;
  try {
    creds = typeof serviceAccountJson === 'string'
      ? JSON.parse(serviceAccountJson) as GcpCredentials
      : serviceAccountJson as GcpCredentials;
  } catch {
    return res.status(400).json({ error: 'serviceAccountJson is not valid JSON' });
  }

  if (creds.type && creds.type !== 'service_account') {
    return res.status(400).json({ error: 'Only service_account credential JSON is supported' });
  }

  try {
    const projectName = await verifyGcpCredentials(creds);
    console.log(`GCP identity verified: ${creds.client_email} (project: ${projectName})`);
  } catch (err: any) {
    return res.status(400).json({ error: `GCP credential verification failed: ${err.message}` });
  }

  const encrypted = encrypt(JSON.stringify(creds));

  const db = getDb();
  const result = db.prepare(
    'INSERT INTO provider_credentials (user_id, label, provider, region, encrypted_credentials, verified, credential_type) VALUES (?, ?, ?, ?, ?, 1, ?)'
  ).run(user.id, label, 'gcp', region || 'global', encrypted, 'permanent');

  res.json({
    id: result.lastInsertRowid,
    label,
    provider: 'gcp',
    region: region || 'global',
    verified: true,
    credentialType: 'permanent',
    projectId: creds.project_id,
  });
}

async function handleAddAzure(req: Request, res: Response, user: User, label: string) {
  const { tenantId, clientId, clientSecret, subscriptionId, region } = req.body;

  if (!tenantId || !clientId || !clientSecret || !subscriptionId) {
    return res.status(400).json({
      error: 'tenantId, clientId, clientSecret, and subscriptionId are required for Azure',
    });
  }

  const creds: AzureCredentials = {
    tenantId,
    clientId,
    clientSecret,
    subscriptionId,
  };

  try {
    const subscriptionName = await verifyAzureCredentials(creds);
    console.log(`Azure identity verified: ${clientId} (subscription: ${subscriptionName})`);
  } catch (err: any) {
    return res.status(400).json({ error: `Azure credential verification failed: ${err.message}` });
  }

  const encrypted = encrypt(JSON.stringify(creds));

  const db = getDb();
  const result = db.prepare(
    'INSERT INTO provider_credentials (user_id, label, provider, region, encrypted_credentials, verified, credential_type) VALUES (?, ?, ?, ?, ?, 1, ?)'
  ).run(user.id, label, 'azure', region || 'global', encrypted, 'permanent');

  res.json({
    id: result.lastInsertRowid,
    label,
    provider: 'azure',
    region: region || 'global',
    verified: true,
    credentialType: 'permanent',
    subscriptionId,
  });
}

router.get('/', (req: Request, res: Response) => {
  const user = req.user as User;
  const db = getDb();
  const providers = db.prepare(
    'SELECT id, label, provider, region, verified, credential_type, created_at FROM provider_credentials WHERE user_id = ?'
  ).all(user.id);
  res.json({ providers });
});

router.delete('/:id', (req: Request, res: Response) => {
  const user = req.user as User;
  const db = getDb();
  const result = db.prepare(
    'DELETE FROM provider_credentials WHERE id = ? AND user_id = ?'
  ).run(req.params.id, user.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Provider not found' });
  }
  res.json({ ok: true });
});

export default router;

export interface DecryptedProvider {
  provider: ProviderType;
  creds: CloudCredentials;
  region: string;
}

export function getDecryptedCredentials(providerId: number, userId: number): DecryptedProvider | null {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM provider_credentials WHERE id = ? AND user_id = ?'
  ).get(providerId, userId) as ProviderCredential | undefined;

  if (!row) return null;
  const creds = JSON.parse(decrypt(row.encrypted_credentials)) as CloudCredentials;
  return { provider: row.provider, creds, region: row.region };
}

import { getIo } from './socket.js';
import { getDb } from '../db/connection.js';
import { getClient } from '../aws/client-factory.js';
import { discoverResources } from '../aws/discovery.js';
import { fetchMetrics } from '../aws/metrics.js';
import { decrypt } from '../providers/encryption.js';
import type { ProviderCredential, AwsCredentials } from '../providers/types.js';
import type { CloudWatchClient } from '@aws-sdk/client-cloudwatch';

const activeLoops = new Map<string, NodeJS.Timeout>();

export function startPulseLoop(userId: number, providerId: number) {
  const key = `${userId}:${providerId}`;
  if (activeLoops.has(key)) return;

  const interval = setInterval(async () => {
    try {
      const io = getIo();
      const room = `user:${userId}`;
      const sockets = await io.in(room).fetchSockets();
      if (sockets.length === 0) {
        stopPulseLoop(userId, providerId);
        return;
      }

      const db = getDb();
      const row = db.prepare(
        'SELECT * FROM provider_credentials WHERE id = ? AND user_id = ?'
      ).get(providerId, userId) as ProviderCredential | undefined;

      if (!row) {
        stopPulseLoop(userId, providerId);
        return;
      }

      // Live metrics are currently only implemented for AWS via CloudWatch.
      // GCP support (Cloud Monitoring) is intentionally deferred — the loop is a
      // no-op for non-AWS providers so it doesn't break the socket channel.
      if (row.provider !== 'aws') {
        return;
      }

      const creds = JSON.parse(decrypt(row.encrypted_credentials)) as AwsCredentials;
      const nodes = await discoverResources(providerId, creds, row.region, ['ec2', 'rds', 'lambda']);
      const cloudwatch = getClient<CloudWatchClient>(providerId, creds, row.region, 'cloudwatch');
      const pulses = await fetchMetrics(cloudwatch, nodes);

      io.to(room).emit('metric:pulse', { providerId, pulses });
    } catch (err: any) {
      console.error(`Pulse loop error [${key}]:`, err.message);
    }
  }, 30000);

  activeLoops.set(key, interval);
  console.log(`Pulse loop started: ${key}`);
}

export function stopPulseLoop(userId: number, providerId: number) {
  const key = `${userId}:${providerId}`;
  const interval = activeLoops.get(key);
  if (interval) {
    clearInterval(interval);
    activeLoops.delete(key);
    console.log(`Pulse loop stopped: ${key}`);
  }
}

export function stopAllLoops() {
  for (const [key, interval] of activeLoops) {
    clearInterval(interval);
    console.log(`Pulse loop stopped: ${key}`);
  }
  activeLoops.clear();
}

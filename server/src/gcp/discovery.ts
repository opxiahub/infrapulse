import type { InfraNode } from '../aws/types.js';
import type { GcpCredentials } from '../providers/types.js';
import type { GcpResourceType } from './resource-registry.js';
import {
  discoverGceInstances,
  discoverVpcNetworks,
  discoverSubnetworks,
  discoverFirewalls,
  discoverRoutes,
  discoverCloudRouters,
  discoverCloudNats,
  discoverExternalIps,
  discoverCloudArmor,
  discoverLoadBalancers,
} from './resources/compute.js';
import { discoverGcsBuckets } from './resources/storage.js';
import { discoverCloudFunctions } from './resources/functions.js';
import { discoverCloudRunServices } from './resources/run.js';
import { discoverCloudSql } from './resources/sql.js';
import { discoverMemorystore } from './resources/redis.js';
import { discoverKmsKeyRings } from './resources/kms.js';
import { discoverSecrets } from './resources/secrets.js';
import { discoverCloudDns } from './resources/dns.js';
import { discoverPubsubTopics } from './resources/pubsub.js';

type DiscoveryFn = (creds: GcpCredentials) => Promise<InfraNode[]>;

const DISCOVERY_MAP: Record<GcpResourceType, DiscoveryFn> = {
  'gce-instance':   discoverGceInstances,
  'cloud-function': discoverCloudFunctions,
  'cloud-run':      discoverCloudRunServices,

  'vpc-network':    discoverVpcNetworks,
  subnetwork:       discoverSubnetworks,
  firewall:         discoverFirewalls,
  route:            discoverRoutes,
  'cloud-router':   discoverCloudRouters,
  'cloud-nat':      discoverCloudNats,
  'external-ip':    discoverExternalIps,

  'cloud-sql':      discoverCloudSql,
  memorystore:      discoverMemorystore,

  'gcs-bucket':     discoverGcsBuckets,

  'kms-keyring':    discoverKmsKeyRings,
  'secret-manager': discoverSecrets,
  'cloud-armor':    discoverCloudArmor,

  'load-balancer':  discoverLoadBalancers,
  'cloud-dns':      discoverCloudDns,

  'pubsub-topic':   discoverPubsubTopics,
};

export async function discoverGcpResources(
  creds: GcpCredentials,
  resourceTypes: GcpResourceType[]
): Promise<InfraNode[]> {
  const promises = resourceTypes
    .map(t => DISCOVERY_MAP[t])
    .filter((fn): fn is DiscoveryFn => !!fn)
    .map(fn => fn(creds));

  const results = await Promise.allSettled(promises);
  const nodes: InfraNode[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') nodes.push(...r.value);
  }
  return nodes;
}

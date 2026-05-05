import type { InfraNode } from '../aws/types.js';
import type { AzureCredentials } from '../providers/types.js';
import type { AzureResourceType } from './resource-registry.js';
import {
  discoverAzureAppServices,
  discoverAzureApplicationGateways,
  discoverAzureDnsZones,
  discoverAzureFunctions,
  discoverAzureKeyVaults,
  discoverAzureLoadBalancers,
  discoverAzureNsgs,
  discoverAzurePublicIps,
  discoverAzureRedis,
  discoverAzureServiceBus,
  discoverAzureSqlServers,
  discoverAzureStorageAccounts,
  discoverAzureSubnets,
  discoverAzureVms,
  discoverAzureVnets,
} from './resources/discovery.js';

type DiscoveryFn = (creds: AzureCredentials) => Promise<InfraNode[]>;

const DISCOVERY_MAP: Record<AzureResourceType, DiscoveryFn> = {
  'azure-vm': discoverAzureVms,
  'azure-function': discoverAzureFunctions,
  'azure-app-service': discoverAzureAppServices,

  'azure-vnet': discoverAzureVnets,
  'azure-subnet': discoverAzureSubnets,
  'azure-nsg': discoverAzureNsgs,
  'azure-public-ip': discoverAzurePublicIps,
  'azure-load-balancer': discoverAzureLoadBalancers,
  'azure-application-gateway': discoverAzureApplicationGateways,

  'azure-sql-server': discoverAzureSqlServers,
  'azure-redis': discoverAzureRedis,

  'azure-storage-account': discoverAzureStorageAccounts,

  'azure-key-vault': discoverAzureKeyVaults,

  'azure-dns-zone': discoverAzureDnsZones,

  'azure-service-bus': discoverAzureServiceBus,
};

export async function discoverAzureResources(
  creds: AzureCredentials,
  resourceTypes: AzureResourceType[]
): Promise<InfraNode[]> {
  const promises = resourceTypes
    .map(t => DISCOVERY_MAP[t])
    .filter((fn): fn is DiscoveryFn => !!fn)
    .map(fn => fn(creds));

  const results = await Promise.allSettled(promises);
  const nodes: InfraNode[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') nodes.push(...result.value);
  }
  return nodes;
}

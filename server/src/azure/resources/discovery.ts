import type { InfraNode } from '../../aws/types.js';
import type { AzureCredentials } from '../../providers/types.js';
import { azureList } from '../auth.js';

const ARM = 'https://management.azure.com';
const RESOURCE_LIST_API_VERSION = '2021-04-01';

interface AzureResource {
  id: string;
  name: string;
  type: string;
  location?: string;
  tags?: Record<string, string>;
  kind?: string;
  sku?: { name?: string; tier?: string; size?: string };
  properties?: Record<string, any>;
}

function resourceGroupFromId(id?: string): string | undefined {
  return id?.match(/\/resourceGroups\/([^/]+)/i)?.[1];
}

function lastSegment(id?: string): string | undefined {
  return id?.split('/').filter(Boolean).pop();
}

function normalizeId(id?: string): string {
  return (id || '').toLowerCase();
}

function isManagedByTags(tags?: Record<string, string>): boolean {
  if (!tags) return false;
  return Object.entries(tags).some(([key, value]) => {
    const text = `${key}:${value}`.toLowerCase();
    return (
      text.includes('terraform') ||
      text.includes('bicep') ||
      text.includes('arm') ||
      text.includes('pulumi') ||
      text.includes('managed-by') ||
      text.includes('created-by')
    );
  });
}

function node(
  type: string,
  resource: AzureResource,
  status: string,
  metadata: Record<string, any>
): InfraNode {
  return {
    id: `${type}-${normalizeId(resource.id)}`,
    type,
    label: resource.name || lastSegment(resource.id) || 'Unknown Resource',
    status: (status || 'unknown').toLowerCase(),
    isManual: !isManagedByTags(resource.tags),
    tags: resource.tags || {},
    metadata: {
      resourceId: resource.id,
      name: resource.name,
      resourceGroup: resourceGroupFromId(resource.id),
      location: resource.location,
      azureType: resource.type,
      ...metadata,
    },
  };
}

async function listByType(creds: AzureCredentials, resourceType: string): Promise<AzureResource[]> {
  const filter = encodeURIComponent(`resourceType eq '${resourceType}'`);
  return azureList<AzureResource>(
    creds,
    `${ARM}/subscriptions/${encodeURIComponent(creds.subscriptionId)}/resources?$filter=${filter}&api-version=${RESOURCE_LIST_API_VERSION}`
  );
}

// ---------- Compute ----------
export async function discoverAzureVms(creds: AzureCredentials): Promise<InfraNode[]> {
  try {
    const items = await listByType(creds, 'Microsoft.Compute/virtualMachines');
    return items.map(vm => node('azure-vm', vm, vm.properties?.provisioningState || 'active', {
      vmId: vm.properties?.vmId,
      hardwareSize: vm.properties?.hardwareProfile?.vmSize,
      osType: vm.properties?.storageProfile?.osDisk?.osType,
      networkInterfaceIds: (vm.properties?.networkProfile?.networkInterfaces || []).map((nic: any) => normalizeId(nic.id)),
      availabilitySetId: normalizeId(vm.properties?.availabilitySet?.id),
      subtitle: `${vm.properties?.hardwareProfile?.vmSize || 'VM'} · ${vm.location || ''}`,
    }));
  } catch (e: any) {
    console.error('Azure VM discovery error:', e.message);
    return [];
  }
}

export async function discoverAzureAppServices(creds: AzureCredentials): Promise<InfraNode[]> {
  try {
    const items = await listByType(creds, 'Microsoft.Web/sites');
    return items
      .filter(app => !String(app.kind || '').toLowerCase().includes('functionapp'))
      .map(app => node('azure-app-service', app, app.properties?.state || app.properties?.availabilityState || 'active', {
        kind: app.kind,
        defaultHostName: app.properties?.defaultHostName,
        serverFarmId: normalizeId(app.properties?.serverFarmId),
        httpsOnly: app.properties?.httpsOnly,
        subtitle: app.properties?.defaultHostName,
      }));
  } catch (e: any) {
    console.error('Azure App Service discovery error:', e.message);
    return [];
  }
}

export async function discoverAzureFunctions(creds: AzureCredentials): Promise<InfraNode[]> {
  try {
    const items = await listByType(creds, 'Microsoft.Web/sites');
    return items
      .filter(app => String(app.kind || '').toLowerCase().includes('functionapp'))
      .map(app => node('azure-function', app, app.properties?.state || app.properties?.availabilityState || 'active', {
        kind: app.kind,
        defaultHostName: app.properties?.defaultHostName,
        serverFarmId: normalizeId(app.properties?.serverFarmId),
        httpsOnly: app.properties?.httpsOnly,
        subtitle: app.properties?.defaultHostName,
      }));
  } catch (e: any) {
    console.error('Azure Function discovery error:', e.message);
    return [];
  }
}

// ---------- Networking ----------
export async function discoverAzureVnets(creds: AzureCredentials): Promise<InfraNode[]> {
  try {
    const items = await listByType(creds, 'Microsoft.Network/virtualNetworks');
    return items.map(vnet => node('azure-vnet', vnet, vnet.properties?.provisioningState || 'active', {
      addressPrefixes: vnet.properties?.addressSpace?.addressPrefixes || [],
      dnsServers: vnet.properties?.dhcpOptions?.dnsServers || [],
      subnetIds: (vnet.properties?.subnets || []).map((s: any) => normalizeId(s.id)),
      subtitle: (vnet.properties?.addressSpace?.addressPrefixes || []).join(', '),
    }));
  } catch (e: any) {
    console.error('Azure VNet discovery error:', e.message);
    return [];
  }
}

export async function discoverAzureSubnets(creds: AzureCredentials): Promise<InfraNode[]> {
  try {
    const vnets = await listByType(creds, 'Microsoft.Network/virtualNetworks');
    const subnets: InfraNode[] = [];
    for (const vnet of vnets) {
      for (const subnet of vnet.properties?.subnets || []) {
        const subnetResource: AzureResource = {
          id: subnet.id,
          name: subnet.name,
          type: 'Microsoft.Network/virtualNetworks/subnets',
          location: vnet.location,
          tags: vnet.tags,
          properties: subnet.properties || {},
        };
        subnets.push(node('azure-subnet', subnetResource, subnet.properties?.provisioningState || 'active', {
          vnetId: normalizeId(vnet.id),
          vnetName: vnet.name,
          addressPrefix: subnet.properties?.addressPrefix,
          addressPrefixes: subnet.properties?.addressPrefixes || [],
          networkSecurityGroupId: normalizeId(subnet.properties?.networkSecurityGroup?.id),
          routeTableId: normalizeId(subnet.properties?.routeTable?.id),
          subtitle: subnet.properties?.addressPrefix || (subnet.properties?.addressPrefixes || []).join(', '),
        }));
      }
    }
    return subnets;
  } catch (e: any) {
    console.error('Azure subnet discovery error:', e.message);
    return [];
  }
}

export async function discoverAzureNsgs(creds: AzureCredentials): Promise<InfraNode[]> {
  try {
    const items = await listByType(creds, 'Microsoft.Network/networkSecurityGroups');
    return items.map(nsg => node('azure-nsg', nsg, nsg.properties?.provisioningState || 'active', {
      securityRuleCount: nsg.properties?.securityRules?.length || 0,
      defaultSecurityRuleCount: nsg.properties?.defaultSecurityRules?.length || 0,
      subnetIds: (nsg.properties?.subnets || []).map((s: any) => normalizeId(s.id)),
      networkInterfaceIds: (nsg.properties?.networkInterfaces || []).map((nic: any) => normalizeId(nic.id)),
      subtitle: `${nsg.properties?.securityRules?.length || 0} custom rules`,
    }));
  } catch (e: any) {
    console.error('Azure NSG discovery error:', e.message);
    return [];
  }
}

export async function discoverAzurePublicIps(creds: AzureCredentials): Promise<InfraNode[]> {
  try {
    const items = await listByType(creds, 'Microsoft.Network/publicIPAddresses');
    return items.map(ip => node('azure-public-ip', ip, ip.properties?.provisioningState || 'active', {
      ipAddress: ip.properties?.ipAddress,
      allocationMethod: ip.properties?.publicIPAllocationMethod,
      sku: ip.sku?.name,
      attachedResourceId: normalizeId(ip.properties?.ipConfiguration?.id),
      dnsName: ip.properties?.dnsSettings?.fqdn,
      subtitle: ip.properties?.ipAddress || ip.properties?.dnsSettings?.fqdn,
    }));
  } catch (e: any) {
    console.error('Azure public IP discovery error:', e.message);
    return [];
  }
}

export async function discoverAzureLoadBalancers(creds: AzureCredentials): Promise<InfraNode[]> {
  try {
    const items = await listByType(creds, 'Microsoft.Network/loadBalancers');
    return items.map(lb => node('azure-load-balancer', lb, lb.properties?.provisioningState || 'active', {
      sku: lb.sku?.name,
      frontendIpConfigIds: (lb.properties?.frontendIPConfigurations || []).map((c: any) => normalizeId(c.id)),
      backendPoolIds: (lb.properties?.backendAddressPools || []).map((p: any) => normalizeId(p.id)),
      loadBalancingRuleCount: lb.properties?.loadBalancingRules?.length || 0,
      subtitle: `${lb.sku?.name || 'Load Balancer'} · ${lb.location || ''}`,
    }));
  } catch (e: any) {
    console.error('Azure load balancer discovery error:', e.message);
    return [];
  }
}

export async function discoverAzureApplicationGateways(creds: AzureCredentials): Promise<InfraNode[]> {
  try {
    const items = await listByType(creds, 'Microsoft.Network/applicationGateways');
    return items.map(gw => node('azure-application-gateway', gw, gw.properties?.provisioningState || 'active', {
      sku: gw.properties?.sku?.name,
      tier: gw.properties?.sku?.tier,
      frontendIpConfigIds: (gw.properties?.frontendIPConfigurations || []).map((c: any) => normalizeId(c.id)),
      backendPoolCount: gw.properties?.backendAddressPools?.length || 0,
      listenerCount: gw.properties?.httpListeners?.length || 0,
      subtitle: `${gw.properties?.sku?.name || 'Application Gateway'} · ${gw.location || ''}`,
    }));
  } catch (e: any) {
    console.error('Azure application gateway discovery error:', e.message);
    return [];
  }
}

// ---------- Database & Cache ----------
export async function discoverAzureSqlServers(creds: AzureCredentials): Promise<InfraNode[]> {
  try {
    const items = await listByType(creds, 'Microsoft.Sql/servers');
    return items.map(sql => node('azure-sql-server', sql, sql.properties?.state || 'active', {
      fullyQualifiedDomainName: sql.properties?.fullyQualifiedDomainName,
      administratorLogin: sql.properties?.administratorLogin,
      version: sql.properties?.version,
      publicNetworkAccess: sql.properties?.publicNetworkAccess,
      subtitle: sql.properties?.fullyQualifiedDomainName,
    }));
  } catch (e: any) {
    console.error('Azure SQL discovery error:', e.message);
    return [];
  }
}

export async function discoverAzureRedis(creds: AzureCredentials): Promise<InfraNode[]> {
  try {
    const items = await listByType(creds, 'Microsoft.Cache/Redis');
    return items.map(redis => node('azure-redis', redis, redis.properties?.provisioningState || 'active', {
      hostName: redis.properties?.hostName,
      port: redis.properties?.port,
      sslPort: redis.properties?.sslPort,
      sku: redis.sku?.name,
      tier: redis.sku?.tier,
      size: redis.sku?.size,
      subtitle: `${redis.sku?.name || ''} ${redis.sku?.tier || ''}`.trim(),
    }));
  } catch (e: any) {
    console.error('Azure Redis discovery error:', e.message);
    return [];
  }
}

// ---------- Storage ----------
export async function discoverAzureStorageAccounts(creds: AzureCredentials): Promise<InfraNode[]> {
  try {
    const items = await listByType(creds, 'Microsoft.Storage/storageAccounts');
    return items.map(storage => node('azure-storage-account', storage, storage.properties?.provisioningState || 'active', {
      sku: storage.sku?.name,
      kind: storage.kind,
      primaryLocation: storage.properties?.primaryLocation,
      accessTier: storage.properties?.accessTier,
      allowBlobPublicAccess: storage.properties?.allowBlobPublicAccess,
      primaryEndpoint: storage.properties?.primaryEndpoints?.blob,
      subtitle: `${storage.sku?.name || ''} · ${storage.kind || ''}`,
    }));
  } catch (e: any) {
    console.error('Azure storage discovery error:', e.message);
    return [];
  }
}

// ---------- Security ----------
export async function discoverAzureKeyVaults(creds: AzureCredentials): Promise<InfraNode[]> {
  try {
    const items = await listByType(creds, 'Microsoft.KeyVault/vaults');
    return items.map(vault => node('azure-key-vault', vault, vault.properties?.provisioningState || 'active', {
      vaultUri: vault.properties?.vaultUri,
      tenantId: vault.properties?.tenantId,
      sku: vault.properties?.sku?.name,
      enableRbacAuthorization: vault.properties?.enableRbacAuthorization,
      publicNetworkAccess: vault.properties?.publicNetworkAccess,
      subtitle: vault.properties?.vaultUri,
    }));
  } catch (e: any) {
    console.error('Azure Key Vault discovery error:', e.message);
    return [];
  }
}

// ---------- Content & API ----------
export async function discoverAzureDnsZones(creds: AzureCredentials): Promise<InfraNode[]> {
  try {
    const items = await listByType(creds, 'Microsoft.Network/dnsZones');
    return items.map(zone => node('azure-dns-zone', zone, 'active', {
      nameServers: zone.properties?.nameServers || [],
      numberOfRecordSets: zone.properties?.numberOfRecordSets,
      subtitle: `${zone.properties?.numberOfRecordSets || 0} record sets`,
    }));
  } catch (e: any) {
    console.error('Azure DNS discovery error:', e.message);
    return [];
  }
}

// ---------- Messaging ----------
export async function discoverAzureServiceBus(creds: AzureCredentials): Promise<InfraNode[]> {
  try {
    const items = await listByType(creds, 'Microsoft.ServiceBus/namespaces');
    return items.map(ns => node('azure-service-bus', ns, ns.properties?.status || ns.properties?.provisioningState || 'active', {
      sku: ns.sku?.name,
      tier: ns.sku?.tier,
      serviceBusEndpoint: ns.properties?.serviceBusEndpoint,
      zoneRedundant: ns.properties?.zoneRedundant,
      subtitle: ns.properties?.serviceBusEndpoint,
    }));
  } catch (e: any) {
    console.error('Azure Service Bus discovery error:', e.message);
    return [];
  }
}

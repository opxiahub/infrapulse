import type { InfraNode } from '../../aws/types.js';
import type { GcpCredentials } from '../../providers/types.js';
import { gcpFetch } from '../auth.js';

// All compute.googleapis.com endpoints below.
//
// We mostly use aggregatedList where it exists, which collapses results from
// every zone/region into a single response — closest analog to AWS regional
// scans, plus it works for projects that span many regions.

const BASE = 'https://compute.googleapis.com/compute/v1/projects';

function shortName(selfLink?: string): string | undefined {
  if (!selfLink) return undefined;
  return selfLink.split('/').pop();
}

function isManagedByLabels(labels?: Record<string, string>): boolean {
  if (!labels) return false;
  return Object.keys(labels).some(k => {
    const lower = k.toLowerCase();
    return lower.includes('terraform') || lower.includes('deployment-manager') || lower.includes('managed-by');
  });
}

interface AggregatedListResponse<T> {
  items?: Record<string, { warning?: any } & Record<string, T[] | undefined>>;
  nextPageToken?: string;
}

interface ListResponse<T> {
  items?: T[];
  nextPageToken?: string;
}

function flattenAggregated<T>(data: AggregatedListResponse<T>, key: string): T[] {
  const items: T[] = [];
  for (const scope of Object.values(data.items || {})) {
    const scoped = scope[key] as T[] | undefined;
    if (scoped && Array.isArray(scoped)) items.push(...scoped);
  }
  return items;
}

// ---------- GCE Instances ----------
interface GceInstance {
  id?: string;
  name?: string;
  status?: string;
  zone?: string;
  machineType?: string;
  networkInterfaces?: Array<{
    network?: string;
    subnetwork?: string;
    networkIP?: string;
    accessConfigs?: Array<{ natIP?: string }>;
  }>;
  labels?: Record<string, string>;
  creationTimestamp?: string;
  selfLink?: string;
  tags?: { items?: string[] };
}

export async function discoverGceInstances(creds: GcpCredentials): Promise<InfraNode[]> {
  try {
    const data = await gcpFetch<AggregatedListResponse<GceInstance>>(
      creds,
      `${BASE}/${creds.project_id}/aggregated/instances`
    );
    const instances = flattenAggregated<GceInstance>(data, 'instances');
    return instances.map(i => {
      const network = i.networkInterfaces?.[0];
      return {
        id: `gce-${i.id || i.name}`,
        type: 'gce-instance',
        label: i.name || 'Unknown VM',
        status: (i.status || 'unknown').toLowerCase(),
        isManual: !isManagedByLabels(i.labels),
        tags: i.labels || {},
        metadata: {
          instanceId: i.id,
          name: i.name,
          machineType: shortName(i.machineType),
          zone: shortName(i.zone),
          network: shortName(network?.network),
          subnetwork: shortName(network?.subnetwork),
          privateIp: network?.networkIP,
          publicIp: network?.accessConfigs?.[0]?.natIP,
          networkTags: i.tags?.items || [],
          creationTimestamp: i.creationTimestamp,
          subtitle: `${shortName(i.machineType) || ''} · ${shortName(i.zone) || ''}`,
        },
      };
    });
  } catch (e: any) {
    console.error('GCE instance discovery error:', e.message);
    return [];
  }
}

// ---------- VPC Networks ----------
interface GceNetwork {
  id?: string;
  name?: string;
  autoCreateSubnetworks?: boolean;
  routingConfig?: { routingMode?: string };
  subnetworks?: string[];
  creationTimestamp?: string;
  selfLink?: string;
}

export async function discoverVpcNetworks(creds: GcpCredentials): Promise<InfraNode[]> {
  try {
    const data = await gcpFetch<ListResponse<GceNetwork>>(
      creds,
      `${BASE}/${creds.project_id}/global/networks`
    );
    return (data.items || []).map(n => ({
      id: `vpc-${n.name}`,
      type: 'vpc-network',
      label: n.name || 'Unknown Network',
      status: 'active',
      isManual: true,
      tags: {},
      metadata: {
        networkId: n.id,
        name: n.name,
        autoCreateSubnetworks: n.autoCreateSubnetworks,
        routingMode: n.routingConfig?.routingMode,
        subnetworkCount: n.subnetworks?.length || 0,
        subtitle: n.routingConfig?.routingMode || 'global',
      },
    }));
  } catch (e: any) {
    console.error('VPC network discovery error:', e.message);
    return [];
  }
}

// ---------- Subnetworks ----------
interface GceSubnetwork {
  id?: string;
  name?: string;
  ipCidrRange?: string;
  region?: string;
  network?: string;
  privateIpGoogleAccess?: boolean;
  gatewayAddress?: string;
}

export async function discoverSubnetworks(creds: GcpCredentials): Promise<InfraNode[]> {
  try {
    const data = await gcpFetch<AggregatedListResponse<GceSubnetwork>>(
      creds,
      `${BASE}/${creds.project_id}/aggregated/subnetworks`
    );
    const items = flattenAggregated<GceSubnetwork>(data, 'subnetworks');
    return items.map(s => ({
      id: `subnet-${s.name}-${shortName(s.region)}`,
      type: 'subnetwork',
      label: s.name || 'Unknown Subnet',
      status: 'active',
      isManual: true,
      tags: {},
      metadata: {
        subnetworkId: s.id,
        name: s.name,
        cidr: s.ipCidrRange,
        region: shortName(s.region),
        network: shortName(s.network),
        gateway: s.gatewayAddress,
        privateGoogleAccess: s.privateIpGoogleAccess,
        subtitle: `${s.ipCidrRange} · ${shortName(s.region) || ''}`,
      },
    }));
  } catch (e: any) {
    console.error('Subnetwork discovery error:', e.message);
    return [];
  }
}

// ---------- Firewall Rules ----------
interface GceFirewall {
  id?: string;
  name?: string;
  network?: string;
  direction?: string;
  priority?: number;
  disabled?: boolean;
  sourceRanges?: string[];
  targetTags?: string[];
  allowed?: Array<{ IPProtocol?: string; ports?: string[] }>;
}

export async function discoverFirewalls(creds: GcpCredentials): Promise<InfraNode[]> {
  try {
    const data = await gcpFetch<ListResponse<GceFirewall>>(
      creds,
      `${BASE}/${creds.project_id}/global/firewalls`
    );
    return (data.items || []).map(f => ({
      id: `fw-${f.name}`,
      type: 'firewall',
      label: f.name || 'Unknown Firewall',
      status: f.disabled ? 'disabled' : 'active',
      isManual: true,
      tags: {},
      metadata: {
        firewallId: f.id,
        name: f.name,
        network: shortName(f.network),
        direction: f.direction,
        priority: f.priority,
        sourceRanges: f.sourceRanges,
        targetTags: f.targetTags,
        allowed: f.allowed,
        subtitle: `${f.direction || ''} · prio ${f.priority ?? ''}`,
      },
    }));
  } catch (e: any) {
    console.error('Firewall discovery error:', e.message);
    return [];
  }
}

// ---------- Routes ----------
interface GceRoute {
  id?: string;
  name?: string;
  network?: string;
  destRange?: string;
  priority?: number;
  nextHopGateway?: string;
  nextHopIp?: string;
  nextHopInstance?: string;
}

export async function discoverRoutes(creds: GcpCredentials): Promise<InfraNode[]> {
  try {
    const data = await gcpFetch<ListResponse<GceRoute>>(
      creds,
      `${BASE}/${creds.project_id}/global/routes`
    );
    return (data.items || []).map(r => ({
      id: `route-${r.name}`,
      type: 'route',
      label: r.name || 'Unknown Route',
      status: 'active',
      isManual: true,
      tags: {},
      metadata: {
        routeId: r.id,
        name: r.name,
        network: shortName(r.network),
        destRange: r.destRange,
        priority: r.priority,
        nextHop: r.nextHopGateway || r.nextHopIp || r.nextHopInstance,
        subtitle: r.destRange,
      },
    }));
  } catch (e: any) {
    console.error('Route discovery error:', e.message);
    return [];
  }
}

// ---------- Cloud Routers ----------
interface GceRouter {
  id?: string;
  name?: string;
  network?: string;
  region?: string;
  bgp?: { asn?: number };
  nats?: Array<{ name?: string }>;
}

export async function discoverCloudRouters(creds: GcpCredentials): Promise<InfraNode[]> {
  try {
    const data = await gcpFetch<AggregatedListResponse<GceRouter>>(
      creds,
      `${BASE}/${creds.project_id}/aggregated/routers`
    );
    const items = flattenAggregated<GceRouter>(data, 'routers');
    return items.map(r => ({
      id: `router-${r.name}-${shortName(r.region)}`,
      type: 'cloud-router',
      label: r.name || 'Unknown Router',
      status: 'active',
      isManual: true,
      tags: {},
      metadata: {
        routerId: r.id,
        name: r.name,
        network: shortName(r.network),
        region: shortName(r.region),
        asn: r.bgp?.asn,
        natCount: r.nats?.length || 0,
        subtitle: `ASN ${r.bgp?.asn ?? '—'} · ${shortName(r.region) || ''}`,
      },
    }));
  } catch (e: any) {
    console.error('Cloud Router discovery error:', e.message);
    return [];
  }
}

// ---------- Cloud NAT ----------
// Cloud NAT lives inside Cloud Router. We re-walk routers and emit one node
// per nested NAT config.
export async function discoverCloudNats(creds: GcpCredentials): Promise<InfraNode[]> {
  try {
    const data = await gcpFetch<AggregatedListResponse<GceRouter>>(
      creds,
      `${BASE}/${creds.project_id}/aggregated/routers`
    );
    const routers = flattenAggregated<GceRouter>(data, 'routers');
    const nats: InfraNode[] = [];
    for (const r of routers) {
      for (const nat of r.nats || []) {
        nats.push({
          id: `nat-${r.name}-${nat.name}`,
          type: 'cloud-nat',
          label: nat.name || 'Unknown NAT',
          status: 'active',
          isManual: true,
          tags: {},
          metadata: {
            name: nat.name,
            router: r.name,
            region: shortName(r.region),
            network: shortName(r.network),
            subtitle: `via ${r.name}`,
          },
        });
      }
    }
    return nats;
  } catch (e: any) {
    console.error('Cloud NAT discovery error:', e.message);
    return [];
  }
}

// ---------- External IPs ----------
interface GceAddress {
  id?: string;
  name?: string;
  address?: string;
  status?: string;
  region?: string;
  addressType?: string;
  purpose?: string;
  users?: string[];
}

export async function discoverExternalIps(creds: GcpCredentials): Promise<InfraNode[]> {
  try {
    const [regional, global] = await Promise.allSettled([
      gcpFetch<AggregatedListResponse<GceAddress>>(creds, `${BASE}/${creds.project_id}/aggregated/addresses`),
      gcpFetch<ListResponse<GceAddress>>(creds, `${BASE}/${creds.project_id}/global/addresses`),
    ]);

    const items: GceAddress[] = [];
    if (regional.status === 'fulfilled') {
      items.push(...flattenAggregated<GceAddress>(regional.value, 'addresses'));
    }
    if (global.status === 'fulfilled') {
      items.push(...(global.value.items || []));
    }

    return items.map(a => ({
      id: `ip-${a.name}-${shortName(a.region) || 'global'}`,
      type: 'external-ip',
      label: a.name || a.address || 'Unknown IP',
      status: (a.status || 'unknown').toLowerCase(),
      isManual: true,
      tags: {},
      metadata: {
        addressId: a.id,
        name: a.name,
        address: a.address,
        region: shortName(a.region) || 'global',
        addressType: a.addressType,
        purpose: a.purpose,
        users: a.users?.map(shortName),
        subtitle: a.address,
      },
    }));
  } catch (e: any) {
    console.error('External IP discovery error:', e.message);
    return [];
  }
}

// ---------- Cloud Armor (security policies) ----------
interface GceSecurityPolicy {
  id?: string;
  name?: string;
  description?: string;
  type?: string;
  rules?: Array<{ priority?: number; action?: string }>;
}

export async function discoverCloudArmor(creds: GcpCredentials): Promise<InfraNode[]> {
  try {
    const data = await gcpFetch<ListResponse<GceSecurityPolicy>>(
      creds,
      `${BASE}/${creds.project_id}/global/securityPolicies`
    );
    return (data.items || []).map(p => ({
      id: `armor-${p.name}`,
      type: 'cloud-armor',
      label: p.name || 'Unknown Policy',
      status: 'active',
      isManual: true,
      tags: {},
      metadata: {
        policyId: p.id,
        name: p.name,
        description: p.description,
        type: p.type,
        ruleCount: p.rules?.length || 0,
        subtitle: `${p.rules?.length || 0} rules`,
      },
    }));
  } catch (e: any) {
    console.error('Cloud Armor discovery error:', e.message);
    return [];
  }
}

// ---------- Load Balancers (global forwarding rules) ----------
interface GceForwardingRule {
  id?: string;
  name?: string;
  IPAddress?: string;
  IPProtocol?: string;
  loadBalancingScheme?: string;
  target?: string;
  region?: string;
  portRange?: string;
  network?: string;
}

export async function discoverLoadBalancers(creds: GcpCredentials): Promise<InfraNode[]> {
  try {
    const [globalRes, regionalRes] = await Promise.allSettled([
      gcpFetch<ListResponse<GceForwardingRule>>(creds, `${BASE}/${creds.project_id}/global/forwardingRules`),
      gcpFetch<AggregatedListResponse<GceForwardingRule>>(creds, `${BASE}/${creds.project_id}/aggregated/forwardingRules`),
    ]);

    const rules: GceForwardingRule[] = [];
    if (globalRes.status === 'fulfilled') rules.push(...(globalRes.value.items || []));
    if (regionalRes.status === 'fulfilled') {
      rules.push(...flattenAggregated<GceForwardingRule>(regionalRes.value, 'forwardingRules'));
    }

    // Dedup by name+region (global+aggregated may overlap)
    const seen = new Set<string>();
    const out: InfraNode[] = [];
    for (const r of rules) {
      const key = `${r.name}-${shortName(r.region) || 'global'}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: `lb-${key}`,
        type: 'load-balancer',
        label: r.name || 'Unknown LB',
        status: 'active',
        isManual: true,
        tags: {},
        metadata: {
          ruleId: r.id,
          name: r.name,
          ipAddress: r.IPAddress,
          protocol: r.IPProtocol,
          scheme: r.loadBalancingScheme,
          target: shortName(r.target),
          region: shortName(r.region) || 'global',
          portRange: r.portRange,
          network: shortName(r.network),
          subtitle: `${r.loadBalancingScheme || ''} · ${r.IPProtocol || ''}`,
        },
      });
    }
    return out;
  } catch (e: any) {
    console.error('Load Balancer discovery error:', e.message);
    return [];
  }
}

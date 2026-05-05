import {
  DescribeVpcsCommand,
  DescribeSubnetsCommand,
  DescribeRouteTablesCommand,
  DescribeTransitGatewaysCommand,
  DescribeVpcEndpointsCommand,
  DescribeInternetGatewaysCommand,
  DescribeNatGatewaysCommand,
  DescribeAddressesCommand,
  DescribeDhcpOptionsCommand,
  DescribeNetworkAclsCommand,
  DescribeVpnConnectionsCommand,
} from '@aws-sdk/client-ec2';
import type { EC2Client } from '@aws-sdk/client-ec2';
import type { InfraNode } from '../types.js';

function hasManagedTag(tags: any[]): boolean {
  return (tags || []).some((t: any) =>
    t.Key?.toLowerCase().includes('terraform') ||
    t.Key?.toLowerCase().includes('cloudformation') ||
    t.Key?.toLowerCase() === 'aws:cloudformation:stack-name'
  );
}

function toTagRecord(tags: any[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const t of (tags || [])) {
    if (t.Key) record[t.Key] = t.Value ?? '';
  }
  return record;
}

export async function discoverVpc(client: EC2Client): Promise<InfraNode[]> {
  try {
    const res = await client.send(new DescribeVpcsCommand({}));
    return (res.Vpcs || []).map(v => {
      const name = (v.Tags || []).find(t => t.Key === 'Name')?.Value;
      return {
        id: `vpc-${v.VpcId}`,
        type: 'vpc' as const,
        label: name || v.VpcId || 'Unknown VPC',
        status: v.State || 'unknown',
        isManual: !hasManagedTag(v.Tags || []),
        tags: toTagRecord(v.Tags || []),
        metadata: { vpcId: v.VpcId, cidrBlock: v.CidrBlock, isDefault: v.IsDefault, subtitle: v.CidrBlock },
      };
    });
  } catch (e: any) { console.error('VPC discovery error:', e.message); return []; }
}

export async function discoverSubnet(client: EC2Client): Promise<InfraNode[]> {
  try {
    const res = await client.send(new DescribeSubnetsCommand({}));
    return (res.Subnets || []).map(s => {
      const name = (s.Tags || []).find(t => t.Key === 'Name')?.Value;
      return {
        id: `subnet-${s.SubnetId}`,
        type: 'subnet' as const,
        label: name || s.SubnetId || 'Unknown Subnet',
        status: s.State || 'unknown',
        isManual: !hasManagedTag(s.Tags || []),
        tags: toTagRecord(s.Tags || []),
        metadata: { subnetId: s.SubnetId, vpcId: s.VpcId, cidrBlock: s.CidrBlock, az: s.AvailabilityZone, subtitle: `${s.CidrBlock} · ${s.AvailabilityZone}` },
      };
    });
  } catch (e: any) { console.error('Subnet discovery error:', e.message); return []; }
}

export async function discoverRouteTable(client: EC2Client): Promise<InfraNode[]> {
  try {
    const res = await client.send(new DescribeRouteTablesCommand({}));
    return (res.RouteTables || []).map(rt => {
      const name = (rt.Tags || []).find(t => t.Key === 'Name')?.Value;
      return {
        id: `rt-${rt.RouteTableId}`,
        type: 'route-table' as const,
        label: name || rt.RouteTableId || 'Unknown RT',
        status: 'active',
        isManual: !hasManagedTag(rt.Tags || []),
        tags: toTagRecord(rt.Tags || []),
        metadata: { routeTableId: rt.RouteTableId, vpcId: rt.VpcId, routeCount: rt.Routes?.length || 0, subtitle: `${rt.Routes?.length || 0} routes` },
      };
    });
  } catch (e: any) { console.error('Route Table discovery error:', e.message); return []; }
}

export async function discoverTransitGateway(client: EC2Client): Promise<InfraNode[]> {
  try {
    const res = await client.send(new DescribeTransitGatewaysCommand({}));
    return (res.TransitGateways || []).map(tgw => {
      const name = (tgw.Tags || []).find(t => t.Key === 'Name')?.Value;
      return {
        id: `tgw-${tgw.TransitGatewayId}`,
        type: 'transit-gateway' as const,
        label: name || tgw.TransitGatewayId || 'Unknown TGW',
        status: tgw.State || 'unknown',
        isManual: !hasManagedTag(tgw.Tags || []),
        tags: toTagRecord(tgw.Tags || []),
        metadata: { transitGatewayId: tgw.TransitGatewayId, asnNumber: tgw.Options?.AmazonSideAsn, subtitle: tgw.TransitGatewayId },
      };
    });
  } catch (e: any) { console.error('Transit Gateway discovery error:', e.message); return []; }
}

export async function discoverVpcEndpoint(client: EC2Client): Promise<InfraNode[]> {
  try {
    const res = await client.send(new DescribeVpcEndpointsCommand({}));
    return (res.VpcEndpoints || []).map(ep => {
      const name = (ep.Tags || []).find(t => t.Key === 'Name')?.Value;
      return {
        id: `vpce-${ep.VpcEndpointId}`,
        type: 'vpc-endpoint' as const,
        label: name || ep.ServiceName?.split('.').pop() || ep.VpcEndpointId || 'Unknown Endpoint',
        status: ep.State || 'unknown',
        isManual: !hasManagedTag(ep.Tags || []),
        tags: toTagRecord(ep.Tags || []),
        metadata: { vpcEndpointId: ep.VpcEndpointId, vpcId: ep.VpcId, serviceName: ep.ServiceName, endpointType: ep.VpcEndpointType, subtitle: ep.ServiceName?.split('.').pop() },
      };
    });
  } catch (e: any) { console.error('VPC Endpoint discovery error:', e.message); return []; }
}

export async function discoverIgw(client: EC2Client): Promise<InfraNode[]> {
  try {
    const res = await client.send(new DescribeInternetGatewaysCommand({}));
    return (res.InternetGateways || []).map(igw => {
      const name = (igw.Tags || []).find(t => t.Key === 'Name')?.Value;
      const attachedVpc = igw.Attachments?.[0]?.VpcId;
      return {
        id: `igw-${igw.InternetGatewayId}`,
        type: 'igw' as const,
        label: name || igw.InternetGatewayId || 'Unknown IGW',
        status: igw.Attachments?.[0]?.State || 'detached',
        isManual: !hasManagedTag(igw.Tags || []),
        tags: toTagRecord(igw.Tags || []),
        metadata: { internetGatewayId: igw.InternetGatewayId, vpcId: attachedVpc, subtitle: attachedVpc ? `Attached to ${attachedVpc}` : 'Detached' },
      };
    });
  } catch (e: any) { console.error('IGW discovery error:', e.message); return []; }
}

export async function discoverNatGateway(client: EC2Client): Promise<InfraNode[]> {
  try {
    const res = await client.send(new DescribeNatGatewaysCommand({}));
    return (res.NatGateways || []).filter(n => n.State !== 'deleted').map(nat => {
      const name = (nat.Tags || []).find(t => t.Key === 'Name')?.Value;
      return {
        id: `nat-${nat.NatGatewayId}`,
        type: 'nat-gateway' as const,
        label: name || nat.NatGatewayId || 'Unknown NAT',
        status: nat.State || 'unknown',
        isManual: !hasManagedTag(nat.Tags || []),
        tags: toTagRecord(nat.Tags || []),
        metadata: { natGatewayId: nat.NatGatewayId, vpcId: nat.VpcId, subnetId: nat.SubnetId, connectivityType: nat.ConnectivityType, subtitle: nat.ConnectivityType || 'NAT' },
      };
    });
  } catch (e: any) { console.error('NAT Gateway discovery error:', e.message); return []; }
}

export async function discoverEip(client: EC2Client): Promise<InfraNode[]> {
  try {
    const res = await client.send(new DescribeAddressesCommand({}));
    return (res.Addresses || []).map(addr => {
      const name = (addr.Tags || []).find(t => t.Key === 'Name')?.Value;
      return {
        id: `eip-${addr.AllocationId}`,
        type: 'eip' as const,
        label: name || addr.PublicIp || 'Unknown EIP',
        status: addr.AssociationId ? 'associated' : 'unassociated',
        isManual: !hasManagedTag(addr.Tags || []),
        tags: toTagRecord(addr.Tags || []),
        metadata: { allocationId: addr.AllocationId, publicIp: addr.PublicIp, instanceId: addr.InstanceId, associationId: addr.AssociationId, subtitle: addr.PublicIp },
      };
    });
  } catch (e: any) { console.error('EIP discovery error:', e.message); return []; }
}

export async function discoverDhcpOptions(client: EC2Client): Promise<InfraNode[]> {
  try {
    const res = await client.send(new DescribeDhcpOptionsCommand({}));
    return (res.DhcpOptions || []).map(d => {
      const name = (d.Tags || []).find(t => t.Key === 'Name')?.Value;
      return {
        id: `dhcp-${d.DhcpOptionsId}`,
        type: 'dhcp-options' as const,
        label: name || d.DhcpOptionsId || 'Unknown DHCP',
        status: 'active',
        isManual: !hasManagedTag(d.Tags || []),
        tags: toTagRecord(d.Tags || []),
        metadata: { dhcpOptionsId: d.DhcpOptionsId, subtitle: d.DhcpOptionsId },
      };
    });
  } catch (e: any) { console.error('DHCP Options discovery error:', e.message); return []; }
}

export async function discoverNacl(client: EC2Client): Promise<InfraNode[]> {
  try {
    const res = await client.send(new DescribeNetworkAclsCommand({}));
    return (res.NetworkAcls || []).map(nacl => {
      const name = (nacl.Tags || []).find(t => t.Key === 'Name')?.Value;
      return {
        id: `nacl-${nacl.NetworkAclId}`,
        type: 'nacl' as const,
        label: name || nacl.NetworkAclId || 'Unknown NACL',
        status: nacl.IsDefault ? 'default' : 'custom',
        isManual: !hasManagedTag(nacl.Tags || []),
        tags: toTagRecord(nacl.Tags || []),
        metadata: { networkAclId: nacl.NetworkAclId, vpcId: nacl.VpcId, isDefault: nacl.IsDefault, entryCount: nacl.Entries?.length || 0, subtitle: `${nacl.Entries?.length || 0} rules` },
      };
    });
  } catch (e: any) { console.error('NACL discovery error:', e.message); return []; }
}

export async function discoverVpn(client: EC2Client): Promise<InfraNode[]> {
  try {
    const res = await client.send(new DescribeVpnConnectionsCommand({}));
    return (res.VpnConnections || []).filter(v => v.State !== 'deleted').map(vpn => {
      const name = (vpn.Tags || []).find(t => t.Key === 'Name')?.Value;
      return {
        id: `vpn-${vpn.VpnConnectionId}`,
        type: 'vpn' as const,
        label: name || vpn.VpnConnectionId || 'Unknown VPN',
        status: vpn.State || 'unknown',
        isManual: !hasManagedTag(vpn.Tags || []),
        tags: toTagRecord(vpn.Tags || []),
        metadata: { vpnConnectionId: vpn.VpnConnectionId, vpnGatewayId: vpn.VpnGatewayId, customerGatewayId: vpn.CustomerGatewayId, vpnType: vpn.Type, subtitle: vpn.Type },
      };
    });
  } catch (e: any) { console.error('VPN discovery error:', e.message); return []; }
}

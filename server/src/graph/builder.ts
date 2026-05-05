import type { InfraNode, InfraEdge, GraphData } from '../aws/types.js';

interface EdgeRule {
  sourceTypes: string[];
  targetTypes: string[];
  match: (source: InfraNode, target: InfraNode) => boolean;
  label: string;
  animated: boolean;
}

const EDGE_RULES: EdgeRule[] = [
  // Subnet belongs to VPC
  { sourceTypes: ['subnet'], targetTypes: ['vpc'],
    match: (s, t) => !!s.metadata.vpcId && s.metadata.vpcId === t.metadata.vpcId,
    label: 'In VPC', animated: false },

  // EC2 in Subnet
  { sourceTypes: ['ec2'], targetTypes: ['subnet'],
    match: (s, t) => !!s.metadata.subnetId && s.metadata.subnetId === t.metadata.subnetId,
    label: 'In Subnet', animated: false },

  // NAT Gateway in Subnet
  { sourceTypes: ['nat-gateway'], targetTypes: ['subnet'],
    match: (s, t) => !!s.metadata.subnetId && s.metadata.subnetId === t.metadata.subnetId,
    label: 'In Subnet', animated: false },

  // IGW attached to VPC
  { sourceTypes: ['igw'], targetTypes: ['vpc'],
    match: (s, t) => !!s.metadata.vpcId && s.metadata.vpcId === t.metadata.vpcId,
    label: 'Attached', animated: false },

  // Route Table in VPC
  { sourceTypes: ['route-table'], targetTypes: ['vpc'],
    match: (s, t) => !!s.metadata.vpcId && s.metadata.vpcId === t.metadata.vpcId,
    label: 'In VPC', animated: false },

  // VPC Endpoint in VPC
  { sourceTypes: ['vpc-endpoint'], targetTypes: ['vpc'],
    match: (s, t) => !!s.metadata.vpcId && s.metadata.vpcId === t.metadata.vpcId,
    label: 'In VPC', animated: false },

  // NACL in VPC
  { sourceTypes: ['nacl'], targetTypes: ['vpc'],
    match: (s, t) => !!s.metadata.vpcId && s.metadata.vpcId === t.metadata.vpcId,
    label: 'In VPC', animated: false },

  // EC2 <-> RDS same VPC with shared security groups
  { sourceTypes: ['ec2'], targetTypes: ['rds'],
    match: (s, t) => {
      if (!s.metadata.vpcId || s.metadata.vpcId !== t.metadata.vpcId) return false;
      const ec2Sgs = (s.metadata.securityGroups || []).map((sg: any) => sg.id);
      const rdsSgs = (t.metadata.securityGroups || []).map((sg: any) => sg.id);
      return ec2Sgs.some((id: string) => rdsSgs.includes(id));
    },
    label: 'SG Link', animated: true },

  // EC2 <-> RDS same VPC (fallback)
  { sourceTypes: ['ec2'], targetTypes: ['rds'],
    match: (s, t) => !!s.metadata.vpcId && s.metadata.vpcId === t.metadata.vpcId,
    label: 'Same VPC', animated: true },

  // Lambda -> S3 via env vars
  { sourceTypes: ['lambda'], targetTypes: ['s3'],
    match: (s, t) => {
      const refs = s.metadata.referencedBuckets || [];
      return refs.some((ref: string) => ref.includes(t.metadata.bucketName));
    },
    label: 'Reads/Writes', animated: true },

  // Lambda -> RDS via env vars
  { sourceTypes: ['lambda'], targetTypes: ['rds'],
    match: (s, t) => {
      const refs = s.metadata.referencedEndpoints || [];
      return !!t.metadata.endpoint && refs.some((ref: string) => ref.includes(t.metadata.endpoint));
    },
    label: 'DB Connection', animated: true },

  // ELB in VPC
  { sourceTypes: ['elb'], targetTypes: ['vpc'],
    match: (s, t) => !!s.metadata.vpcId && s.metadata.vpcId === t.metadata.vpcId,
    label: 'In VPC', animated: false },

  // CloudFront -> S3 origin
  { sourceTypes: ['cloudfront'], targetTypes: ['s3'],
    match: (s, t) => {
      const origins: string[] = s.metadata.origins || [];
      return origins.some(o => o.includes(t.metadata.bucketName));
    },
    label: 'Origin', animated: true },

  // CloudFront -> ELB origin
  { sourceTypes: ['cloudfront'], targetTypes: ['elb'],
    match: (s, t) => {
      const origins: string[] = s.metadata.origins || [];
      return !!t.metadata.dnsName && origins.some(o => o.includes(t.metadata.dnsName));
    },
    label: 'Origin', animated: true },

  // EIP associated to EC2
  { sourceTypes: ['eip'], targetTypes: ['ec2'],
    match: (s, t) => !!s.metadata.instanceId && t.metadata.instanceId === s.metadata.instanceId,
    label: 'Associated', animated: false },

  // ---------------- GCP edge rules ----------------

  // Subnetwork in VPC Network
  { sourceTypes: ['subnetwork'], targetTypes: ['vpc-network'],
    match: (s, t) => !!s.metadata.network && s.metadata.network === t.metadata.name,
    label: 'In VPC', animated: false },

  // Firewall attached to VPC Network
  { sourceTypes: ['firewall'], targetTypes: ['vpc-network'],
    match: (s, t) => !!s.metadata.network && s.metadata.network === t.metadata.name,
    label: 'Protects', animated: false },

  // Route in VPC Network
  { sourceTypes: ['route'], targetTypes: ['vpc-network'],
    match: (s, t) => !!s.metadata.network && s.metadata.network === t.metadata.name,
    label: 'In VPC', animated: false },

  // Cloud Router in VPC Network
  { sourceTypes: ['cloud-router'], targetTypes: ['vpc-network'],
    match: (s, t) => !!s.metadata.network && s.metadata.network === t.metadata.name,
    label: 'In VPC', animated: false },

  // Cloud NAT inside Cloud Router
  { sourceTypes: ['cloud-nat'], targetTypes: ['cloud-router'],
    match: (s, t) => !!s.metadata.router && s.metadata.router === t.metadata.name,
    label: 'On Router', animated: false },

  // GCE instance in subnetwork
  { sourceTypes: ['gce-instance'], targetTypes: ['subnetwork'],
    match: (s, t) => !!s.metadata.subnetwork && s.metadata.subnetwork === t.metadata.name,
    label: 'In Subnet', animated: false },

  // GCE instance in VPC (fallback when subnetwork match unavailable)
  { sourceTypes: ['gce-instance'], targetTypes: ['vpc-network'],
    match: (s, t) => !!s.metadata.network && s.metadata.network === t.metadata.name,
    label: 'In VPC', animated: false },

  // External IP associated to a GCE instance (via users[])
  { sourceTypes: ['external-ip'], targetTypes: ['gce-instance'],
    match: (s, t) => {
      const users: string[] = s.metadata.users || [];
      return !!t.metadata.name && users.includes(t.metadata.name);
    },
    label: 'Attached', animated: false },

  // Memorystore in VPC (authorizedNetwork → vpc name)
  { sourceTypes: ['memorystore'], targetTypes: ['vpc-network'],
    match: (s, t) => !!s.metadata.authorizedNetwork && s.metadata.authorizedNetwork === t.metadata.name,
    label: 'Authorized', animated: true },

  // Load Balancer fronting a GCE network
  { sourceTypes: ['load-balancer'], targetTypes: ['vpc-network'],
    match: (s, t) => !!s.metadata.network && s.metadata.network === t.metadata.name,
    label: 'Front-ends', animated: true },

  // ---------------- Azure edge rules ----------------

  // Subnet in VNet
  { sourceTypes: ['azure-subnet'], targetTypes: ['azure-vnet'],
    match: (s, t) => !!s.metadata.vnetId && s.metadata.vnetId === String(t.metadata.resourceId || '').toLowerCase(),
    label: 'In VNet', animated: false },

  // NSG attached to subnet
  { sourceTypes: ['azure-nsg'], targetTypes: ['azure-subnet'],
    match: (s, t) => {
      const subnetIds: string[] = s.metadata.subnetIds || [];
      return subnetIds.includes(String(t.metadata.resourceId || '').toLowerCase()) ||
        (!!t.metadata.networkSecurityGroupId && t.metadata.networkSecurityGroupId === String(s.metadata.resourceId || '').toLowerCase());
    },
    label: 'Protects', animated: false },

  // Load Balancer frontend IP references Public IP config
  { sourceTypes: ['azure-load-balancer'], targetTypes: ['azure-public-ip'],
    match: (s, t) => {
      const frontendIds: string[] = s.metadata.frontendIpConfigIds || [];
      const attached = String(t.metadata.attachedResourceId || '').toLowerCase();
      return frontendIds.some(id => attached.includes(id));
    },
    label: 'Frontend', animated: true },

  // Application Gateway frontend IP references Public IP config
  { sourceTypes: ['azure-application-gateway'], targetTypes: ['azure-public-ip'],
    match: (s, t) => {
      const frontendIds: string[] = s.metadata.frontendIpConfigIds || [];
      const attached = String(t.metadata.attachedResourceId || '').toLowerCase();
      return frontendIds.some(id => attached.includes(id));
    },
    label: 'Frontend', animated: true },
];

export function buildGraph(nodes: InfraNode[]): GraphData {
  const edges: InfraEdge[] = [];
  const edgeSet = new Set<string>();

  // Index nodes by type for faster lookups
  const byType: Record<string, InfraNode[]> = {};
  for (const node of nodes) {
    if (!byType[node.type]) byType[node.type] = [];
    byType[node.type].push(node);
  }

  for (const rule of EDGE_RULES) {
    for (const srcType of rule.sourceTypes) {
      for (const tgtType of rule.targetTypes) {
        const sources = byType[srcType] || [];
        const targets = byType[tgtType] || [];
        for (const source of sources) {
          for (const target of targets) {
            if (source.id === target.id) continue;
            const edgeKey = `${source.id}->${target.id}`;
            const reverseKey = `${target.id}->${source.id}`;
            if (edgeSet.has(edgeKey) || edgeSet.has(reverseKey)) continue;

            if (rule.match(source, target)) {
              edgeSet.add(edgeKey);
              edges.push({
                id: `edge-${source.id}-${target.id}`,
                source: source.id,
                target: target.id,
                label: rule.label,
                animated: rule.animated,
              });
            }
          }
        }
      }
    }
  }

  return { nodes, edges };
}

import { getAvailableK8sFieldsMessage, type K8sGraphData, type K8sInfraNode, type K8sIntentAnalysisResult } from './k8s-types.js';

export function buildK8sContext(
  graphData: K8sGraphData,
  intent: K8sIntentAnalysisResult
): { context: string; isRefusal: boolean; refusalMessage?: string } {
  if (!intent.isAnswerable) {
    return {
      context: '',
      isRefusal: true,
      refusalMessage: buildRefusalMessage(intent),
    };
  }

  let relevantNodes = graphData.nodes;

  if (intent.resourceTypes.length > 0) {
    relevantNodes = relevantNodes.filter(node => intent.resourceTypes.includes(node.type as any));
  }

  if (intent.filters?.status) {
    relevantNodes = relevantNodes.filter(node =>
      node.status?.toLowerCase().includes(String(intent.filters?.status).toLowerCase())
    );
  }

  const context = buildContextString(relevantNodes, graphData);
  return { context, isRefusal: false };
}

function buildContextString(nodes: K8sInfraNode[], graphData: K8sGraphData): string {
  if (nodes.length === 0) {
    return 'No Kubernetes resources found matching the query criteria.';
  }

  const lines: string[] = [];
  lines.push(`Total resources found: ${nodes.length}`);
  lines.push('');

  const nodesByType = new Map<string, K8sInfraNode[]>();
  for (const node of nodes) {
    if (!nodesByType.has(node.type)) nodesByType.set(node.type, []);
    nodesByType.get(node.type)!.push(node);
  }

  for (const [type, typeNodes] of nodesByType.entries()) {
    lines.push(`${type.toUpperCase()} Resources (${typeNodes.length}):`);
    for (const node of typeNodes) {
      const details: string[] = [];
      const metadata = node.metadata || {};
      details.push(`  - ${node.label} (${node.id})`);
      details.push(`    Status: ${node.status}`);
      if (metadata.namespace) details.push(`    Namespace: ${metadata.namespace}`);
      if (metadata.createdAt) details.push(`    Created: ${metadata.createdAt}`);

      if (metadata.replicas !== undefined) details.push(`    Replicas: ${metadata.readyReplicas ?? 0}/${metadata.replicas}`);
      if (metadata.image) details.push(`    Image: ${metadata.image}`);
      if (metadata.desiredNumberScheduled !== undefined) details.push(`    Desired Nodes: ${metadata.desiredNumberScheduled}`);
      if (metadata.numberReady !== undefined) details.push(`    Ready Nodes: ${metadata.numberReady}`);
      if (metadata.restarts !== undefined) details.push(`    Restarts: ${metadata.restarts}`);
      if (metadata.nodeName) details.push(`    Node: ${metadata.nodeName}`);
      if (metadata.containers?.length) details.push(`    Containers: ${metadata.containers.join(', ')}`);
      if (metadata.svcType) details.push(`    Service Type: ${metadata.svcType}`);
      if (metadata.clusterIP) details.push(`    Cluster IP: ${metadata.clusterIP}`);
      if (metadata.ports?.length) {
        const ports = metadata.ports.map((port: any) => `${port.port}/${port.protocol}`).join(', ');
        details.push(`    Ports: ${ports}`);
      }
      if (metadata.hosts?.length) details.push(`    Hosts: ${metadata.hosts.join(', ')}`);
      if (metadata.lbHostnames?.length) details.push(`    Load Balancers: ${metadata.lbHostnames.join(', ')}`);
      if (metadata.secretType) details.push(`    Secret Type: ${metadata.secretType}`);
      if (metadata.dataKeys?.length) details.push(`    Data Keys: ${metadata.dataKeys.join(', ')}`);
      if (metadata.storageClass) details.push(`    Storage Class: ${metadata.storageClass}`);
      if (metadata.capacity) details.push(`    Capacity: ${metadata.capacity}`);
      if (metadata.accessModes?.length) details.push(`    Access Modes: ${metadata.accessModes.join(', ')}`);
      if (metadata.nodeRole) details.push(`    Node Role: ${metadata.nodeRole}`);
      if (metadata.kubernetesVersion) details.push(`    Kubernetes Version: ${metadata.kubernetesVersion}`);
      if (metadata.osImage) details.push(`    OS Image: ${metadata.osImage}`);
      if (metadata.cpuCapacity) details.push(`    CPU Capacity: ${metadata.cpuCapacity}`);
      if (metadata.memoryCapacity) details.push(`    Memory Capacity: ${metadata.memoryCapacity}`);
      if (metadata.completions !== undefined) details.push(`    Completions: ${metadata.succeeded ?? 0}/${metadata.completions}`);
      if (metadata.failed !== undefined) details.push(`    Failed: ${metadata.failed}`);
      if (metadata.active !== undefined) details.push(`    Active: ${metadata.active}`);
      if (metadata.schedule) details.push(`    Schedule: ${metadata.schedule}`);
      if (metadata.lastScheduleTime) details.push(`    Last Scheduled: ${metadata.lastScheduleTime}`);

      lines.push(details.join('\n'));
    }
    lines.push('');
  }

  const nodeIds = new Set(nodes.map(node => node.id));
  const relatedEdges = graphData.edges.filter(edge => nodeIds.has(edge.source) || nodeIds.has(edge.target));
  if (relatedEdges.length > 0) {
    lines.push(`Relationships (${relatedEdges.length}):`);
    for (const edge of relatedEdges.slice(0, 50)) {
      const source = graphData.nodes.find(node => node.id === edge.source);
      const target = graphData.nodes.find(node => node.id === edge.target);
      lines.push(`  - ${source?.label || edge.source} ${edge.label || 'connects to'} ${target?.label || edge.target}`);
    }
  }

  return lines.join('\n');
}

function buildRefusalMessage(intent: K8sIntentAnalysisResult): string {
  const unavailableFields = intent.unavailableFields || [];

  let message = "I don't have access to ";
  if (unavailableFields.length > 0) {
    message += unavailableFields.join(', ');
    message += ' for this scanned Kubernetes namespace. ';
  } else {
    message += 'that type of live Kubernetes data. ';
  }

  message += '\n\n';

  if (intent.resourceTypes.length > 0) {
    message += 'However, I can help you with:\n\n';
    message += getAvailableK8sFieldsMessage(intent.resourceTypes);
  } else {
    message += 'I can help you with cached Kubernetes configuration and metadata such as:\n';
    message += '• Resource counts and lists\n';
    message += '• Replica and readiness status\n';
    message += '• Images, ports, selectors, and ingress hosts\n';
    message += '• Node roles and capacity metadata\n';
    message += '• Relationships between ingresses, services, workloads, and pods\n';
  }

  message += '\n\nWould you like to ask about one of those instead?';
  return message;
}

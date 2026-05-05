import type { GraphData, InfraNode } from '../aws/types.js';
import type { IntentAnalysisResult } from './types.js';
import { RESOURCE_SCHEMAS, getAvailableFieldsMessage } from './types.js';

export function buildContext(
  graphData: GraphData,
  intent: IntentAnalysisResult
): { context: string; isRefusal: boolean; refusalMessage?: string } {
  // If question is not answerable, build refusal message
  if (!intent.isAnswerable) {
    const refusalMessage = buildRefusalMessage(intent);
    return {
      context: '',
      isRefusal: true,
      refusalMessage
    };
  }

  // Filter nodes based on resource types from intent
  let relevantNodes: InfraNode[] = graphData.nodes;

  if (intent.resourceTypes.length > 0) {
    relevantNodes = graphData.nodes.filter(node =>
      (intent.resourceTypes as string[]).includes(node.type)
    );
  }

  // Apply additional filters if specified
  if (intent.filters) {
    relevantNodes = applyFilters(relevantNodes, intent.filters);
  }

  // Build context string with only relevant resource information
  const context = buildContextString(relevantNodes, intent);

  return {
    context,
    isRefusal: false
  };
}

function applyFilters(nodes: InfraNode[], filters: any): InfraNode[] {
  let filtered = nodes;

  // Filter by missing tags
  if (filters.missingTag) {
    filtered = filtered.filter(node => {
      const tags = node.tags || {};
      return Object.keys(tags).length === 0;
    });
  }

  // Filter by having tags
  if (filters.hasTag && !filters.missingTag) {
    filtered = filtered.filter(node => {
      const tags = node.tags || {};
      return Object.keys(tags).length > 0;
    });
  }

  // Filter by status
  if (filters.status) {
    filtered = filtered.filter(node =>
      node.status?.toLowerCase().includes(filters.status.toLowerCase())
    );
  }

  // Filter by manual/managed
  if (filters.isManual !== undefined) {
    filtered = filtered.filter(node => node.isManual === filters.isManual);
  }

  return filtered;
}

function buildContextString(nodes: InfraNode[], intent: IntentAnalysisResult): string {
  if (nodes.length === 0) {
    return 'No resources found matching the query criteria.';
  }

  const contextParts: string[] = [];
  contextParts.push(`Total resources found: ${nodes.length}`);
  contextParts.push('');

  // Group by resource type
  const nodesByType = new Map<string, InfraNode[]>();
  for (const node of nodes) {
    if (!nodesByType.has(node.type)) {
      nodesByType.set(node.type, []);
    }
    nodesByType.get(node.type)!.push(node);
  }

  // Build detailed context for each resource type
  for (const [type, typeNodes] of nodesByType.entries()) {
    contextParts.push(`${type.toUpperCase()} Resources (${typeNodes.length}):`);
    
    for (const node of typeNodes) {
      const nodeInfo: string[] = [];
      nodeInfo.push(`  - ${node.label} (${node.id})`);
      nodeInfo.push(`    Status: ${node.status}`);
      nodeInfo.push(`    Managed: ${node.isManual ? 'Manual' : 'IaC (Terraform/CloudFormation)'}`);

      // Add relevant metadata based on resource type
      const metadata = node.metadata || {};
      
      // Common fields
      if (metadata.instanceType) nodeInfo.push(`    Type: ${metadata.instanceType}`);
      if (metadata.instanceClass) nodeInfo.push(`    Class: ${metadata.instanceClass}`);
      if (metadata.runtime) nodeInfo.push(`    Runtime: ${metadata.runtime}`);
      if (metadata.engine) nodeInfo.push(`    Engine: ${metadata.engine}`);
      if (metadata.vpcId) nodeInfo.push(`    VPC: ${metadata.vpcId}`);
      if (metadata.availabilityZone) nodeInfo.push(`    AZ: ${metadata.availabilityZone}`);
      if (metadata.memorySize) nodeInfo.push(`    Memory: ${metadata.memorySize}MB`);
      if (metadata.timeout) nodeInfo.push(`    Timeout: ${metadata.timeout}s`);
      if (metadata.endpoint) nodeInfo.push(`    Endpoint: ${metadata.endpoint}`);
      if (metadata.domainName) nodeInfo.push(`    Domain: ${metadata.domainName}`);
      if (metadata.webAclId) nodeInfo.push(`    WAF: ${metadata.webAclId}`);
      if (metadata.origins && Array.isArray(metadata.origins)) {
        nodeInfo.push(`    Origins: ${metadata.origins.join(', ')}`);
      }
      
      // Tags
      const tags = node.tags || {};
      const tagCount = Object.keys(tags).length;
      if (tagCount > 0) {
        const tagStrings = Object.entries(tags)
          .slice(0, 5)
          .map(([k, v]) => `${k}=${v}`);
        nodeInfo.push(`    Tags (${tagCount}): ${tagStrings.join(', ')}${tagCount > 5 ? '...' : ''}`);
      } else {
        nodeInfo.push(`    Tags: None`);
      }

      contextParts.push(nodeInfo.join('\n'));
    }
    contextParts.push('');
  }

  return contextParts.join('\n');
}

function buildRefusalMessage(intent: IntentAnalysisResult): string {
  const unavailableFields = intent.unavailableFields || [];
  
  let message = "I don't have access to ";
  
  if (unavailableFields.length > 0) {
    message += unavailableFields.join(', ');
    message += ' for your infrastructure resources. ';
  } else {
    message += 'that type of information. ';
  }

  message += '\n\n';

  // Suggest what information IS available
  if (intent.resourceTypes.length > 0) {
    message += 'However, I can help you with:\n\n';
    message += getAvailableFieldsMessage(intent.resourceTypes);
  } else {
    message += 'I can help you with configuration and metadata information about your AWS resources, such as:\n';
    message += '• Resource counts and lists\n';
    message += '• Configuration details (instance types, runtime, etc.)\n';
    message += '• Network settings (VPCs, subnets, IPs)\n';
    message += '• Tags and management status\n';
    message += '• Resource relationships\n';
  }

  message += '\n\nWould you like to know about any of these aspects instead?';

  return message;
}

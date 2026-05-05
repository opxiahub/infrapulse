import type { AwsResourceType } from '../aws/resource-registry.js';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface ChatRequest {
  message: string;
  sourceType?: 'aws' | 'gcp' | 'azure' | 'k8s';
  providerId?: number;
  clusterId?: number;
  namespace?: string;
  conversationHistory?: ChatMessage[];
}

export interface ChatResponse {
  response: string;
  timestamp: string;
}

export interface IntentAnalysisResult {
  resourceTypes: AwsResourceType[];
  queryType: 'count' | 'list' | 'filter' | 'info' | 'general';
  filters?: {
    tags?: boolean;
    status?: string;
    hasTag?: boolean;
    missingTag?: boolean;
    [key: string]: any;
  };
  isAnswerable: boolean;
  unavailableFields?: string[];
  reason?: string;
}

export interface ResourceSchema {
  queryable: string[];
  notAvailable: string[];
  description: string;
}

export const RESOURCE_SCHEMAS: Record<string, ResourceSchema> = {
  ec2: {
    queryable: [
      'instanceId', 'instanceType', 'status', 'availabilityZone',
      'vpcId', 'subnetId', 'privateIp', 'publicIp', 'tags',
      'launchTime', 'isManual', 'securityGroups', 'name'
    ],
    notAvailable: [
      'CPU usage', 'memory usage', 'network metrics', 'performance data',
      'errors', 'logs', 'running processes', 'disk usage'
    ],
    description: 'EC2 instance configuration and network details'
  },
  lambda: {
    queryable: [
      'functionName', 'runtime', 'memorySize', 'timeout', 'handler',
      'codeSize', 'vpcId', 'subnetIds', 'tags', 'lastModified',
      'isManual', 'state', 'referencedBuckets', 'referencedEndpoints'
    ],
    notAvailable: [
      'errors', 'invocation count', 'performance metrics', 'execution logs',
      'concurrent executions', 'throttles', 'error rates'
    ],
    description: 'Lambda function configuration and settings'
  },
  rds: {
    queryable: [
      'dbInstanceId', 'engine', 'engineVersion', 'instanceClass',
      'status', 'vpcId', 'endpoint', 'port', 'multiAZ',
      'storageType', 'allocatedStorage', 'tags', 'isManual',
      'securityGroups', 'name'
    ],
    notAvailable: [
      'connection count', 'query performance', 'CPU usage', 'memory usage',
      'database size', 'active connections', 'slow queries', 'logs'
    ],
    description: 'RDS database configuration and network details'
  },
  s3: {
    queryable: [
      'bucketName', 'creationDate', 'tags', 'name'
    ],
    notAvailable: [
      'object count', 'bucket size', 'storage metrics', 'access patterns',
      'encryption status', 'versioning', 'lifecycle policies', 'permissions'
    ],
    description: 'S3 bucket basic information'
  },
  cloudfront: {
    queryable: [
      'distributionId', 'domainName', 'status', 'enabled/disabled',
      'origins', 'webAclId', 'tags', 'comment', 'name'
    ],
    notAvailable: [
      'traffic metrics', 'cache hit rate', 'errors', 'viewer statistics',
      'bandwidth usage', 'request counts', 'performance data'
    ],
    description: 'CloudFront distribution configuration'
  },
  'api-gateway': {
    queryable: ['name', 'id', 'protocol', 'tags', 'isManual'],
    notAvailable: ['request metrics', 'errors', 'latency', 'cache performance'],
    description: 'API Gateway configuration'
  },
  elb: {
    queryable: ['name', 'dnsName', 'scheme', 'vpcId', 'type', 'tags', 'isManual'],
    notAvailable: ['traffic metrics', 'health check status', 'active connections'],
    description: 'Load balancer configuration'
  },
  elasticache: {
    queryable: ['clusterId', 'engine', 'nodeType', 'status', 'tags', 'isManual'],
    notAvailable: ['cache hits/misses', 'CPU usage', 'memory usage', 'connections'],
    description: 'ElastiCache cluster configuration'
  },
  vpc: {
    queryable: ['vpcId', 'cidrBlock', 'tags', 'isManual'],
    notAvailable: ['network traffic', 'flow logs data'],
    description: 'VPC configuration'
  },
  subnet: {
    queryable: ['subnetId', 'vpcId', 'cidrBlock', 'availabilityZone', 'tags', 'isManual'],
    notAvailable: ['network traffic', 'available IP count'],
    description: 'Subnet configuration'
  }
};

export function getAvailableFieldsMessage(resourceTypes: AwsResourceType[]): string {
  const schemas = resourceTypes.map(type => RESOURCE_SCHEMAS[type]).filter(Boolean);
  if (schemas.length === 0) return '';
  
  const messages: string[] = [];
  resourceTypes.forEach(type => {
    const schema = RESOURCE_SCHEMAS[type];
    if (schema) {
      messages.push(`**${type.toUpperCase()}**: ${schema.description}\nAvailable: ${schema.queryable.slice(0, 8).join(', ')}${schema.queryable.length > 8 ? ', ...' : ''}`);
    }
  });
  
  return messages.join('\n\n');
}

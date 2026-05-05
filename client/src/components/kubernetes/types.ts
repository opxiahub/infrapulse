export interface K8sDeployment {
  name: string;
  namespace: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  createdAt: string;
  replicas: number;
  readyReplicas: number;
  image: string;
}

export interface K8sPod {
  name: string;
  namespace: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  createdAt: string;
  phase: string;
  restarts: number;
  nodeName: string;
  containers: string[];
}

export interface K8sService {
  name: string;
  namespace: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  createdAt: string;
  type: string;
  clusterIP: string;
  ports: Array<{ port: number; targetPort: string | number; protocol: string; nodePort?: number }>;
}

export interface K8sIngress {
  name: string;
  namespace: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  createdAt: string;
  hosts: string[];
  rules: Array<{ host: string; paths: Array<{ path: string; backend: string }> }>;
}

export interface K8sSecret {
  name: string;
  namespace: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  createdAt: string;
  type: string;
}

export interface ResourceData {
  deployments: K8sDeployment[];
  pods: K8sPod[];
  services: K8sService[];
  ingresses: K8sIngress[];
  secrets: K8sSecret[];
}

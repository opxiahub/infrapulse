import type { K8sClients } from './client.js';
import type { K8sDeployment, K8sPod, K8sService, K8sIngress, K8sSecret, K8sStatefulSet, K8sDaemonSet, K8sConfigMap, K8sPersistentVolumeClaim, K8sClusterNode, K8sJob, K8sCronJob, EnvVar } from './types.js';

export async function listNamespaces(clients: K8sClients): Promise<string[]> {
  const res = await clients.coreV1.listNamespace();
  return (res.items || []).map((ns: any) => ns.metadata?.name ?? '').filter(Boolean);
}

export async function listDeployments(clients: K8sClients, namespace: string): Promise<K8sDeployment[]> {
  const res = await clients.appsV1.listNamespacedDeployment({ namespace });
  return (res.items || []).map((d: any) => ({
    name: d.metadata?.name ?? '',
    namespace,
    labels: d.metadata?.labels ?? {},
    annotations: d.metadata?.annotations ?? {},
    createdAt: d.metadata?.creationTimestamp ?? '',
    replicas: d.spec?.replicas ?? 0,
    readyReplicas: d.status?.readyReplicas ?? 0,
    unavailableReplicas: d.status?.unavailableReplicas ?? 0,
    updatedReplicas: d.status?.updatedReplicas ?? 0,
    image: d.spec?.template?.spec?.containers?.[0]?.image ?? '',
    podLabels: d.spec?.template?.metadata?.labels ?? {},
  }));
}

export async function listPods(clients: K8sClients, namespace: string): Promise<K8sPod[]> {
  const res = await clients.coreV1.listNamespacedPod({ namespace });
  return (res.items || []).map((p: any) => {
    const restarts = (p.status?.containerStatuses ?? []).reduce(
      (sum: number, cs: any) => sum + (cs.restartCount ?? 0),
      0
    );
    return {
      name: p.metadata?.name ?? '',
      namespace,
      labels: p.metadata?.labels ?? {},
      annotations: p.metadata?.annotations ?? {},
      createdAt: p.metadata?.creationTimestamp ?? '',
      phase: p.status?.phase ?? 'Unknown',
      restarts,
      nodeName: p.spec?.nodeName ?? '',
      containers: (p.spec?.containers ?? []).map((c: any) => c.name),
    };
  });
}

export async function listServices(clients: K8sClients, namespace: string): Promise<K8sService[]> {
  const res = await clients.coreV1.listNamespacedService({ namespace });
  return (res.items || []).map((s: any) => ({
    name: s.metadata?.name ?? '',
    namespace,
    labels: s.metadata?.labels ?? {},
    annotations: s.metadata?.annotations ?? {},
    createdAt: s.metadata?.creationTimestamp ?? '',
    type: s.spec?.type ?? 'ClusterIP',
    clusterIP: s.spec?.clusterIP ?? '',
    ports: (s.spec?.ports ?? []).map((p: any) => ({
      port: p.port,
      targetPort: p.targetPort,
      protocol: p.protocol,
      nodePort: p.nodePort,
    })),
    selector: s.spec?.selector ?? {},
  }));
}

export async function listIngresses(clients: K8sClients, namespace: string): Promise<K8sIngress[]> {
  const res = await clients.networkingV1.listNamespacedIngress({ namespace });
  return (res.items || []).map((i: any) => {
    const rules = (i.spec?.rules ?? []).map((r: any) => ({
      host: r.host ?? '',
      paths: (r.http?.paths ?? []).map((p: any) => ({
        path: p.path ?? '/',
        backend: p.backend?.service
          ? `${p.backend.service.name}:${p.backend.service.port?.number ?? p.backend.service.port?.name}`
          : '',
      })),
    }));
    const lbHostnames: string[] = (i.status?.loadBalancer?.ingress ?? [])
      .map((lb: any) => lb.hostname || lb.ip)
      .filter(Boolean);
    return {
      name: i.metadata?.name ?? '',
      namespace,
      labels: i.metadata?.labels ?? {},
      annotations: i.metadata?.annotations ?? {},
      createdAt: i.metadata?.creationTimestamp ?? '',
      hosts: rules.map((r: any) => r.host).filter(Boolean),
      lbHostnames,
      rules,
    };
  });
}

export async function listSecrets(clients: K8sClients, namespace: string): Promise<K8sSecret[]> {
  const res = await clients.coreV1.listNamespacedSecret({ namespace });
  return (res.items || []).map((s: any) => ({
    name: s.metadata?.name ?? '',
    namespace,
    labels: s.metadata?.labels ?? {},
    annotations: s.metadata?.annotations ?? {},
    createdAt: s.metadata?.creationTimestamp ?? '',
    type: s.type ?? '',
  }));
}

export async function listStatefulSets(clients: K8sClients, namespace: string): Promise<K8sStatefulSet[]> {
  const res = await clients.appsV1.listNamespacedStatefulSet({ namespace });
  return (res.items || []).map((s: any) => ({
    name: s.metadata?.name ?? '',
    namespace,
    labels: s.metadata?.labels ?? {},
    annotations: s.metadata?.annotations ?? {},
    createdAt: s.metadata?.creationTimestamp ?? '',
    replicas: s.spec?.replicas ?? 0,
    readyReplicas: s.status?.readyReplicas ?? 0,
    image: s.spec?.template?.spec?.containers?.[0]?.image ?? '',
    podLabels: s.spec?.template?.metadata?.labels ?? {},
  }));
}

export async function listDaemonSets(clients: K8sClients, namespace: string): Promise<K8sDaemonSet[]> {
  const res = await clients.appsV1.listNamespacedDaemonSet({ namespace });
  return (res.items || []).map((d: any) => ({
    name: d.metadata?.name ?? '',
    namespace,
    labels: d.metadata?.labels ?? {},
    annotations: d.metadata?.annotations ?? {},
    createdAt: d.metadata?.creationTimestamp ?? '',
    desiredNumberScheduled: d.status?.desiredNumberScheduled ?? 0,
    numberReady: d.status?.numberReady ?? 0,
    numberMisscheduled: d.status?.numberMisscheduled ?? 0,
    image: d.spec?.template?.spec?.containers?.[0]?.image ?? '',
  }));
}

export async function listConfigMaps(clients: K8sClients, namespace: string): Promise<K8sConfigMap[]> {
  const res = await clients.coreV1.listNamespacedConfigMap({ namespace });
  return (res.items || []).map((cm: any) => ({
    name: cm.metadata?.name ?? '',
    namespace,
    labels: cm.metadata?.labels ?? {},
    annotations: cm.metadata?.annotations ?? {},
    createdAt: cm.metadata?.creationTimestamp ?? '',
    dataKeys: Object.keys(cm.data ?? {}),
  }));
}

export async function listPersistentVolumeClaims(clients: K8sClients, namespace: string): Promise<K8sPersistentVolumeClaim[]> {
  const res = await clients.coreV1.listNamespacedPersistentVolumeClaim({ namespace });
  return (res.items || []).map((pvc: any) => ({
    name: pvc.metadata?.name ?? '',
    namespace,
    labels: pvc.metadata?.labels ?? {},
    annotations: pvc.metadata?.annotations ?? {},
    createdAt: pvc.metadata?.creationTimestamp ?? '',
    phase: pvc.status?.phase ?? 'Unknown',
    storageClass: pvc.spec?.storageClassName ?? '',
    capacity: pvc.status?.capacity?.storage ?? '',
    accessModes: pvc.spec?.accessModes ?? [],
  }));
}

export async function listK8sNodes(clients: K8sClients): Promise<K8sClusterNode[]> {
  const res = await clients.coreV1.listNode();
  return (res.items || []).map((n: any) => {
    const roles = Object.keys(n.metadata?.labels ?? {})
      .filter((k: string) => k.startsWith('node-role.kubernetes.io/'))
      .map((k: string) => k.replace('node-role.kubernetes.io/', ''));
    const readyCondition = (n.status?.conditions ?? []).find((c: any) => c.type === 'Ready');
    return {
      name: n.metadata?.name ?? '',
      namespace: '',
      labels: n.metadata?.labels ?? {},
      annotations: n.metadata?.annotations ?? {},
      createdAt: n.metadata?.creationTimestamp ?? '',
      nodeRole: roles.join(',') || 'worker',
      osImage: n.status?.nodeInfo?.osImage ?? '',
      kubernetesVersion: n.status?.nodeInfo?.kubeletVersion ?? '',
      cpuCapacity: n.status?.capacity?.cpu ?? '',
      memoryCapacity: n.status?.capacity?.memory ?? '',
      ready: readyCondition?.status === 'True',
    };
  });
}

export async function listJobs(clients: K8sClients, namespace: string): Promise<K8sJob[]> {
  const res = await clients.batchV1.listNamespacedJob({ namespace });
  return (res.items || []).map((j: any) => ({
    name: j.metadata?.name ?? '',
    namespace,
    labels: j.metadata?.labels ?? {},
    annotations: j.metadata?.annotations ?? {},
    createdAt: j.metadata?.creationTimestamp ?? '',
    completions: j.spec?.completions ?? 1,
    succeeded: j.status?.succeeded ?? 0,
    failed: j.status?.failed ?? 0,
    active: j.status?.active ?? 0,
  }));
}

export async function listCronJobs(clients: K8sClients, namespace: string): Promise<K8sCronJob[]> {
  const res = await clients.batchV1.listNamespacedCronJob({ namespace });
  return (res.items || []).map((cj: any) => ({
    name: cj.metadata?.name ?? '',
    namespace,
    labels: cj.metadata?.labels ?? {},
    annotations: cj.metadata?.annotations ?? {},
    createdAt: cj.metadata?.creationTimestamp ?? '',
    schedule: cj.spec?.schedule ?? '',
    lastScheduleTime: cj.status?.lastScheduleTime ?? '',
    active: (cj.status?.active ?? []).length,
  }));
}

export async function getDeploymentEnvVars(
  clients: K8sClients,
  namespace: string,
  deploymentName: string
): Promise<EnvVar[]> {
  const res = await clients.appsV1.readNamespacedDeployment({ name: deploymentName, namespace });
  const containers = res.spec?.template?.spec?.containers ?? [];
  const envVars: EnvVar[] = [];

  for (const container of containers) {
    for (const env of container.env ?? []) {
      if (env.valueFrom) {
        let valueFrom = '';
        if (env.valueFrom.secretKeyRef) {
          valueFrom = `secretKeyRef: ${env.valueFrom.secretKeyRef.name}/${env.valueFrom.secretKeyRef.key}`;
        } else if (env.valueFrom.configMapKeyRef) {
          valueFrom = `configMapKeyRef: ${env.valueFrom.configMapKeyRef.name}/${env.valueFrom.configMapKeyRef.key}`;
        } else if (env.valueFrom.fieldRef) {
          valueFrom = `fieldRef: ${env.valueFrom.fieldRef.fieldPath}`;
        } else if (env.valueFrom.resourceFieldRef) {
          valueFrom = `resourceFieldRef: ${env.valueFrom.resourceFieldRef.resource}`;
        }
        envVars.push({ name: env.name, valueFrom });
      } else {
        envVars.push({ name: env.name, value: env.value ?? '' });
      }
    }
  }

  return envVars;
}

interface GraphNode {
  id: string;
  type: string;
  label: string;
  status: string;
  isManual: boolean;
  metadata: Record<string, any>;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

export interface KubernetesGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

type RawData = Record<string, any[]>;

export function buildKubernetesGraphData(raw: RawData, clusterId: number, namespace: string): KubernetesGraphData {
  const nodes: KubernetesGraphData['nodes'] = [];
  const edges: KubernetesGraphData['edges'] = [];

  const deployments = raw['k8s-deployment'] || [];
  const pods = raw['k8s-pod'] || [];
  const services = raw['k8s-service'] || [];
  const ingresses = raw['k8s-ingress'] || [];
  const secrets = raw['k8s-secret'] || [];
  const configmaps = raw['k8s-configmap'] || [];
  const statefulsets = raw['k8s-statefulset'] || [];
  const daemonsets = raw['k8s-daemonset'] || [];
  const pvcs = raw['k8s-pvc'] || [];
  const k8sNodes = raw['k8s-node'] || [];
  const jobs = raw['k8s-job'] || [];
  const cronjobs = raw['k8s-cronjob'] || [];

  for (const d of deployments) {
    nodes.push({
      id: `kd-${d.name}`,
      type: 'k8s-deployment',
      label: d.name,
      status: `${d.readyReplicas}/${d.replicas}`,
      isManual: false,
      metadata: {
        clusterId,
        namespace,
        replicas: d.replicas,
        readyReplicas: d.readyReplicas,
        unavailableReplicas: d.unavailableReplicas ?? 0,
        updatedReplicas: d.updatedReplicas ?? 0,
        image: d.image,
        createdAt: d.createdAt,
        podLabels: d.podLabels || {},
      },
    });
  }

  for (const s of statefulsets) {
    nodes.push({
      id: `kss-${s.name}`,
      type: 'k8s-statefulset',
      label: s.name,
      status: `${s.readyReplicas}/${s.replicas}`,
      isManual: false,
      metadata: {
        clusterId,
        namespace,
        replicas: s.replicas,
        readyReplicas: s.readyReplicas,
        image: s.image,
        createdAt: s.createdAt,
        podLabels: s.podLabels || {},
      },
    });
  }

  for (const d of daemonsets) {
    nodes.push({
      id: `kds-${d.name}`,
      type: 'k8s-daemonset',
      label: d.name,
      status: `${d.numberReady}/${d.desiredNumberScheduled}`,
      isManual: false,
      metadata: {
        clusterId,
        namespace,
        desiredNumberScheduled: d.desiredNumberScheduled,
        numberReady: d.numberReady,
        numberMisscheduled: d.numberMisscheduled,
        image: d.image,
        createdAt: d.createdAt,
      },
    });
  }

  for (const p of pods) {
    nodes.push({
      id: `kp-${p.name}`,
      type: 'k8s-pod',
      label: p.name,
      status: p.phase,
      isManual: false,
      metadata: {
        clusterId,
        namespace,
        restarts: p.restarts,
        nodeName: p.nodeName,
        containers: p.containers,
        createdAt: p.createdAt,
      },
    });
  }

  for (const j of jobs) {
    nodes.push({
      id: `kj-${j.name}`,
      type: 'k8s-job',
      label: j.name,
      status: j.succeeded >= j.completions ? 'Complete' : j.failed > 0 ? 'Failed' : 'Running',
      isManual: false,
      metadata: {
        clusterId,
        namespace,
        completions: j.completions,
        succeeded: j.succeeded,
        failed: j.failed,
        active: j.active,
        createdAt: j.createdAt,
      },
    });
  }

  for (const cj of cronjobs) {
    nodes.push({
      id: `kcj-${cj.name}`,
      type: 'k8s-cronjob',
      label: cj.name,
      status: 'active',
      isManual: false,
      metadata: {
        clusterId,
        namespace,
        schedule: cj.schedule,
        lastScheduleTime: cj.lastScheduleTime,
        active: cj.active,
        createdAt: cj.createdAt,
      },
    });
  }

  for (const s of services) {
    nodes.push({
      id: `ks-${s.name}`,
      type: 'k8s-service',
      label: s.name,
      status: 'active',
      isManual: false,
      metadata: {
        clusterId,
        namespace,
        svcType: s.type,
        clusterIP: s.clusterIP,
        ports: s.ports,
        selector: s.selector || {},
        createdAt: s.createdAt,
      },
    });
  }

  for (const i of ingresses) {
    nodes.push({
      id: `ki-${i.name}`,
      type: 'k8s-ingress',
      label: i.name,
      status: 'active',
      isManual: false,
      metadata: {
        clusterId,
        namespace,
        hosts: i.hosts,
        lbHostnames: i.lbHostnames || [],
        rules: i.rules,
        annotations: i.annotations || {},
        createdAt: i.createdAt,
      },
    });
  }

  for (const s of secrets) {
    nodes.push({
      id: `kse-${s.name}`,
      type: 'k8s-secret',
      label: s.name,
      status: 'active',
      isManual: false,
      metadata: {
        clusterId,
        namespace,
        secretType: s.type,
        createdAt: s.createdAt,
      },
    });
  }

  for (const cm of configmaps) {
    nodes.push({
      id: `kcm-${cm.name}`,
      type: 'k8s-configmap',
      label: cm.name,
      status: 'active',
      isManual: false,
      metadata: {
        clusterId,
        namespace,
        dataKeys: cm.dataKeys || [],
        createdAt: cm.createdAt,
      },
    });
  }

  for (const pvc of pvcs) {
    nodes.push({
      id: `kpvc-${pvc.name}`,
      type: 'k8s-pvc',
      label: pvc.name,
      status: pvc.phase,
      isManual: false,
      metadata: {
        clusterId,
        namespace,
        phase: pvc.phase,
        storageClass: pvc.storageClass,
        capacity: pvc.capacity,
        accessModes: pvc.accessModes,
        createdAt: pvc.createdAt,
      },
    });
  }

  for (const n of k8sNodes) {
    nodes.push({
      id: `kn-${n.name}`,
      type: 'k8s-node',
      label: n.name,
      status: n.ready ? 'Ready' : 'NotReady',
      isManual: false,
      metadata: {
        clusterId,
        namespace,
        nodeRole: n.nodeRole,
        osImage: n.osImage,
        kubernetesVersion: n.kubernetesVersion,
        cpuCapacity: n.cpuCapacity,
        memoryCapacity: n.memoryCapacity,
        ready: n.ready,
        createdAt: n.createdAt,
      },
    });
  }

  for (const d of deployments) {
    for (const p of pods) {
      if (p.name.startsWith(`${d.name}-`)) {
        edges.push({
          id: `e-kd-${d.name}-kp-${p.name}`,
          source: `kd-${d.name}`,
          target: `kp-${p.name}`,
          label: 'owns',
          animated: true,
        });
      }
    }
  }

  for (const s of statefulsets) {
    for (const p of pods) {
      if (p.name.startsWith(`${s.name}-`)) {
        edges.push({
          id: `e-kss-${s.name}-kp-${p.name}`,
          source: `kss-${s.name}`,
          target: `kp-${p.name}`,
          label: 'owns',
          animated: true,
        });
      }
    }
  }

  for (const d of daemonsets) {
    for (const p of pods) {
      if (p.name.startsWith(`${d.name}-`)) {
        edges.push({
          id: `e-kds-${d.name}-kp-${p.name}`,
          source: `kds-${d.name}`,
          target: `kp-${p.name}`,
          label: 'owns',
          animated: true,
        });
      }
    }
  }

  for (const s of services) {
    if (!s.selector || Object.keys(s.selector).length === 0) continue;

    const matchesLabels = (podLabels: Record<string, string>) =>
      Object.entries(s.selector).every(([key, value]) => podLabels[key] === value);

    for (const d of deployments) {
      if (matchesLabels(d.podLabels || {})) {
        edges.push({
          id: `e-ks-${s.name}-kd-${d.name}`,
          source: `ks-${s.name}`,
          target: `kd-${d.name}`,
          label: 'routes to',
          animated: true,
        });
      }
    }

    for (const ss of statefulsets) {
      if (matchesLabels(ss.podLabels || {})) {
        edges.push({
          id: `e-ks-${s.name}-kss-${ss.name}`,
          source: `ks-${s.name}`,
          target: `kss-${ss.name}`,
          label: 'routes to',
          animated: true,
        });
      }
    }
  }

  for (const i of ingresses) {
    const linked = new Set<string>();
    for (const rule of i.rules || []) {
      for (const path of rule.paths || []) {
        const svcName = path.backend?.split(':')[0];
        if (svcName && !linked.has(svcName) && services.find(service => service.name === svcName)) {
          linked.add(svcName);
          edges.push({
            id: `e-ki-${i.name}-ks-${svcName}`,
            source: `ki-${i.name}`,
            target: `ks-${svcName}`,
            label: 'exposes',
            animated: false,
          });
        }
      }
    }
  }

  return { nodes, edges };
}

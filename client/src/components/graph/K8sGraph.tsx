import { useMemo, useEffect, useCallback, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { GroupNode } from './nodes/GroupNode';
import { K8sDeploymentNode } from './nodes/K8sDeploymentNode';
import { K8sPodNode } from './nodes/K8sPodNode';
import { K8sServiceNode } from './nodes/K8sServiceNode';
import { K8sIngressNode } from './nodes/K8sIngressNode';
import { K8sSecretNode } from './nodes/K8sSecretNode';
import { K8sStatefulSetNode } from './nodes/K8sStatefulSetNode';
import { K8sDaemonSetNode } from './nodes/K8sDaemonSetNode';
import { K8sConfigMapNode } from './nodes/K8sConfigMapNode';
import { K8sPvcNode } from './nodes/K8sPvcNode';
import { K8sClusterNodeWidget } from './nodes/K8sClusterNodeWidget';
import { K8sJobNode } from './nodes/K8sJobNode';
import { K8sCronJobNode } from './nodes/K8sCronJobNode';
import { PulseEdge } from './PulseEdge';
import { K8sNodeDetailPanel } from './K8sNodeDetailPanel';
import { getK8sResourceConfig } from '../../config/k8s-resources';
import type { GraphData } from '../../hooks/useGraph';

const k8sNodeTypes: Record<string, any> = {
  resourceGroup: GroupNode,
  'k8s-deployment':  K8sDeploymentNode,
  'k8s-pod':         K8sPodNode,
  'k8s-service':     K8sServiceNode,
  'k8s-ingress':     K8sIngressNode,
  'k8s-secret':      K8sSecretNode,
  'k8s-statefulset': K8sStatefulSetNode,
  'k8s-daemonset':   K8sDaemonSetNode,
  'k8s-configmap':   K8sConfigMapNode,
  'k8s-pvc':         K8sPvcNode,
  'k8s-node':        K8sClusterNodeWidget,
  'k8s-job':         K8sJobNode,
  'k8s-cronjob':     K8sCronJobNode,
};

const edgeTypes = { pulse: PulseEdge };

interface Props {
  graphData: GraphData;
  searchQuery: string;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 110;
const NODE_GAP_X = 30;
const NODE_GAP_Y = 30;
const GROUP_PADDING = 50;
const GROUP_HEADER = 40;
const GROUP_GAP = 60;
const NODES_PER_ROW = 3;
const GROUPS_PER_ROW = 3;

function getSearchableValues(node: Node): string[] {
  return [
    node.data?.label,
    node.id,
    ...Object.values(node.data?.metadata || {}).filter(v => typeof v === 'string'),
  ].filter(Boolean).map(v => String(v).toLowerCase());
}

function matchesSearch(node: Node, query: string): boolean {
  if (node.type === 'resourceGroup') return false;
  return getSearchableValues(node).some(v => v.includes(query));
}

function layoutK8sNodes(graphData: GraphData): { nodes: Node[]; edges: Edge[] } {
  const groups: Record<string, typeof graphData.nodes> = {};
  for (const node of graphData.nodes) {
    if (!groups[node.type]) groups[node.type] = [];
    groups[node.type].push(node);
  }

  // Order by groupOrder from K8S_RESOURCES
  const typeOrder = Object.keys(groups).sort((a, b) => {
    const ca = getK8sResourceConfig(a);
    const cb = getK8sResourceConfig(b);
    return (ca?.groupOrder ?? 99) - (cb?.groupOrder ?? 99);
  });

  const nodes: Node[] = [];
  const groupSizes: { width: number; height: number }[] = [];

  for (const type of typeOrder) {
    const group = groups[type];
    const cols = Math.min(group.length, NODES_PER_ROW);
    const rows = Math.ceil(group.length / NODES_PER_ROW);
    groupSizes.push({
      width: cols * (NODE_WIDTH + NODE_GAP_X) - NODE_GAP_X + GROUP_PADDING * 2,
      height: rows * (NODE_HEIGHT + NODE_GAP_Y) - NODE_GAP_Y + GROUP_PADDING + GROUP_HEADER + GROUP_PADDING,
    });
  }

  let currentX = 0;
  let currentY = 0;
  let rowMaxHeight = 0;
  let colInRow = 0;

  typeOrder.forEach((type, i) => {
    const group = groups[type];
    const config = getK8sResourceConfig(type);
    const size = groupSizes[i];

    if (colInRow >= GROUPS_PER_ROW) {
      currentX = 0;
      currentY += rowMaxHeight + GROUP_GAP;
      rowMaxHeight = 0;
      colInRow = 0;
    }

    const groupId = `k8s-group-${type}`;
    nodes.push({
      id: groupId,
      type: 'resourceGroup',
      position: { x: currentX, y: currentY },
      data: {
        label: config?.label || type,
        color: config?.groupColor || '#6b7280',
        count: group.length,
      },
      style: { width: size.width, height: size.height },
      draggable: true,
      selectable: false,
    });

    group.forEach((node, j) => {
      const col = j % NODES_PER_ROW;
      const row = Math.floor(j / NODES_PER_ROW);
      nodes.push({
        id: node.id,
        type: node.type,
        position: {
          x: GROUP_PADDING + col * (NODE_WIDTH + NODE_GAP_X),
          y: GROUP_HEADER + GROUP_PADDING + row * (NODE_HEIGHT + NODE_GAP_Y),
        },
        parentNode: groupId,
        extent: 'parent' as const,
        data: {
          type: node.type,
          label: node.label,
          status: node.status,
          isManual: node.isManual,
          metadata: node.metadata,
        },
      });
    });

    currentX += size.width + GROUP_GAP;
    rowMaxHeight = Math.max(rowMaxHeight, size.height);
    colInRow++;
  });

  const edges: Edge[] = graphData.edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'pulse',
    data: { label: edge.label, animated: edge.animated !== false },
  }));

  return { nodes, edges };
}

function K8sGraphInner({ graphData, searchQuery }: Props) {
  const layout = useMemo(() => layoutK8sNodes(graphData), [graphData]);
  const [nodes, setNodes, onNodesChange] = useNodesState(layout.nodes);
  const [edges, , onEdgesChange] = useEdgesState(layout.edges);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const { setCenter } = useReactFlow();
  const lastAutoFocusKeyRef = useRef<string | null>(null);

  const centerNode = useCallback((targetNode: Node, allNodes: Node[]) => {
    const parent = allNodes.find(n => n.id === targetNode.parentNode);
    const absX = (parent?.position?.x || 0) + targetNode.position.x + NODE_WIDTH / 2;
    const absY = (parent?.position?.y || 0) + targetNode.position.y + NODE_HEIGHT / 2;
    setCenter(absX, absY, { zoom: 1.2, duration: 500 });
  }, [setCenter]);

  useEffect(() => {
    setNodes(layoutK8sNodes(graphData).nodes);
  }, [graphData, setNodes]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      lastAutoFocusKeyRef.current = null;
      setNodes(prev => prev.map(n => ({ ...n, style: { ...n.style, opacity: 1 } })));
      return;
    }

    const query = searchQuery.toLowerCase();
    setNodes(prev => prev.map(n => {
      if (n.type === 'resourceGroup') return n;
      const matches = matchesSearch(n, query);
      return { ...n, style: { ...n.style, opacity: matches ? 1 : 0.15 } };
    }));
  }, [searchQuery, setNodes]);

  useEffect(() => {
    if (!searchQuery.trim()) return;

    const query = searchQuery.toLowerCase();
    const autoFocusKey = `${query}::${graphData.nodes.length}::${graphData.edges.length}::${graphData.nodes.map(n => n.id).join('|')}`;
    if (lastAutoFocusKeyRef.current === autoFocusKey) return;

    const match = nodes.find(n => matchesSearch(n, query));

    if (match) {
      centerNode(match, nodes);
      lastAutoFocusKeyRef.current = autoFocusKey;
    }
  }, [searchQuery, graphData, nodes, centerNode]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    if (node.type === 'resourceGroup') return;
    if (searchQuery.trim() && matchesSearch(node, searchQuery.toLowerCase())) {
      centerNode(node, nodes);
    }
    setSelectedNode(node.data);
  }, [searchQuery, nodes, centerNode]);

  const onPaneClick = useCallback(() => setSelectedNode(null), []);

  return (
    <div className="flex h-full">
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={k8sNodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          proOptions={{ hideAttribution: true }}
          minZoom={0.05}
          maxZoom={2}
        >
          <Background color="#1a1a25" gap={20} size={1} />
          <Controls />
          <MiniMap
            nodeColor={(node: Node) => {
              if (node.type === 'resourceGroup') return 'transparent';
              const config = getK8sResourceConfig(node.type || '');
              return config?.groupColor || '#39FF14';
            }}
            maskColor="rgba(0,0,0,0.8)"
          />
        </ReactFlow>
      </div>
      {selectedNode && (
        <K8sNodeDetailPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}

export function K8sGraph(props: Props) {
  return (
    <ReactFlowProvider>
      <K8sGraphInner {...props} />
    </ReactFlowProvider>
  );
}

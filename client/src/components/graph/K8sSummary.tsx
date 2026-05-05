import { getK8sResourceConfig } from '../../config/k8s-resources';
import type { GraphData } from '../../hooks/useGraph';

interface Props {
  graphData: GraphData;
  namespace: string;
}

export function K8sSummary({ graphData, namespace }: Props) {
  const groups: Record<string, GraphData['nodes']> = {};
  for (const node of graphData.nodes) {
    if (!groups[node.type]) groups[node.type] = [];
    groups[node.type].push(node);
  }
  const types = Object.keys(groups);
  if (types.length === 0) return null;

  return (
    <div className="border-b border-surface-600 bg-surface-900/80">
      <div className="flex items-stretch gap-0 overflow-x-auto">
        <div className="flex items-center gap-2 px-4 py-2.5 border-r border-surface-600 shrink-0">
          <span className="text-[10px] text-gray-500">namespace</span>
          <span className="text-[11px] font-mono text-neon-purple">{namespace}</span>
          <span className="text-[10px] text-gray-600 ml-1">{graphData.nodes.length} resources</span>
        </div>
        {types.map(type => {
          const nodes = groups[type];
          const config = getK8sResourceConfig(type);
          const Icon = config?.icon;
          const iconColor = config?.iconColor || 'text-gray-400';
          return (
            <div key={type} className="flex items-center gap-2 px-3 py-2.5 border-r border-surface-600 shrink-0">
              {Icon && <Icon className={`w-3.5 h-3.5 ${iconColor}`} />}
              <span className="text-sm font-bold text-gray-200">{nodes.length}</span>
              <span className="text-[10px] text-gray-500">{config?.label || type}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

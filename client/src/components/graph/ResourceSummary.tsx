import { Shield, AlertTriangle } from 'lucide-react';
import { getCloudResourceConfig, type CloudProvider } from '../../config/cloud-resources';
import type { GraphData } from '../../hooks/useGraph';

interface Props {
  graphData: GraphData;
  cloud?: CloudProvider;
}

export function ResourceSummary({ graphData, cloud = 'aws' }: Props) {
  const groups: Record<string, GraphData['nodes']> = {};
  for (const node of graphData.nodes) {
    if (!groups[node.type]) groups[node.type] = [];
    groups[node.type].push(node);
  }

  const types = Object.keys(groups);
  if (types.length === 0) return null;

  const totalManual = graphData.nodes.filter(n => n.isManual).length;
  const totalManaged = graphData.nodes.filter(n => !n.isManual).length;

  return (
    <div className="border-b border-surface-600 bg-surface-900/80">
      <div className="flex items-stretch gap-0 overflow-x-auto">
        {/* Overall IaC summary */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-r border-surface-600 shrink-0">
          <div className="text-[10px] text-gray-500 mr-1">{graphData.nodes.length} total</div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-neon-green" />
            <span className="text-[11px] text-neon-green font-medium">{totalManaged}</span>
            <span className="text-[10px] text-gray-600">IaC</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-neon-red" />
            <span className="text-[11px] text-neon-red font-medium">{totalManual}</span>
            <span className="text-[10px] text-gray-600">Manual</span>
          </div>
        </div>

        {/* Per-type cards */}
        {types.map(type => {
          const nodes = groups[type];
          const config = getCloudResourceConfig(type, cloud);
          const Icon = config?.icon || Shield;
          const iconColor = config?.iconColor || 'text-gray-400';
          const activeStatuses = config?.activeStatuses || [];

          const activeCount = nodes.filter(n => activeStatuses.includes(n.status)).length;
          const inactiveCount = nodes.length - activeCount;
          const iacCount = nodes.filter(n => !n.isManual).length;
          const manualCount = nodes.filter(n => n.isManual).length;

          return (
            <div key={type} className="flex items-center gap-2.5 px-3 py-2.5 border-r border-surface-600 shrink-0">
              <div className="flex items-center gap-1.5">
                <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                <span className="text-sm font-bold text-gray-200">{nodes.length}</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">{config?.label?.split(' ')[0] || type}</span>
              </div>

              {activeCount > 0 && (
                <span className="flex items-center gap-1 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                  <span className="text-neon-green">{activeCount}</span>
                </span>
              )}
              {inactiveCount > 0 && (
                <span className="flex items-center gap-1 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                  <span className="text-gray-500">{inactiveCount}</span>
                </span>
              )}

              <div className="flex items-center gap-1.5 pl-1.5 border-l border-surface-700">
                {iacCount > 0 && <span className="text-[10px] text-neon-green/70">{iacCount} IaC</span>}
                {manualCount > 0 && <span className="text-[10px] text-neon-red/70">{manualCount} M</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { Handle, Position } from 'reactflow';
import { Box } from 'lucide-react';

interface Props {
  data: {
    label: string;
    status: string;  // "readyReplicas/replicas"
    metadata: Record<string, any>;
  };
}

export function K8sDeploymentNode({ data }: Props) {
  const ready = data.metadata?.readyReplicas ?? 0;
  const total = data.metadata?.replicas ?? 0;
  const unavailable = data.metadata?.unavailableReplicas ?? 0;
  const allReady = total > 0 && ready === total;
  const borderColor = allReady ? 'border-neon-purple/50' : unavailable > 0 ? 'border-neon-red/50' : 'border-yellow-500/50';
  const glowClass = allReady ? 'shadow-[0_0_8px_rgba(188,19,254,0.3)]' : '';

  return (
    <div className={`bg-surface-800 border ${borderColor} ${glowClass} rounded-lg p-3 min-w-[160px]`}>
      <Handle type="target" position={Position.Top} className="!bg-neon-purple !border-0 !w-2 !h-2" />
      <div className="flex items-center gap-2 mb-2">
        <Box className="w-4 h-4 text-neon-purple" />
        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Deploy</span>
        <div className={`w-2 h-2 rounded-full ml-auto ${allReady ? 'bg-neon-purple' : unavailable > 0 ? 'bg-neon-red' : 'bg-yellow-500'}`} />
      </div>
      <div className="text-sm font-medium text-gray-100 truncate">{data.label}</div>

      {/* Pod health summary */}
      <div className="mt-2 flex items-center gap-2 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-neon-green inline-block" />
          <span className="text-neon-green">{ready}</span>
          <span className="text-gray-600">ready</span>
        </span>
        {unavailable > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-red inline-block" />
            <span className="text-neon-red">{unavailable}</span>
            <span className="text-gray-600">unavail</span>
          </span>
        )}
        <span className="text-gray-600 ml-auto">{total} total</span>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-neon-purple !border-0 !w-2 !h-2" />
    </div>
  );
}

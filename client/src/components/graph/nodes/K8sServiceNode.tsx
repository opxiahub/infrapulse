import { Handle, Position } from 'reactflow';
import { Network } from 'lucide-react';

interface Props {
  data: {
    label: string;
    status: string;
    metadata: Record<string, any>;
  };
}

export function K8sServiceNode({ data }: Props) {
  return (
    <div className="bg-surface-800 border border-neon-blue/40 rounded-lg p-3 min-w-[160px]">
      <Handle type="target" position={Position.Top} className="!bg-neon-blue !border-0 !w-2 !h-2" />
      <div className="flex items-center gap-2 mb-2">
        <Network className="w-4 h-4 text-neon-blue" />
        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Service</span>
      </div>
      <div className="text-sm font-medium text-gray-100 truncate">{data.label}</div>
      <div className="text-[10px] text-gray-500 mt-1">{data.metadata?.svcType || 'ClusterIP'}</div>
      <Handle type="source" position={Position.Bottom} className="!bg-neon-blue !border-0 !w-2 !h-2" />
    </div>
  );
}

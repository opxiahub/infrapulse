import { Handle, Position } from 'reactflow';
import { Server } from 'lucide-react';

interface Props {
  data: { label: string; status: string; metadata: Record<string, any> };
}

export function K8sClusterNodeWidget({ data }: Props) {
  const isReady = data.metadata?.ready === true;

  return (
    <div className={`bg-surface-800 border ${isReady ? 'border-gray-400/50' : 'border-neon-red/50'} rounded-lg p-3 min-w-[160px]`}>
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !border-0 !w-2 !h-2" />
      <div className="flex items-center gap-2 mb-2">
        <Server className="w-4 h-4 text-gray-300" />
        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Node</span>
        <div className={`w-2 h-2 rounded-full ml-auto ${isReady ? 'bg-neon-green' : 'bg-neon-red'}`} />
      </div>
      <div className="text-sm font-medium text-gray-100 truncate">{data.label}</div>
      <div className="text-[10px] text-gray-500 mt-1">
        {data.metadata?.nodeRole || 'worker'} · {data.metadata?.kubernetesVersion || ''}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !border-0 !w-2 !h-2" />
    </div>
  );
}

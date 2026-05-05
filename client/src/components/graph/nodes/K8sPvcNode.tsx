import { Handle, Position } from 'reactflow';
import { HardDrive } from 'lucide-react';

interface Props {
  data: { label: string; status: string; metadata: Record<string, any> };
}

export function K8sPvcNode({ data }: Props) {
  const isBound = data.metadata?.phase === 'Bound';

  return (
    <div className={`bg-surface-800 border ${isBound ? 'border-yellow-400/50' : 'border-gray-600'} rounded-lg p-3 min-w-[160px]`}>
      <Handle type="target" position={Position.Top} className="!bg-yellow-400 !border-0 !w-2 !h-2" />
      <div className="flex items-center gap-2 mb-2">
        <HardDrive className="w-4 h-4 text-yellow-400" />
        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">PVC</span>
        <div className={`w-2 h-2 rounded-full ml-auto ${isBound ? 'bg-yellow-400' : 'bg-gray-500'}`} />
      </div>
      <div className="text-sm font-medium text-gray-100 truncate">{data.label}</div>
      <div className="text-[10px] text-gray-500 mt-1">
        {data.metadata?.phase} · {data.metadata?.capacity || '—'}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-yellow-400 !border-0 !w-2 !h-2" />
    </div>
  );
}

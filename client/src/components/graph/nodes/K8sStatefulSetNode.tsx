import { Handle, Position } from 'reactflow';
import { Layers } from 'lucide-react';

interface Props {
  data: { label: string; status: string; metadata: Record<string, any> };
}

export function K8sStatefulSetNode({ data }: Props) {
  const [ready, desired] = (data.status || '0/0').split('/').map(Number);
  const isReady = ready > 0 && ready === desired;
  const borderColor = isReady ? 'border-violet-500/50' : 'border-yellow-500/50';

  return (
    <div className={`bg-surface-800 border ${borderColor} rounded-lg p-3 min-w-[160px]`}>
      <Handle type="target" position={Position.Top} className="!bg-violet-400 !border-0 !w-2 !h-2" />
      <div className="flex items-center gap-2 mb-2">
        <Layers className="w-4 h-4 text-violet-400" />
        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">StatefulSet</span>
        <div className={`w-2 h-2 rounded-full ml-auto ${isReady ? 'bg-violet-400' : 'bg-yellow-500'}`} />
      </div>
      <div className="text-sm font-medium text-gray-100 truncate">{data.label}</div>
      <div className="text-[10px] text-gray-500 mt-1">Replicas: {data.status}</div>
      <Handle type="source" position={Position.Bottom} className="!bg-violet-400 !border-0 !w-2 !h-2" />
    </div>
  );
}

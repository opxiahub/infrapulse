import { Handle, Position } from 'reactflow';
import { Radio } from 'lucide-react';

interface Props {
  data: { label: string; status: string; metadata: Record<string, any> };
}

export function K8sDaemonSetNode({ data }: Props) {
  const desired = data.metadata?.desiredNumberScheduled ?? 0;
  const ready = data.metadata?.numberReady ?? 0;
  const isReady = desired > 0 && ready === desired;

  return (
    <div className={`bg-surface-800 border ${isReady ? 'border-indigo-400/50' : 'border-yellow-500/50'} rounded-lg p-3 min-w-[160px]`}>
      <Handle type="target" position={Position.Top} className="!bg-indigo-400 !border-0 !w-2 !h-2" />
      <div className="flex items-center gap-2 mb-2">
        <Radio className="w-4 h-4 text-indigo-400" />
        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">DaemonSet</span>
        <div className={`w-2 h-2 rounded-full ml-auto ${isReady ? 'bg-indigo-400' : 'bg-yellow-500'}`} />
      </div>
      <div className="text-sm font-medium text-gray-100 truncate">{data.label}</div>
      <div className="text-[10px] text-gray-500 mt-1">{ready}/{desired} nodes ready</div>
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-400 !border-0 !w-2 !h-2" />
    </div>
  );
}

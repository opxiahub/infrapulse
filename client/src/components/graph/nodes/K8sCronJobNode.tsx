import { Handle, Position } from 'reactflow';
import { Clock } from 'lucide-react';

interface Props {
  data: { label: string; status: string; metadata: Record<string, any> };
}

export function K8sCronJobNode({ data }: Props) {
  return (
    <div className="bg-surface-800 border border-lime-300/40 rounded-lg p-3 min-w-[160px]">
      <Handle type="target" position={Position.Top} className="!bg-lime-300 !border-0 !w-2 !h-2" />
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-4 h-4 text-lime-300" />
        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">CronJob</span>
      </div>
      <div className="text-sm font-medium text-gray-100 truncate">{data.label}</div>
      <div className="text-[10px] text-gray-500 mt-1 font-mono">{data.metadata?.schedule || '—'}</div>
      <Handle type="source" position={Position.Bottom} className="!bg-lime-300 !border-0 !w-2 !h-2" />
    </div>
  );
}

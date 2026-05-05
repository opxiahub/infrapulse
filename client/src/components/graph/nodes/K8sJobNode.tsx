import { Handle, Position } from 'reactflow';
import { Briefcase } from 'lucide-react';

interface Props {
  data: { label: string; status: string; metadata: Record<string, any> };
}

export function K8sJobNode({ data }: Props) {
  const succeeded = data.metadata?.succeeded ?? 0;
  const completions = data.metadata?.completions ?? 1;
  const failed = data.metadata?.failed ?? 0;
  const isDone = succeeded >= completions;
  const hasFailed = failed > 0;

  return (
    <div className={`bg-surface-800 border ${isDone ? 'border-lime-400/50' : hasFailed ? 'border-neon-red/50' : 'border-lime-500/30'} rounded-lg p-3 min-w-[160px]`}>
      <Handle type="target" position={Position.Top} className="!bg-lime-400 !border-0 !w-2 !h-2" />
      <div className="flex items-center gap-2 mb-2">
        <Briefcase className="w-4 h-4 text-lime-400" />
        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Job</span>
        <div className={`w-2 h-2 rounded-full ml-auto ${isDone ? 'bg-lime-400' : hasFailed ? 'bg-neon-red' : 'bg-yellow-400'}`} />
      </div>
      <div className="text-sm font-medium text-gray-100 truncate">{data.label}</div>
      <div className="text-[10px] text-gray-500 mt-1">{succeeded}/{completions} completed{failed > 0 ? ` · ${failed} failed` : ''}</div>
      <Handle type="source" position={Position.Bottom} className="!bg-lime-400 !border-0 !w-2 !h-2" />
    </div>
  );
}

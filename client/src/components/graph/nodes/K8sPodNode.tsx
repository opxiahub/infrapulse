import { Handle, Position } from 'reactflow';
import { Cpu } from 'lucide-react';

interface Props {
  data: {
    label: string;
    status: string; // pod phase: Running, Pending, etc.
    metadata: Record<string, any>;
  };
}

export function K8sPodNode({ data }: Props) {
  const isRunning = data.status === 'Running';
  const isFailed = ['Failed', 'CrashLoopBackOff', 'Error'].includes(data.status);
  const borderColor = isRunning ? 'border-neon-green/50' : isFailed ? 'border-neon-red/50' : 'border-yellow-500/50';
  const dotColor = isRunning ? 'bg-neon-green' : isFailed ? 'bg-neon-red' : 'bg-yellow-500';
  const glowClass = isRunning ? 'shadow-neon-green' : '';

  return (
    <div className={`bg-surface-800 border ${borderColor} ${glowClass} rounded-lg p-3 min-w-[160px] node-pulse`}>
      <Handle type="target" position={Position.Top} className="!bg-neon-green !border-0 !w-2 !h-2" />
      <div className="flex items-center gap-2 mb-2">
        <Cpu className="w-4 h-4 text-neon-green" />
        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Pod</span>
        <div className={`w-2 h-2 rounded-full ml-auto ${dotColor}`} />
      </div>
      <div className="text-sm font-medium text-gray-100 truncate">{data.label}</div>
      <div className={`text-[10px] mt-1 ${isRunning ? 'text-neon-green' : isFailed ? 'text-neon-red' : 'text-yellow-400'}`}>
        {data.status}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-neon-green !border-0 !w-2 !h-2" />
    </div>
  );
}

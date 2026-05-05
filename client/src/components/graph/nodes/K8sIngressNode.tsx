import { Handle, Position } from 'reactflow';
import { Globe } from 'lucide-react';

interface Props {
  data: {
    label: string;
    status: string;
    metadata: Record<string, any>;
  };
}

export function K8sIngressNode({ data }: Props) {
  return (
    <div className="bg-surface-800 border border-amber-500/40 rounded-lg p-3 min-w-[160px]">
      <Handle type="target" position={Position.Top} className="!bg-amber-400 !border-0 !w-2 !h-2" />
      <div className="flex items-center gap-2 mb-2">
        <Globe className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Ingress</span>
      </div>
      <div className="text-sm font-medium text-gray-100 truncate">{data.label}</div>
      <div className="text-[10px] text-gray-500 mt-1 truncate">{(data.metadata?.hosts as string[])?.join(', ') || '—'}</div>
      <Handle type="source" position={Position.Bottom} className="!bg-amber-400 !border-0 !w-2 !h-2" />
    </div>
  );
}

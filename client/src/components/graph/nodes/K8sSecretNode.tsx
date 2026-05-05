import { Handle, Position } from 'reactflow';
import { Key } from 'lucide-react';

interface Props {
  data: {
    label: string;
    status: string;
    metadata: Record<string, any>;
  };
}

export function K8sSecretNode({ data }: Props) {
  return (
    <div className="bg-surface-800 border border-rose-500/40 rounded-lg p-3 min-w-[160px]">
      <Handle type="target" position={Position.Top} className="!bg-rose-400 !border-0 !w-2 !h-2" />
      <div className="flex items-center gap-2 mb-2">
        <Key className="w-4 h-4 text-rose-400" />
        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Secret</span>
      </div>
      <div className="text-sm font-medium text-gray-100 truncate">{data.label}</div>
      <div className="text-[10px] text-gray-500 mt-1">{data.metadata?.secretType || 'Opaque'}</div>
      <Handle type="source" position={Position.Bottom} className="!bg-rose-400 !border-0 !w-2 !h-2" />
    </div>
  );
}

import { Handle, Position } from 'reactflow';
import { HardDrive } from 'lucide-react';

interface Props {
  data: {
    label: string;
    status: string;
    isManual: boolean;
    metadata: Record<string, any>;
    metrics?: Record<string, number>;
  };
}

export function S3Node({ data }: Props) {
  const borderColor = data.isManual ? 'border-neon-red/50' : 'border-neon-green/50';
  const glowClass = data.isManual ? 'shadow-neon-red' : 'shadow-neon-green';

  return (
    <div className={`bg-surface-800 border ${borderColor} ${glowClass} rounded-lg p-3 min-w-[160px] node-pulse`}>
      <Handle type="target" position={Position.Top} className="!bg-neon-blue !border-0 !w-2 !h-2" />

      <div className="flex items-center gap-2 mb-2">
        <HardDrive className="w-4 h-4 text-yellow-500" />
        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">S3</span>
        <div className="w-2 h-2 rounded-full ml-auto bg-neon-green" />
      </div>

      <div className="text-sm font-medium text-gray-100 truncate">{data.label}</div>
      <div className="text-[10px] text-gray-500 mt-1">Bucket</div>

      {data.isManual && (
        <div className="mt-2 text-[9px] text-neon-red/80 bg-neon-red/10 rounded px-1 py-0.5 text-center">
          MANUAL RESOURCE
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-neon-blue !border-0 !w-2 !h-2" />
    </div>
  );
}

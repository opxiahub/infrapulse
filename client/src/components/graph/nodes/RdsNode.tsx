import { Handle, Position } from 'reactflow';
import { Database } from 'lucide-react';

interface Props {
  data: {
    label: string;
    status: string;
    isManual: boolean;
    metadata: Record<string, any>;
    metrics?: Record<string, number>;
  };
}

export function RdsNode({ data }: Props) {
  const isAvailable = data.status === 'available';
  const connections = data.metrics?.connections;
  const borderColor = data.isManual
    ? 'border-neon-red/50'
    : isAvailable
    ? 'border-neon-green/50'
    : 'border-gray-600';
  const glowClass = data.isManual ? 'shadow-neon-red' : isAvailable ? 'shadow-neon-green' : '';

  return (
    <div className={`bg-surface-800 border ${borderColor} ${glowClass} rounded-lg p-3 min-w-[160px] node-pulse`}>
      <Handle type="target" position={Position.Top} className="!bg-neon-blue !border-0 !w-2 !h-2" />

      <div className="flex items-center gap-2 mb-2">
        <Database className="w-4 h-4 text-neon-purple" />
        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">RDS</span>
        <div className={`w-2 h-2 rounded-full ml-auto ${isAvailable ? 'bg-neon-green' : 'bg-gray-500'}`} />
      </div>

      <div className="text-sm font-medium text-gray-100 truncate">{data.label}</div>
      <div className="text-[10px] text-gray-500 mt-1">
        {data.metadata.engine} {data.metadata.engineVersion}
      </div>

      {connections !== undefined && (
        <div className="mt-2 text-[10px] text-gray-400">
          <span className="text-neon-blue">{Math.round(connections)}</span> connections
        </div>
      )}

      {data.isManual && (
        <div className="mt-2 text-[9px] text-neon-red/80 bg-neon-red/10 rounded px-1 py-0.5 text-center">
          MANUAL RESOURCE
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-neon-blue !border-0 !w-2 !h-2" />
    </div>
  );
}

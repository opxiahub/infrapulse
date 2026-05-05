import { Handle, Position } from 'reactflow';
import { getCloudResourceConfig } from '../../../config/cloud-resources';
import { Server } from 'lucide-react';

interface Props {
  data: {
    type: string;
    label: string;
    status: string;
    isManual: boolean;
    metadata: Record<string, any>;
    metrics?: Record<string, number>;
  };
}

export function GenericResourceNode({ data }: Props) {
  const config = getCloudResourceConfig(data.type);
  const Icon = config?.icon || Server;
  const iconColor = config?.iconColor || 'text-gray-400';
  const activeStatuses = config?.activeStatuses || [];
  const isActive = activeStatuses.includes(data.status);

  const borderColor = data.isManual
    ? 'border-neon-red/50'
    : isActive
    ? 'border-neon-green/50'
    : 'border-gray-600';
  const glowClass = data.isManual
    ? 'shadow-neon-red'
    : isActive
    ? 'shadow-neon-green'
    : '';

  return (
    <div className={`bg-surface-800 border ${borderColor} ${glowClass} rounded-lg p-3 min-w-[160px] node-pulse`}>
      <Handle type="target" position={Position.Top} className="!bg-neon-blue !border-0 !w-2 !h-2" />

      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
          {config?.label?.split(' ')[0] || data.type}
        </span>
        <div className={`w-2 h-2 rounded-full ml-auto ${isActive ? 'bg-neon-green' : 'bg-gray-500'}`} />
      </div>

      <div className="text-sm font-medium text-gray-100 truncate">{data.label}</div>
      {data.metadata?.subtitle && (
        <div className="text-[10px] text-gray-500 mt-1 truncate">{data.metadata.subtitle}</div>
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

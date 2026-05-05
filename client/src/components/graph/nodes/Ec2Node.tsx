import { Handle, Position } from 'reactflow';
import { Server } from 'lucide-react';

interface Props {
  data: {
    label: string;
    status: string;
    isManual: boolean;
    metadata: Record<string, any>;
    metrics?: Record<string, number>;
  };
}

export function Ec2Node({ data }: Props) {
  const isRunning = data.status === 'running';
  const cpu = data.metrics?.cpuUtilization;
  const borderColor = data.isManual
    ? 'border-neon-red/50'
    : isRunning
    ? 'border-neon-green/50'
    : 'border-gray-600';
  const glowClass = data.isManual
    ? 'shadow-neon-red'
    : isRunning
    ? 'shadow-neon-green'
    : '';
  const pulseClass = isRunning ? (cpu && cpu > 80 ? 'node-pulse-fast' : 'node-pulse') : '';

  return (
    <div className={`bg-surface-800 border ${borderColor} ${glowClass} rounded-lg p-3 min-w-[160px] ${pulseClass}`}>
      <Handle type="target" position={Position.Top} className="!bg-neon-blue !border-0 !w-2 !h-2" />

      <div className="flex items-center gap-2 mb-2">
        <Server className="w-4 h-4 text-neon-blue" />
        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">EC2</span>
        <div className={`w-2 h-2 rounded-full ml-auto ${isRunning ? 'bg-neon-green' : 'bg-gray-500'}`} />
      </div>

      <div className="text-sm font-medium text-gray-100 truncate">{data.label}</div>
      <div className="text-[10px] text-gray-500 mt-1">{data.metadata.instanceType}</div>

      {cpu !== undefined && (
        <div className="mt-2">
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>CPU</span>
            <span>{cpu.toFixed(1)}%</span>
          </div>
          <div className="w-full h-1 bg-surface-700 rounded mt-0.5">
            <div
              className="h-1 rounded transition-all duration-1000"
              style={{
                width: `${Math.min(cpu, 100)}%`,
                backgroundColor: cpu > 80 ? '#FF073A' : cpu > 50 ? '#FFAA00' : '#39FF14',
              }}
            />
          </div>
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

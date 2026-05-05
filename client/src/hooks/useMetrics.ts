import { useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket } from '../lib/socket';
import type { GraphData } from './useGraph';

interface MetricPulse {
  nodeId: string;
  metrics: Record<string, number>;
  timestamp: string;
}

export function useMetrics(
  providerId: number | null,
  setGraphData: React.Dispatch<React.SetStateAction<GraphData | null>> | ((updater: (prev: GraphData | null) => GraphData | null) => void)
) {
  const socketRef = useRef<ReturnType<typeof connectSocket> | null>(null);

  useEffect(() => {
    if (!providerId) return;

    const socket = connectSocket();
    socketRef.current = socket;

    socket.on('metric:pulse', (data: { providerId: number; pulses: MetricPulse[] }) => {
      if (data.providerId !== providerId) return;

      setGraphData((prev: GraphData | null) => {
        if (!prev) return prev;
        const updatedNodes = prev.nodes.map(node => {
          const pulse = data.pulses.find(p => p.nodeId === node.id);
          if (pulse) {
            return { ...node, metrics: { ...node.metrics, ...pulse.metrics } };
          }
          return node;
        });
        return { ...prev, nodes: updatedNodes };
      });
    });

    return () => {
      socket.off('metric:pulse');
      disconnectSocket();
    };
  }, [providerId, setGraphData]);
}

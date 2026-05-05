import { useState } from 'react';
import { X, Copy, Terminal } from 'lucide-react';
import { api } from '../../lib/api';

interface Props {
  clusterId: number;
  namespace: string;
  podName: string;
  containerName?: string;
  onClose: () => void;
}

export function LogViewer({ clusterId, namespace, podName, containerName, onClose }: Props) {
  const [logs, setLogs] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ namespace, pod: podName, tail: '100' });
      if (containerName) params.set('container', containerName);
      const data = await api.get<{ logs: string }>(
        `/kubernetes/clusters/${clusterId}/logs?${params}`
      );
      setLogs(data.logs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!logs) return;
    await navigator.clipboard.writeText(logs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-neon-green" />
            <span className="font-mono text-sm text-gray-200">
              {podName}{containerName ? ` / ${containerName}` : ''}
            </span>
            <span className="text-xs text-gray-500">({namespace})</span>
          </div>
          <div className="flex items-center gap-2">
            {logs && (
              <button onClick={handleCopy} className="btn-secondary text-xs px-2 py-1 flex items-center gap-1">
                <Copy className="w-3 h-3" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-3 bg-neon-red/10 border border-neon-red/30 rounded text-neon-red text-sm flex-shrink-0">
            {error}
          </div>
        )}

        {!logs && !loading && (
          <div className="flex-1 flex items-center justify-center">
            <button onClick={fetchLogs} className="btn-primary flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Fetch Logs (last 100 lines)
            </button>
          </div>
        )}

        {loading && (
          <div className="flex-1 flex items-center justify-center text-neon-green text-sm animate-pulse">
            Fetching logs...
          </div>
        )}

        {logs !== null && !loading && (
          <pre className="flex-1 overflow-auto bg-surface-950 border border-surface-600 rounded p-3 font-mono text-xs text-gray-300 whitespace-pre-wrap min-h-0">
            {logs || '(no output)'}
          </pre>
        )}
      </div>
    </div>
  );
}

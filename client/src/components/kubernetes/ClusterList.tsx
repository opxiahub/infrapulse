import { Trash2, CheckCircle, Server } from 'lucide-react';
import { api } from '../../lib/api';

interface Cluster {
  id: number;
  label: string;
  cluster_type: string;
  api_server_url: string;
  verified: number;
  created_at: string;
}

interface Props {
  clusters: Cluster[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onRefresh: () => void;
}

export function ClusterList({ clusters, selectedId, onSelect, onRefresh }: Props) {
  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('Delete this cluster connection?')) return;
    try {
      await api.delete(`/kubernetes/clusters/${id}`);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (clusters.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No clusters connected yet. Add one above.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {clusters.map(cluster => (
        (() => {
          const iconColor = cluster.cluster_type === 'aks'
            ? 'text-blue-400'
            : cluster.cluster_type === 'eks'
              ? 'text-yellow-500'
              : cluster.cluster_type === 'gke'
                ? 'text-green-400'
                : 'text-neon-red';
          return (
        <div
          key={cluster.id}
          onClick={() => onSelect(cluster.id)}
          className={`card cursor-pointer transition-all duration-150 ${
            selectedId === cluster.id
              ? 'border-neon-green/40 bg-neon-green/5'
              : 'hover:border-surface-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Server className={`w-4 h-4 ${iconColor} flex-shrink-0`} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-200 truncate">{cluster.label}</span>
                  {cluster.verified === 1 && (
                    <CheckCircle className="w-3 h-3 text-neon-green flex-shrink-0" />
                  )}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-700 text-gray-400 uppercase tracking-wider">
                    {cluster.cluster_type}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 truncate">{cluster.api_server_url}</p>
              </div>
            </div>
            <button
              onClick={e => handleDelete(e, cluster.id)}
              className="text-gray-600 hover:text-neon-red transition-colors ml-2 flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
          );
        })()
      ))}
    </div>
  );
}

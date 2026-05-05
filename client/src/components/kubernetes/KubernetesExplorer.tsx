import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { ResourceTabs } from './ResourceTabs';

interface Props {
  clusterId: number;
  clusterLabel: string;
}

export function KubernetesExplorer({ clusterId, clusterLabel }: Props) {
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [selectedNamespace, setSelectedNamespace] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    setSelectedNamespace('');
    api.get<{ namespaces: string[] }>(`/kubernetes/clusters/${clusterId}/namespaces`)
      .then(data => {
        setNamespaces(data.namespaces);
        if (data.namespaces.includes('default')) {
          setSelectedNamespace('default');
        } else if (data.namespaces.length > 0) {
          setSelectedNamespace(data.namespaces[0]);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [clusterId]);

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-sm font-semibold text-gray-300">{clusterLabel}</h3>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Namespace</label>
          {loading && <span className="text-xs text-gray-500 animate-pulse">Loading...</span>}
          {error && <span className="text-xs text-neon-red">{error}</span>}
          {!loading && !error && (
            <select
              value={selectedNamespace}
              onChange={e => setSelectedNamespace(e.target.value)}
              className="input-field text-xs py-1 px-2 w-auto"
            >
              {namespaces.map(ns => (
                <option key={ns} value={ns}>{ns}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {selectedNamespace && (
        <ResourceTabs clusterId={clusterId} namespace={selectedNamespace} />
      )}
    </div>
  );
}

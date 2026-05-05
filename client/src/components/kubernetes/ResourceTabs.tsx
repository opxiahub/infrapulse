import { useState, useEffect } from 'react';
import { Terminal } from 'lucide-react';
import { api } from '../../lib/api';
import { DeploymentDetail } from './DeploymentDetail';
import { LogViewer } from './LogViewer';
import type { ResourceData, K8sDeployment, K8sPod } from './types';

type Tab = 'deployments' | 'pods' | 'services' | 'ingresses' | 'secrets';

interface Props {
  clusterId: number;
  namespace: string;
}

function formatAge(ts: string): string {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  return `${Math.floor(diff / 60000)}m`;
}

export function ResourceTabs({ clusterId, namespace }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('deployments');
  const [data, setData] = useState<ResourceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDeployment, setSelectedDeployment] = useState<K8sDeployment | null>(null);
  const [logPod, setLogPod] = useState<K8sPod | null>(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    setSelectedDeployment(null);
    api.get<ResourceData>(`/kubernetes/clusters/${clusterId}/resources?namespace=${namespace}`)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [clusterId, namespace]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'deployments', label: 'Deployments', count: data?.deployments.length ?? 0 },
    { key: 'pods', label: 'Pods', count: data?.pods.length ?? 0 },
    { key: 'services', label: 'Services', count: data?.services.length ?? 0 },
    { key: 'ingresses', label: 'Ingress', count: data?.ingresses.length ?? 0 },
    { key: 'secrets', label: 'Secrets', count: data?.secrets.length ?? 0 },
  ];

  if (loading) {
    return <div className="text-neon-green text-sm animate-pulse py-4">Loading resources...</div>;
  }

  if (error) {
    return <div className="text-neon-red text-sm py-4">{error}</div>;
  }

  if (!data) return null;

  return (
    <>
      <div>
        {/* Tab bar */}
        <div className="flex gap-1 mb-4 border-b border-surface-600 pb-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-xs rounded-t transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-neon-green/10 text-neon-green border border-neon-green/20'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
              {!loading && <span className="ml-1 text-[10px] opacity-60">({tab.count})</span>}
            </button>
          ))}
        </div>

        {/* Deployments */}
        {activeTab === 'deployments' && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-surface-600">
                <th className="text-left py-2 pr-4">Name</th>
                <th className="text-left py-2 pr-4">Ready</th>
                <th className="text-left py-2">Age</th>
              </tr>
            </thead>
            <tbody>
              {data.deployments.length === 0 && (
                <tr><td colSpan={3} className="py-4 text-center text-gray-600">None</td></tr>
              )}
              {data.deployments.map(d => (
                <tr
                  key={d.name}
                  onClick={() => setSelectedDeployment(d)}
                  className="border-b border-surface-700/50 hover:bg-surface-700/30 cursor-pointer"
                >
                  <td className="py-2 pr-4 font-mono text-neon-green/80 text-xs">{d.name}</td>
                  <td className="py-2 pr-4 text-xs">
                    <span className={d.readyReplicas === d.replicas ? 'text-neon-green' : 'text-yellow-400'}>
                      {d.readyReplicas}/{d.replicas}
                    </span>
                  </td>
                  <td className="py-2 text-xs text-gray-500">{formatAge(d.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pods */}
        {activeTab === 'pods' && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-surface-600">
                <th className="text-left py-2 pr-4">Name</th>
                <th className="text-left py-2 pr-4">Status</th>
                <th className="text-left py-2 pr-4">Restarts</th>
                <th className="text-left py-2 pr-4">Age</th>
                <th className="text-left py-2"></th>
              </tr>
            </thead>
            <tbody>
              {data.pods.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-gray-600">None</td></tr>
              )}
              {data.pods.map(p => (
                <tr key={p.name} className="border-b border-surface-700/50 hover:bg-surface-700/30">
                  <td className="py-2 pr-4 font-mono text-xs text-gray-300">{p.name}</td>
                  <td className="py-2 pr-4 text-xs">
                    <span className={p.phase === 'Running' ? 'text-neon-green' : 'text-yellow-400'}>
                      {p.phase}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-xs text-gray-400">{p.restarts}</td>
                  <td className="py-2 pr-4 text-xs text-gray-500">{formatAge(p.createdAt)}</td>
                  <td className="py-2">
                    <button
                      onClick={() => setLogPod(p)}
                      className="text-xs text-neon-blue hover:text-neon-blue/70 flex items-center gap-1"
                    >
                      <Terminal className="w-3 h-3" /> Logs
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Services */}
        {activeTab === 'services' && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-surface-600">
                <th className="text-left py-2 pr-4">Name</th>
                <th className="text-left py-2 pr-4">Type</th>
                <th className="text-left py-2 pr-4">Ports</th>
                <th className="text-left py-2">Age</th>
              </tr>
            </thead>
            <tbody>
              {data.services.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-center text-gray-600">None</td></tr>
              )}
              {data.services.map(s => (
                <tr key={s.name} className="border-b border-surface-700/50">
                  <td className="py-2 pr-4 font-mono text-xs text-gray-300">{s.name}</td>
                  <td className="py-2 pr-4 text-xs text-gray-400">{s.type}</td>
                  <td className="py-2 pr-4 text-xs text-gray-400">
                    {s.ports.map((p, i) => (
                      <span key={i} className="mr-1">{p.port}/{p.protocol}</span>
                    ))}
                  </td>
                  <td className="py-2 text-xs text-gray-500">{formatAge(s.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Ingresses */}
        {activeTab === 'ingresses' && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-surface-600">
                <th className="text-left py-2 pr-4">Name</th>
                <th className="text-left py-2 pr-4">Hosts</th>
                <th className="text-left py-2">Age</th>
              </tr>
            </thead>
            <tbody>
              {data.ingresses.length === 0 && (
                <tr><td colSpan={3} className="py-4 text-center text-gray-600">None</td></tr>
              )}
              {data.ingresses.map(i => (
                <tr key={i.name} className="border-b border-surface-700/50">
                  <td className="py-2 pr-4 font-mono text-xs text-gray-300">{i.name}</td>
                  <td className="py-2 pr-4 text-xs text-gray-400">{i.hosts.join(', ') || '—'}</td>
                  <td className="py-2 text-xs text-gray-500">{formatAge(i.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Secrets */}
        {activeTab === 'secrets' && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-surface-600">
                <th className="text-left py-2 pr-4">Name</th>
                <th className="text-left py-2 pr-4">Type</th>
                <th className="text-left py-2">Age</th>
              </tr>
            </thead>
            <tbody>
              {data.secrets.length === 0 && (
                <tr><td colSpan={3} className="py-4 text-center text-gray-600">None</td></tr>
              )}
              {data.secrets.map(s => (
                <tr key={s.name} className="border-b border-surface-700/50">
                  <td className="py-2 pr-4 font-mono text-xs text-gray-300">{s.name}</td>
                  <td className="py-2 pr-4 text-xs text-gray-400">{s.type}</td>
                  <td className="py-2 text-xs text-gray-500">{formatAge(s.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedDeployment && (
        <DeploymentDetail
          clusterId={clusterId}
          namespace={namespace}
          deployment={selectedDeployment}
          pods={data.pods}
          onClose={() => setSelectedDeployment(null)}
        />
      )}

      {logPod && (
        <LogViewer
          clusterId={clusterId}
          namespace={namespace}
          podName={logPod.name}
          containerName={logPod.containers[0]}
          onClose={() => setLogPod(null)}
        />
      )}
    </>
  );
}

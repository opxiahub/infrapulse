import { useState, useEffect } from 'react';
import { X, Terminal } from 'lucide-react';
import { api } from '../../lib/api';
import { LogViewer } from './LogViewer';
import type { K8sDeployment, K8sPod } from './types';

interface EnvVar {
  name: string;
  value?: string;
  valueFrom?: string;
}

interface Props {
  clusterId: number;
  namespace: string;
  deployment: K8sDeployment;
  pods: K8sPod[];
  onClose: () => void;
}

export function DeploymentDetail({ clusterId, namespace, deployment, pods, onClose }: Props) {
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [loadingEnv, setLoadingEnv] = useState(true);
  const [envError, setEnvError] = useState('');
  const [logPod, setLogPod] = useState<K8sPod | null>(null);

  useEffect(() => {
    setLoadingEnv(true);
    setEnvError('');
    api.get<{ envVars: EnvVar[] }>(
      `/kubernetes/clusters/${clusterId}/deployments/${deployment.name}/envvars?namespace=${namespace}`
    )
      .then(data => setEnvVars(data.envVars))
      .catch(err => setEnvError(err.message))
      .finally(() => setLoadingEnv(false));
  }, [clusterId, namespace, deployment.name]);

  // Pods belonging to this deployment (match selector labels)
  const deploymentPods = pods.filter(p =>
    Object.entries(deployment.labels).some(
      ([k, v]) => p.labels[k] === v
    )
  );

  return (
    <>
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-surface-900 border-l border-surface-600 z-40 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-surface-600 flex-shrink-0">
          <div>
            <h3 className="font-bold text-gray-100">{deployment.name}</h3>
            <p className="text-xs text-gray-500">{namespace}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Metadata */}
          <div className="card">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Info</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Replicas</span>
                <p className="text-gray-200">{deployment.readyReplicas}/{deployment.replicas}</p>
              </div>
              <div>
                <span className="text-gray-500">Image</span>
                <p className="text-gray-200 text-xs truncate" title={deployment.image}>{deployment.image || '—'}</p>
              </div>
            </div>
          </div>

          {/* Env Vars */}
          <div className="card">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Environment Variables
              {!loadingEnv && <span className="ml-2 text-gray-600 normal-case">({envVars.length})</span>}
            </h4>
            {loadingEnv && <div className="text-gray-500 text-sm animate-pulse">Loading...</div>}
            {envError && <div className="text-neon-red text-sm">{envError}</div>}
            {!loadingEnv && !envError && envVars.length === 0 && (
              <div className="text-gray-500 text-sm">No environment variables</div>
            )}
            {!loadingEnv && envVars.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-surface-600">
                      <th className="text-left py-1 pr-3 font-medium">KEY</th>
                      <th className="text-left py-1 font-medium">VALUE / SOURCE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {envVars.map((ev, i) => (
                      <tr key={i} className="border-b border-surface-700/50">
                        <td className="py-1 pr-3 font-mono text-neon-green/80">{ev.name}</td>
                        <td className="py-1 font-mono text-gray-400 break-all">
                          {ev.valueFrom ? (
                            <span className="text-neon-blue/70">{ev.valueFrom}</span>
                          ) : (
                            ev.value || <span className="text-gray-600">(empty)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pods */}
          {deploymentPods.length > 0 && (
            <div className="card">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Pods</h4>
              <div className="space-y-1">
                {deploymentPods.map(pod => (
                  <div key={pod.name} className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono text-gray-300">{pod.name}</span>
                      <span className={`ml-2 text-[10px] ${pod.phase === 'Running' ? 'text-neon-green' : 'text-yellow-400'}`}>
                        {pod.phase}
                      </span>
                    </div>
                    <button
                      onClick={() => setLogPod(pod)}
                      className="text-xs text-neon-blue hover:text-neon-blue/70 flex items-center gap-1"
                    >
                      <Terminal className="w-3 h-3" /> Logs
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

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

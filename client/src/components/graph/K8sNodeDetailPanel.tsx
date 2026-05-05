import { useState, useEffect } from 'react';
import { X, Terminal, Box, Cpu, Network, Globe, Key, FileText, Layers, Radio, HardDrive, Server, Briefcase, Clock, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api';
import { LogViewer } from '../kubernetes/LogViewer';

interface EnvVar {
  name: string;
  value?: string;
  valueFrom?: string;
}

interface Props {
  node: {
    type: string;
    label: string;
    status: string;
    metadata: Record<string, any>;
  };
  onClose: () => void;
}

const TYPE_ICONS: Record<string, any> = {
  'k8s-deployment':  Box,
  'k8s-pod':         Cpu,
  'k8s-service':     Network,
  'k8s-ingress':     Globe,
  'k8s-secret':      Key,
  'k8s-configmap':   FileText,
  'k8s-statefulset': Layers,
  'k8s-daemonset':   Radio,
  'k8s-pvc':         HardDrive,
  'k8s-node':        Server,
  'k8s-job':         Briefcase,
  'k8s-cronjob':     Clock,
};

const TYPE_COLORS: Record<string, string> = {
  'k8s-deployment':  'text-neon-purple',
  'k8s-pod':         'text-neon-green',
  'k8s-service':     'text-neon-blue',
  'k8s-ingress':     'text-amber-400',
  'k8s-secret':      'text-rose-400',
  'k8s-configmap':   'text-teal-400',
  'k8s-statefulset': 'text-violet-400',
  'k8s-daemonset':   'text-indigo-400',
  'k8s-pvc':         'text-yellow-400',
  'k8s-node':        'text-gray-300',
  'k8s-job':         'text-lime-400',
  'k8s-cronjob':     'text-lime-300',
};

const TYPE_LABELS: Record<string, string> = {
  'k8s-deployment':  'Deployment',
  'k8s-pod':         'Pod',
  'k8s-service':     'Service',
  'k8s-ingress':     'Ingress',
  'k8s-secret':      'Secret',
  'k8s-configmap':   'ConfigMap',
  'k8s-statefulset': 'StatefulSet',
  'k8s-daemonset':   'DaemonSet',
  'k8s-pvc':         'PersistentVolumeClaim',
  'k8s-node':        'Node',
  'k8s-job':         'Job',
  'k8s-cronjob':     'CronJob',
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      {children}
    </div>
  );
}

export function K8sNodeDetailPanel({ node, onClose }: Props) {
  const Icon = TYPE_ICONS[node.type] || Box;
  const iconColor = TYPE_COLORS[node.type] || 'text-gray-400';
  const typeLabel = TYPE_LABELS[node.type] || node.type;
  const { clusterId, namespace } = node.metadata;

  const [envVars, setEnvVars] = useState<EnvVar[] | null>(null);
  const [envLoading, setEnvLoading] = useState(false);
  const [envError, setEnvError] = useState('');
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    if (node.type !== 'k8s-deployment' && node.type !== 'k8s-statefulset') return;
    setEnvLoading(true);
    setEnvError('');
    setEnvVars(null);
    api.get<{ envVars: EnvVar[] }>(
      `/kubernetes/clusters/${clusterId}/deployments/${encodeURIComponent(node.label)}/envvars?namespace=${namespace}`
    )
      .then(d => setEnvVars(d.envVars))
      .catch(e => setEnvError(e.message))
      .finally(() => setEnvLoading(false));
  }, [node.type, node.label, clusterId, namespace]);

  const formatAge = (ts: string) => {
    if (!ts) return '—';
    const diff = Date.now() - new Date(ts).getTime();
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${Math.floor(diff / 60000)}m ago`;
  };

  const annotations = node.metadata.annotations as Record<string, string> | undefined;
  const hasAnnotations = annotations && Object.keys(annotations).length > 0;

  return (
    <>
      <div className="w-80 bg-surface-900 border-l border-surface-600 h-full overflow-auto">
        <div className="p-4 border-b border-surface-600 flex items-center justify-between sticky top-0 bg-surface-900 z-10">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${iconColor}`} />
            <span className="font-bold text-sm text-gray-200">{typeLabel}</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <Section label="Name">
            <div className="text-sm text-gray-200 break-all font-mono">{node.label}</div>
          </Section>

          {namespace && (
            <Section label="Namespace">
              <div className="text-sm text-gray-400">{namespace}</div>
            </Section>
          )}

          {node.metadata.createdAt && (
            <Section label="Age">
              <div className="text-sm text-gray-400">{formatAge(node.metadata.createdAt)}</div>
            </Section>
          )}

          {/* ── Deployment ─────────────────────────────────────────────────── */}
          {node.type === 'k8s-deployment' && (
            <>
              <Section label="Replicas">
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-neon-green" />
                    <span className="text-neon-green">{node.metadata.readyReplicas}</span>
                    <span className="text-gray-600 text-xs">ready</span>
                  </span>
                  {node.metadata.unavailableReplicas > 0 && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-neon-red" />
                      <span className="text-neon-red">{node.metadata.unavailableReplicas}</span>
                      <span className="text-gray-600 text-xs">unavailable</span>
                    </span>
                  )}
                  <span className="text-gray-500 text-xs ml-auto">{node.metadata.replicas} desired</span>
                </div>
              </Section>
              {node.metadata.image && (
                <Section label="Image">
                  <div className="text-xs text-gray-400 break-all font-mono">{node.metadata.image}</div>
                </Section>
              )}
              <EnvVarSection envVars={envVars} envLoading={envLoading} envError={envError} />
            </>
          )}

          {/* ── StatefulSet ────────────────────────────────────────────────── */}
          {node.type === 'k8s-statefulset' && (
            <>
              <Section label="Replicas">
                <span className={`text-sm ${node.metadata.readyReplicas === node.metadata.replicas ? 'text-neon-green' : 'text-yellow-400'}`}>
                  {node.metadata.readyReplicas}/{node.metadata.replicas} ready
                </span>
              </Section>
              {node.metadata.image && (
                <Section label="Image">
                  <div className="text-xs text-gray-400 break-all font-mono">{node.metadata.image}</div>
                </Section>
              )}
              <EnvVarSection envVars={envVars} envLoading={envLoading} envError={envError} />
            </>
          )}

          {/* ── DaemonSet ──────────────────────────────────────────────────── */}
          {node.type === 'k8s-daemonset' && (
            <>
              <Section label="Nodes">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-neon-green">{node.metadata.numberReady}</span>
                  <span className="text-gray-600 text-xs">ready /</span>
                  <span className="text-gray-400">{node.metadata.desiredNumberScheduled}</span>
                  <span className="text-gray-600 text-xs">desired</span>
                </div>
              </Section>
              {node.metadata.image && (
                <Section label="Image">
                  <div className="text-xs text-gray-400 break-all font-mono">{node.metadata.image}</div>
                </Section>
              )}
            </>
          )}

          {/* ── Pod ────────────────────────────────────────────────────────── */}
          {node.type === 'k8s-pod' && (
            <>
              <Section label="Phase">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  node.status === 'Running' ? 'bg-neon-green/10 text-neon-green' : 'bg-yellow-500/10 text-yellow-400'
                }`}>
                  {node.status}
                </span>
              </Section>
              <Section label="Restarts">
                <div className={`text-sm ${(node.metadata.restarts ?? 0) > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                  {node.metadata.restarts ?? 0}
                </div>
              </Section>
              {node.metadata.nodeName && (
                <Section label="Node">
                  <div className="text-xs text-gray-400 font-mono truncate">{node.metadata.nodeName}</div>
                </Section>
              )}
              {(node.metadata.containers as string[])?.length > 0 && (
                <Section label="Containers">
                  <div className="space-y-1">
                    {(node.metadata.containers as string[]).map((c, i) => (
                      <div key={i} className="text-xs font-mono text-gray-400">{c}</div>
                    ))}
                  </div>
                </Section>
              )}
              <button onClick={() => setShowLogs(true)} className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
                <Terminal className="w-4 h-4" /> View Logs
              </button>
            </>
          )}

          {/* ── Service ────────────────────────────────────────────────────── */}
          {node.type === 'k8s-service' && (
            <>
              <Section label="Type"><div className="text-sm text-gray-400">{node.metadata.svcType}</div></Section>
              <Section label="Cluster IP"><div className="text-sm text-gray-400 font-mono">{node.metadata.clusterIP}</div></Section>
              {(node.metadata.ports as any[])?.length > 0 && (
                <Section label="Ports">
                  <div className="space-y-1">
                    {(node.metadata.ports as any[]).map((p, i) => (
                      <div key={i} className="text-xs text-gray-400">
                        {p.port}/{p.protocol}{p.nodePort ? ` → NodePort ${p.nodePort}` : ''}
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </>
          )}

          {/* ── Ingress ────────────────────────────────────────────────────── */}
          {node.type === 'k8s-ingress' && (
            <>
              {(node.metadata.lbHostnames as string[])?.length > 0 && (
                <Section label="Load Balancer">
                  <div className="space-y-1">
                    {(node.metadata.lbHostnames as string[]).map((h, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="text-xs text-neon-blue font-mono break-all">{h}</span>
                        <a href={`https://${h}`} target="_blank" rel="noreferrer" className="text-gray-600 hover:text-neon-blue flex-shrink-0">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
              {(node.metadata.hosts as string[])?.length > 0 && (
                <Section label="Hosts">
                  <div className="space-y-1">
                    {(node.metadata.hosts as string[]).map((h, i) => (
                      <div key={i} className="text-xs text-gray-400 font-mono">{h}</div>
                    ))}
                  </div>
                </Section>
              )}
              {(node.metadata.rules as any[])?.length > 0 && (
                <Section label="Rules">
                  <div className="space-y-2">
                    {(node.metadata.rules as any[]).map((r, i) => (
                      <div key={i} className="text-xs">
                        <div className="text-gray-400 font-mono">{r.host || '*'}</div>
                        {(r.paths || []).map((p: any, j: number) => (
                          <div key={j} className="ml-2 text-gray-600">{p.path} → {p.backend}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                </Section>
              )}
              {hasAnnotations && (
                <Section label="Annotations">
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {Object.entries(annotations!).map(([k, v]) => (
                      <div key={k} className="text-xs">
                        <div className="text-gray-500 break-all">{k}</div>
                        <div className="text-gray-400 break-all ml-2">{v}</div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </>
          )}

          {/* ── Secret ─────────────────────────────────────────────────────── */}
          {node.type === 'k8s-secret' && (
            <Section label="Type">
              <div className="text-sm text-gray-400">{node.metadata.secretType || 'Opaque'}</div>
            </Section>
          )}

          {/* ── ConfigMap ──────────────────────────────────────────────────── */}
          {node.type === 'k8s-configmap' && (node.metadata.dataKeys as string[])?.length > 0 && (
            <Section label={`Keys (${(node.metadata.dataKeys as string[]).length})`}>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {(node.metadata.dataKeys as string[]).map((k, i) => (
                  <div key={i} className="text-xs font-mono text-teal-400/80">{k}</div>
                ))}
              </div>
            </Section>
          )}

          {/* ── PVC ────────────────────────────────────────────────────────── */}
          {node.type === 'k8s-pvc' && (
            <>
              <Section label="Phase">
                <span className={`text-xs px-2 py-0.5 rounded ${node.metadata.phase === 'Bound' ? 'bg-yellow-400/10 text-yellow-400' : 'bg-gray-600/30 text-gray-400'}`}>
                  {node.metadata.phase}
                </span>
              </Section>
              <Section label="Capacity"><div className="text-sm text-gray-400">{node.metadata.capacity || '—'}</div></Section>
              <Section label="Storage Class"><div className="text-sm text-gray-400 font-mono">{node.metadata.storageClass || '—'}</div></Section>
              {(node.metadata.accessModes as string[])?.length > 0 && (
                <Section label="Access Modes">
                  <div className="text-xs text-gray-400">{(node.metadata.accessModes as string[]).join(', ')}</div>
                </Section>
              )}
            </>
          )}

          {/* ── Cluster Node ───────────────────────────────────────────────── */}
          {node.type === 'k8s-node' && (
            <>
              <Section label="Status">
                <span className={`text-xs px-2 py-0.5 rounded ${node.metadata.ready ? 'bg-neon-green/10 text-neon-green' : 'bg-neon-red/10 text-neon-red'}`}>
                  {node.metadata.ready ? 'Ready' : 'NotReady'}
                </span>
              </Section>
              <Section label="Role"><div className="text-sm text-gray-400">{node.metadata.nodeRole}</div></Section>
              <Section label="K8s Version"><div className="text-sm text-gray-400 font-mono">{node.metadata.kubernetesVersion}</div></Section>
              <Section label="OS"><div className="text-xs text-gray-400">{node.metadata.osImage}</div></Section>
              <Section label="CPU"><div className="text-sm text-gray-400">{node.metadata.cpuCapacity}</div></Section>
              <Section label="Memory"><div className="text-sm text-gray-400">{node.metadata.memoryCapacity}</div></Section>
            </>
          )}

          {/* ── Job ────────────────────────────────────────────────────────── */}
          {node.type === 'k8s-job' && (
            <>
              <Section label="Status"><div className="text-sm text-gray-400">{node.status}</div></Section>
              <Section label="Progress">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-neon-green">{node.metadata.succeeded}</span><span className="text-gray-600 text-xs">succeeded</span>
                  {node.metadata.failed > 0 && <><span className="text-neon-red">{node.metadata.failed}</span><span className="text-gray-600 text-xs">failed</span></>}
                  {node.metadata.active > 0 && <><span className="text-yellow-400">{node.metadata.active}</span><span className="text-gray-600 text-xs">active</span></>}
                  <span className="text-gray-600 text-xs ml-auto">/{node.metadata.completions} completions</span>
                </div>
              </Section>
            </>
          )}

          {/* ── CronJob ────────────────────────────────────────────────────── */}
          {node.type === 'k8s-cronjob' && (
            <>
              <Section label="Schedule"><div className="text-sm text-gray-400 font-mono">{node.metadata.schedule}</div></Section>
              {node.metadata.lastScheduleTime && (
                <Section label="Last Run"><div className="text-sm text-gray-400">{formatAge(node.metadata.lastScheduleTime)}</div></Section>
              )}
              {node.metadata.active > 0 && (
                <Section label="Active Jobs"><div className="text-sm text-yellow-400">{node.metadata.active}</div></Section>
              )}
            </>
          )}
        </div>
      </div>

      {showLogs && node.type === 'k8s-pod' && (
        <LogViewer
          clusterId={clusterId}
          namespace={namespace}
          podName={node.label}
          containerName={(node.metadata.containers as string[])?.[0]}
          onClose={() => setShowLogs(false)}
        />
      )}
    </>
  );
}

function EnvVarSection({ envVars, envLoading, envError }: { envVars: EnvVar[] | null; envLoading: boolean; envError: string }) {
  return (
    <div>
      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
        Environment Variables
        {!envLoading && envVars && <span className="ml-1 text-gray-600">({envVars.length})</span>}
      </div>
      {envLoading && <div className="text-xs text-gray-500 animate-pulse">Loading...</div>}
      {envError && <div className="text-xs text-neon-red">{envError}</div>}
      {envVars && !envLoading && (
        envVars.length === 0 ? (
          <div className="text-xs text-gray-600 italic">None</div>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {envVars.map((ev, i) => (
              <div key={i} className="text-xs border-b border-surface-700/50 pb-1">
                <span className="font-mono text-neon-green/80">{ev.name}</span>
                <div className="font-mono text-gray-500 break-all ml-2">
                  {ev.valueFrom ? (
                    <span className="text-neon-blue/70">{ev.valueFrom}</span>
                  ) : (
                    ev.value || <span className="text-gray-600 italic">empty</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

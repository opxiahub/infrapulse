import { useEffect, useMemo, useState } from 'react';
import { Box, Cloud, Monitor, X } from 'lucide-react';
import { api } from '../../lib/api';

interface Props {
  onClose: () => void;
  onAdded: () => void;
  initialClusterType?: 'rosa' | 'eks' | 'gke' | 'aks';
}

interface ProviderRow {
  id: number;
  label: string;
  provider: string;
  region: string;
  verified: number;
}

interface GkeClusterOption {
  name: string;
  location: string;
  status: string;
  endpoint: string;
  masterVersion: string;
  releaseChannel: string;
}

interface EksClusterOption {
  name: string;
  region: string;
  status: string;
  endpoint: string;
  version: string;
  platformVersion: string;
}

interface AksClusterOption {
  name: string;
  resourceGroup: string;
  location: string;
  status: string;
  endpoint: string;
  version: string;
  nodePools: number;
  azureRbac: boolean;
}

type ClusterType = 'rosa' | 'eks' | 'gke' | 'aks';

export function AddClusterModal({ onClose, onAdded, initialClusterType = 'rosa' }: Props) {
  const [clusterType, setClusterType] = useState<ClusterType>(initialClusterType);

  const [rosaLabel, setRosaLabel] = useState('');
  const [apiServerUrl, setApiServerUrl] = useState('');
  const [token, setToken] = useState('');
  const [skipTlsVerify, setSkipTlsVerify] = useState(false);

  const [gkeLabel, setGkeLabel] = useState('');
  const [gcpProviders, setGcpProviders] = useState<ProviderRow[]>([]);
  const [gcpProvidersLoading, setGcpProvidersLoading] = useState(false);
  const [selectedGcpProviderId, setSelectedGcpProviderId] = useState('');
  const [gkeClusters, setGkeClusters] = useState<GkeClusterOption[]>([]);
  const [gkeClustersLoading, setGkeClustersLoading] = useState(false);
  const [selectedGkeClusterKey, setSelectedGkeClusterKey] = useState('');
  const [projectId, setProjectId] = useState('');

  const [eksLabel, setEksLabel] = useState('');
  const [awsProviders, setAwsProviders] = useState<ProviderRow[]>([]);
  const [awsProvidersLoading, setAwsProvidersLoading] = useState(false);
  const [selectedAwsProviderId, setSelectedAwsProviderId] = useState('');
  const [eksClusters, setEksClusters] = useState<EksClusterOption[]>([]);
  const [eksClustersLoading, setEksClustersLoading] = useState(false);
  const [selectedEksClusterName, setSelectedEksClusterName] = useState('');
  const [awsRegion, setAwsRegion] = useState('');

  const [aksLabel, setAksLabel] = useState('');
  const [azureProviders, setAzureProviders] = useState<ProviderRow[]>([]);
  const [azureProvidersLoading, setAzureProvidersLoading] = useState(false);
  const [selectedAzureProviderId, setSelectedAzureProviderId] = useState('');
  const [aksClusters, setAksClusters] = useState<AksClusterOption[]>([]);
  const [aksClustersLoading, setAksClustersLoading] = useState(false);
  const [selectedAksClusterKey, setSelectedAksClusterKey] = useState('');
  const [subscriptionId, setSubscriptionId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setClusterType(initialClusterType);
  }, [initialClusterType]);

  useEffect(() => {
    if (clusterType !== 'gke') return;

    let cancelled = false;
    setGcpProvidersLoading(true);
    api.get<{ providers: ProviderRow[] }>('/providers')
      .then(data => {
        if (cancelled) return;
        const nextProviders = data.providers.filter(provider => provider.provider === 'gcp' && provider.verified === 1);
        setGcpProviders(nextProviders);
        setSelectedGcpProviderId(current => {
          if (current && nextProviders.some(provider => String(provider.id) === current)) return current;
          return nextProviders[0] ? String(nextProviders[0].id) : '';
        });
      })
      .catch(err => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setGcpProvidersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clusterType]);

  useEffect(() => {
    if (clusterType !== 'aks') return;

    let cancelled = false;
    setAzureProvidersLoading(true);
    api.get<{ providers: ProviderRow[] }>('/providers')
      .then(data => {
        if (cancelled) return;
        const nextProviders = data.providers.filter(provider => provider.provider === 'azure' && provider.verified === 1);
        setAzureProviders(nextProviders);
        setSelectedAzureProviderId(current => {
          if (current && nextProviders.some(provider => String(provider.id) === current)) return current;
          return nextProviders[0] ? String(nextProviders[0].id) : '';
        });
      })
      .catch(err => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setAzureProvidersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clusterType]);

  useEffect(() => {
    if (clusterType !== 'eks') return;

    let cancelled = false;
    setAwsProvidersLoading(true);
    api.get<{ providers: ProviderRow[] }>('/providers')
      .then(data => {
        if (cancelled) return;
        const nextProviders = data.providers.filter(provider => provider.provider === 'aws' && provider.verified === 1);
        setAwsProviders(nextProviders);
        setSelectedAwsProviderId(current => {
          if (current && nextProviders.some(provider => String(provider.id) === current)) return current;
          return nextProviders[0] ? String(nextProviders[0].id) : '';
        });
      })
      .catch(err => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setAwsProvidersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clusterType]);

  useEffect(() => {
    if (clusterType !== 'gke' || !selectedGcpProviderId) {
      setGkeClusters([]);
      setSelectedGkeClusterKey('');
      setProjectId('');
      return;
    }

    let cancelled = false;
    setGkeClustersLoading(true);
    setError('');
    api.get<{ projectId: string; clusters: GkeClusterOption[] }>(`/kubernetes/gke/clusters?providerId=${selectedGcpProviderId}`)
      .then(data => {
        if (cancelled) return;
        setProjectId(data.projectId);
        setGkeClusters(data.clusters);
        setSelectedGkeClusterKey(current => {
          if (current && data.clusters.some(cluster => gkeClusterKey(cluster) === current)) return current;
          return data.clusters[0] ? gkeClusterKey(data.clusters[0]) : '';
        });
      })
      .catch(err => {
        if (cancelled) return;
        setError(err.message);
        setGkeClusters([]);
        setSelectedGkeClusterKey('');
        setProjectId('');
      })
      .finally(() => {
        if (!cancelled) setGkeClustersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clusterType, selectedGcpProviderId]);

  useEffect(() => {
    if (clusterType !== 'eks' || !selectedAwsProviderId) {
      setEksClusters([]);
      setSelectedEksClusterName('');
      setAwsRegion('');
      return;
    }

    let cancelled = false;
    setEksClustersLoading(true);
    setError('');
    api.get<{ region: string; clusters: EksClusterOption[] }>(`/kubernetes/eks/clusters?providerId=${selectedAwsProviderId}`)
      .then(data => {
        if (cancelled) return;
        setAwsRegion(data.region);
        setEksClusters(data.clusters);
        setSelectedEksClusterName(current => {
          if (current && data.clusters.some(cluster => cluster.name === current)) return current;
          return data.clusters[0]?.name || '';
        });
      })
      .catch(err => {
        if (cancelled) return;
        setError(err.message);
        setEksClusters([]);
        setSelectedEksClusterName('');
        setAwsRegion('');
      })
      .finally(() => {
        if (!cancelled) setEksClustersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clusterType, selectedAwsProviderId]);

  useEffect(() => {
    if (clusterType !== 'aks' || !selectedAzureProviderId) {
      setAksClusters([]);
      setSelectedAksClusterKey('');
      setSubscriptionId('');
      return;
    }

    let cancelled = false;
    setAksClustersLoading(true);
    setError('');
    api.get<{ subscriptionId: string; clusters: AksClusterOption[] }>(`/kubernetes/aks/clusters?providerId=${selectedAzureProviderId}`)
      .then(data => {
        if (cancelled) return;
        setSubscriptionId(data.subscriptionId);
        setAksClusters(data.clusters);
        setSelectedAksClusterKey(current => {
          if (current && data.clusters.some(cluster => aksClusterKey(cluster) === current)) return current;
          return data.clusters[0] ? aksClusterKey(data.clusters[0]) : '';
        });
      })
      .catch(err => {
        if (cancelled) return;
        setError(err.message);
        setAksClusters([]);
        setSelectedAksClusterKey('');
        setSubscriptionId('');
      })
      .finally(() => {
        if (!cancelled) setAksClustersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clusterType, selectedAzureProviderId]);

  const selectedGkeCluster = useMemo(
    () => gkeClusters.find(cluster => gkeClusterKey(cluster) === selectedGkeClusterKey) || null,
    [gkeClusters, selectedGkeClusterKey]
  );

  const selectedEksCluster = useMemo(
    () => eksClusters.find(cluster => cluster.name === selectedEksClusterName) || null,
    [eksClusters, selectedEksClusterName]
  );

  const selectedAksCluster = useMemo(
    () => aksClusters.find(cluster => aksClusterKey(cluster) === selectedAksClusterKey) || null,
    [aksClusters, selectedAksClusterKey]
  );

  useEffect(() => {
    if (clusterType === 'gke' && selectedGkeCluster) {
      setGkeLabel(selectedGkeCluster.name);
    }
  }, [clusterType, selectedGkeCluster]);

  useEffect(() => {
    if (clusterType === 'eks' && selectedEksCluster) {
      setEksLabel(selectedEksCluster.name);
    }
  }, [clusterType, selectedEksCluster]);

  useEffect(() => {
    if (clusterType === 'aks' && selectedAksCluster) {
      setAksLabel(selectedAksCluster.name);
    }
  }, [clusterType, selectedAksCluster]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (clusterType === 'gke') {
        if (!selectedGcpProviderId || !selectedGkeCluster) {
          throw new Error('Select a GCP project and GKE cluster first');
        }

        await api.post('/kubernetes/clusters', {
          label: gkeLabel || selectedGkeCluster.name,
          cluster_type: 'gke',
          provider_id: Number(selectedGcpProviderId),
          cluster_name: selectedGkeCluster.name,
          location: selectedGkeCluster.location,
        });
      } else if (clusterType === 'eks') {
        if (!selectedAwsProviderId || !selectedEksCluster) {
          throw new Error('Select an AWS account and EKS cluster first');
        }

        await api.post('/kubernetes/clusters', {
          label: eksLabel || selectedEksCluster.name,
          cluster_type: 'eks',
          provider_id: Number(selectedAwsProviderId),
          cluster_name: selectedEksCluster.name,
        });
      } else if (clusterType === 'aks') {
        if (!selectedAzureProviderId || !selectedAksCluster) {
          throw new Error('Select an Azure subscription and AKS cluster first');
        }

        await api.post('/kubernetes/clusters', {
          label: aksLabel || selectedAksCluster.name,
          cluster_type: 'aks',
          provider_id: Number(selectedAzureProviderId),
          cluster_name: selectedAksCluster.name,
          resource_group: selectedAksCluster.resourceGroup,
        });
      } else {
        await api.post('/kubernetes/clusters', {
          label: rosaLabel,
          cluster_type: 'rosa',
          api_server_url: apiServerUrl,
          token,
          skip_tls_verify: skipTlsVerify,
        });
      }

      onAdded();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const noGcpProviders = clusterType === 'gke' && !gcpProvidersLoading && gcpProviders.length === 0;
  const noAwsProviders = clusterType === 'eks' && !awsProvidersLoading && awsProviders.length === 0;
  const noAzureProviders = clusterType === 'aks' && !azureProvidersLoading && azureProviders.length === 0;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="card w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-b-none sm:rounded-b-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-neon-blue">
            {modalTitle(clusterType)}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <button
            type="button"
            onClick={() => { setClusterType('rosa'); setError(''); }}
            className={`card text-left transition-colors ${
              clusterType === 'rosa' ? 'border-neon-red/40 bg-neon-red/5' : 'hover:border-surface-500'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Box className="w-4 h-4 text-neon-red" />
              <span className="text-sm font-medium text-gray-200">ROSA</span>
            </div>
            <p className="text-[10px] text-gray-500">Red Hat OpenShift on AWS</p>
          </button>

          <button
            type="button"
            onClick={() => { setClusterType('eks'); setError(''); }}
            className={`card text-left transition-colors ${
              clusterType === 'eks' ? 'border-yellow-500/40 bg-yellow-500/5' : 'hover:border-surface-500'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Cloud className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-gray-200">EKS</span>
            </div>
            <p className="text-[10px] text-gray-500">Amazon Elastic Kubernetes</p>
          </button>

          <button
            type="button"
            onClick={() => { setClusterType('gke'); setError(''); }}
            className={`card text-left transition-colors ${
              clusterType === 'gke' ? 'border-neon-green/40 bg-neon-green/5' : 'hover:border-surface-500'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Monitor className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-gray-200">GKE</span>
            </div>
            <p className="text-[10px] text-gray-500">Google Kubernetes Engine</p>
          </button>

          <button
            type="button"
            onClick={() => { setClusterType('aks'); setError(''); }}
            className={`card text-left transition-colors ${
              clusterType === 'aks' ? 'border-blue-400/40 bg-blue-400/5' : 'hover:border-surface-500'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Cloud className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-gray-200">AKS</span>
            </div>
            <p className="text-[10px] text-gray-500">Azure Kubernetes Service</p>
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-neon-red/10 border border-neon-red/30 rounded text-neon-red text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {clusterType === 'rosa' && (
            <>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Label</label>
                <input
                  type="text"
                  value={rosaLabel}
                  onChange={e => setRosaLabel(e.target.value)}
                  className="input-field"
                  placeholder="My ROSA Cluster"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">API Server URL</label>
                <input
                  type="text"
                  value={apiServerUrl}
                  onChange={e => setApiServerUrl(e.target.value)}
                  className="input-field"
                  placeholder="https://api.cluster.example.com:6443"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Bearer Token</label>
                <input
                  type="password"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  className="input-field"
                  placeholder="Your service account token"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="skipTls"
                  checked={skipTlsVerify}
                  onChange={e => setSkipTlsVerify(e.target.checked)}
                  className="w-4 h-4 accent-neon-green"
                />
                <label htmlFor="skipTls" className="text-gray-400 text-sm">
                  Skip TLS Verify
                  <span className="ml-2 text-[10px] text-gray-600">not recommended for production</span>
                </label>
              </div>

              <div className="text-xs text-gray-500 p-2 bg-surface-900 rounded border border-surface-600">
                Verified via namespace list call · stored encrypted (AES-256-GCM)
              </div>
            </>
          )}

          {clusterType === 'eks' && (
            <>
              <div>
                <label className="block text-gray-400 text-sm mb-1">AWS Account</label>
                <select
                  value={selectedAwsProviderId}
                  onChange={e => setSelectedAwsProviderId(e.target.value)}
                  className="input-field"
                  disabled={awsProvidersLoading || noAwsProviders}
                  required
                >
                  {awsProvidersLoading && <option value="">Loading AWS accounts...</option>}
                  {!awsProvidersLoading && noAwsProviders && <option value="">Connect an AWS account first</option>}
                  {!awsProvidersLoading && awsProviders.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.label} ({provider.region})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Cluster</label>
                <select
                  value={selectedEksClusterName}
                  onChange={e => setSelectedEksClusterName(e.target.value)}
                  className="input-field"
                  disabled={!selectedAwsProviderId || eksClustersLoading || eksClusters.length === 0}
                  required
                >
                  {eksClustersLoading && <option value="">Loading EKS clusters...</option>}
                  {!eksClustersLoading && eksClusters.length === 0 && <option value="">No EKS clusters found</option>}
                  {!eksClustersLoading && eksClusters.map(cluster => (
                    <option key={cluster.name} value={cluster.name}>
                      {cluster.name} ({cluster.region})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Label</label>
                <input
                  type="text"
                  value={eksLabel}
                  onChange={e => setEksLabel(e.target.value)}
                  className="input-field"
                  placeholder="My EKS Cluster"
                  required
                />
              </div>

              <div className="text-xs text-gray-500 p-2 bg-surface-900 rounded border border-surface-600 space-y-1">
                <div>Verified via EKS cluster metadata + namespace list call · stored encrypted (AES-256-GCM)</div>
                {awsRegion && (
                  <div>
                    Region: <span className="text-gray-400 font-mono">{awsRegion}</span>
                  </div>
                )}
                {selectedEksCluster && (
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <span>Status: <span className="text-gray-400">{selectedEksCluster.status}</span></span>
                    <span>Version: <span className="text-gray-400">{selectedEksCluster.version}</span></span>
                    <span className="col-span-2">
                      Platform: <span className="text-gray-400">{selectedEksCluster.platformVersion}</span>
                    </span>
                  </div>
                )}
                {noAwsProviders && (
                  <div className="text-yellow-400/90">
                    Add an AWS account connection in Providers before connecting an EKS cluster.
                  </div>
                )}
              </div>
            </>
          )}

          {clusterType === 'aks' && (
            <>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Azure Subscription</label>
                <select
                  value={selectedAzureProviderId}
                  onChange={e => setSelectedAzureProviderId(e.target.value)}
                  className="input-field"
                  disabled={azureProvidersLoading || noAzureProviders}
                  required
                >
                  {azureProvidersLoading && <option value="">Loading Azure subscriptions...</option>}
                  {!azureProvidersLoading && noAzureProviders && <option value="">Connect an Azure subscription first</option>}
                  {!azureProvidersLoading && azureProviders.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.label} ({provider.region})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Cluster</label>
                <select
                  value={selectedAksClusterKey}
                  onChange={e => setSelectedAksClusterKey(e.target.value)}
                  className="input-field"
                  disabled={!selectedAzureProviderId || aksClustersLoading || aksClusters.length === 0}
                  required
                >
                  {aksClustersLoading && <option value="">Loading AKS clusters...</option>}
                  {!aksClustersLoading && aksClusters.length === 0 && <option value="">No AKS clusters found</option>}
                  {!aksClustersLoading && aksClusters.map(cluster => (
                    <option key={aksClusterKey(cluster)} value={aksClusterKey(cluster)}>
                      {cluster.name} ({cluster.resourceGroup} · {cluster.location})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Label</label>
                <input
                  type="text"
                  value={aksLabel}
                  onChange={e => setAksLabel(e.target.value)}
                  className="input-field"
                  placeholder="My AKS Cluster"
                  required
                />
              </div>

              <div className="text-xs text-gray-500 p-2 bg-surface-900 rounded border border-surface-600 space-y-1">
                <div>Verified via AKS cluster metadata + namespace list call · stored encrypted (AES-256-GCM)</div>
                {subscriptionId && (
                  <div>
                    Subscription: <span className="text-gray-400 font-mono">{subscriptionId}</span>
                  </div>
                )}
                {selectedAksCluster && (
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <span>Status: <span className="text-gray-400">{selectedAksCluster.status}</span></span>
                    <span>Version: <span className="text-gray-400">{selectedAksCluster.version}</span></span>
                    <span>Region: <span className="text-gray-400">{selectedAksCluster.location}</span></span>
                    <span>Node pools: <span className="text-gray-400">{selectedAksCluster.nodePools}</span></span>
                    <span className="col-span-2">
                      Resource group: <span className="text-gray-400">{selectedAksCluster.resourceGroup}</span>
                    </span>
                    <span className="col-span-2">
                      Azure RBAC: <span className="text-gray-400">{selectedAksCluster.azureRbac ? 'Enabled' : 'Disabled / unknown'}</span>
                    </span>
                  </div>
                )}
                {noAzureProviders && (
                  <div className="text-yellow-400/90">
                    Add an Azure subscription connection in Providers before connecting an AKS cluster.
                  </div>
                )}
              </div>
            </>
          )}

          {clusterType === 'gke' && (
            <>
              <div>
                <label className="block text-gray-400 text-sm mb-1">GCP Project</label>
                <select
                  value={selectedGcpProviderId}
                  onChange={e => setSelectedGcpProviderId(e.target.value)}
                  className="input-field"
                  disabled={gcpProvidersLoading || noGcpProviders}
                  required
                >
                  {gcpProvidersLoading && <option value="">Loading GCP projects...</option>}
                  {!gcpProvidersLoading && noGcpProviders && <option value="">Connect a GCP project first</option>}
                  {!gcpProvidersLoading && gcpProviders.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.label} ({provider.region})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Cluster</label>
                <select
                  value={selectedGkeClusterKey}
                  onChange={e => setSelectedGkeClusterKey(e.target.value)}
                  className="input-field"
                  disabled={!selectedGcpProviderId || gkeClustersLoading || gkeClusters.length === 0}
                  required
                >
                  {gkeClustersLoading && <option value="">Loading GKE clusters...</option>}
                  {!gkeClustersLoading && gkeClusters.length === 0 && <option value="">No GKE clusters found</option>}
                  {!gkeClustersLoading && gkeClusters.map(cluster => (
                    <option key={gkeClusterKey(cluster)} value={gkeClusterKey(cluster)}>
                      {cluster.name} ({cluster.location})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Label</label>
                <input
                  type="text"
                  value={gkeLabel}
                  onChange={e => setGkeLabel(e.target.value)}
                  className="input-field"
                  placeholder="My GKE Cluster"
                  required
                />
              </div>

              <div className="text-xs text-gray-500 p-2 bg-surface-900 rounded border border-surface-600 space-y-1">
                <div>Verified via GKE cluster metadata + namespace list call · stored encrypted (AES-256-GCM)</div>
                {projectId && (
                  <div>
                    Project: <span className="text-gray-400 font-mono">{projectId}</span>
                  </div>
                )}
                {selectedGkeCluster && (
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <span>Status: <span className="text-gray-400">{selectedGkeCluster.status}</span></span>
                    <span>Version: <span className="text-gray-400">{selectedGkeCluster.masterVersion}</span></span>
                    <span className="col-span-2">
                      Channel: <span className="text-gray-400">{selectedGkeCluster.releaseChannel}</span>
                    </span>
                  </div>
                )}
                {noGcpProviders && (
                  <div className="text-yellow-400/90">
                    Add a GCP project connection in Providers before connecting a GKE cluster.
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                loading ||
                (clusterType === 'gke' && (noGcpProviders || !selectedGcpProviderId || !selectedGkeCluster)) ||
                (clusterType === 'eks' && (noAwsProviders || !selectedAwsProviderId || !selectedEksCluster)) ||
                (clusterType === 'aks' && (noAzureProviders || !selectedAzureProviderId || !selectedAksCluster))
              }
              className="btn-primary flex-1"
            >
              {loading ? 'Verifying...' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function modalTitle(clusterType: ClusterType): string {
  if (clusterType === 'gke') return 'Connect GKE Cluster';
  if (clusterType === 'eks') return 'Connect EKS Cluster';
  if (clusterType === 'aks') return 'Connect AKS Cluster';
  return 'Connect ROSA Cluster';
}

function gkeClusterKey(cluster: Pick<GkeClusterOption, 'location' | 'name'>): string {
  return `${cluster.location}/${cluster.name}`;
}

function aksClusterKey(cluster: Pick<AksClusterOption, 'resourceGroup' | 'name'>): string {
  return `${cluster.resourceGroup}/${cluster.name}`;
}

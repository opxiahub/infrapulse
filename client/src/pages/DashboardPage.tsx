import { useState, useEffect, useCallback } from 'react';
import { InfraGraph } from '../components/graph/InfraGraph';
import { K8sGraph } from '../components/graph/K8sGraph';
import { ResourceSummary } from '../components/graph/ResourceSummary';
import { K8sSummary } from '../components/graph/K8sSummary';
import { ResourceTypeSelector } from '../components/ResourceTypeSelector';
import { K8sResourceTypeSelector } from '../components/K8sResourceTypeSelector';
import { ChatPanel } from '../components/chat/ChatPanel';
import { useGraph } from '../hooks/useGraph';
import { useMetrics } from '../hooks/useMetrics';
import { useKubernetesGraph } from '../hooks/useKubernetesGraph';
import { K8S_DEFAULT_TYPES } from '../config/k8s-resources';
import { GCP_DEFAULT_TYPES } from '../config/gcp-resources';
import { AZURE_DEFAULT_TYPES } from '../config/azure-resources';
import { api } from '../lib/api';
import { RefreshCw, Loader2, AlertTriangle, Clock, Search, X, Tag, MessageSquare, Box } from 'lucide-react';

interface CloudProviderRow {
  id: number;
  label: string;
  provider: string;
  region: string;
  verified: number;
}

interface K8sCluster {
  id: number;
  label: string;
  cluster_type: string;
  api_server_url: string;
  verified: number;
}

export function DashboardPage() {
  const [providers, setProviders] = useState<CloudProviderRow[]>([]);
  const [k8sClusters, setK8sClusters] = useState<K8sCluster[]>([]);
  const [activeSource, setActiveSource] = useState<string>(''); // 'aws:1', 'gcp:3', 'azure:4', or 'k8s:2'
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['ec2', 'rds', 's3', 'lambda']);
  const [k8sSelectedTypes, setK8sSelectedTypes] = useState<string[]>(K8S_DEFAULT_TYPES);
  const [searchQuery, setSearchQuery] = useState('');
  const [withTags, setWithTags] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const { graphData: awsGraphData, loading: awsLoading, error: awsError, scannedAt: awsScannedAt, activeTypes, fetchTags, fetchGraph, loadCached, setGraphData } = useGraph();
  const {
    graphData: k8sGraphData,
    namespaces,
    selectedNamespace,
    setSelectedNamespace,
    loading: k8sLoading,
    namespacesLoading,
    error: k8sError,
    scannedAt: k8sScannedAt,
    activeTypes: k8sActiveTypes,
    fetchNamespaces,
    loadCached: loadK8sCached,
    fetchResources,
  } = useKubernetesGraph();

  const isK8s = activeSource.startsWith('k8s:');
  const isGcp = activeSource.startsWith('gcp:');
  const isAzure = activeSource.startsWith('azure:');
  const cloudProvider = isAzure ? 'azure' : isGcp ? 'gcp' : 'aws';
  const isCloud = activeSource.startsWith('aws:') || isGcp || isAzure;
  const sourceId = activeSource ? Number(activeSource.split(':')[1]) : null;

  // Only pass AWS provider id to useMetrics (null for k8s/GCP/Azure — no provider-native metric stream yet)
  useMetrics(isK8s || isGcp || isAzure ? null : sourceId, setGraphData);

  // Load all sources on mount
  useEffect(() => {
    Promise.all([
      api.get<{ providers: CloudProviderRow[] }>('/providers').catch(() => ({ providers: [] })),
      api.get<{ clusters: K8sCluster[] }>('/kubernetes/clusters').catch(() => ({ clusters: [] })),
    ]).then(([providerData, k8sData]) => {
      setProviders(providerData.providers);
      setK8sClusters(k8sData.clusters);

      // Auto-select first available source
      const first = providerData.providers[0];
      if (first) {
        const prefix = first.provider === 'azure' ? 'azure' : first.provider === 'gcp' ? 'gcp' : 'aws';
        setActiveSource(`${prefix}:${first.id}`);
      } else if (k8sData.clusters.length > 0) {
        setActiveSource(`k8s:${k8sData.clusters[0].id}`);
      }
    });
  }, []);

  // Load cached graph when a cloud provider (AWS or GCP) source is selected
  useEffect(() => {
    if (!isCloud) return;
    const id = Number(activeSource.split(':')[1]);
    loadCached(id);
  }, [activeSource, isCloud, loadCached]);

  // Sync activeTypes and withTags from useGraph
  useEffect(() => {
    if (activeTypes.length > 0) setSelectedTypes(activeTypes);
  }, [activeTypes]);
  useEffect(() => {
    if (k8sActiveTypes.length > 0) setK8sSelectedTypes(k8sActiveTypes);
  }, [k8sActiveTypes]);
  useEffect(() => {
    setWithTags(fetchTags);
  }, [fetchTags]);

  // Load K8s namespaces when K8s source selected
  useEffect(() => {
    if (!activeSource.startsWith('k8s:')) return;
    const id = Number(activeSource.split(':')[1]);
    fetchNamespaces(id);
  }, [activeSource, fetchNamespaces]);

  useEffect(() => {
    if (!activeSource.startsWith('k8s:') || !selectedNamespace) return;
    const id = Number(activeSource.split(':')[1]);
    loadK8sCached(id, selectedNamespace);
  }, [activeSource, selectedNamespace, loadK8sCached]);

  const handleSourceChange = (val: string) => {
    setActiveSource(val);
    setSearchQuery('');
    if (val.startsWith('azure:')) {
      setSelectedTypes([...AZURE_DEFAULT_TYPES]);
      setWithTags(false);
    } else if (val.startsWith('gcp:')) {
      setSelectedTypes([...GCP_DEFAULT_TYPES]);
      setWithTags(false);
    } else if (val.startsWith('aws:')) {
      setSelectedTypes(['ec2', 'rds', 's3', 'lambda']);
      setWithTags(false);
    }
  };

  const handleCloudScan = useCallback(() => {
    if (!sourceId || isK8s) return;
    fetchGraph(sourceId, selectedTypes, withTags);
  }, [sourceId, isK8s, selectedTypes, withTags, fetchGraph]);

  const handleK8sFetch = useCallback(() => {
    if (!sourceId || !isK8s || !selectedNamespace) return;
    fetchResources(sourceId, selectedNamespace, k8sSelectedTypes);
  }, [sourceId, isK8s, selectedNamespace, k8sSelectedTypes, fetchResources]);

  const hasAnySources = providers.length > 0 || k8sClusters.length > 0;
  if (!hasAnySources) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No sources connected.</p>
          <p className="text-sm mt-1">Go to Providers to connect AWS, GCP, Azure, or Kubernetes.</p>
        </div>
      </div>
    );
  }

  const activeProvider = isCloud && sourceId ? providers.find(p => p.id === sourceId) : null;
  const activeCluster = isK8s && sourceId ? k8sClusters.find(c => c.id === sourceId) : null;

  const loading = isK8s ? k8sLoading : awsLoading;
  const error = isK8s ? k8sError : awsError;
  const graphData = isK8s ? k8sGraphData : awsGraphData;
  const scannedAt = isK8s ? k8sScannedAt : awsScannedAt;

  const matchCount = searchQuery.trim()
    ? graphData?.nodes.filter(n => {
        const q = searchQuery.toLowerCase();
        const vals = [n.label, n.id, ...Object.values(n.metadata || {}).filter(v => typeof v === 'string')]
          .map(v => String(v).toLowerCase());
        return vals.some(v => v.includes(q));
      }).length ?? 0
    : null;

  return (
    <div className="h-full flex flex-col">
      {/* Controls bar */}
      <div className="p-3 border-b border-surface-600 bg-surface-900 flex items-center gap-3 flex-wrap">
        {/* Unified source selector */}
        <div className="flex items-center gap-2">
          {isK8s ? (
            <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-neon-purple/15 text-neon-purple">
              {activeCluster?.cluster_type?.toUpperCase() ?? 'K8S'}
            </span>
          ) : isGcp ? (
            <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-neon-blue/15 text-neon-blue">
              GCP
            </span>
          ) : isAzure ? (
            <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-blue-400/15 text-blue-400">
              AZURE
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-500">
              AWS
            </span>
          )}
          <select
            value={activeSource}
            onChange={e => handleSourceChange(e.target.value)}
            className="input-field w-auto text-xs"
          >
            {providers.filter(p => p.provider === 'aws').length > 0 && (
              <optgroup label="AWS Providers">
                {providers.filter(p => p.provider === 'aws').map(p => (
                  <option key={`aws:${p.id}`} value={`aws:${p.id}`}>
                    {p.label} ({p.region})
                  </option>
                ))}
              </optgroup>
            )}
            {providers.filter(p => p.provider === 'gcp').length > 0 && (
              <optgroup label="GCP Projects">
                {providers.filter(p => p.provider === 'gcp').map(p => (
                  <option key={`gcp:${p.id}`} value={`gcp:${p.id}`}>
                    {p.label} ({p.region})
                  </option>
                ))}
              </optgroup>
            )}
            {providers.filter(p => p.provider === 'azure').length > 0 && (
              <optgroup label="Azure Subscriptions">
                {providers.filter(p => p.provider === 'azure').map(p => (
                  <option key={`azure:${p.id}`} value={`azure:${p.id}`}>
                    {p.label} ({p.region})
                  </option>
                ))}
              </optgroup>
            )}
            {k8sClusters.length > 0 && (
              <optgroup label="Kubernetes">
                {k8sClusters.map(c => (
                  <option key={`k8s:${c.id}`} value={`k8s:${c.id}`}>
                    {c.label} [{c.cluster_type.toUpperCase()}]
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        <div className="w-px h-6 bg-surface-600" />

        {/* Cloud controls */}
        {isCloud && (
          <>
            <ResourceTypeSelector selected={selectedTypes} onChange={setSelectedTypes} cloud={cloudProvider} />
            <div className="w-px h-6 bg-surface-600" />
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name or ID..."
                className="input-field pl-8 pr-8 w-52 text-xs"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {matchCount !== null && (
              <span className="text-[10px] text-gray-500">{matchCount} {matchCount === 1 ? 'match' : 'matches'}</span>
            )}
            {!isGcp && (
              <label className="flex items-center gap-1.5 cursor-pointer ml-auto select-none">
                <input type="checkbox" checked={withTags} onChange={e => setWithTags(e.target.checked)} className="w-3.5 h-3.5 accent-neon-blue" />
                <Tag className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[11px] text-gray-400">Fetch Tags</span>
              </label>
            )}
            <button
              onClick={handleCloudScan}
              disabled={awsLoading || !sourceId || selectedTypes.length === 0}
              className={`btn-primary flex items-center gap-2 ${isGcp || isAzure ? 'ml-auto' : ''}`}
            >
              {awsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {awsLoading ? 'Scanning...' : 'Scan Resources'}
            </button>
          </>
        )}

        {/* K8s-specific controls */}
        {isK8s && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Namespace</span>
              {namespacesLoading ? (
                <span className="text-xs text-gray-500 animate-pulse">Loading...</span>
              ) : (
                <select
                  value={selectedNamespace}
                  onChange={e => setSelectedNamespace(e.target.value)}
                  className="input-field w-auto text-xs"
                >
                  {namespaces.map(ns => (
                    <option key={ns} value={ns}>{ns}</option>
                  ))}
                </select>
              )}
            </div>
            <K8sResourceTypeSelector selected={k8sSelectedTypes} onChange={setK8sSelectedTypes} />
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name or ID..."
                className="input-field pl-8 pr-8 w-52 text-xs"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {matchCount !== null && (
              <span className="text-[10px] text-gray-500">{matchCount} {matchCount === 1 ? 'match' : 'matches'}</span>
            )}
            <button
              onClick={handleK8sFetch}
              disabled={k8sLoading || !selectedNamespace || namespacesLoading || k8sSelectedTypes.length === 0}
              className="btn-primary flex items-center gap-2 ml-auto"
            >
              {k8sLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Box className="w-4 h-4" />}
              {k8sLoading ? 'Fetching...' : 'Fetch Resources'}
            </button>
          </>
        )}
      </div>

      {/* Summary strip */}
      {isCloud && awsGraphData && awsGraphData.nodes.length > 0 && (
        <ResourceSummary graphData={awsGraphData} cloud={cloudProvider} />
      )}
      {isK8s && k8sGraphData && k8sGraphData.nodes.length > 0 && (
        <K8sSummary graphData={k8sGraphData} namespace={selectedNamespace} />
      )}

      {/* Last scanned timestamp */}
      {scannedAt && (
        <div className="px-3 py-1 bg-surface-950 border-b border-surface-600 flex items-center gap-1.5 text-[10px] text-gray-600">
          <Clock className="w-3 h-3" />
          Last scanned: {new Date(scannedAt).toLocaleString()}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-3 mt-3 p-3 bg-neon-red/10 border border-neon-red/30 rounded text-neon-red text-sm">
          {error}
        </div>
      )}

      {/* Graph area */}
      <div className="flex-1 overflow-hidden">
        {graphData ? (
          graphData.nodes.length > 0 ? (
            isK8s ? (
              <K8sGraph graphData={graphData} searchQuery={searchQuery} />
            ) : (
              <InfraGraph graphData={graphData} searchQuery={searchQuery} />
            )
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <p>No resources found.</p>
                <p className="text-sm mt-1">
                  {isK8s ? 'Try selecting a different namespace.' : 'Try selecting different resource types or check your region.'}
                </p>
              </div>
            </div>
          )
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full border-2 border-neon-green/20 flex items-center justify-center">
                <RefreshCw className={`w-8 h-8 text-neon-green/30 ${loading ? 'animate-spin' : ''}`} />
              </div>
              {loading
                ? <p className="text-neon-green/60 animate-pulse">
                    {isK8s ? 'Fetching resources...' : 'Scanning your infrastructure...'}
                  </p>
                : <p className="text-sm">
                    {isK8s
                      ? <>Select a namespace above and click <span className="text-gray-300 font-medium">Fetch Resources</span>.</>
                      : <>Select the resource types above and click <span className="text-gray-300 font-medium">Scan Resources</span>.</>
                    }
                  </p>
              }
            </div>
          </div>
        )}
      </div>

      {/* Stats bar */}
      {graphData && graphData.nodes.length > 0 && (
        <div className="p-2 border-t border-surface-600 bg-surface-900 flex items-center gap-6 text-[10px] text-gray-500">
          <span>Nodes: <span className="text-gray-300">{graphData.nodes.length}</span></span>
          <span>Edges: <span className="text-gray-300">{graphData.edges.length}</span></span>
          {isCloud && (
            <>
              <span>Manual: <span className="text-neon-red">{graphData.nodes.filter(n => n.isManual).length}</span></span>
              <span>Managed: <span className="text-neon-green">{graphData.nodes.filter(n => !n.isManual).length}</span></span>
            </>
          )}
          {isK8s && activeCluster && (
            <span className="text-neon-purple">{activeCluster.label}</span>
          )}
        </div>
      )}

      {/* Floating Chat Button */}
      {!isChatOpen && graphData && graphData.nodes.length > 0 && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-neon-green shadow-lg hover:shadow-neon-green/50 transition-all flex items-center justify-center group z-40"
          title={isK8s ? 'Open Kubernetes Assistant' : 'Open Infrastructure Assistant'}
        >
          <MessageSquare className="w-6 h-6 text-surface-900" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-neon-blue rounded-full animate-pulse" />
        </button>
      )}

      {/* Chat Panel */}
      {(activeProvider || activeCluster) && (
        <ChatPanel
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          sourceType={isK8s ? 'k8s' : cloudProvider}
          sourceId={sourceId}
          sourceLabel={isK8s ? (activeCluster?.label || 'Kubernetes Cluster') : (activeProvider?.label || 'Cloud Provider')}
          sourceSubtitle={isK8s
            ? `${activeCluster?.cluster_type?.toUpperCase() || 'K8S'} • namespace ${selectedNamespace || 'n/a'}`
            : (activeProvider?.region || 'unknown region')}
          namespace={isK8s ? selectedNamespace : undefined}
        />
      )}
    </div>
  );
}

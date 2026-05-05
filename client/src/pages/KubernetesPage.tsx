import { useState, useEffect, useCallback } from 'react';
import { Box, Cloud, Monitor, Plus } from 'lucide-react';
import { api } from '../lib/api';
import { AddClusterModal } from '../components/kubernetes/AddClusterModal';
import { ClusterList } from '../components/kubernetes/ClusterList';

interface Cluster {
  id: number;
  label: string;
  cluster_type: string;
  api_server_url: string;
  verified: number;
  created_at: string;
}

export function KubernetesPage() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalClusterType, setModalClusterType] = useState<'rosa' | 'eks' | 'gke' | 'aks'>('rosa');

  const fetchClusters = useCallback(async () => {
    try {
      const data = await api.get<{ clusters: Cluster[] }>('/kubernetes/clusters');
      setClusters(data.clusters);
    } catch (_) {}
  }, []);

  useEffect(() => { fetchClusters(); }, [fetchClusters]);

  const distros = [
    { key: 'rosa', label: 'ROSA', sublabel: 'Red Hat OpenShift on AWS', icon: <Box className="w-5 h-5 text-neon-red" />, active: true },
    { key: 'eks',  label: 'EKS',  sublabel: 'Amazon Elastic Kubernetes',  icon: <Cloud className="w-5 h-5 text-yellow-500" />, active: true },
    { key: 'aks',  label: 'AKS',  sublabel: 'Azure Kubernetes Service',    icon: <Cloud className="w-5 h-5 text-blue-400" />, active: true },
    { key: 'gke',  label: 'GKE',  sublabel: 'Google Kubernetes Engine',    icon: <Monitor className="w-5 h-5 text-green-400" />, active: true },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Kubernetes</h1>
          <p className="text-sm text-gray-500">Connect and manage Kubernetes clusters</p>
        </div>
        <button
          onClick={() => {
            setModalClusterType('rosa');
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Cluster
        </button>
      </div>

      {/* Distribution cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {distros.map(d => (
          d.active ? (
            <button
              key={d.key}
              onClick={() => {
                setModalClusterType(d.key as 'rosa' | 'eks' | 'gke' | 'aks');
                setShowModal(true);
              }}
              className={`card transition-colors text-left ${
                d.key === 'aks'
                  ? 'hover:border-blue-400/30'
                  : d.key === 'gke'
                  ? 'hover:border-neon-green/30'
                  : d.key === 'eks'
                    ? 'hover:border-yellow-500/30'
                    : 'hover:border-neon-red/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {d.icon}
                <span className="font-medium text-sm text-gray-200">{d.label}</span>
              </div>
              <p className="text-[10px] text-gray-500">{d.sublabel}</p>
            </button>
          ) : (
            <div key={d.key} className="card opacity-40 cursor-not-allowed">
              <div className="flex items-center gap-2 mb-1">
                {d.icon}
                <span className="font-medium text-sm text-gray-200">{d.label}</span>
              </div>
              <p className="text-[10px] text-gray-500">Coming Soon</p>
            </div>
          )
        ))}
      </div>

      <ClusterList
        clusters={clusters}
        selectedId={null}
        onSelect={() => {}}
        onRefresh={fetchClusters}
      />

      {showModal && (
        <AddClusterModal
          initialClusterType={modalClusterType}
          onClose={() => setShowModal(false)}
          onAdded={() => { fetchClusters(); setShowModal(false); }}
        />
      )}
    </div>
  );
}

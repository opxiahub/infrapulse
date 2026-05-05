import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProviderList } from '../components/providers/ProviderList';
import { AddProviderModal } from '../components/providers/AddProviderModal';
import { api } from '../lib/api';
import { Plus, Cloud, Monitor, CloudCog } from 'lucide-react';

interface Provider {
  id: number;
  label: string;
  provider: string;
  region: string;
  verified: number;
  credential_type: 'permanent' | 'temporary';
  created_at: string;
}

export function ProvidersPage() {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalProvider, setModalProvider] = useState<'aws' | 'gcp' | 'azure'>('aws');

  const fetchProviders = useCallback(async () => {
    const data = await api.get<{ providers: Provider[] }>('/providers');
    setProviders(data.providers);
  }, []);

  useEffect(() => { fetchProviders(); }, [fetchProviders]);

  const handleProviderAdded = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-100">Cloud Providers</h1>
          <p className="text-sm text-gray-500">Connect and manage your cloud accounts</p>
        </div>
        <button
          onClick={() => {
            setModalProvider('aws');
            setShowModal(true);
          }}
          className="btn-primary min-h-11 sm:min-h-0 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Connect Provider
        </button>
      </div>

      {/* Provider type cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <button
          onClick={() => {
            setModalProvider('aws');
            setShowModal(true);
          }}
          className="card hover:border-yellow-500/30 transition-colors text-left"
        >
          <div className="flex items-center gap-2 mb-2">
            <Cloud className="w-5 h-5 text-yellow-500" />
            <span className="font-medium text-sm text-gray-200">AWS</span>
          </div>
          <p className="text-[10px] text-gray-500">Amazon Web Services</p>
        </button>

        <button
          onClick={() => {
            setModalProvider('gcp');
            setShowModal(true);
          }}
          className="card hover:border-neon-blue/30 transition-colors text-left"
        >
          <div className="flex items-center gap-2 mb-2">
            <Monitor className="w-5 h-5 text-neon-blue" />
            <span className="font-medium text-sm text-gray-200">GCP</span>
          </div>
          <p className="text-[10px] text-gray-500">Google Cloud Platform</p>
        </button>

        <button
          onClick={() => {
            setModalProvider('azure');
            setShowModal(true);
          }}
          className="card hover:border-blue-400/30 transition-colors text-left"
        >
          <div className="flex items-center gap-2 mb-2">
            <CloudCog className="w-5 h-5 text-blue-400" />
            <span className="font-medium text-sm text-gray-200">Azure</span>
          </div>
          <p className="text-[10px] text-gray-500">Microsoft Azure</p>
        </button>
      </div>

      <ProviderList providers={providers} onRefresh={fetchProviders} />

      {showModal && (
        <AddProviderModal
          provider={modalProvider}
          onClose={() => setShowModal(false)}
          onAdded={handleProviderAdded}
        />
      )}
    </div>
  );
}

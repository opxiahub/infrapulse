import { useEffect, useState } from 'react';
import { X, Clock, Key, FileJson, Cloud, Monitor, CloudCog } from 'lucide-react';
import { api } from '../../lib/api';
import { GCP_REGIONS } from '../../config/gcp-resources';
import { AZURE_REGIONS } from '../../config/azure-resources';

interface Props {
  onClose: () => void;
  onAdded: () => void;
  provider?: 'aws' | 'gcp' | 'azure';
}

type ProviderType = 'aws' | 'gcp' | 'azure';

const AWS_REGIONS = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'eu-west-1', 'eu-west-2', 'eu-central-1',
  'ap-south-1', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1',
];

export function AddProviderModal({ onClose, onAdded, provider = 'aws' }: Props) {
  const [selectedProvider, setSelectedProvider] = useState<ProviderType>(provider);

  useEffect(() => {
    setSelectedProvider(provider);
  }, [provider]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-neon-blue">
            {selectedProvider === 'azure'
              ? 'Connect Azure Subscription'
              : selectedProvider === 'gcp'
                ? 'Connect GCP Project'
                : 'Connect AWS Account'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setSelectedProvider('aws')}
            className={`card text-left transition-colors ${
              selectedProvider === 'aws' ? 'border-yellow-500/40 bg-yellow-500/5' : 'hover:border-surface-500'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Cloud className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-gray-200">AWS</span>
            </div>
            <p className="text-[10px] text-gray-500">Amazon Web Services</p>
          </button>
          <button
            type="button"
            onClick={() => setSelectedProvider('gcp')}
            className={`card text-left transition-colors ${
              selectedProvider === 'gcp' ? 'border-neon-blue/40 bg-neon-blue/5' : 'hover:border-surface-500'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Monitor className="w-4 h-4 text-neon-blue" />
              <span className="text-sm font-medium text-gray-200">GCP</span>
            </div>
            <p className="text-[10px] text-gray-500">Google Cloud Platform</p>
          </button>
          <button
            type="button"
            onClick={() => setSelectedProvider('azure')}
            className={`card text-left transition-colors ${
              selectedProvider === 'azure' ? 'border-blue-400/40 bg-blue-400/5' : 'hover:border-surface-500'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <CloudCog className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-gray-200">Azure</span>
            </div>
            <p className="text-[10px] text-gray-500">Microsoft Azure</p>
          </button>
        </div>

        {selectedProvider === 'azure'
          ? <AzureForm onClose={onClose} onAdded={onAdded} />
          : selectedProvider === 'gcp'
            ? <GcpForm onClose={onClose} onAdded={onAdded} />
            : <AwsForm onClose={onClose} onAdded={onAdded} />}
      </div>
    </div>
  );
}

function AwsForm({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [label, setLabel] = useState('');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [region, setRegion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isTemporary = sessionToken.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/providers', {
        label,
        provider: 'aws',
        region,
        accessKeyId,
        secretAccessKey,
        ...(isTemporary ? { sessionToken: sessionToken.trim() } : {}),
      });
      onAdded();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded mb-4 border transition-all duration-200 ${
        isTemporary
          ? 'bg-neon-blue/10 border-neon-blue/30 text-neon-blue'
          : 'bg-surface-700 border-surface-600 text-gray-400'
      }`}>
        {isTemporary ? <Clock className="w-3 h-3" /> : <Key className="w-3 h-3" />}
        {isTemporary
          ? 'Temporary credentials (session token detected)'
          : 'Long-lived credentials (no session token)'}
      </div>

      {error && (
        <div className="p-3 mb-4 bg-neon-red/10 border border-neon-red/30 rounded text-neon-red text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-gray-400 text-sm mb-1">Label</label>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="input-field"
            placeholder="My AWS Account"
            required
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Access Key ID</label>
          <input
            type="text"
            value={accessKeyId}
            onChange={e => setAccessKeyId(e.target.value)}
            className="input-field"
            placeholder="AKIA... or ASIA... (temporary)"
            required
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Secret Access Key</label>
          <input
            type="password"
            value={secretAccessKey}
            onChange={e => setSecretAccessKey(e.target.value)}
            className="input-field"
            placeholder="Your secret access key"
            required
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">
            Session Token
            <span className="ml-2 text-[10px] text-gray-600 normal-case tracking-normal">
              optional — required for ASIA... keys
            </span>
          </label>
          <textarea
            value={sessionToken}
            onChange={e => setSessionToken(e.target.value)}
            className="input-field resize-none font-mono text-[11px]"
            placeholder="Paste your AWS_SESSION_TOKEN here (leave blank for permanent credentials)"
            rows={4}
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Region</label>
          <select
            value={region}
            onChange={e => setRegion(e.target.value)}
            className="input-field"
            required
          >
            <option value="" disabled>Select a region</option>
            {AWS_REGIONS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-gray-500 p-2 bg-surface-900 rounded border border-surface-600 space-y-1">
          <div>Validated via STS GetCallerIdentity &middot; stored encrypted (AES-256-GCM)</div>
          {isTemporary && (
            <div className="text-neon-blue/70">
              Note: temporary credentials expire. Reconnect when they expire.
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? 'Verifying...' : 'Connect'}
          </button>
        </div>
      </form>
    </>
  );
}

function GcpForm({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [label, setLabel] = useState('');
  const [serviceAccountJson, setServiceAccountJson] = useState('');
  const [region, setRegion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  let projectId: string | null = null;
  let clientEmail: string | null = null;
  if (serviceAccountJson.trim()) {
    try {
      const parsed = JSON.parse(serviceAccountJson);
      projectId = parsed.project_id || null;
      clientEmail = parsed.client_email || null;
    } catch {
      // ignore parse errors while typing
    }
  }
  const jsonValid = !!projectId && !!clientEmail;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/providers', {
        label,
        provider: 'gcp',
        region: region || 'global',
        serviceAccountJson: serviceAccountJson.trim(),
      });
      onAdded();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded mb-4 border transition-all duration-200 ${
        jsonValid
          ? 'bg-neon-green/10 border-neon-green/30 text-neon-green'
          : 'bg-surface-700 border-surface-600 text-gray-400'
      }`}>
        <FileJson className="w-3 h-3" />
        {jsonValid
          ? `Service account detected · project ${projectId}`
          : 'Paste a service account JSON key'}
      </div>

      {error && (
        <div className="p-3 mb-4 bg-neon-red/10 border border-neon-red/30 rounded text-neon-red text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-gray-400 text-sm mb-1">Label</label>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="input-field"
            placeholder="My GCP Project"
            required
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">
            Service Account JSON
            <span className="ml-2 text-[10px] text-gray-600 normal-case tracking-normal">
              Project IAM &gt; Service Accounts &gt; Keys &gt; Add Key
            </span>
          </label>
          <textarea
            value={serviceAccountJson}
            onChange={e => setServiceAccountJson(e.target.value)}
            className="input-field resize-none font-mono text-[10px]"
            placeholder='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
            rows={10}
            required
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Default Region</label>
          <select
            value={region}
            onChange={e => setRegion(e.target.value)}
            className="input-field"
          >
            <option value="">global</option>
            {GCP_REGIONS.filter(r => r !== 'global').map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-gray-500 p-2 bg-surface-900 rounded border border-surface-600 space-y-1">
          <div>Validated via Cloud Resource Manager &middot; stored encrypted (AES-256-GCM)</div>
          {clientEmail && (
            <div className="text-neon-green/70 break-all">{clientEmail}</div>
          )}
          <div className="text-gray-600">
            Recommended IAM role: <span className="text-gray-400">Viewer</span> (read-only across the project)
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={loading || !jsonValid} className="btn-primary flex-1">
            {loading ? 'Verifying...' : 'Connect'}
          </button>
        </div>
      </form>
    </>
  );
}

function AzureForm({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [label, setLabel] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [subscriptionId, setSubscriptionId] = useState('');
  const [region, setRegion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isComplete = tenantId.trim() && clientId.trim() && clientSecret.trim() && subscriptionId.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/providers', {
        label,
        provider: 'azure',
        tenantId: tenantId.trim(),
        clientId: clientId.trim(),
        clientSecret,
        subscriptionId: subscriptionId.trim(),
        region: region || 'global',
      });
      onAdded();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded mb-4 border transition-all duration-200 ${
        isComplete
          ? 'bg-blue-400/10 border-blue-400/30 text-blue-300'
          : 'bg-surface-700 border-surface-600 text-gray-400'
      }`}>
        <Key className="w-3 h-3" />
        {isComplete ? 'Service principal details ready' : 'Enter Azure service principal credentials'}
      </div>

      {error && (
        <div className="p-3 mb-4 bg-neon-red/10 border border-neon-red/30 rounded text-neon-red text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-gray-400 text-sm mb-1">Label</label>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="input-field"
            placeholder="My Azure Subscription"
            required
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Tenant ID</label>
          <input
            type="text"
            value={tenantId}
            onChange={e => setTenantId(e.target.value)}
            className="input-field font-mono text-xs"
            placeholder="Directory / tenant ID"
            required
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Client ID</label>
          <input
            type="text"
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            className="input-field font-mono text-xs"
            placeholder="Application / client ID"
            required
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Client Secret</label>
          <input
            type="password"
            value={clientSecret}
            onChange={e => setClientSecret(e.target.value)}
            className="input-field"
            placeholder="Service principal client secret"
            required
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Subscription ID</label>
          <input
            type="text"
            value={subscriptionId}
            onChange={e => setSubscriptionId(e.target.value)}
            className="input-field font-mono text-xs"
            placeholder="Azure subscription ID"
            required
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Default Region</label>
          <select
            value={region}
            onChange={e => setRegion(e.target.value)}
            className="input-field"
          >
            <option value="">global</option>
            {AZURE_REGIONS.filter(r => r !== 'global').map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-gray-500 p-2 bg-surface-900 rounded border border-surface-600 space-y-1">
          <div>Validated via Azure Resource Manager &middot; stored encrypted (AES-256-GCM)</div>
          <div className="text-gray-600">
            Recommended role: <span className="text-gray-400">Reader</span> at subscription or resource-group scope.
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={loading || !isComplete} className="btn-primary flex-1">
            {loading ? 'Verifying...' : 'Connect'}
          </button>
        </div>
      </form>
    </>
  );
}

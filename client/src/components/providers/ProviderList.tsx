import { Cloud, Trash2, CheckCircle, XCircle, Clock, Key } from 'lucide-react';
import { api } from '../../lib/api';

interface Provider {
  id: number;
  label: string;
  provider: string;
  region: string;
  verified: number;
  credential_type: 'permanent' | 'temporary';
  created_at: string;
}

interface Props {
  providers: Provider[];
  onRefresh: () => void;
}

export function ProviderList({ providers, onRefresh }: Props) {
  const handleDelete = async (id: number) => {
    if (!confirm('Remove this provider connection?')) return;
    await api.delete(`/providers/${id}`);
    onRefresh();
  };

  if (providers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Cloud className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No cloud providers connected yet.</p>
        <p className="text-sm">Connect AWS, GCP, or Azure to start visualizing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {providers.map(p => {
        const isTemporary = p.credential_type === 'temporary';
        const isGcp = p.provider === 'gcp';
        const isAzure = p.provider === 'azure';
        const badgeColor = isAzure ? 'text-blue-400' : isGcp ? 'text-neon-blue' : 'text-yellow-500';
        const badgeLabel = isAzure ? 'AZURE' : isGcp ? 'GCP' : 'AWS';
        return (
          <div key={p.id} className="card flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded bg-surface-700 flex items-center justify-center shrink-0">
                <span className={`${isAzure ? 'text-xs' : 'text-lg'} font-bold ${badgeColor}`}>
                  {badgeLabel}
                </span>
              </div>
              <div className="min-w-0">
                <div className="font-medium text-gray-200 truncate">{p.label}</div>
                <div className="text-xs text-gray-500">{p.region} &middot; {p.provider.toUpperCase()}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Credential type badge — AWS only (GCP/Azure use long-lived app credentials) */}
              {!isGcp && !isAzure && (
                <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border ${
                  isTemporary
                    ? 'text-neon-blue border-neon-blue/30 bg-neon-blue/10'
                    : 'text-gray-500 border-surface-600 bg-surface-700'
                }`}>
                  {isTemporary
                    ? <><Clock className="w-3 h-3" /> Temporary</>
                    : <><Key className="w-3 h-3" /> Permanent</>
                  }
                </span>
              )}

              {p.verified ? (
                <span className="flex items-center gap-1 text-xs text-neon-green">
                  <CheckCircle className="w-3 h-3" /> Verified
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-neon-red">
                  <XCircle className="w-3 h-3" /> Unverified
                </span>
              )}

              <button
                onClick={() => handleDelete(p.id)}
                className="text-gray-500 hover:text-neon-red transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

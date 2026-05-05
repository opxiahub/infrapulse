import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export function RegisterForm({ onToggle }: { onToggle: () => void }) {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, displayName);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold text-neon-green mb-6">Create Account</h2>

      {error && (
        <div className="p-3 bg-neon-red/10 border border-neon-red/30 rounded text-neon-red text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-gray-400 text-sm mb-1">Display Name</label>
        <input
          type="text"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          className="input-field"
          placeholder="Your name"
        />
      </div>

      <div>
        <label className="block text-gray-400 text-sm mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="input-field"
          placeholder="you@example.com"
          required
        />
      </div>

      <div>
        <label className="block text-gray-400 text-sm mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="input-field"
          placeholder="Choose a password"
          required
          minLength={6}
        />
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Creating account...' : 'Create Account'}
      </button>

      <p className="text-gray-500 text-sm text-center">
        Already have an account?{' '}
        <button type="button" onClick={onToggle} className="text-neon-blue hover:underline">
          Sign In
        </button>
      </p>
    </form>
  );
}

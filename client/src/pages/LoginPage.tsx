import { useState } from 'react';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { GoogleButton } from '../components/auth/GoogleButton';
import { Activity } from 'lucide-react';

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Activity className="w-12 h-12 text-neon-green mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-neon-green tracking-wider">INFRAPULSE</h1>
          <p className="text-gray-500 text-sm mt-1">Living Infrastructure Visualizer</p>
        </div>

        <div className="card">
          {isLogin ? (
            <LoginForm onToggle={() => setIsLogin(false)} />
          ) : (
            <RegisterForm onToggle={() => setIsLogin(true)} />
          )}

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surface-600" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-surface-800 text-gray-500">or</span>
            </div>
          </div>

          <GoogleButton />
        </div>
      </div>
    </div>
  );
}

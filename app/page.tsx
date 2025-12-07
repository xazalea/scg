'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(errorParam === 'auth_failed' 
        ? 'Authentication failed. Please try again.' 
        : 'An error occurred. Please try again.');
    }
  }, [searchParams]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get('/api/auth/login');
      if (response.data.authUrl) {
        window.location.href = response.data.authUrl;
      } else {
        setError('Failed to initiate authentication');
        setLoading(false);
      }
    } catch (err) {
      setError('Failed to connect to authentication service');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 magic-gradient">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-6xl md:text-8xl font-bold mb-4 magic-text sparkle">
          SCG
        </h1>
        <p className="text-2xl md:text-3xl mb-2 text-white/90">
          Free Cloud Shell
        </p>
        <p className="text-lg md:text-xl mb-8 text-white/70 italic">
          powered by magic ✨
        </p>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8 magic-glow border border-white/20">
          <p className="text-lg mb-6 text-white/90">
            Access your cloud development environment instantly. 
            No setup required, just sign in and start coding.
          </p>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
              <p className="text-red-200">{error}</p>
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="bg-white text-purple-600 px-8 py-4 rounded-xl font-semibold text-lg 
                     hover:bg-purple-50 transition-all duration-300 transform hover:scale-105 
                     disabled:opacity-50 disabled:cursor-not-allowed magic-glow"
          >
            {loading ? 'Connecting...' : 'Sign in with Google'}
          </button>
        </div>

        <div className="text-sm text-white/60">
          <p>Secure • Fast • Free</p>
        </div>
      </div>
    </div>
  );
}


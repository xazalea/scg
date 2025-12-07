'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { generateShellUrl } from '@/lib/utils/shell';

export default function ShellPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const initializeShell = async () => {
      try {
        // Get shell URL from proxy
        const response = await axios.get('/api/shell/proxy', {
          withCredentials: true,
        });

        if (response.data.shellUrl) {
          setAccessToken('authenticated'); // Mark as authenticated
          setLoading(false);
        } else {
          throw new Error('No shell URL received');
        }
      } catch (err: any) {
        console.error('Shell initialization error:', err);
        if (err.response?.status === 401) {
          router.push('/?error=session_expired');
        } else {
          setError('Failed to initialize shell. Please try logging in again.');
        }
      }
    };

    initializeShell();
  }, [router]);

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout', {}, { withCredentials: true });
      router.push('/');
    } catch (err) {
      console.error('Logout error:', err);
      router.push('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center magic-gradient">
        <div className="text-center">
          <div className="text-4xl mb-4">✨</div>
          <p className="text-xl text-white/90">Loading your cloud shell...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center magic-gradient">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 magic-glow border border-white/20">
            <p className="text-red-200 mb-6">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-white text-purple-600 px-6 py-3 rounded-xl font-semibold 
                       hover:bg-purple-50 transition-all duration-300"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Google Cloud Shell URL
  // Note: The iframe will use the user's Google session from the OAuth flow
  const shellUrl = generateShellUrl({ showIde: true, showTerminal: true });

  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold magic-text">SCG</h1>
          <span className="text-sm text-gray-400 italic">powered by magic ✨</span>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg 
                   transition-colors duration-200 text-sm font-medium"
        >
          Logout
        </button>
      </header>

      {/* Shell Container */}
      <div className="flex-1 relative">
        <iframe
          ref={iframeRef}
          src={shellUrl}
          className="w-full h-full border-0"
          allow="clipboard-read; clipboard-write"
          title="Google Cloud Shell"
          style={{ minHeight: 'calc(100vh - 60px)' }}
        />
      </div>
    </div>
  );
}


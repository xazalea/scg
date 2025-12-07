'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Automatically create fake authentication and redirect to shell
    const initializeFakeAuth = async () => {
      try {
        // Create fake session
        await axios.get('/api/auth/fake', { withCredentials: true });
        // Redirect to shell
        router.push('/shell');
      } catch (error) {
        console.error('Failed to initialize:', error);
        // Still redirect even if fake auth fails
        router.push('/shell');
      }
    };

    initializeFakeAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center monochrome-bg sphere-bg grid-pattern">
      <div className="text-center z-10 relative">
        <div className="mb-8">
          <h1 className="monochrome-title mb-4">SCG</h1>
          <p className="monochrome-subtitle">Cloud Shell</p>
        </div>
        {loading && (
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <div className="status-indicator"></div>
            <span className="text-sm">Initializing...</span>
          </div>
        )}
      </div>
    </div>
  );
}

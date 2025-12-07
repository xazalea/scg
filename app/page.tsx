'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to shell without authentication
    router.push('/shell');
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 magic-gradient">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-pulse">✨</div>
        <p className="text-xl text-white/90">Loading SCG Cloud Shell...</p>
      </div>
    </div>
  );
}

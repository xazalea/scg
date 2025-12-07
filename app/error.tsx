'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center magic-gradient">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 magic-glow border border-white/20">
          <h2 className="text-2xl font-bold mb-4 text-red-200">Something went wrong!</h2>
          <p className="text-white/80 mb-6">{error.message}</p>
          <button
            onClick={reset}
            className="bg-white text-purple-600 px-6 py-3 rounded-xl font-semibold 
                     hover:bg-purple-50 transition-all duration-300"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}


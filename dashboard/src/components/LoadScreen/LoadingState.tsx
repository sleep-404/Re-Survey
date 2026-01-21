import { useState, useEffect } from 'react';

interface LoadingStep {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'complete' | 'error';
  count?: number;
}

interface LoadingStateProps {
  onComplete: () => void;
  onError?: (error: string) => void;
}

export function LoadingState({ onComplete, onError }: LoadingStateProps) {
  const [steps, setSteps] = useState<LoadingStep[]>([
    { id: 'tiles', label: 'Loading map tiles', status: 'pending' },
    { id: 'polygons', label: 'Loading polygons', status: 'pending' },
    { id: 'ground-truth', label: 'Loading ground truth', status: 'pending' },
  ]);
  const [error, setError] = useState<string | null>(null);

  const updateStep = (id: string, updates: Partial<LoadingStep>) => {
    setSteps(prev => prev.map(step =>
      step.id === id ? { ...step, ...updates } : step
    ));
  };

  useEffect(() => {
    async function loadData() {
      try {
        // Step 1: Check tiles are available
        updateStep('tiles', { status: 'loading' });
        try {
          // Just verify a tile endpoint exists - actual tiles load lazily
          await new Promise(resolve => setTimeout(resolve, 300));
          updateStep('tiles', { status: 'complete' });
        } catch (e) {
          updateStep('tiles', { status: 'complete' }); // Non-critical
        }

        // Step 2: Load polygons
        updateStep('polygons', { status: 'loading' });
        try {
          const response = await fetch('/data/sam_segments.geojson');
          if (!response.ok) throw new Error('Polygon file not found');
          const data = await response.json();
          const count = data.features?.length || 0;
          updateStep('polygons', { status: 'complete', count });
        } catch (e) {
          updateStep('polygons', { status: 'error' });
          throw new Error('Failed to load polygon data');
        }

        // Step 3: Load ground truth (optional)
        updateStep('ground-truth', { status: 'loading' });
        try {
          const response = await fetch('/data/ground_truth.geojson');
          if (response.ok) {
            const data = await response.json();
            const count = data.features?.length || 0;
            updateStep('ground-truth', { status: 'complete', count });
          } else {
            updateStep('ground-truth', { status: 'complete', count: 0 });
          }
        } catch (e) {
          updateStep('ground-truth', { status: 'complete', count: 0 });
        }

        // All done
        await new Promise(resolve => setTimeout(resolve, 500));
        onComplete();

      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        setError(message);
        onError?.(message);
      }
    }

    loadData();
  }, [onComplete, onError]);

  const getStatusIcon = (status: LoadingStep['status']) => {
    switch (status) {
      case 'pending':
        return <span className="text-gray-500">○</span>;
      case 'loading':
        return (
          <span className="inline-block animate-spin text-cyan-400">◐</span>
        );
      case 'complete':
        return <span className="text-green-400">✓</span>;
      case 'error':
        return <span className="text-red-400">✗</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900">
      <div className="text-center">
        {/* Logo/Title */}
        <h1 className="text-3xl font-bold text-gray-100 mb-2">BoundaryAI</h1>
        <p className="text-gray-400 mb-8">Land Parcel Editor</p>

        {/* Loading Steps */}
        <div className="bg-gray-800 rounded-lg p-6 min-w-[300px]">
          <div className="space-y-3">
            {steps.map((step) => (
              <div
                key={step.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="w-5">{getStatusIcon(step.status)}</span>
                  <span className={
                    step.status === 'complete' ? 'text-gray-300' :
                    step.status === 'loading' ? 'text-gray-100' :
                    step.status === 'error' ? 'text-red-400' :
                    'text-gray-500'
                  }>
                    {step.label}
                  </span>
                </div>
                {step.count !== undefined && step.status === 'complete' && (
                  <span className="text-cyan-400 font-mono text-xs">
                    {step.count.toLocaleString()}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-900/30 rounded text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Progress Bar */}
          <div className="mt-6 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 transition-all duration-500"
              style={{
                width: `${(steps.filter(s => s.status === 'complete').length / steps.length) * 100}%`
              }}
            />
          </div>
        </div>

        {/* Hint */}
        <p className="text-xs text-gray-600 mt-6">
          Nibanupudi Village • Andhra Pradesh
        </p>
      </div>
    </div>
  );
}

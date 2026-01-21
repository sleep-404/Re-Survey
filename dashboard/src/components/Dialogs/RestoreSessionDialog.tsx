import { useEffect, useState } from 'react';
import { getSavedSession, clearSavedSession, type SavedSession } from '../../hooks/useAutoSave';
import { usePolygonStore } from '../../hooks/usePolygonStore';

interface RestoreSessionDialogProps {
  onClose: () => void;
}

export function RestoreSessionDialog({ onClose }: RestoreSessionDialogProps) {
  const [session, setSession] = useState<SavedSession | null>(null);
  const { setParcels } = usePolygonStore();

  useEffect(() => {
    const saved = getSavedSession();
    setSession(saved);
  }, []);

  if (!session) {
    onClose();
    return null;
  }

  const handleRestore = () => {
    if (session) {
      setParcels(session.parcels);
    }
    onClose();
  };

  const handleDiscard = () => {
    clearSavedSession();
    onClose();
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gray-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-100">
            Restore Previous Session?
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            We found an unsaved session from your last visit.
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          <div className="bg-gray-900 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Saved</span>
              <span className="text-gray-200">{formatTimeAgo(session.timestamp)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Date</span>
              <span className="text-gray-200">{formatDate(session.timestamp)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Polygons</span>
              <span className="text-cyan-400 font-medium">{session.polygonCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Edits made</span>
              <span className="text-gray-200">{session.editCount}</span>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Choose "Restore" to continue where you left off, or "Discard" to start fresh
            with the original data.
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-700/50 flex gap-3 justify-end">
          <button
            onClick={handleDiscard}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-gray-100
                       bg-gray-600 hover:bg-gray-500 rounded transition-colors"
          >
            Discard
          </button>
          <button
            onClick={handleRestore}
            className="px-4 py-2 text-sm font-medium text-white
                       bg-cyan-600 hover:bg-cyan-700 rounded transition-colors"
          >
            Restore Session
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Check } from 'lucide-react';
import { useVillageStore } from '../../hooks/useVillageStore';
import { useAuthStore } from '../../hooks/useAuthStore';
import { useAutoSave } from '../../hooks/useAutoSave';

export function EditorHeader() {
  const { selectedVillage } = useVillageStore();
  const { user, logout } = useAuthStore();
  const { showSavedIndicator } = useAutoSave();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="h-12 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
      {/* Left: Back + Village */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 hover:bg-gray-700 rounded text-gray-100"
          aria-label="Back to Dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <span className="font-medium text-gray-100">
            {selectedVillage?.name || 'Unknown Village'}
          </span>
          <span className="text-gray-400 ml-2">
            {selectedVillage?.mandal}
          </span>
        </div>
      </div>

      {/* Right: Save status + User */}
      <div className="flex items-center gap-4">
        {/* Save indicator */}
        {showSavedIndicator && (
          <span className="text-emerald-500 text-sm flex items-center gap-1 animate-pulse">
            <Check className="w-4 h-4" />
            Auto-saved
          </span>
        )}

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 hover:bg-gray-700 px-2 py-1 rounded text-gray-100"
          >
            <span>{user?.name}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 bg-gray-800 border border-gray-700 rounded shadow-lg z-50 min-w-32">
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 w-full text-left hover:bg-gray-700 text-gray-100"
                >
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

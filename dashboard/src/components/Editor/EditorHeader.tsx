import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVillageStore } from '../../hooks/useVillageStore';
import { useAuthStore } from '../../hooks/useAuthStore';
import { useAutoSave } from '../../hooks/useAutoSave';
import { Icon } from '../shared/Icon';

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

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <header className="h-16 bg-[#1f2937] border-b border-gray-700 flex items-center justify-between px-6 shrink-0 z-30 shadow-md">
      {/* Left: Back + Village */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-700"
          aria-label="Back to Dashboard"
        >
          <Icon name="arrow_back" size="lg" />
        </button>
        <div>
          <h1 className="font-semibold text-lg text-white tracking-tight">
            {selectedVillage?.name || 'Unknown Village'}, {selectedVillage?.mandal}
          </h1>
          <p className="text-xs text-gray-400 font-medium">Map Editor V2.4</p>
        </div>
      </div>

      {/* Right: Save status + User */}
      <div className="flex items-center gap-8">
        {/* Save indicator */}
        {showSavedIndicator && (
          <span className="text-emerald-500 text-sm font-semibold flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Auto-saved <Icon name="check" className="text-sm font-bold" />
          </span>
        )}

        <div className="h-8 w-[1px] bg-gray-700" />

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors">
                {user?.name}
              </span>
              <span className="text-[10px] text-gray-400">{user?.role}</span>
            </div>
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-lg ring-2 ring-gray-800">
                {userInitials}
              </div>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-gray-800" />
            </div>
            <Icon
              name="expand_more"
              className="text-gray-400 group-hover:text-white transition-colors"
            />
          </button>
          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 min-w-36 overflow-hidden">
                <button
                  onClick={handleLogout}
                  className="px-4 py-2.5 w-full text-left hover:bg-gray-700 text-gray-100 text-sm"
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

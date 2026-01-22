import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Check } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../hooks/useAuthStore';
import { useVillageStore, Village } from '../../hooks/useVillageStore';

export function DashboardScreen() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const {
    villages,
    isLoading,
    error,
    searchQuery,
    sortBy,
    sortDirection,
    loadVillages,
    selectVillage,
    setSearchQuery,
    setSortBy
  } = useVillageStore();

  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Load villages on mount
  useEffect(() => {
    loadVillages();
  }, [loadVillages]);

  // Filter and sort villages
  const filteredVillages = useMemo(() => {
    let result = villages.filter(
      (v) =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.mandal.toLowerCase().includes(searchQuery.toLowerCase())
    );

    result = [...result].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      if (sortBy === 'name') return dir * a.name.localeCompare(b.name);
      if (sortBy === 'progress') return dir * (a.progress - b.progress);
      if (sortBy === 'parcels') return dir * (a.parcelCount - b.parcelCount);
      return 0;
    });

    return result;
  }, [villages, searchQuery, sortBy, sortDirection]);

  // Summary calculations
  const assigned = villages.length;
  const completed = villages.filter((v) => v.progress === 100).length;
  const pending = villages.filter((v) => v.progress < 100).length;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleVillageClick = (village: Village) => {
    if (!village.hasRealData) {
      toast.error(`${village.name} data not available in demo`, {
        duration: 3000,
        icon: '⚠️'
      });
      return;
    }
    selectVillage(village.id);
    navigate('/editor');
  };

  const getActionText = (village: Village): string => {
    if (village.progress === 100) return 'View';
    if (village.progress === 0) return 'Start';
    return 'Continue';
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
            <span className="text-slate-500 text-xs font-bold">B</span>
          </div>
          <span className="font-semibold text-slate-800">BoundaryAI</span>
        </div>

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 hover:bg-slate-100 px-3 py-2 rounded text-slate-700"
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
              <div className="absolute right-0 mt-2 bg-white border border-slate-200 rounded shadow-lg z-50 min-w-32">
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 w-full text-left hover:bg-slate-100 text-slate-700"
                >
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">
            Welcome, {user?.name}
          </h1>
          <p className="text-slate-500">
            {user?.role} • {user?.district} District
          </p>
        </div>

        {/* Summary Cards */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div
            className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-4"
            aria-label={`${assigned} Assigned Villages`}
          >
            <div className="text-3xl font-bold text-blue-700">{assigned}</div>
            <div className="text-blue-600 text-sm">Assigned</div>
          </div>
          <div
            className="flex-1 bg-emerald-50 border border-emerald-200 rounded-lg p-4"
            aria-label={`${completed} Completed Villages`}
          >
            <div className="text-3xl font-bold text-emerald-700">
              {completed}
            </div>
            <div className="text-emerald-600 text-sm">Completed</div>
          </div>
          <div
            className="flex-1 bg-amber-50 border border-amber-200 rounded-lg p-4"
            aria-label={`${pending} Pending Villages`}
          >
            <div className="text-3xl font-bold text-amber-700">{pending}</div>
            <div className="text-amber-600 text-sm">Pending</div>
          </div>
        </div>

        {/* Search and Sort */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <input
            type="search"
            placeholder="Search villages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 border border-slate-300 rounded px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Search villages by name or mandal"
          />
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'name' | 'progress' | 'parcels')
            }
            className="border border-slate-300 rounded px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="name">Sort by: Name</option>
            <option value="progress">Sort by: Progress</option>
            <option value="parcels">Sort by: Parcels</option>
          </select>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-slate-100 rounded-lg p-4 animate-pulse"
              >
                <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-4" />
                <div className="h-2 bg-slate-200 rounded w-full mb-2" />
                <div className="h-8 bg-slate-200 rounded w-1/3" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">Failed to load villages</p>
            <button
              onClick={() => loadVillages()}
              className="px-4 py-2 bg-blue-800 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* No Search Results */}
        {filteredVillages.length === 0 && searchQuery && !isLoading && (
          <div className="text-center py-12 text-slate-500">
            No villages match your search
          </div>
        )}

        {/* No Villages Assigned */}
        {villages.length === 0 && !isLoading && !error && (
          <div className="text-center py-12 text-slate-500">
            No villages assigned
          </div>
        )}

        {/* Village Cards */}
        {!isLoading && !error && filteredVillages.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVillages.map((village) => (
              <article
                key={village.id}
                className="bg-slate-50 border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                tabIndex={0}
                onClick={() => handleVillageClick(village)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && handleVillageClick(village)
                }
                aria-label={`${village.name}, ${village.parcelCount} parcels, ${village.progress}% verified`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-slate-800">
                      {village.name}
                    </h3>
                    <p className="text-slate-500 text-sm">{village.mandal}</p>
                  </div>
                  {village.progress === 100 && (
                    <Check className="w-5 h-5 text-emerald-600" />
                  )}
                </div>

                <p className="text-slate-600 text-sm mt-2">
                  {village.parcelCount.toLocaleString()} parcels
                </p>

                {/* Progress Bar */}
                <div
                  className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={village.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${village.progress}% verified`}
                >
                  <div
                    className={clsx(
                      'h-full rounded-full transition-all',
                      village.progress === 100
                        ? 'bg-emerald-600'
                        : village.progress > 0
                          ? 'bg-blue-500'
                          : 'bg-slate-300'
                    )}
                    style={{ width: `${village.progress}%` }}
                  />
                </div>

                {/* Status and Action */}
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-slate-500">
                    {village.progress === 0
                      ? 'Not started'
                      : village.progress === 100
                        ? 'Complete'
                        : `${village.progress}% verified`}
                  </span>
                  <span className="text-blue-600 font-medium text-sm">
                    {getActionText(village)} →
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

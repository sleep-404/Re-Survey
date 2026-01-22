import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../hooks/useAuthStore';
import { useVillageStore, type Village } from '../../hooks/useVillageStore';
import { Icon } from '../shared/Icon';

// Logo URL
const AP_EMBLEM_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBnw4iep8fyTAo5ZIIRmqTibv572vQWlqSsuRmacWr7JrlQMxuLFAV6ejQAuXCsuLwJWyMEm7SeWDbxEyR60scB8dhKKttTH9Zuz3IHFR8dOFrvjFOweYy5v8vDTfxOwmhgoHtvadTtdY5RumHDQ67nVVpaXwZ3DDTMGglHRHpHjdFPZK1HFYbVg9cddLcfdJvZNP11yvFC4rFCHX1P6662ma_N-is9flPoftIwVFdVzOrgpxnAyyErD5sR9GVqU9hB5TzqBmSIfRI2';

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

  useEffect(() => {
    loadVillages();
  }, [loadVillages]);

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

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <div className="min-h-screen w-full bg-white font-sans text-slate-900">
      {/* Header */}
      <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-[#e2e8f0] bg-white px-6">
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-full bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${AP_EMBLEM_URL}")` }}
          />
          <span className="text-lg font-semibold text-[#1e293b] tracking-tight">BoundaryAI</span>
        </div>

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex cursor-pointer items-center gap-2 rounded p-1 hover:bg-slate-50 transition"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
              {userInitials}
            </div>
            <span className="text-sm font-medium text-[#1e293b]">{user?.name}</span>
            <Icon name="expand_more" className="text-[#64748b]" />
          </button>
          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-32 overflow-hidden">
                <button
                  onClick={handleLogout}
                  className="px-4 py-2.5 w-full text-left hover:bg-slate-100 text-slate-700 text-sm"
                >
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 pt-24 pb-12">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1e293b]">Welcome, {user?.name}</h1>
          <p className="mt-1 text-sm font-medium text-[#64748b]">
            {user?.role} • {user?.district} District
          </p>
        </div>

        {/* Summary Cards */}
        <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex flex-col rounded-xl border border-[#bfdbfe] bg-[#eff6ff] p-6 shadow-sm">
            <span className="text-sm font-semibold text-blue-900/60">Assigned</span>
            <span className="mt-2 text-4xl font-bold text-[#1d4ed8]">{assigned}</span>
          </div>
          <div className="flex flex-col rounded-xl border border-[#a7f3d0] bg-[#ecfdf5] p-6 shadow-sm">
            <span className="text-sm font-semibold text-emerald-900/60">Completed</span>
            <span className="mt-2 text-4xl font-bold text-[#059669]">{completed}</span>
          </div>
          <div className="flex flex-col rounded-xl border border-[#fde68a] bg-[#fffbeb] p-6 shadow-sm">
            <span className="text-sm font-semibold text-amber-900/60">Pending</span>
            <span className="mt-2 text-4xl font-bold text-[#d97706]">{pending}</span>
          </div>
        </div>

        {/* Search and Sort */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-[400px]">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Icon name="search" className="text-[20px] text-gray-400" />
            </div>
            <input
              type="search"
              placeholder="Search villages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm placeholder-gray-400 shadow-sm focus:border-[#1e40af] focus:ring-1 focus:ring-[#1e40af] focus:outline-none"
              aria-label="Search villages by name or mandal"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-[#64748b]">Sort by:</label>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as 'name' | 'progress' | 'parcels')
                }
                className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm font-medium text-[#1e293b] shadow-sm focus:border-[#1e40af] focus:ring-1 focus:ring-[#1e40af] focus:outline-none cursor-pointer"
              >
                <option value="name">Name</option>
                <option value="progress">Progress (Low to High)</option>
                <option value="parcels">Parcel Count</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <Icon name="expand_more" className="text-[18px]" />
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex flex-col rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-6 shadow-sm animate-pulse"
              >
                <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-4" />
                <div className="h-2 bg-slate-200 rounded w-full mb-2" />
                <div className="h-8 bg-slate-200 rounded w-1/3 mt-4" />
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
              className="px-4 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-blue-800 transition"
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
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {filteredVillages.map((village) => (
              <article
                key={village.id}
                className="flex flex-col rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-6 shadow-sm transition hover:shadow-md cursor-pointer"
                tabIndex={0}
                onClick={() => handleVillageClick(village)}
                onKeyDown={(e) => e.key === 'Enter' && handleVillageClick(village)}
                aria-label={`${village.name}, ${village.parcelCount} parcels, ${village.progress}% verified`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-[#1e293b]">{village.name}</h3>
                    <p className="text-sm text-[#64748b]">{village.mandal}</p>
                  </div>
                  <div className="rounded bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm border border-slate-100">
                    {village.parcelCount.toLocaleString()} parcels
                  </div>
                </div>

                {/* Progress */}
                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between text-xs font-medium">
                    {village.progress === 100 ? (
                      <div className="flex items-center gap-1 text-[#059669]">
                        <Icon name="check_circle" className="text-[16px]" />
                        <span>Complete</span>
                      </div>
                    ) : village.progress > 0 ? (
                      <span className="text-[#3b82f6]">{village.progress}% verified</span>
                    ) : (
                      <span className="text-[#64748b]">Not started</span>
                    )}
                    <span className="text-[#1e293b]">{village.progress}%</span>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-gray-200"
                    role="progressbar"
                    aria-valuenow={village.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className={clsx(
                        'h-full transition-all',
                        village.progress === 100
                          ? 'bg-[#059669]'
                          : village.progress > 0
                            ? 'bg-[#3b82f6]'
                            : 'bg-transparent'
                      )}
                      style={{ width: `${village.progress}%` }}
                    />
                  </div>
                </div>

                {/* Action */}
                <div className="mt-6 flex justify-end border-t border-gray-100 pt-4">
                  <button className="flex items-center gap-1 text-sm font-bold text-blue-700 hover:text-blue-800 transition">
                    {getActionText(village)} <Icon name="arrow_forward" className="text-[18px]" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

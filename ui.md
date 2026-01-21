# BoundaryAI UI Implementation Plan

## Overview

Add Login and Dashboard screens to the existing Map Editor application, implementing the design.md specification with proper routing and theme switching.

**Branch:** `feature/ui-redesign`

---

## Current State → Target State

| Aspect | Current | Target |
|--------|---------|--------|
| Screens | 1 (Map Editor only) | 3 (Login → Dashboard → Map Editor) |
| Routing | None (single page) | React Router with protected routes |
| Theme | Dark everywhere | Light (Login/Dashboard) + Dark (Map Editor) |
| Auth | None | Mock auth for demo |

---

## Files to Create (7 files)

| File | Purpose |
|------|---------|
| `src/hooks/useAuthStore.ts` | Mock authentication (login/logout, user state) |
| `src/hooks/useVillageStore.ts` | Village list with mock data |
| `src/components/Auth/LoginScreen.tsx` | Login page (light theme) |
| `src/components/Auth/ProtectedRoute.tsx` | Route guard with redirect preservation |
| `src/components/Dashboard/DashboardScreen.tsx` | Village selection (light theme) |
| `src/components/Editor/EditorHeader.tsx` | Header with Back button for Map Editor |
| `src/components/Editor/MapEditorScreen.tsx` | Wrapper combining header + existing editor |

## Files to Modify (4 files)

| File | Changes |
|------|---------|
| `package.json` | Add `react-router-dom` |
| `src/main.tsx` | Add router, define routes |
| `src/index.css` | Remove hardcoded dark theme from body |
| `src/components/Sidebar/Sidebar.tsx` | Remove duplicate "Saved ✓" (now in header) |

---

## Theme Switching Implementation

**Approach:** CSS class on root element + Tailwind

```tsx
// Login/Dashboard routes
<div className="min-h-screen bg-white text-slate-800">

// Map Editor route
<div className="min-h-screen bg-gray-900 text-gray-100">
```

**index.css changes:**
- Remove `bg-gray-900 text-gray-100` from body
- Body should be neutral: `font-family: Inter, sans-serif`
- Each screen wrapper applies its own theme classes

---

## Implementation Phases

### Phase 1: Setup (5 min)
1. Create branch `feature/ui-redesign`
2. Install `react-router-dom`
3. Update `index.css` - remove `bg-gray-900 text-gray-100` from body

### Phase 2: Auth Store (10 min)
Create `useAuthStore.ts`:

**State:**
```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface User {
  employeeId: string;
  name: string;
  role: string;
  district: string;
}
```

**Actions:**
- `login(employeeId: string, password: string): Promise<void>` - validates credentials, sets user, persists to localStorage
- `logout(): void` - clears user, clears localStorage, does NOT clear village working data
- `clearError(): void` - clears error message
- `initFromStorage(): void` - called on app load to restore session

**Error Messages (per design.md):**
- "Employee ID is required"
- "Password is required"
- "Invalid credentials. Please try again."
- "Network error. Please check your connection." (simulated for demo)

**localStorage Persistence:**
```typescript
// On successful login
localStorage.setItem('auth_user', JSON.stringify(user));

// On logout
localStorage.removeItem('auth_user');

// On app init
const stored = localStorage.getItem('auth_user');
if (stored) set({ user: JSON.parse(stored), isAuthenticated: true });
```

### Phase 3: Village Store (10 min)
Create `useVillageStore.ts`:

**State:**
```typescript
interface VillageState {
  villages: Village[];
  selectedVillage: Village | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  sortBy: 'name' | 'progress' | 'parcels';
  sortDirection: 'asc' | 'desc';
}

interface Village {
  id: string;
  name: string;
  mandal: string;
  parcelCount: number;
  progress: number; // 0-100
  hasRealData: boolean;
}
```

**Actions:**
- `loadVillages(): Promise<void>` - loads mock data, sets isLoading during "fetch"
- `selectVillage(id: string): void` - sets selectedVillage
- `setSearchQuery(query: string): void` - filters villages
- `setSortBy(field: 'name' | 'progress' | 'parcels'): void`
- `toggleSortDirection(): void`

**Computed (via selector):**
```typescript
// Filtered and sorted villages
const filteredVillages = useMemo(() => {
  let result = villages.filter(v =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.mandal.toLowerCase().includes(searchQuery.toLowerCase())
  );

  result.sort((a, b) => {
    const dir = sortDirection === 'asc' ? 1 : -1;
    if (sortBy === 'name') return dir * a.name.localeCompare(b.name);
    if (sortBy === 'progress') return dir * (a.progress - b.progress);
    if (sortBy === 'parcels') return dir * (a.parcelCount - b.parcelCount);
    return 0;
  });

  return result;
}, [villages, searchQuery, sortBy, sortDirection]);
```

**Summary Calculations:**
```typescript
const assigned = villages.length;
const completed = villages.filter(v => v.progress === 100).length;
const pending = villages.filter(v => v.progress < 100).length; // Includes 0% and in-progress
```

**Default Sort:** `name` ascending

### Phase 4: Login Screen (20 min)
Create `LoginScreen.tsx`:

**Theme:** Light (`bg-white`)

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│  [Language Dropdown ▼]                          (top-right) │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              [Govt Logo]  [Dept Logo]                       │
│                                                             │
│                    BoundaryAI                               │
│               Land Parcel Editor                            │
│                                                             │
│           ┌─────────────────────────┐                       │
│           │ Employee ID             │                       │
│           │ [________________]      │                       │
│           │                         │                       │
│           │ Password           [👁] │                       │
│           │ [________________]      │                       │
│           │                         │                       │
│           │ [    Sign In      ]     │                       │
│           │                         │                       │
│           │ Demo: EMP001 / demo123  │                       │
│           └─────────────────────────┘                       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Andhra Pradesh Survey & Land Records Department            │
└─────────────────────────────────────────────────────────────┘
```

**Required Elements (per design.md):**

| Element | Implementation | Notes |
|---------|----------------|-------|
| Government Logo | `<div className="w-16 h-16 rounded-full bg-slate-200" />` | Placeholder circle |
| Department Logo | `<div className="w-16 h-16 rounded-full bg-slate-200" />` | Placeholder circle |
| Application Title | `<h1>BoundaryAI</h1><p>Land Parcel Editor</p>` | |
| Employee ID Input | `<input id="employee-id" />` with `<label>` | NOT just placeholder |
| Password Input | `<input type="password" id="password" />` with toggle | Show/hide eye icon |
| Sign In Button | `<button type="submit">Sign In</button>` | Full-width in form |
| Language Selector | `<select>English/తెలుగు</select>` | Top-right, non-functional for demo |
| Department Footer | `<footer>` at bottom | Fixed or at page bottom |
| Demo Hint | Small muted text below form | "Use EMP001 / demo123" |

**Password Toggle Implementation:**
```tsx
const [showPassword, setShowPassword] = useState(false);

<div className="relative">
  <input
    type={showPassword ? 'text' : 'password'}
    id="password"
    aria-describedby={error ? 'password-error' : undefined}
  />
  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-3 top-1/2 -translate-y-1/2"
    aria-label={showPassword ? 'Hide password' : 'Show password'}
  >
    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
  </button>
</div>
```

**Form States (per design.md):**

| State | Visual | Implementation |
|-------|--------|----------------|
| Empty fields | Sign In disabled (gray) | `disabled={!employeeId || !password}` |
| Valid input | Sign In enabled (blue) | `disabled={false}` |
| Loading | Spinner in button, fields disabled | `isLoading` state |
| Error | Red border, error message below field | `error` state + `aria-describedby` |
| Success | Navigate to Dashboard | `navigate('/dashboard')` |

**Accessibility (per design.md):**
- Tab order: Language → Employee ID → Password → Sign In
- All inputs have visible `<label>` elements (not just placeholders)
- Error messages linked via `aria-describedby`
- Minimum touch target: 44x44px (`min-h-11 min-w-11` in Tailwind)
- Form submits on Enter key

**Error Display:**
```tsx
{error && (
  <div
    id="login-error"
    role="alert"
    className="text-red-600 text-sm mt-2"
  >
    {error}
  </div>
)}

// Input with error state
<input
  className={cn(
    'border rounded px-3 py-2',
    error ? 'border-red-600' : 'border-slate-300'
  )}
  aria-invalid={!!error}
  aria-describedby={error ? 'login-error' : undefined}
/>
```

### Phase 5: Dashboard Screen (25 min)
Create `DashboardScreen.tsx`:

**Theme:** Light (`bg-white`)

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] BoundaryAI                    [Ravi Kumar ▼]        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Welcome, Ravi Kumar                                        │
│  Survey Officer • Guntur District                           │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │    4     │  │    1     │  │    3     │                   │
│  │ Assigned │  │Completed │  │ Pending  │                   │
│  │  (blue)  │  │ (green)  │  │ (amber)  │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
│                                                             │
│  [Search villages...]  [Sort by: Name ▼]                    │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ Nibhanupudi     │  │ Kondaveedu      │                   │
│  │ Pedakurapadu    │  │ Pedakurapadu    │                   │
│  │ 12,032 parcels  │  │ 8,456 parcels   │                   │
│  │ [░░░░░░░░░░] 0% │  │ [██████████]100%│                   │
│  │ [Start →]       │  │ [View →]        │                   │
│  └─────────────────┘  └─────────────────┘                   │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ Manchala        │  │ Vemuru          │                   │
│  │ Sattenapalli    │  │ Vemuru          │                   │
│  │ 5,234 parcels   │  │ 6,789 parcels   │                   │
│  │ [█████░░░░░] 45%│  │ [░░░░░░░░░░] 0% │                   │
│  │ [Continue →]    │  │ [Start →]       │                   │
│  └─────────────────┘  └─────────────────┘                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Header Bar Elements:**
- Logo placeholder (small circle or icon)
- App name "BoundaryAI"
- User dropdown (name + chevron) → Logout option

**User Dropdown:**
```tsx
const [dropdownOpen, setDropdownOpen] = useState(false);

<div className="relative">
  <button
    onClick={() => setDropdownOpen(!dropdownOpen)}
    className="flex items-center gap-2"
  >
    <span>{user.name}</span>
    <ChevronDownIcon />
  </button>
  {dropdownOpen && (
    <div className="absolute right-0 mt-2 bg-white border rounded shadow-lg">
      <button onClick={handleLogout} className="px-4 py-2 w-full text-left">
        Logout
      </button>
    </div>
  )}
</div>
```

**Welcome Section:**
```tsx
<div>
  <h1 className="text-2xl font-bold text-slate-800">Welcome, {user.name}</h1>
  <p className="text-slate-500">{user.role} • {user.district} District</p>
</div>
```

**Summary Cards (per design.md):**

| Card | Color | Tailwind Classes |
|------|-------|------------------|
| Assigned | Blue | `bg-blue-50 border-blue-200 text-blue-700` |
| Completed | Green | `bg-emerald-50 border-emerald-200 text-emerald-700` |
| Pending | Amber | `bg-amber-50 border-amber-200 text-amber-700` |

```tsx
<div
  className="bg-blue-50 border border-blue-200 rounded-lg p-4"
  aria-label="4 Assigned Villages"
>
  <div className="text-3xl font-bold text-blue-700">{assigned}</div>
  <div className="text-blue-600 text-sm">Assigned</div>
</div>
```

**Search Box:**
```tsx
<input
  type="search"
  placeholder="Search villages..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  className="border border-slate-300 rounded px-3 py-2"
  aria-label="Search villages by name or mandal"
/>
```
- Filters on BOTH village name AND mandal name
- Case-insensitive
- Real-time filtering (no debounce needed for 4 items)

**Sort Dropdown:**
```tsx
<select
  value={sortBy}
  onChange={(e) => setSortBy(e.target.value)}
  className="border border-slate-300 rounded px-3 py-2"
>
  <option value="name">Sort by: Name</option>
  <option value="progress">Sort by: Progress</option>
  <option value="parcels">Sort by: Parcels</option>
</select>
```
- Default: Name (A-Z)
- Progress: Low to high (0% first)
- Parcels: Low to high

**Village Card Content (per design.md):**
```tsx
<article
  className="bg-slate-50 border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
  tabIndex={0}
  onClick={() => handleVillageClick(village)}
  onKeyDown={(e) => e.key === 'Enter' && handleVillageClick(village)}
  aria-label={`${village.name}, ${village.parcelCount} parcels, ${village.progress}% verified`}
>
  <h3 className="font-semibold text-slate-800">{village.name}</h3>
  <p className="text-slate-500 text-sm">{village.mandal}</p>
  <p className="text-slate-600 text-sm mt-2">{village.parcelCount.toLocaleString()} parcels</p>

  <div
    className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden"
    role="progressbar"
    aria-valuenow={village.progress}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-label={`${village.progress}% verified`}
  >
    <div
      className={cn(
        'h-full rounded-full',
        village.progress === 100 ? 'bg-emerald-600' :
        village.progress > 0 ? 'bg-blue-500' : 'bg-slate-300'
      )}
      style={{ width: `${village.progress}%` }}
    />
  </div>

  <div className="flex justify-between items-center mt-2">
    <span className="text-sm text-slate-500">
      {village.progress === 0 ? 'Not started' :
       village.progress === 100 ? 'Complete' :
       `${village.progress}% verified`}
    </span>
    <button className="text-blue-600 font-medium text-sm">
      {getActionText(village)} →
    </button>
  </div>
</article>
```

**Action Button Text Logic (per design.md):**
```typescript
function getActionText(village: Village): string {
  if (village.progress === 100) return 'View';
  if (village.progress === 0) return 'Start';
  return 'Continue';
}
```

**Village Click Handler:**
```typescript
function handleVillageClick(village: Village) {
  if (!village.hasRealData) {
    // Show toast or inline message
    toast.info(`${village.name} data not available in demo`);
    return;
  }
  selectVillage(village.id);
  navigate('/editor');
}
```

**States (per design.md):**

| State | Implementation |
|-------|----------------|
| Loading villages | Skeleton cards with `animate-pulse` |
| No results | "No villages match your search" centered message |
| Empty list | "No villages assigned" centered message |
| Village 100% | Green progress bar, checkmark icon, "View →" |
| Village 0% | Gray progress bar, "Start →" |
| Village in-progress | Blue progress bar, "Continue →" |
| Load error | "Failed to load villages" + Retry button |

**Skeleton Loading:**
```tsx
{isLoading && (
  <div className="grid grid-cols-2 gap-4">
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="bg-slate-100 rounded-lg p-4 animate-pulse">
        <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
        <div className="h-4 bg-slate-200 rounded w-1/2 mb-4" />
        <div className="h-2 bg-slate-200 rounded w-full mb-2" />
        <div className="h-8 bg-slate-200 rounded w-1/3" />
      </div>
    ))}
  </div>
)}
```

**Empty States:**
```tsx
// No search results
{filteredVillages.length === 0 && searchQuery && (
  <div className="text-center py-12 text-slate-500">
    No villages match your search
  </div>
)}

// No villages assigned at all
{villages.length === 0 && !isLoading && (
  <div className="text-center py-12 text-slate-500">
    No villages assigned
  </div>
)}
```

**Responsive Behavior (per design.md):**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Village cards */}
</div>

// Summary cards
<div className="flex flex-col sm:flex-row gap-4">
  {/* 3 summary cards - stack on mobile, row on tablet+ */}
</div>
```

**Accessibility (per design.md):**
- Tab order: Search → Sort → Summary Cards → Village Cards
- Village cards are keyboard navigable (Enter to open)
- Progress bars have `aria-valuenow`
- Summary card values announced with context via `aria-label`

### Phase 6: Map Editor Screen (15 min)
Create `MapEditorScreen.tsx`:

**Theme:** Dark (`bg-gray-900`)

**Structure:**
```tsx
<div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
  <EditorHeader />
  <div className="flex flex-1 overflow-hidden">
    <Sidebar />
    <main className="flex-1 relative">
      <MapCanvas />
    </main>
  </div>
  <BottomBar />
</div>
```

**EditorHeader Component:**
```tsx
function EditorHeader() {
  const { selectedVillage } = useVillageStore();
  const { user, logout } = useAuthStore();
  const { isDirty, isSaving, lastSaved } = usePolygonStore();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="h-12 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
      {/* Left: Back + Village */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 hover:bg-gray-700 rounded"
          aria-label="Back to Dashboard"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <span className="font-medium">{selectedVillage?.name}</span>
          <span className="text-gray-400 ml-2">{selectedVillage?.mandal}</span>
        </div>
      </div>

      {/* Right: Save status + User */}
      <div className="flex items-center gap-4">
        <SaveStatus isSaving={isSaving} lastSaved={lastSaved} />

        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 hover:bg-gray-700 px-2 py-1 rounded"
          >
            <span>{user?.name}</span>
            <ChevronDownIcon className="w-4 h-4" />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 bg-gray-800 border border-gray-700 rounded shadow-lg z-50">
              <button
                onClick={() => { logout(); navigate('/'); }}
                className="px-4 py-2 w-full text-left hover:bg-gray-700"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
```

**Save Status Component (per design.md):**
```tsx
function SaveStatus({ isSaving, lastSaved }: { isSaving: boolean; lastSaved: Date | null }) {
  if (isSaving) {
    return (
      <span className="text-gray-400 text-sm flex items-center gap-1">
        <SpinnerIcon className="w-4 h-4 animate-spin" />
        Saving...
      </span>
    );
  }

  if (lastSaved) {
    return (
      <span className="text-emerald-500 text-sm flex items-center gap-1">
        <CheckIcon className="w-4 h-4" />
        Auto-saved ✓
      </span>
    );
  }

  return null;
}
```

**Data Loading Logic (extract from App.tsx):**
- Move GeoJSON loading into MapEditorScreen or a custom hook
- Check `selectedVillage.hasRealData` before loading
- Show loading state while data fetches

### Phase 7: Routing (10 min)
Update `main.tsx`:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginScreen />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/editor"
          element={
            <ProtectedRoute requireVillage>
              <MapEditorScreen />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**ProtectedRoute Component:**
```tsx
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVillage?: boolean;
}

function ProtectedRoute({ children, requireVillage }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuthStore();
  const { selectedVillage } = useVillageStore();
  const location = useLocation();

  if (!isAuthenticated) {
    // Preserve intended destination
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (requireVillage && !selectedVillage) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
```

**Post-Login Redirect:**
```tsx
// In LoginScreen, after successful login:
const location = useLocation();
const from = location.state?.from?.pathname || '/dashboard';
navigate(from, { replace: true });
```

### Phase 8: Logout Flow

**Logout Behavior:**
1. Clear auth state and localStorage auth data
2. Do NOT clear village working data (localStorage polygons) - user may want to restore
3. Navigate to `/` (Login)
4. If on protected route, ProtectedRoute handles redirect

```typescript
// In useAuthStore
logout: () => {
  localStorage.removeItem('auth_user');
  set({ user: null, isAuthenticated: false, error: null });
  // Note: Do NOT clear polygon/working data here
}
```

### Phase 9: Testing (15 min)

**Test Cases:**

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | Login - empty fields | Load login page | Sign In button disabled |
| 2 | Login - invalid credentials | Enter wrong ID/password, click Sign In | Error message displayed |
| 3 | Login - valid credentials | Enter EMP001/demo123, click Sign In | Navigate to Dashboard |
| 4 | Login - Enter key | Fill fields, press Enter | Form submits |
| 5 | Password toggle | Click eye icon | Password shows/hides |
| 6 | Dashboard - loads villages | After login | 4 villages displayed |
| 7 | Dashboard - summary cards | View cards | Correct counts (4 assigned, 1 completed, 3 pending) |
| 8 | Dashboard - search | Type "nib" | Only Nibhanupudi shown |
| 9 | Dashboard - search mandal | Type "satte" | Only Manchala shown |
| 10 | Dashboard - sort by progress | Select "Sort by: Progress" | Villages reorder |
| 11 | Dashboard - click village with data | Click Nibhanupudi | Navigate to Editor |
| 12 | Dashboard - click village without data | Click Kondaveedu | Toast message, stay on Dashboard |
| 13 | Dashboard - keyboard nav | Tab to village, press Enter | Same as click |
| 14 | Editor - loads | After village select | Map with parcels loads |
| 15 | Editor - all tools work | Test select, draw, edit, split | All function correctly |
| 16 | Editor - back button | Click back arrow | Return to Dashboard |
| 17 | Editor - save status | Make edit | Shows "Saving..." then "Auto-saved ✓" |
| 18 | Route protection - editor | Go to /editor directly (not logged in) | Redirect to Login |
| 19 | Route protection - editor | Go to /editor (logged in, no village) | Redirect to Dashboard |
| 20 | Logout | Click user dropdown → Logout | Return to Login |
| 21 | Theme - login/dashboard | View pages | Light background (#ffffff) |
| 22 | Theme - editor | View page | Dark background (#111827) |
| 23 | Restore after logout | Login again | Previous working data still available |

---

## Mock Data

### Mock Users
```typescript
const MOCK_USERS: Record<string, { password: string; name: string; role: string; district: string }> = {
  'EMP001': {
    password: 'demo123',
    name: 'Ravi Kumar',
    role: 'Survey Officer',
    district: 'Guntur'
  }
};
```

### Mock Villages
```typescript
const MOCK_VILLAGES: Village[] = [
  {
    id: 'nibhanupudi',
    name: 'Nibhanupudi',
    mandal: 'Pedakurapadu',
    parcelCount: 12032,
    progress: 0,
    hasRealData: true
  },
  {
    id: 'kondaveedu',
    name: 'Kondaveedu',
    mandal: 'Pedakurapadu',
    parcelCount: 8456,
    progress: 100,
    hasRealData: false
  },
  {
    id: 'manchala',
    name: 'Manchala',
    mandal: 'Sattenapalli',
    parcelCount: 5234,
    progress: 45,
    hasRealData: false
  },
  {
    id: 'vemuru',
    name: 'Vemuru',
    mandal: 'Vemuru',
    parcelCount: 6789,
    progress: 0,
    hasRealData: false
  },
];
```

---

## Color Reference

### Light Theme (Login/Dashboard)
| Name | Hex | Tailwind | Usage |
|------|-----|----------|-------|
| Background | #ffffff | `bg-white` | Page background |
| Surface | #f8fafc | `bg-slate-50` | Cards, form containers |
| Border | #e2e8f0 | `border-slate-200` | Input borders, dividers |
| Text Primary | #1e293b | `text-slate-800` | Main text |
| Text Muted | #64748b | `text-slate-500` | Secondary text, labels |
| Primary Blue | #1e40af | `bg-blue-800` | Buttons |
| Primary Hover | #1d4ed8 | `hover:bg-blue-700` | Button hover |
| Error | #dc2626 | `text-red-600 border-red-600` | Error states |

### Dark Theme (Map Editor)
| Name | Hex | Tailwind | Usage |
|------|-----|----------|-------|
| Background | #111827 | `bg-gray-900` | Page background |
| Surface | #1f2937 | `bg-gray-800` | Panels, cards |
| Border | #374151 | `border-gray-700` | Dividers |
| Text Primary | #f3f4f6 | `text-gray-100` | Main text |
| Text Muted | #9ca3af | `text-gray-400` | Secondary text |
| Accent | #06b6d4 | `text-cyan-500` | Selection, active states |

### Semantic Colors (Both Themes)
| Name | Hex | Tailwind | Usage |
|------|-----|----------|-------|
| Success | #059669 | `text-emerald-600` / `bg-emerald-600` | Confirmations, good match, completed |
| Warning | #d97706 | `text-amber-600` / `bg-amber-600` | Fair match, attention needed |
| Error | #dc2626 | `text-red-600` / `bg-red-600` | Poor match, errors, required fields |

### Summary Card Colors
| Card | Background | Border | Text |
|------|------------|--------|------|
| Assigned | `bg-blue-50` | `border-blue-200` | `text-blue-700` |
| Completed | `bg-emerald-50` | `border-emerald-200` | `text-emerald-700` |
| Pending | `bg-amber-50` | `border-amber-200` | `text-amber-700` |

---

## Typography

### Font Stack
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Telugu text (if language selector implemented) */
font-family: 'Noto Sans Telugu', sans-serif;
```

### Login & Dashboard (Light Theme)
| Element | Size | Weight | Tailwind |
|---------|------|--------|----------|
| Page Title | 24px | 700 | `text-2xl font-bold text-slate-800` |
| Section Header | 18px | 600 | `text-lg font-semibold text-slate-800` |
| Card Title | 16px | 600 | `text-base font-semibold text-slate-800` |
| Body Text | 14px | 400 | `text-sm text-slate-800` |
| Muted Text | 14px | 400 | `text-sm text-slate-500` |
| Button Text | 14px | 500 | `text-sm font-medium text-white` |

### Map Editor (Dark Theme)
| Element | Size | Weight | Tailwind |
|---------|------|--------|----------|
| App Title | 18px | 600 | `text-lg font-semibold text-gray-100` |
| Tab Label (inactive) | 14px | 500 | `text-sm font-medium text-gray-400` |
| Tab Label (active) | 14px | 500 | `text-sm font-medium text-cyan-500` |
| Section Header | 12px | 600 | `text-xs font-semibold text-gray-400 uppercase` |
| Body Text | 14px | 400 | `text-sm text-gray-200` |
| Stat Value | 24px | 700 | `text-2xl font-bold text-cyan-500` |
| Stat Label | 12px | 400 | `text-xs text-gray-400` |
| Button Text | 14px | 500 | `text-sm font-medium text-white` |

---

## Verification Checklist

### Login Screen
- [ ] Light theme (white background)
- [ ] Government logo placeholders visible
- [ ] Department logo placeholder visible
- [ ] Application title "BoundaryAI" with tagline
- [ ] Employee ID input with visible label
- [ ] Password input with show/hide toggle
- [ ] Sign In button disabled when fields empty
- [ ] Sign In button enabled when fields filled
- [ ] Loading state shows spinner, disables inputs
- [ ] Invalid credentials shows error message
- [ ] Error has red border on input
- [ ] Valid login navigates to Dashboard
- [ ] Language selector visible (non-functional)
- [ ] Footer with department name
- [ ] Demo hint text visible
- [ ] Tab order: Language → Employee ID → Password → Sign In
- [ ] Enter key submits form

### Dashboard Screen
- [ ] Light theme (white background)
- [ ] Header with logo, app name, user dropdown
- [ ] User dropdown opens/closes
- [ ] Logout option in dropdown works
- [ ] Welcome message with user name
- [ ] Role and district displayed
- [ ] 3 summary cards with correct counts
- [ ] Summary cards have correct colors
- [ ] Search box filters villages
- [ ] Search works on village name
- [ ] Search works on mandal name
- [ ] Sort dropdown changes order
- [ ] 4 village cards displayed
- [ ] Village cards show name, mandal, parcels
- [ ] Progress bars have correct fill
- [ ] Action button text: Start (0%), Continue (1-99%), View (100%)
- [ ] Click Nibhanupudi → navigates to Editor
- [ ] Click other villages → shows "not available" message
- [ ] Keyboard navigation (Tab + Enter) works
- [ ] Skeleton loading state works
- [ ] "No results" message when search has no matches

### Map Editor Screen
- [ ] Dark theme (gray-900 background)
- [ ] Header with back button
- [ ] Back button returns to Dashboard
- [ ] Village name and mandal displayed
- [ ] Save status shows "Auto-saved ✓" or "Saving..."
- [ ] User name in header
- [ ] User dropdown with Logout
- [ ] Logout returns to Login
- [ ] All existing Map Editor functionality works
- [ ] Sidebar, MapCanvas, BottomBar render correctly

### Routing
- [ ] `/` shows Login
- [ ] `/dashboard` redirects to Login if not authenticated
- [ ] `/dashboard` shows Dashboard if authenticated
- [ ] `/editor` redirects to Login if not authenticated
- [ ] `/editor` redirects to Dashboard if no village selected
- [ ] `/editor` shows Editor if authenticated + village selected
- [ ] Unknown routes redirect to Login
- [ ] Post-login redirects to intended page

---

## Unchanged Files

All existing functionality preserved:
- `src/components/Map/*` - MapCanvas, ContextMenu, SelectionBox, LassoSelection
- `src/components/Sidebar/*` - All 9 panels (Tools, Layers, Classify, etc.)
- `src/components/BottomBar/*` - Status bar
- `src/components/Dialogs/*` - Export, Restore dialogs
- `src/hooks/*` - All 11 existing stores (usePolygonStore, useSelectionStore, etc.)
- `src/utils/*` - All utilities

---

## Error Handling Summary

| Screen | Error Scenario | Handling |
|--------|----------------|----------|
| Login | Empty Employee ID | "Employee ID is required" below input |
| Login | Empty Password | "Password is required" below input |
| Login | Invalid credentials | "Invalid credentials. Please try again." |
| Login | Network error | "Network error. Please check your connection." |
| Dashboard | Villages fail to load | "Failed to load villages" + Retry button |
| Dashboard | No search results | "No villages match your search" message |
| Dashboard | Village without data clicked | Toast: "{name} data not available in demo" |
| Editor | Data load fails | "Failed to load parcels" + Retry button |

# BoundaryAI UI Implementation Plan

## Overview

Add Login and Dashboard screens to the existing Map Editor application, implementing the design.md specification with proper routing and theme switching.

**Branch:** `feature/ui-redesign`

---

## ⚠️ CRITICAL: Commit Rules

**Commit IMMEDIATELY after creating or updating EACH file. Do NOT wait.**

1. Create/update a file → Save → Commit immediately
2. One file = One commit (unless tightly coupled like component + types)
3. Never batch multiple file changes
4. Never include yourself as commit author
5. Follow conventional commit format: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`

**Example:**
```bash
# After creating useAuthStore.ts
git add dashboard/src/hooks/useAuthStore.ts
git commit -m "feat: Add auth store with login/logout and session persistence"

# After creating LoginScreen.tsx
git add dashboard/src/components/Auth/LoginScreen.tsx
git commit -m "feat: Add login screen with form validation and error states"
```

---

## Implementation Progress

Track completion by checking off items as you commit each file.

### Phase 1: Setup
- [x] Create branch `feature/ui-redesign`
- [x] Run `npm install react-router-dom lucide-react clsx react-hot-toast`
- [x] Update `src/index.css` (remove hardcoded dark theme)

### Phase 2: Auth Store
- [x] Create `src/hooks/useAuthStore.ts`

### Phase 3: Village Store
- [x] Create `src/hooks/useVillageStore.ts`

### Phase 4: Login Screen
- [x] Create `src/components/Auth/LoginScreen.tsx`

### Phase 5: Dashboard Screen
- [x] Create `src/components/Dashboard/DashboardScreen.tsx`

### Phase 6: Map Editor Screen
- [x] Create `src/components/Editor/EditorHeader.tsx`
- [x] Create `src/components/Editor/MapEditorScreen.tsx`
- [x] Update `src/components/Sidebar/Sidebar.tsx` (remove Saved indicator)

### Phase 7: Protected Route
- [ ] Create `src/components/Auth/ProtectedRoute.tsx`

### Phase 8: Routing
- [ ] Update `src/main.tsx` (add router and routes)

### Phase 9: Testing
- [ ] Verify all 23 test cases pass
- [ ] Verify all existing Map Editor features work

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
| `package.json` | Add `react-router-dom`, `lucide-react`, `clsx`, `react-hot-toast` |
| `src/main.tsx` | Add router, define routes, add Toaster |
| `src/index.css` | Remove hardcoded dark theme from body |
| `src/components/Sidebar/Sidebar.tsx` | Remove "Saved ✓" indicator (lines 44-46, moves to EditorHeader) |

---

## New Dependencies

Install these packages in the `dashboard/` directory:

```bash
cd dashboard
npm install react-router-dom lucide-react clsx react-hot-toast
```

| Package | Version | Purpose |
|---------|---------|---------|
| `react-router-dom` | ^6.x | Client-side routing |
| `lucide-react` | ^0.x | Icons (Eye, EyeOff, ChevronDown, ArrowLeft, Check, Loader2) |
| `clsx` | ^2.x | Conditional class names (replacement for `cn()`) |
| `react-hot-toast` | ^2.x | Toast notifications for "data not available" messages |

**Usage patterns:**
```tsx
// clsx for conditional classes
import clsx from 'clsx';
<input className={clsx('border rounded', error && 'border-red-600')} />

// lucide-react icons
import { Eye, EyeOff, ChevronDown, ArrowLeft, Check, Loader2 } from 'lucide-react';
<Eye className="w-5 h-5" />

// react-hot-toast
import toast, { Toaster } from 'react-hot-toast';
toast.error('Village data not available');
// Add <Toaster /> in main.tsx
```

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

**Filtering/Sorting Pattern:**

Use component-level filtering in DashboardScreen (not in store) - simpler for 4 items:

```typescript
// In DashboardScreen.tsx
const { villages, searchQuery, sortBy, sortDirection } = useVillageStore();

const filteredVillages = useMemo(() => {
  let result = villages.filter(v =>
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
```

**Why component-level, not store selector?**
- Only 4 villages - no performance concern
- Simpler to implement
- useMemo in component is sufficient

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
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const [showPassword, setShowPassword] = useState(false);

<div className="relative">
  <input
    type={showPassword ? 'text' : 'password'}
    id="password"
    className="w-full border border-slate-300 rounded px-3 py-2 pr-10"
    aria-describedby={error ? 'password-error' : undefined}
  />
  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
    aria-label={showPassword ? 'Hide password' : 'Show password'}
  >
    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
import clsx from 'clsx';

<input
  className={clsx(
    'border rounded px-3 py-2 w-full',
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
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const [dropdownOpen, setDropdownOpen] = useState(false);

<div className="relative">
  <button
    onClick={() => setDropdownOpen(!dropdownOpen)}
    className="flex items-center gap-2 hover:bg-slate-100 px-2 py-1 rounded"
  >
    <span>{user.name}</span>
    <ChevronDown className="w-4 h-4" />
  </button>
  {dropdownOpen && (
    <div className="absolute right-0 mt-2 bg-white border border-slate-200 rounded shadow-lg z-50">
      <button
        onClick={handleLogout}
        className="px-4 py-2 w-full text-left hover:bg-slate-100 text-slate-700"
      >
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
      className={clsx(
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
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useVillageStore } from '../../hooks/useVillageStore';

const navigate = useNavigate();
const { selectVillage } = useVillageStore();

function handleVillageClick(village: Village) {
  if (!village.hasRealData) {
    toast.error(`${village.name} data not available in demo`, {
      duration: 3000,
      icon: '⚠️',
    });
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
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Check } from 'lucide-react';
import { useVillageStore } from '../../hooks/useVillageStore';
import { useAuthStore } from '../../hooks/useAuthStore';
import { useAutoSave } from '../../hooks/useAutoSave';

export function EditorHeader() {
  const { selectedVillage } = useVillageStore();
  const { user, logout } = useAuthStore();
  const { showSavedIndicator } = useAutoSave(); // Uses existing hook
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
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <span className="font-medium">{selectedVillage?.name}</span>
          <span className="text-gray-400 ml-2">{selectedVillage?.mandal}</span>
        </div>
      </div>

      {/* Right: Save status + User */}
      <div className="flex items-center gap-4">
        {/* Save indicator - uses existing useAutoSave hook */}
        {showSavedIndicator && (
          <span className="text-emerald-500 text-sm flex items-center gap-1 animate-pulse">
            <Check className="w-4 h-4" />
            Auto-saved ✓
          </span>
        )}

        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 hover:bg-gray-700 px-2 py-1 rounded"
          >
            <span>{user?.name}</span>
            <ChevronDown className="w-4 h-4" />
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

**Note:** The `showSavedIndicator` comes from the existing `useAutoSave()` hook in `src/hooks/useAutoSave.ts`. It shows for 2 seconds after each auto-save. No new "isSaving" state needed - the save to localStorage is synchronous.

**Data Loading Logic:**

The current data loading is in `App.tsx` (lines 18-78). For MapEditorScreen:
- Keep the SAME loading logic (don't change it)
- The `workingLayerRef` pattern for preserving edits when switching data sources must stay
- Simply wrap the existing layout in MapEditorScreen

```tsx
// MapEditorScreen.tsx - wraps existing components
export function MapEditorScreen() {
  // Keep existing data loading logic from App.tsx here
  const { setParcels, setLoading, setError } = usePolygonStore();
  const { activeDataSource } = useLayerStore();
  const workingLayerRef = useRef<ParcelFeature[] | null>(null);

  useEffect(() => {
    // ... existing loadData() logic from App.tsx ...
  }, [activeDataSource, setParcels, setLoading, setError]);

  useKeyboardShortcuts();

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      <EditorHeader />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar className="w-64 flex-shrink-0 border-r border-gray-700" />
        <MapCanvas className="flex-1" />
      </div>
      <BottomBar className="flex-shrink-0" />
    </div>
  );
}
```

**Sidebar Modification (Remove "Saved ✓"):**

In `src/components/Sidebar/Sidebar.tsx`, remove lines 44-46:

```diff
  {/* Header */}
  <div className="border-b border-gray-700 px-4 py-3">
    <div className="flex items-center justify-between">
      <h1 className="text-lg font-semibold text-gray-100">BoundaryAI</h1>
-     {showSavedIndicator && (
-       <span className="text-xs text-green-400 animate-pulse">Saved ✓</span>
-     )}
    </div>
    <p className="text-xs text-gray-500">Land Parcel Editor</p>
  </div>
```

Also remove the `useAutoSave` import and `showSavedIndicator` destructuring from line 36:
```diff
- const { showSavedIndicator } = useAutoSave();
```

### Phase 7: Routing (10 min)
Update `main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LoginScreen } from './components/Auth/LoginScreen';
import { DashboardScreen } from './components/Dashboard/DashboardScreen';
import { MapEditorScreen } from './components/Editor/MapEditorScreen';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import './index.css';

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
      <Toaster position="top-center" />
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```
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
- `src/components/Sidebar/*` - All 6 tab panels (Tools, Layers, Classify, Validate, ROR, Stats)
- `src/components/BottomBar/*` - Status bar with mode hints and actions
- `src/components/Dialogs/*` - Export, Restore dialogs
- `src/hooks/*` - All 9 existing stores
- `src/utils/*` - All utilities (export, topology, accuracy, etc.)

---

## Existing Map Editor Features (Must Remain Working)

This section documents ALL existing features that must continue to work after the UI redesign. Use this as a testing checklist.

### Editing Tools (4 Modes)

| Mode | Shortcut | Features |
|------|----------|----------|
| **Select (V)** | V | Click to select, Shift+click to add, Ctrl/Cmd+click to toggle, drag for box select, click empty to clear |
| **Draw (N)** | N | Click to add vertices, double-click to finish, Escape to cancel, minimum 3 vertices, live preview |
| **Edit Vertices (E)** | E | Drag vertices to move, right-click to delete vertex (min 3), click edge to add vertex, Escape to finish |
| **Split (S)** | S | Draw line across polygon, double-click/Enter to cut, red dashed preview, Escape to cancel |

### Selection Operations

| Action | Shortcut | Requirement | Behavior |
|--------|----------|-------------|----------|
| Delete | D | 1+ selected | Removes selected parcels, confirmation if >5 |
| Merge | M | 2+ selected | Combines into one polygon using Turf.js union |
| Edit Vertices | E | 1 selected | Enters edit-vertices mode |
| Split | S | 1 selected | Enters split mode |

### Undo/Redo System

| Feature | Details |
|---------|---------|
| Stack Size | 100 actions max |
| Undo | Z or Ctrl+Z |
| Redo | Shift+Z or Ctrl+Shift+Z |
| Tracked Actions | Add, Delete, Merge, Split, Edit vertices, Change type |

### Data Sources (Radio Selection in Layers Tab)

| Source | Editable | Description |
|--------|----------|-------------|
| Working Layer | ✅ Yes | User's edits, persists to localStorage |
| SAM AI Output | ❌ No | 12,032 AI-detected parcels |
| Ground Truth | ❌ No | 105 reference parcels |

### Base Layers & Overlays (Checkboxes in Layers Tab)

| Layer | Default | Description |
|-------|---------|-------------|
| ORI Tiles | ON | Local drone imagery (zoom 14-20) |
| Google Satellite | ON | Global satellite fallback (zoom 0-21) |
| Show Polygons | ON | Parcel boundary visibility |
| Ground Truth Overlay | OFF | Dashed red lines showing reference parcels |
| Conflict Highlighting | OFF | Color parcels by area deviation (green/yellow/red) |

### Area Filter (Layers Tab)

| Feature | Details |
|---------|---------|
| Slider Range | 0-1000 m² |
| Presets | All, 10m², 50m², 100m², 500m² |
| Display | "Hiding X parcels" count |
| Stats | Smallest, Median, Largest area values |

### Parcel Classification (8 Types)

| # | Type | Shortcut | Color |
|---|------|----------|-------|
| 1 | Agricultural | 1 | Orange |
| 2 | Gramakantam | 2 | Yellow |
| 3 | Building | 3 | Red |
| 4 | Road | 4 | Gray |
| 5 | Water Body | 5 | Blue |
| 6 | Open Space | 6 | Green |
| 7 | Compound | 7 | Purple |
| 8 | Government Land | 8 | Teal |
| 0 | Unclassified | 0 | Default |

### Parcel Type Visibility (Layers Tab)

- Toggle visibility for each of 8 types independently
- "All" / "None" quick buttons
- Count of parcels per type displayed

### Validation Features (Validate Tab)

**Topology Validation:**
- Run topology check button
- Detects overlaps and gaps
- Auto-fix for fixable errors
- Clickable error list (zooms to location)
- Green/red status indicator

**Area Comparison (when parcel selected):**
- SAM area vs ROR expected area
- Difference percentage and absolute
- Match quality badge (Excellent/Good/Fair/Poor)
- LP number match display

**Accuracy Metrics:**
- Overall IoU score vs ground truth (target ≥85%)
- Matched/unmatched parcel counts
- "Parcels Needing Review" list (top 20)
- Export accuracy report as text file

### ROR Features (ROR Tab)

| Feature | Details |
|---------|---------|
| Load ROR | File upload (XLSX format) |
| Auto-load | Nibhanupudi ROR on startup |
| Search | By LP#, Survey#, Land Type |
| Display | LP number, extent, land type, survey number |
| Stats | Total records count, total area |

### Statistics Panel (Stats Tab)

| Section | Content |
|---------|---------|
| Overview | Total parcel count, Total area (ha/m²) |
| Area Distribution | Min, Avg, Median, Max |
| By Parcel Type | Colored bar chart with count, %, area per type |

### Export Features

**Shapefile Export:**
- Format: ESRI Shapefile (.zip with .shp, .shx, .dbf, .prj)
- CRS: UTM Zone 44N (EPSG:32644)
- Pre-export topology validation
- Export with warnings option

**Accuracy Report:**
- Text file with metrics summary
- Priority review list by lowest IoU

### Auto-Save & Session Persistence

| Feature | Details |
|---------|---------|
| Auto-save interval | Every 30 seconds |
| Storage | Browser localStorage |
| Saved indicator | "Saved ✓" pulse in sidebar header |
| Restore dialog | Shown on reload if previous session exists |
| Persisted data | Parcels + undo/redo history |

### Keyboard Shortcuts (Complete Reference)

**Mode Selection:**
| Key | Action |
|-----|--------|
| V | Select mode |
| N | Draw mode |
| E | Edit vertices mode (1 parcel) |
| S | Split mode (1 parcel) |

**Actions:**
| Key | Action |
|-----|--------|
| D or Delete | Delete selected |
| M | Merge selected (2+) |
| Z | Quick undo |
| Ctrl/Cmd+Z | Undo |
| Ctrl/Cmd+Shift+Z | Redo |
| Ctrl/Cmd+A | Select all visible |
| Escape | Cancel/clear selection |

**Classification:**
| Key | Type |
|-----|------|
| 1 | Agricultural |
| 2 | Gramakantam |
| 3 | Building |
| 4 | Road |
| 5 | Water Body |
| 6 | Open Space |
| 7 | Compound |
| 8 | Government Land |
| 0 | Unclassified |

### Map Interactions

**Mouse:**
- Hover: Visual highlight + pointer cursor
- Click: Select polygon
- Shift+Click: Add to selection
- Ctrl/Cmd+Click: Toggle selection
- Double-click (draw mode): Finish polygon
- Drag (empty area): Pan map
- Scroll: Zoom

**Right-Click Context Menu:**

*On empty space:*
- Draw New Polygon
- Select All
- Fit to Extent

*On single parcel:*
- Select / Add to Selection
- Zoom to Parcel
- Edit Vertices
- Split
- Delete

*On multiple selected:*
- Merge N Polygons
- Zoom to Selection
- Delete N Polygons

### Bottom Bar Components

| Component | Content |
|-----------|---------|
| Mode Badge | Colored pill: SELECT (blue), DRAW (green), EDIT (purple), SPLIT (orange) |
| Hint Text | Context-sensitive instructions for current mode |
| Selection Info | "Selected: X parcels • Y.Z m²" |
| Action Buttons | Delete, Merge, Split, Edit (shown contextually) |

### Visual Feedback

| State | Visual |
|-------|--------|
| Parcel hover | Lighter fill, pointer cursor |
| Parcel selected | Cyan border (3px), lighter fill |
| Vertex handles | White circles on boundary |
| Vertex hover | Larger handle, move cursor |
| Drawing preview | Dashed line following cursor |
| Split line | Red dashed line |

### State Management (9 Zustand Stores)

| Store | Purpose |
|-------|---------|
| usePolygonStore | Parcel data, CRUD, merge/split |
| useModeStore | Current editing mode |
| useSelectionStore | Selected/hovered polygon IDs |
| useLayerStore | Layer visibility, data source, filters |
| useDrawingStore | Drawing state and vertices |
| useEditingStore | Vertex editing state |
| useSplitStore | Split line state |
| useHistoryStore | Undo/redo stacks |
| useRORStore | Record of Rights data |

### Integration Notes for MapEditorScreen

When wrapping the existing editor in MapEditorScreen:

1. **Do NOT modify** any existing component functionality
2. **EditorHeader** is NEW - adds back button, village name, save status, user menu
3. **Sidebar header** currently shows "Saved ✓" - this moves to EditorHeader
4. **Data loading** currently in App.tsx - moves to MapEditorScreen
5. **All keyboard shortcuts** must continue working (not intercepted by new components)
6. **Auto-save** continues to work with localStorage
7. **Session restore dialog** still appears when applicable

---

## Map Editor Verification Checklist

After implementing the new UI, verify ALL these features work:

### Tools
- [ ] Select mode (V) - click, shift+click, ctrl+click, box select
- [ ] Draw mode (N) - click vertices, double-click finish, escape cancel
- [ ] Edit vertices mode (E) - drag vertices, add on edge, delete vertex
- [ ] Split mode (S) - draw line, double-click to cut

### Operations
- [ ] Delete (D) - single and multiple, confirmation for >5
- [ ] Merge (M) - combines 2+ polygons
- [ ] Undo (Z, Ctrl+Z) - reverts last action
- [ ] Redo (Shift+Z) - restores undone action

### Data Sources
- [ ] Working Layer - editable, persists
- [ ] SAM AI Output - loads 12,032 parcels
- [ ] Ground Truth - loads 105 parcels

### Layers
- [ ] ORI Tiles - drone imagery shows at zoom 14+
- [ ] Google Satellite - shows as fallback
- [ ] Show Polygons toggle - hides/shows all parcels
- [ ] Ground Truth Overlay - dashed red lines
- [ ] Conflict Highlighting - green/yellow/red coloring

### Area Filter
- [ ] Slider changes threshold
- [ ] Preset buttons work
- [ ] "Hiding X parcels" updates
- [ ] Stats display correctly

### Classification
- [ ] All 8 type buttons work
- [ ] Keyboard shortcuts 1-8 work
- [ ] Type visibility toggles work
- [ ] All/None buttons work

### Validation
- [ ] Topology check runs and shows results
- [ ] Auto-fix works for fixable errors
- [ ] Area comparison shows when parcel selected
- [ ] Accuracy metrics calculate vs ground truth

### ROR
- [ ] Auto-loads Nibhanupudi ROR
- [ ] Search filters records
- [ ] Click record highlights it

### Stats
- [ ] Total parcels and area correct
- [ ] Area distribution shows
- [ ] Type bar chart renders

### Export
- [ ] Shapefile export downloads .zip
- [ ] Pre-export validation runs

### Auto-Save
- [ ] Saves every 30 seconds
- [ ] "Saved ✓" indicator shows
- [ ] Session restore dialog appears on reload

### Context Menu
- [ ] Right-click on empty space shows options
- [ ] Right-click on parcel shows options
- [ ] Right-click on multi-selection shows merge option

### Keyboard Shortcuts
- [ ] All mode shortcuts (V, N, E, S)
- [ ] All action shortcuts (D, M, Z, Escape)
- [ ] All classification shortcuts (0-8)
- [ ] Ctrl+A selects all

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

import { create } from 'zustand';

interface User {
  employeeId: string;
  name: string;
  role: string;
  district: string;
}

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (employeeId: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  initFromStorage: () => void;
}

// Mock users for demo
const MOCK_USERS: Record<string, { password: string; name: string; role: string; district: string }> = {
  'EMP001': {
    password: 'demo123',
    name: 'Ravi Kumar',
    role: 'Survey Officer',
    district: 'Guntur'
  }
};

const AUTH_STORAGE_KEY = 'auth_user';

export const useAuthStore = create<AuthState>((set) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Actions
  login: async (employeeId: string, password: string) => {
    // Clear previous errors
    set({ error: null });

    // Validate inputs
    if (!employeeId.trim()) {
      set({ error: 'Employee ID is required' });
      return;
    }
    if (!password) {
      set({ error: 'Password is required' });
      return;
    }

    set({ isLoading: true });

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Check credentials
    const mockUser = MOCK_USERS[employeeId.toUpperCase()];
    if (!mockUser || mockUser.password !== password) {
      set({
        isLoading: false,
        error: 'Invalid credentials. Please try again.'
      });
      return;
    }

    // Success - create user object
    const user: User = {
      employeeId: employeeId.toUpperCase(),
      name: mockUser.name,
      role: mockUser.role,
      district: mockUser.district
    };

    // Persist to localStorage
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));

    set({
      user,
      isAuthenticated: true,
      isLoading: false,
      error: null
    });
  },

  logout: () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    set({
      user: null,
      isAuthenticated: false,
      error: null
    });
    // Note: Do NOT clear polygon/working data here
  },

  clearError: () => {
    set({ error: null });
  },

  initFromStorage: () => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        const user = JSON.parse(stored) as User;
        set({ user, isAuthenticated: true });
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
  }
}));

// Initialize auth from storage on module load
useAuthStore.getState().initFromStorage();

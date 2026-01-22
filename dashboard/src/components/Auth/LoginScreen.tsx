import { useState, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../../hooks/useAuthStore';

export function LoginScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    await login(employeeId, password);

    // Check if login was successful (user is now authenticated)
    if (useAuthStore.getState().isAuthenticated) {
      navigate(from, { replace: true });
    }
  };

  const isFormValid = employeeId.trim() && password;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header with language selector */}
      <header className="flex justify-end p-4">
        <select
          className="border border-slate-300 rounded px-3 py-2 text-slate-700 bg-white text-sm"
          defaultValue="en"
          aria-label="Select language"
        >
          <option value="en">English</option>
          <option value="te">తెలుగు</option>
        </select>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        {/* Logos */}
        <div className="flex items-center gap-6 mb-6">
          <div
            className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center"
            aria-label="Government Logo"
          >
            <span className="text-slate-400 text-xs">Gov</span>
          </div>
          <div
            className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center"
            aria-label="Department Logo"
          >
            <span className="text-slate-400 text-xs">Dept</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-800 mb-1">BoundaryAI</h1>
        <p className="text-slate-500 mb-8">Land Parcel Editor</p>

        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm bg-slate-50 border border-slate-200 rounded-lg p-6"
        >
          {/* Employee ID Field */}
          <div className="mb-4">
            <label
              htmlFor="employee-id"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Employee ID
            </label>
            <input
              type="text"
              id="employee-id"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              disabled={isLoading}
              className={clsx(
                'w-full border rounded px-3 py-2 text-slate-800 bg-white',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                'disabled:bg-slate-100 disabled:cursor-not-allowed',
                error ? 'border-red-600' : 'border-slate-300'
              )}
              placeholder="e.g., EMP001"
              aria-invalid={!!error}
              aria-describedby={error ? 'login-error' : undefined}
            />
          </div>

          {/* Password Field */}
          <div className="mb-4">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className={clsx(
                  'w-full border rounded px-3 py-2 pr-10 text-slate-800 bg-white',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  'disabled:bg-slate-100 disabled:cursor-not-allowed',
                  error ? 'border-red-600' : 'border-slate-300'
                )}
                aria-invalid={!!error}
                aria-describedby={error ? 'login-error' : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 disabled:cursor-not-allowed min-h-11 min-w-11 flex items-center justify-center -mr-3"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div
              id="login-error"
              role="alert"
              className="text-red-600 text-sm mb-4"
            >
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid || isLoading}
            className={clsx(
              'w-full py-2 px-4 rounded font-medium text-white min-h-11',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              'transition-colors',
              isFormValid && !isLoading
                ? 'bg-blue-800 hover:bg-blue-700 cursor-pointer'
                : 'bg-slate-400 cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing In...
              </span>
            ) : (
              'Sign In'
            )}
          </button>

          {/* Demo Hint */}
          <p className="text-center text-slate-500 text-sm mt-4">
            Demo: <span className="font-mono">EMP001</span> / <span className="font-mono">demo123</span>
          </p>
        </form>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-slate-500 text-sm">
        Andhra Pradesh Survey & Land Records Department
      </footer>
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../../hooks/useAuthStore';
import { Icon } from '../shared/Icon';

// Government logos
const AP_EMBLEM_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBnw4iep8fyTAo5ZIIRmqTibv572vQWlqSsuRmacWr7JrlQMxuLFAV6ejQAuXCsuLwJWyMEm7SeWDbxEyR60scB8dhKKttTH9Zuz3IHFR8dOFrvjFOweYy5v8vDTfxOwmhgoHtvadTtdY5RumHDQ67nVVpaXwZ3DDTMGglHRHpHjdFPZK1HFYbVg9cddLcfdJvZNP11yvFC4rFCHX1P6662ma_N-is9flPoftIwVFdVzOrgpxnAyyErD5sR9GVqU9hB5TzqBmSIfRI2';
const SURVEY_DEPT_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAbhm3kWSHp03uVfebHTL1GQO06eghEHEX9M9gitfpV8H3Tr0l958V6RYU1MpDJn_xKc-ywGVbZqvfjzhYxPhLs__Q_prk-OnfGgNd_lDy9Mg2OqOs5vAIHHFRwmdIbfWb7wSccNgY8g4xdF9tFfIGW5tkMF2U_vLF1LV25GUQEcPURbxj__jWPZ4pWypk6xoPLIUmmQ59dwSyNapPgePQyi9QsMBFpqGrEiSGp9RoaNtBPInU-6D1jQbNZSIqw3K3VLHyWfevLhvJf';

export function LoginScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [employeeId, setEmployeeId] = useState('EMP001');
  const [password, setPassword] = useState('demo123');
  const [showPassword, setShowPassword] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    await login(employeeId, password);

    if (useAuthStore.getState().isAuthenticated) {
      navigate(from, { replace: true });
    }
  };

  const isFormValid = employeeId.trim() && password;

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[#f6f6f8] font-sans overflow-x-hidden">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#e2e4e9] bg-white px-6 py-4 lg:px-10">
        <div className="flex items-center gap-4">
          {/* Government Logos */}
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 bg-contain bg-center bg-no-repeat rounded-full"
              style={{ backgroundImage: `url("${AP_EMBLEM_URL}")` }}
              aria-label="Andhra Pradesh State Emblem"
            />
            <div className="h-8 border-r border-[#e2e4e9] hidden sm:block" />
            <div
              className="h-12 w-12 bg-contain bg-center bg-no-repeat rounded-full"
              style={{ backgroundImage: `url("${SURVEY_DEPT_URL}")` }}
              aria-label="Survey & Land Records Department Logo"
            />
          </div>
          <div className="hidden flex-col sm:flex">
            <h1 className="text-[#121317] text-base font-bold leading-tight">Andhra Pradesh</h1>
            <span className="text-[#656d86] text-xs font-medium">Survey & Land Records Dept.</span>
          </div>
        </div>

        {/* Language Selector */}
        <div className="flex items-center gap-2">
          <button className="group flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#dcdee5] bg-white px-4 text-[#121317] transition hover:bg-[#f8fafc]">
            <Icon name="language" size="lg" />
            <span className="text-sm font-bold">English / తెలుగు</span>
            <Icon name="expand_more" size="lg" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Login Card */}
          <div className="flex flex-col gap-8 rounded-xl bg-white p-8 shadow-xl shadow-[#00000008] ring-1 ring-[#e2e4e9]">
            {/* Card Header */}
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-xl bg-[#1e3fae]/10 text-[#1e3fae]">
                <Icon name="map" size="2xl" className="text-3xl" />
              </div>
              <h2 className="text-[#121317] text-2xl font-black tracking-tight">BoundaryAI</h2>
              <p className="text-[#656d86] text-sm font-medium">Land Parcel Editor Portal</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Employee ID Field */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="employee-id" className="text-[#121317] text-sm font-semibold">
                  Employee ID
                </label>
                <div className={clsx(
                  'flex w-full items-center rounded-lg border bg-white transition',
                  'focus-within:border-[#1e3fae] focus-within:ring-1 focus-within:ring-[#1e3fae]',
                  error ? 'border-red-500' : 'border-[#dcdee5]'
                )}>
                  <div className="flex h-12 w-10 items-center justify-center text-[#656d86]">
                    <Icon name="badge" className="text-[20px]" />
                  </div>
                  <input
                    type="text"
                    id="employee-id"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    disabled={isLoading}
                    className="h-12 w-full border-none bg-transparent px-0 pr-4 text-sm text-[#121317] placeholder:text-[#949ab1] focus:ring-0 focus:outline-none disabled:cursor-not-allowed"
                    placeholder="Enter your government ID"
                    aria-invalid={!!error}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-[#121317] text-sm font-semibold">
                  Password
                </label>
                <div className={clsx(
                  'flex w-full items-center rounded-lg border bg-white transition',
                  'focus-within:border-[#1e3fae] focus-within:ring-1 focus-within:ring-[#1e3fae]',
                  error ? 'border-red-500' : 'border-[#dcdee5]'
                )}>
                  <div className="flex h-12 w-10 items-center justify-center text-[#656d86]">
                    <Icon name="lock" className="text-[20px]" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="h-12 w-full border-none bg-transparent px-0 text-sm text-[#121317] placeholder:text-[#949ab1] focus:ring-0 focus:outline-none disabled:cursor-not-allowed"
                    placeholder="Enter your password"
                    aria-invalid={!!error}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className="flex h-12 w-10 cursor-pointer items-center justify-center text-[#656d86] transition hover:text-[#121317] disabled:cursor-not-allowed"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-[20px]" />
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div role="alert" className="text-red-600 text-sm -mt-2">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-4 pt-2">
                <button
                  type="submit"
                  disabled={!isFormValid || isLoading}
                  className={clsx(
                    'flex h-12 w-full items-center justify-center rounded-lg text-white shadow-sm transition',
                    'focus:outline-none focus:ring-2 focus:ring-[#1e3fae] focus:ring-offset-2',
                    isFormValid && !isLoading
                      ? 'bg-[#1e3fae] hover:bg-blue-800 cursor-pointer'
                      : 'bg-slate-400 cursor-not-allowed'
                  )}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-base font-bold tracking-wide">Signing In...</span>
                    </span>
                  ) : (
                    <span className="text-base font-bold tracking-wide">Sign In</span>
                  )}
                </button>
                <div className="flex items-center justify-center">
                  <a
                    href="#"
                    className="text-sm font-medium text-[#656d86] underline decoration-[#dcdee5] underline-offset-4 transition hover:text-[#1e3fae] hover:decoration-[#1e3fae]"
                  >
                    Forgot Password?
                  </a>
                </div>
              </div>

              {/* Demo Hint */}
              <p className="text-center text-[#949ab1] text-xs mt-2">
                Demo: <span className="font-mono">EMP001</span> / <span className="font-mono">demo123</span>
              </p>
            </form>
          </div>

          {/* Helper Links below card */}
          <div className="mt-8 flex justify-center gap-6 text-sm font-medium text-[#656d86]">
            <a href="#" className="hover:text-[#1e3fae] transition">Help Desk</a>
            <span className="text-[#dcdee5]">|</span>
            <a href="#" className="hover:text-[#1e3fae] transition">Privacy Policy</a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e2e4e9] bg-white py-6">
        <div className="container mx-auto flex flex-col items-center justify-center gap-2 px-4 text-center">
          <p className="text-sm font-normal text-[#656d86]">
            © 2024 Andhra Pradesh Survey & Land Records Department
          </p>
          <div className="flex items-center gap-2 text-xs text-[#949ab1]">
            <Icon name="verified_user" className="text-[14px]" />
            <span>Official Government Portal</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

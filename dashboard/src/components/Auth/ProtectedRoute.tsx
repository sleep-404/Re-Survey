import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../hooks/useAuthStore';
import { useVillageStore } from '../../hooks/useVillageStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVillage?: boolean;
}

export function ProtectedRoute({
  children,
  requireVillage = false
}: ProtectedRouteProps) {
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

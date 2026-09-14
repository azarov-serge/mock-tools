import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { parseAccessToken, readAccessToken } from '@/shared/lib/session';

export function RequireAuth() {
  const location = useLocation();
  const token = readAccessToken();
  const payload = token ? parseAccessToken(token) : null;
  const valid = payload && payload.exp > Date.now();

  if (!valid) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function RequireSu() {
  const token = readAccessToken();
  const payload = token ? parseAccessToken(token) : null;
  if (payload?.role !== 'su') {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

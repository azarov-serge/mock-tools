import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DevTools } from '@mock-tools/devtools';
import { AppProviders } from '@/app/providers';
import { RequireAuth, RequireSu } from '@/app/guards';
import { ChangePasswordPage } from '@/pages/change-password';
import { LoginPage } from '@/pages/login';
import { MonitoringPage } from '@/pages/monitoring';
import { UsersPage } from '@/pages/users';
import { api } from '@/shared/api';
import { AppLayout } from '@/widgets/app-header';
import { parseAccessToken, readAccessToken } from '@/shared/lib/session';

function LoginRoute() {
  const token = readAccessToken();
  const payload = token ? parseAccessToken(token) : null;
  if (payload && payload.exp > Date.now()) {
    return <Navigate to="/" replace />;
  }
  return <LoginPage />;
}

/** Vite `base` (`/` locally, `/mock-tools/` on GitHub Pages). */
const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

export function App() {
  return (
    <AppProviders>
      <BrowserRouter basename={routerBasename === '/' ? undefined : routerBasename}>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route index element={<MonitoringPage />} />
              <Route path="change-password" element={<ChangePasswordPage />} />
              <Route element={<RequireSu />}>
                <Route path="users" element={<UsersPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <DevTools api={api} />
    </AppProviders>
  );
}

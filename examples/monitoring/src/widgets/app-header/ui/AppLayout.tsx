import { AppShell, Avatar, Group, Menu, Text, UnstyledButton } from '@mantine/core';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { ToggleThemeButton } from '@/features/toggle-theme';
import { api } from '@/shared/api';
import { authHeaders } from '@/shared/api/client';
import {
  clearAccessToken,
  parseAccessToken,
  readAccessToken,
} from '@/shared/lib/session';

function initials(login: string): string {
  const parts = login.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return login.slice(0, 2).toUpperCase() || '?';
}

export function AppLayout() {
  const navigate = useNavigate();
  const payload = parseAccessToken(readAccessToken() ?? '');
  const login = payload?.login ?? 'user';

  async function logout() {
    await api.handle('/auth/logout', { method: 'POST', headers: authHeaders() });
    clearAccessToken();
    navigate('/login', { replace: true });
  }

  return (
    <AppShell header={{ height: 56 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Text
            component={Link}
            to="/"
            fw={800}
            size="lg"
            style={{ textDecoration: 'none', color: 'inherit', letterSpacing: '0.04em' }}
          >
            MONITORING
          </Text>
          <Group gap="sm">
            <ToggleThemeButton />
            <Menu shadow="md" width={220} position="bottom-end">
              <Menu.Target>
                <UnstyledButton
                  aria-label="User menu"
                  style={{ borderRadius: '50%', display: 'inline-flex' }}
                >
                  <Avatar radius="xl" size={36} color="gray" variant="filled">
                    {initials(login)}
                  </Avatar>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{login}</Menu.Label>
                <Menu.Divider />
                {payload?.role === 'su' ? (
                  <Menu.Item component={Link} to="/users">
                    Users
                  </Menu.Item>
                ) : null}
                <Menu.Item component={Link} to="/change-password">
                  Change password
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" onClick={() => void logout()}>
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}

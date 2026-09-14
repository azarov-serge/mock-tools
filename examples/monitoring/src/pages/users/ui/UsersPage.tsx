import { useEffect, useState, type FormEvent } from 'react';
import {
  Button,
  Group,
  Paper,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { api } from '@/shared/api';
import { authHeaders, callResource, ensureMockTransport } from '@/shared/api/client';

type UserRow = { id: string; login: string; role?: string; active: boolean };
type RequestRow = {
  id: string;
  login: string;
  status: string;
  createdAt: string;
};

export function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [login, setLogin] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'dimmed' | 'red'>('dimmed');

  async function loadUsers() {
    const res = await callResource(() => api.users.list());
    if (res.status < 400) setUsers((res.body as { items: UserRow[] }).items);
  }

  async function loadRequests() {
    // Route style for registration list (table meta on route)
    const res = await api.handle<{ items: RequestRow[] }>('/registration/requests', {
      headers: authHeaders(),
    });
    if (res.status < 400) setRequests(res.body.items);
  }

  useEffect(() => {
    void loadUsers();
    void loadRequests();
    ensureMockTransport();
    const ws = new WebSocket('ws://mock/registration/requests');
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(String(ev.data)) as { items?: RequestRow[] };
        if (data.items) setRequests(data.items);
      } catch {
        /* ignore */
      }
    };
    return () => ws.close();
  }, []);

  function showError(text: string) {
    setMessageTone('red');
    setMessage(text);
  }

  function showInfo(text: string) {
    setMessageTone('dimmed');
    setMessage(text);
  }

  async function createUser(e: FormEvent) {
    e.preventDefault();
    const res = await callResource(() => api.users.create({ login }));
    if (res.status >= 400) {
      showError((res.body as { message?: string })?.message ?? 'Create failed');
      return;
    }
    setLogin('');
    showInfo('User created (default password Qwerty!234!@#$) · via api.users.create');
    await loadUsers();
  }

  async function removeUser(id: string) {
    const res = await callResource(() => api.users.remove(id));
    if (res.status >= 400) {
      showError((res.body as { message?: string })?.message ?? 'Delete failed');
      return;
    }
    setMessage(null);
    await loadUsers();
  }

  async function approve(id: string) {
    const res = await api.handle<{ ok?: boolean; message?: string }>(
      `/registration/requests/${id}/approve`,
      {
        method: 'POST',
        headers: authHeaders(),
      },
    );
    if (res.status >= 400) {
      showError(
        (res.body as { message?: string })?.message ?? `Approve failed (${res.status})`,
      );
      return;
    }
    setMessage(null);
    await loadUsers();
    await loadRequests();
  }

  async function reject(id: string) {
    const res = await api.handle<{ ok?: boolean; message?: string }>(
      `/registration/requests/${id}/reject`,
      {
        method: 'POST',
        headers: authHeaders(),
      },
    );
    if (res.status >= 400) {
      showError(
        (res.body as { message?: string })?.message ?? `Reject failed (${res.status})`,
      );
      return;
    }
    setMessage(null);
    await loadRequests();
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Users</Title>
        <Text c="dimmed" size="sm">
          api.users.* (resource + register.meta) · registration via api.handle (routes)
        </Text>
      </div>
      {message ? (
        <Text size="sm" c={messageTone}>
          {message}
        </Text>
      ) : null}

      <Tabs defaultValue="active">
        <Tabs.List>
          <Tabs.Tab value="active">Active users</Tabs.Tab>
          <Tabs.Tab value="requests">Registration requests</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="active" pt="md">
          <Paper withBorder radius="md" p="md" mb="md">
            <form onSubmit={(e) => void createUser(e)}>
              <Group align="flex-end">
                <TextInput
                  label="Login"
                  value={login}
                  onChange={(e) => setLogin(e.currentTarget.value)}
                  required
                  style={{ flex: 1 }}
                />
                <Button type="submit">Add user</Button>
              </Group>
            </form>
          </Paper>
          <Paper withBorder radius="md" p={0} style={{ overflow: 'hidden' }}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Login</Table.Th>
                  <Table.Th>Role</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {users.map((u) => (
                  <Table.Tr key={u.id}>
                    <Table.Td>{u.login}</Table.Td>
                    <Table.Td>{u.role ?? '—'}</Table.Td>
                    <Table.Td>
                      <Button
                        size="xs"
                        color="red"
                        variant="light"
                        onClick={() => void removeUser(u.id)}
                      >
                        Delete
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="requests" pt="md">
          <Paper withBorder radius="md" p={0} style={{ overflow: 'hidden' }}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Login</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Created</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {requests.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={4}>
                      <Text c="dimmed" ta="center" py="md">
                        No requests
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  requests.map((r) => (
                    <Table.Tr key={r.id}>
                      <Table.Td>{r.login}</Table.Td>
                      <Table.Td>{r.status}</Table.Td>
                      <Table.Td>{new Date(r.createdAt).toLocaleString()}</Table.Td>
                      <Table.Td>
                        {r.status === 'pending' ? (
                          <Group gap="xs">
                            <Button size="xs" onClick={() => void approve(r.id)}>
                              Approve
                            </Button>
                            <Button
                              size="xs"
                              variant="light"
                              color="red"
                              onClick={() => void reject(r.id)}
                            >
                              Reject
                            </Button>
                          </Group>
                        ) : null}
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

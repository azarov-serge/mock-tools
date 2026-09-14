import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Badge,
  Button,
  Group,
  NumberInput,
  Paper,
  Progress,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { api } from '@/shared/api';
import { callResource, authHeaders, ensureMockTransport } from '@/shared/api/client';
import { parseAccessToken, readAccessToken } from '@/shared/lib/session';

type ServerRow = { id: string; ip: string; port: number };

type Metrics = {
  cpu: number;
  ram: { usedMb: number; totalMb: number };
  raid: string;
  diskIo: { readMBs: number; writeMBs: number };
  network: { inMbps: number; outMbps: number };
  uptimeSec: number;
};

const PAGE_SIZE = 5;

export function MonitoringPage() {
  const isSu = parseAccessToken(readAccessToken() ?? '')?.role === 'su';
  const [items, setItems] = useState<ServerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ServerRow | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [createIp, setCreateIp] = useState('');
  const [createPort, setCreatePort] = useState<number | ''>(22);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editIp, setEditIp] = useState('');
  const [editPort, setEditPort] = useState<number | ''>(22);

  const load = useCallback(async (p: number) => {
    const res = await callResource(() => api.servers.getList({ page: p, pageSize: PAGE_SIZE }));
    if (res.status >= 400) {
      setError((res.body as { message?: string })?.message ?? 'Failed to load servers');
      return;
    }
    const body = res.body as {
      items: ServerRow[];
      total: number;
      page: number;
    };
    setError(null);
    setItems(body.items);
    setTotal(body.total);
    setPage(body.page);
  }, []);

  useEffect(() => {
    void load(1);
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      setMetrics(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      const res = await callResource(() => api.servers.getItem(selectedId));
      if (!cancelled && res.status < 400) setSelected(res.body as ServerRow);
    })();

    ensureMockTransport();
    const es = new EventSource(`/servers/${selectedId}/metrics`);
    es.onmessage = (ev) => {
      try {
        setMetrics(JSON.parse(String(ev.data)) as Metrics);
      } catch {
        /* ignore */
      }
    };
    return () => {
      cancelled = true;
      es.close();
    };
  }, [selectedId]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function createServer(e: FormEvent) {
    e.preventDefault();
    if (createPort === '') return;
    const res = await callResource(() =>
      api.servers.create({ ip: createIp, port: Number(createPort) }),
    );
    if (res.status >= 400) {
      setMessage((res.body as { message?: string })?.message ?? 'Create failed');
      return;
    }
    setCreateIp('');
    setCreatePort(22);
    setMessage('Server created · api.servers.create');
    await load(page);
  }

  function startEdit(row: ServerRow) {
    setEditingId(row.id);
    setEditIp(row.ip);
    setEditPort(row.port);
  }

  async function saveEdit(id: string) {
    if (editPort === '') return;
    const res = await callResource(() =>
      api.servers.update(id, { ip: editIp, port: Number(editPort) }),
    );
    if (res.status >= 400) {
      setMessage((res.body as { message?: string })?.message ?? 'Update failed');
      return;
    }
    setEditingId(null);
    setMessage('Server updated · api.servers.update');
    if (selectedId === id) setSelected(res.body as ServerRow);
    await load(page);
  }

  async function removeServer(id: string) {
    const res = await callResource(() => api.servers.remove(id));
    if (res.status >= 400) {
      setMessage((res.body as { message?: string })?.message ?? 'Delete failed');
      return;
    }
    if (selectedId === id) setSelectedId(null);
    if (editingId === id) setEditingId(null);
    setMessage('Server deleted · api.servers.remove');
    const nextTotal = Math.max(0, total - 1);
    const nextPages = Math.max(1, Math.ceil(nextTotal / PAGE_SIZE));
    await load(Math.min(page, nextPages));
  }

  async function rebootServer(id: string) {
    const res = await api.handle<{ ok?: boolean; message?: string }>(`/servers/${id}/reboot`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (res.status >= 400) {
      setMessage(
        (res.body as { message?: string })?.message ?? `Reboot failed · HTTP ${res.status}`,
      );
      return;
    }
    setMessage(
      `Reboot ${res.status} · ${(res.body as { message?: string })?.message ?? 'ok'} (override via DevTools Mocks)`,
    );
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Servers</Title>
        <Text c="dimmed" size="sm">
          {total} total · CRUD via api.servers.* (resource + @endpoint)
        </Text>
      </div>

      {error ? (
        <Text c="red" size="sm">
          {error}
        </Text>
      ) : null}
      {message ? (
        <Text size="sm" c="dimmed">
          {message}
        </Text>
      ) : null}

      {isSu ? (
        <Paper withBorder radius="md" p="md">
          <form onSubmit={(e) => void createServer(e)}>
            <Group align="flex-end">
              <TextInput
                label="IP"
                value={createIp}
                onChange={(e) => setCreateIp(e.currentTarget.value)}
                required
                style={{ flex: 1 }}
                placeholder="10.0.0.1"
              />
              <NumberInput
                label="Port"
                value={createPort}
                onChange={(v) => setCreatePort(typeof v === 'number' ? v : '')}
                min={1}
                max={65535}
                required
                w={120}
              />
              <Button type="submit">Add server</Button>
            </Group>
          </form>
        </Paper>
      ) : null}

      <Paper withBorder radius="md" p={0} style={{ overflow: 'hidden' }}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={100} />
              <Table.Th>IP</Table.Th>
              <Table.Th>PORT</Table.Th>
              {isSu ? <Table.Th w={200} /> : null}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={isSu ? 4 : 3}>
                  <Text c="dimmed" ta="center" py="md">
                    No servers
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              items.map((row) => (
                <Table.Tr key={row.id}>
                  <Table.Td>
                    <Button
                      size="xs"
                      variant={selectedId === row.id ? 'filled' : 'light'}
                      onClick={() => setSelectedId(row.id)}
                    >
                      View
                    </Button>
                  </Table.Td>
                  <Table.Td>
                    {editingId === row.id ? (
                      <TextInput
                        size="xs"
                        value={editIp}
                        onChange={(e) => setEditIp(e.currentTarget.value)}
                      />
                    ) : (
                      <Text ff="monospace" size="sm">
                        {row.ip}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {editingId === row.id ? (
                      <NumberInput
                        size="xs"
                        value={editPort}
                        onChange={(v) => setEditPort(typeof v === 'number' ? v : '')}
                        min={1}
                        max={65535}
                        w={100}
                      />
                    ) : (
                      row.port
                    )}
                  </Table.Td>
                  {isSu ? (
                    <Table.Td>
                      <Group gap="xs" justify="flex-end">
                        {editingId === row.id ? (
                          <>
                            <Button size="xs" onClick={() => void saveEdit(row.id)}>
                              Save
                            </Button>
                            <Button
                              size="xs"
                              variant="default"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="xs" variant="light" onClick={() => startEdit(row)}>
                              Edit
                            </Button>
                            <Button
                              size="xs"
                              color="red"
                              variant="light"
                              onClick={() => void removeServer(row.id)}
                            >
                              Delete
                            </Button>
                          </>
                        )}
                      </Group>
                    </Table.Td>
                  ) : null}
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      <Group>
        <Button
          variant="default"
          size="xs"
          disabled={page <= 1}
          onClick={() => void load(page - 1)}
        >
          Prev
        </Button>
        <Text size="sm">
          Page {page} / {pages}
        </Text>
        <Button
          variant="default"
          size="xs"
          disabled={page >= pages}
          onClick={() => void load(page + 1)}
        >
          Next
        </Button>
      </Group>

      {selected ? (
        <Paper withBorder radius="md" p="md">
          <Group justify="space-between" mb="md">
            <Title order={3} ff="monospace">
              {selected.ip}:{selected.port}
            </Title>
            <Group gap="xs">
              <Button size="xs" variant="light" onClick={() => void rebootServer(selected.id)}>
                Reboot
              </Button>
              <Button size="xs" variant="subtle" onClick={() => setSelectedId(null)}>
                Close
              </Button>
            </Group>
          </Group>
          {metrics ? (
            <Stack gap="sm">
              <div>
                <Text size="sm">CPU {metrics.cpu}%</Text>
                <Progress value={metrics.cpu} />
              </div>
              <Text size="sm">
                RAM {metrics.ram.usedMb} / {metrics.ram.totalMb} MB
              </Text>
              <Group gap="xs">
                <Text size="sm">RAID</Text>
                <Badge color={metrics.raid === 'ok' ? 'teal' : 'orange'}>{metrics.raid}</Badge>
              </Group>
              <Text size="sm">
                Disk I/O r {metrics.diskIo.readMBs} / w {metrics.diskIo.writeMBs} MB/s
              </Text>
              <Text size="sm">
                Net ↓ {metrics.network.inMbps} / ↑ {metrics.network.outMbps} Mbps
              </Text>
              <Text size="sm" c="dimmed">
                Uptime {Math.floor(metrics.uptimeSec / 3600)}h{' '}
                {Math.floor((metrics.uptimeSec % 3600) / 60)}m
              </Text>
            </Stack>
          ) : (
            <Text c="dimmed" size="sm">
              Connecting SSE…
            </Text>
          )}
        </Paper>
      ) : null}
    </Stack>
  );
}

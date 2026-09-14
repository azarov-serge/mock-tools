import { useState } from 'react';
import { Button, Code, Group, List, Stack, Text, Title } from '@mantine/core';
import { api } from '@/shared/api';
import { LIBRARIES } from '@/shared/config/libraries';

export function LoginAside() {
  const [pingResult, setPingResult] = useState('');

  async function onPing() {
    const res = await api.handle('/ping');
    setPingResult(JSON.stringify(res.body));
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={4} mb={6}>
          Libraries
        </Title>
        <Text size="sm" c="dimmed" mb="sm">
          Stack used by this example
        </Text>
        <List spacing="sm" size="sm">
          {LIBRARIES.map((lib) => (
            <List.Item key={lib.name}>
              <Text fw={600} span>
                {lib.name}
              </Text>
              <Text size="xs" c="dimmed">
                {lib.role}
              </Text>
            </List.Item>
          ))}
        </List>
      </div>

      <div>
        <Title order={4} mb={6}>
          Logging check
        </Title>
        <Text size="sm" c="dimmed" mb="sm">
          Enable Logging in DevTools Settings, then ping.
        </Text>
        <Group gap="sm" wrap="nowrap" align="center">
          <Button variant="light" radius="md" onClick={() => void onPing()} style={{ flexShrink: 0 }}>
            GET /ping
          </Button>
          {pingResult ? (
            <Code
              style={{
                flex: 1,
                minWidth: 0,
                overflow: 'auto',
                whiteSpace: 'nowrap',
              }}
            >
              {pingResult}
            </Code>
          ) : null}
        </Group>
      </div>
    </Stack>
  );
}

import { Box, Group, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { ToggleThemeButton } from '@/features/toggle-theme';
import { LoginAside } from '@/widgets/login-aside';
import { LoginForm } from '@/widgets/login-form';
import styles from './LoginPage.module.css';

/**
 * Login shell by analogy with secora LoginPage:
 * centered shell → brand + subtitle → card(s).
 */
export function LoginPage() {
  return (
    <Box className={styles.shell}>
      <Box className={styles.frame}>
        <Group justify="space-between" align="flex-start" mb="md" wrap="nowrap">
          <div>
            <Title order={1} className={styles.brandTitle}>
              MONITORING
            </Title>
            <Text c="dimmed" size="sm" mt={2}>
              Server monitoring mock stack
            </Text>
          </div>
          <ToggleThemeButton />
        </Group>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <Paper className={styles.card} p="lg" radius="md" withBorder>
            <Stack gap="xs" mb="md">
              <Title order={3}>Sign in</Title>
              <Text size="sm" c="dimmed">
                Enter credentials to open the monitoring console
              </Text>
            </Stack>
            <LoginForm />
          </Paper>

          <Paper className={styles.card} p="lg" radius="md" withBorder>
            <LoginAside />
          </Paper>
        </SimpleGrid>
      </Box>
    </Box>
  );
}

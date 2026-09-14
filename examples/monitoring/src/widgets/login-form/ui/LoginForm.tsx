import { useState, type FormEvent } from 'react';
import { Alert, Button, PasswordInput, Stack, Text, TextInput } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { api } from '@/shared/api';
import { writeAccessToken } from '@/shared/lib/session';

export function LoginForm() {
  const navigate = useNavigate();
  const [login, setLogin] = useState('root');
  const [password, setPassword] = useState('admin');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setInfo(null);

    if (mode === 'register') {
      const res = await api.handle('/auth/register', {
        method: 'POST',
        body: { login, password, confirmPassword },
      });
      setPending(false);
      if (res.status >= 400) {
        setError((res.body as { message?: string })?.message ?? 'Registration failed');
        return;
      }
      setInfo('Request submitted. Wait for root approval.');
      setMode('login');
      return;
    }

    const res = await api.handle<{ accessToken: string }>('/auth/login', {
      method: 'POST',
      body: { login, password },
    });
    setPending(false);
    if (res.status >= 400) {
      setError((res.body as { message?: string })?.message ?? 'Login failed');
      return;
    }
    writeAccessToken(res.body.accessToken);
    navigate('/', { replace: true });
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)}>
      <Stack gap="md">
        <TextInput
          label="Login"
          value={login}
          onChange={(e) => setLogin(e.currentTarget.value)}
          autoComplete="username"
          radius="md"
          required
        />
        <PasswordInput
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          radius="md"
          required
        />
        {mode === 'register' ? (
          <PasswordInput
            label="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.currentTarget.value)}
            radius="md"
            required
          />
        ) : null}
        {error ? (
          <Alert color="red" variant="light" radius="md">
            {error}
          </Alert>
        ) : null}
        {info ? (
          <Alert color="teal" variant="light" radius="md">
            {info}
          </Alert>
        ) : null}
        <Button type="submit" fullWidth radius="md" loading={pending}>
          {mode === 'login' ? 'Sign in' : 'Register'}
        </Button>
        <Text size="xs" c="dimmed">
          Demo: root / admin · Access token in localStorage
        </Text>
        <Button
          type="button"
          variant="subtle"
          size="compact-sm"
          onClick={() => {
            setMode((m) => (m === 'login' ? 'register' : 'login'));
            setError(null);
            setInfo(null);
          }}
        >
          {mode === 'login' ? 'Create registration request' : 'Back to sign in'}
        </Button>
      </Stack>
    </form>
  );
}

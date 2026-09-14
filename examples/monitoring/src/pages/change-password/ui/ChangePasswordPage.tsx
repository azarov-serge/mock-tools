import { useState, type FormEvent } from 'react';
import { Alert, Button, PasswordInput, Stack, Title } from '@mantine/core';
import { api } from '@/shared/api';
import { authHeaders } from '@/shared/api/client';

export function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setOk(false);
    const res = await api.handle('/auth/change-password', {
      method: 'POST',
      headers: authHeaders(),
      body: { oldPassword, newPassword, confirmPassword },
    });
    setPending(false);
    if (res.status >= 400) {
      setError((res.body as { message?: string })?.message ?? 'Failed');
      return;
    }
    setOk(true);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }

  return (
    <Stack maw={400} gap="md">
      <Title order={2}>Change password</Title>
      <form onSubmit={(e) => void onSubmit(e)}>
        <Stack gap="md">
          <PasswordInput
            label="Current password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.currentTarget.value)}
            required
          />
          <PasswordInput
            label="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.currentTarget.value)}
            required
          />
          <PasswordInput
            label="Confirm"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.currentTarget.value)}
            required
          />
          {error ? <Alert color="red">{error}</Alert> : null}
          {ok ? <Alert color="teal">Password updated</Alert> : null}
          <Button type="submit" loading={pending}>
            Save
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}

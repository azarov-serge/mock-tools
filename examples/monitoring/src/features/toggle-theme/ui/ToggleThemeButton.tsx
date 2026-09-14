import { Group, Switch } from '@mantine/core';
import { useTheme } from '@/shared/lib/theme';

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ToggleThemeButton() {
  const { theme, setTheme } = useTheme();
  const dark = theme === 'dark';

  return (
    <Group gap={8} wrap="nowrap" align="center">
      <span style={{ display: 'inline-flex', opacity: dark ? 0.45 : 1, color: 'inherit' }}>
        <SunIcon />
      </span>
      <Switch
        checked={dark}
        onChange={(e) => setTheme(e.currentTarget.checked ? 'dark' : 'light')}
        aria-label="Toggle theme"
        size="md"
      />
      <span style={{ display: 'inline-flex', opacity: dark ? 1 : 0.45, color: 'inherit' }}>
        <MoonIcon />
      </span>
    </Group>
  );
}

import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { DevToolsProvider } from './context/DevToolsContext.js';
import { Launcher } from './shell/Launcher.js';
import { Panel } from './shell/Panel.js';
import { useDevToolsController } from './shell/useDevToolsController.js';
import type { DevToolsProps } from './types.js';

export function DevTools(props: DevToolsProps): ReactElement | null {
  const { mounted, value } = useDevToolsController(props);

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <DevToolsProvider value={value}>
      <Launcher />
      <Panel />
    </DevToolsProvider>,
    document.body,
  );
}

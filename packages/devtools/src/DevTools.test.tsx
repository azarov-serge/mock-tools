import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { Api } from '@mock-tools/api';
import { DevTools } from './DevTools.js';
import { generationConfigStore } from './storage/GenerationConfigStore.js';
import { manualMockStore } from './storage/ManualMockStore.js';
import { mockStorage } from './storage/MockStorage.js';
import { responseOverrideStore } from './storage/ResponseOverrideStore.js';
import { pushChannelStore } from './storage/PushChannelStore.js';
import { schemaDraftStore } from './storage/SchemaDraftStore.js';

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(async () => {
  localStorage.clear();
  generationConfigStore.useMemoryBackend();
  await generationConfigStore.clearAll();
  manualMockStore.useMemoryBackend();
  await manualMockStore.clearAll();
  responseOverrideStore.useMemoryBackend();
  await responseOverrideStore.clearAll();
  pushChannelStore.useMemoryBackend();
  await pushChannelStore.clearAll();
  schemaDraftStore.useMemoryBackend();
  await schemaDraftStore.clearAll();
});

async function openPanelFromLauncher(buttonIndex = 0) {
  await act(async () => {
    document
      .querySelector('[data-mock-tools-launcher]')!
      .querySelectorAll('button')
      [buttonIndex]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

async function clickTab(label: string) {
  const tab = Array.from(document.querySelectorAll('[role="tab"]')).find(
    (el) => el.textContent === label,
  );
  await act(async () => {
    tab!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('DevTools Shell + Settings', () => {
  it('opens panel from launcher without forcing a tab', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    mockStorage.lastTab.setValue('settings');
    const api = new Api({
      delay: false,
      dbStatus: () => ({
        name: 'demo-db',
        status: 'ok',
        tables: [{ name: 'users', count: 2 }],
      }),
    });
    const root = createRoot(host);

    await act(async () => {
      root.render(<DevTools api={api} />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(document.querySelector('[data-mock-tools-launcher]')).not.toBeNull();

    await openPanelFromLauncher(0);

    expect(mockStorage.lastTab.getValue()).toBe('settings');
    expect(document.querySelector('[data-mock-tools-settings]')).not.toBeNull();
    expect(document.querySelector('[data-mock-tools-settings-database]')?.textContent).toContain(
      'demo-db',
    );
    expect(document.querySelector('[data-mock-tools-launcher]')).not.toBeNull();

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it('persists locale from Settings', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const api = new Api({
      delay: false,
      dbStatus: () => ({ name: 'demo-db', status: 'ok', tables: [] }),
    });
    const root = createRoot(host);

    await act(async () => {
      root.render(<DevTools api={api} />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    await openPanelFromLauncher(0);
    await clickTab('Settings');

    const ruBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'RU');
    await act(async () => {
      ruBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(mockStorage.locale.getValue()).toBe('ru');
    expect(document.querySelector('[data-mock-tools-settings]')?.textContent).toMatch(/Язык|Настройки/);

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it('lists GET list mocks with table and record counts', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const api = new Api({
      delay: false,
      dbStatus: () => ({
        name: 'demo-db',
        status: 'ok',
        tables: [{ name: 'servers', count: 15 }],
      }),
    });
    api.route.get('/servers', {
      table: 'servers',
      handler: async () => ({ items: [] }),
    });
    api.route.get('/ping', { handler: async () => ({ ok: true }) });
    const root = createRoot(host);

    await act(async () => {
      root.render(<DevTools api={api} />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    await openPanelFromLauncher(1);

    const list = document.querySelector('[data-mock-tools-mocks-list]');
    expect(list).not.toBeNull();
    expect(list?.textContent).toContain('[GET]');
    expect(list?.textContent).toContain('/servers');
    expect(list?.textContent).toContain('15');
    expect(list?.textContent).not.toContain('/ping');

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it('switches tabs only via panel TabBar', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const api = new Api({
      delay: false,
      dbStatus: () => ({ name: 'demo-db', status: 'ok', tables: [] }),
    });
    api.route.get('/servers', {
      table: 'servers',
      handler: async () => ({ items: [] }),
    });
    const root = createRoot(host);

    await act(async () => {
      root.render(<DevTools api={api} />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    await openPanelFromLauncher(0);
    expect(document.querySelector('[data-mock-tools-mocks-list]')).not.toBeNull();
    expect(mockStorage.lastTab.getValue()).toBe('mocks');

    await clickTab('Settings');
    expect(document.querySelector('[data-mock-tools-settings]')).not.toBeNull();
    expect(mockStorage.lastTab.getValue()).toBe('settings');

    await clickTab('Mocks');
    expect(document.querySelector('[data-mock-tools-mocks-list]')).not.toBeNull();
    expect(mockStorage.lastTab.getValue()).toBe('mocks');

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it('generates and clears table via storeAdapter in Expand', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const store: Record<string, Array<Record<string, unknown>>> = { servers: [] };
    let tableCount = 0;
    const api = new Api({
      delay: false,
      dbStatus: () => ({
        name: 'demo-db',
        status: 'ok',
        tables: [{ name: 'servers', count: tableCount }],
      }),
      storeAdapter: {
        list: (table) => store[table] ?? [],
        clear: (table) => {
          store[table] = [];
          tableCount = 0;
        },
        put: (table, rows) => {
          store[table] = rows;
          tableCount = rows.length;
        },
      },
      seedGenerator: {
        generate: (_table, count) =>
          Array.from({ length: count }, (_, i) => ({ id: `s-${i}`, ip: '10.0.0.1', port: 22 })),
      },
    });
    api.route.get('/servers', {
      table: 'servers',
      handler: async () => ({ items: [] }),
    });
    const root = createRoot(host);

    await act(async () => {
      root.render(<DevTools api={api} />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    await openPanelFromLauncher(1);

    const header = Array.from(document.querySelectorAll('[data-mock-tools-mocks-list] button')).find(
      (b) => b.textContent?.includes('/servers'),
    );
    await act(async () => {
      header!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Schemas tab (default): Generate into table
    await act(async () => {
      document
        .querySelector<HTMLButtonElement>('[data-mock-tools-mocks-expand-tab="schemas"]')
        ?.click();
    });

    expect(document.querySelector('[data-mock-tools-mocks-generate]')).not.toBeNull();

    await act(async () => {
      document.querySelector<HTMLButtonElement>('[data-mock-tools-mocks-generate]')!.click();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(store.servers?.length ?? 0).toBe(10);
    expect(document.querySelector('[data-mock-tools-mocks-generate-msg]')?.textContent).toMatch(/10/);
    expect(await generationConfigStore.listIds()).toEqual(['GET /servers']);

    // Clear table from Schemas
    await act(async () => {
      document.querySelector<HTMLButtonElement>('[data-mock-tools-mocks-clear]')!.click();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(store.servers?.length ?? 0).toBe(0);
    expect(await generationConfigStore.listIds()).toEqual(['GET /servers']);

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it('filters mocks list by endpoint path', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const api = new Api({
      delay: false,
      dbStatus: () => ({
        name: 'demo-db',
        status: 'ok',
        tables: [
          { name: 'servers', count: 1 },
          { name: 'users', count: 2 },
        ],
      }),
    });
    api.route.get('/servers', {
      table: 'servers',
      handler: async () => ({ items: [] }),
    });
    api.route.get('/users', {
      table: 'users',
      handler: async () => ({ items: [] }),
    });
    const root = createRoot(host);

    await act(async () => {
      root.render(<DevTools api={api} />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    await openPanelFromLauncher(1);
    await clickTab('Mocks');

    const search = document.querySelector(
      '[data-mock-tools-mocks-search]',
    ) as HTMLInputElement | null;
    expect(search).not.toBeNull();

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(search, '/users');
      search!.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const list = document.querySelector('[data-mock-tools-mocks-list]');
    expect(list?.textContent).toContain('/users');
    expect(list?.textContent).not.toContain('/servers');

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it('hides launcher when defaultHidden and opens via hotkey', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const api = new Api({ delay: false });
    const root = createRoot(host);

    await act(async () => {
      root.render(<DevTools api={api} defaultHidden />);
    });

    expect(document.querySelector('[data-mock-tools-launcher]')).toBeNull();

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'M', ctrlKey: true, shiftKey: true, bubbles: true }),
      );
    });

    expect(document.querySelector('[data-mock-tools-panel]')).not.toBeNull();

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  it('persists logging flag and restores ConsoleLogger on remount', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const api = new Api({ delay: false });
    const useSpy = vi.spyOn(api, 'use');
    const root = createRoot(host);

    await act(async () => {
      root.render(<DevTools api={api} />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    await openPanelFromLauncher(0);
    await clickTab('Settings');

    const checks = Array.from(
      document.querySelectorAll('[data-mock-tools-settings] input[type="checkbox"]'),
    ) as HTMLInputElement[];
    const loggingCheck = checks[checks.length - 1]!;
    expect(loggingCheck.checked).toBe(false);

    await act(async () => {
      loggingCheck.click();
    });

    expect(mockStorage.logging.getValue()).toBe(true);
    expect(useSpy).toHaveBeenCalledWith('logger', expect.anything());

    await act(async () => {
      root.unmount();
    });

    const api2 = new Api({ delay: false });
    const useSpy2 = vi.spyOn(api2, 'use');
    const root2 = createRoot(host);

    await act(async () => {
      root2.render(<DevTools api={api2} />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(useSpy2).toHaveBeenCalledWith('logger', expect.anything());

    await openPanelFromLauncher(0);
    await clickTab('Settings');
    const checks2 = Array.from(
      document.querySelectorAll('[data-mock-tools-settings] input[type="checkbox"]'),
    ) as HTMLInputElement[];
    expect(checks2[checks2.length - 1]!.checked).toBe(true);

    await act(async () => {
      root2.unmount();
    });
    host.remove();
  });

  it('adds a manual GET mock via Add wizard', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const api = new Api({
      delay: false,
      dbStatus: () => ({
        name: 'demo-db',
        status: 'ok',
        tables: [{ name: 'tasks', count: 0 }],
      }),
    });
    const root = createRoot(host);

    await act(async () => {
      root.render(<DevTools api={api} />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    await openPanelFromLauncher(1);

    await act(async () => {
      document.querySelector<HTMLButtonElement>('[data-mock-tools-mocks-add-open]')!.click();
    });
    expect(document.querySelector('[data-mock-tools-mocks-add]')).not.toBeNull();

    const pathInput = document.querySelector<HTMLInputElement>(
      '[data-mock-tools-mocks-add] input[data-mt-control]',
    )!;
    await act(async () => {
      const setNative = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setNative.call(pathInput, '/tasks');
      pathInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await act(async () => {
      document.querySelector<HTMLFormElement>('[data-mock-tools-mocks-add]')!.requestSubmit();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(await manualMockStore.listAll()).toEqual([
      expect.objectContaining({ path: '/tasks', table: 'tasks', httpMethod: 'GET' }),
    ]);
    expect(document.querySelector('[data-mock-tools-mocks-list]')?.textContent).toContain('/tasks');

    await act(async () => {
      root.unmount();
    });
    host.remove();
  });
});

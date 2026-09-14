export const LIBRARIES = [
  {
    name: '@mock-tools/factory',
    role: 'Generate / parse mock JSON for seeds and pagination.',
  },
  {
    name: '@mock-tools/api',
    role: 'In-browser mock backend: resources, routes, SSE/WS, middleware.',
  },
  {
    name: '@mock-tools/devtools',
    role: 'Launcher + Mocks / Settings over the live Api instance.',
  },
  {
    name: 'web-idb-client',
    role: 'IndexedDB persistence for users, servers, and requests.',
  },
] as const;

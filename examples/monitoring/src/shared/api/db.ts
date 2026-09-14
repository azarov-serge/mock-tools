import {
  createClient,
  defineStore,
  field,
  type InferSelect,
} from 'web-idb-client';

export const DB_NAME = 'mock-tools-monitoring';

export const usersStore = defineStore('users', {
  id: field.string().primaryKey(),
  login: field.string().uniqueIndex('byLogin'),
  passwordHash: field.string(),
  role: field.string().optional(),
  active: field.boolean().index('byActive'),
});

export const registrationRequestsStore = defineStore('registration_requests', {
  id: field.string().primaryKey(),
  login: field.string().uniqueIndex('byLogin'),
  passwordHash: field.string(),
  status: field.string().index('byStatus'),
  createdAt: field.string().index('byCreatedAt'),
});

export const serversStore = defineStore('servers', {
  id: field.string().primaryKey(),
  ip: field.string(),
  port: field.number(),
});

export const sessionsStore = defineStore('sessions', {
  id: field.string().primaryKey(),
  userId: field.string().index('byUserId'),
  exp: field.number(),
});

export const db = createClient({
  name: DB_NAME,
  version: 1,
  stores: {
    users: usersStore,
    registration_requests: registrationRequestsStore,
    servers: serversStore,
    sessions: sessionsStore,
  },
});

export type User = InferSelect<typeof usersStore>;
export type RegistrationRequest = InferSelect<typeof registrationRequestsStore>;
export type Server = InferSelect<typeof serversStore>;
export type Session = InferSelect<typeof sessionsStore>;

export type MonitoringDb = typeof db;

export type AppContext = {
  db: MonitoringDb;
  /** In-memory refresh “cookie jar” (not logged by default). */
  refreshCookie: string | null;
  /** Set by resource request interceptor / route Bearer hydrate. */
  currentUser: User | null;
};

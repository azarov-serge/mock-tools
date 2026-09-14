type StorageType = 'localStorage' | 'sessionStorage';

type KeyStorageOptions<T> = {
  defaultValue?: T;
  type?: StorageType;
};

/**
 * Typed Storage slot (JSON). Safe when `window` / storage is missing (SSR / tests).
 */
export class KeyStorage<T = string> {
  private readonly type: StorageType;
  private readonly defaultValue?: T;

  constructor(private readonly key: string, options?: KeyStorageOptions<T>) {
    this.type = options?.type ?? 'localStorage';
    this.defaultValue = options?.defaultValue;
  }

  /** `true` if the key exists in storage (written at least once). */
  hasValue(): boolean {
    return this.readRaw() !== null;
  }

  /**
   * Stored value if present.
   * If key is missing / JSON broken: `fallback` → `defaultValue` → `null`.
   */
  getValue(fallback?: T): T | null {
    const raw = this.readRaw();
    if (raw === null) {
      return this.pickDefault(fallback);
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return this.pickDefault(fallback);
    }
  }

  setValue(value: T): void {
    const storage = this.storage();
    if (!storage) return;
    try {
      storage.setItem(this.key, JSON.stringify(value));
    } catch {
      /* quota / private mode */
    }
  }

  removeValue(): void {
    const storage = this.storage();
    if (!storage) return;
    try {
      storage.removeItem(this.key);
    } catch {
      /* ignore */
    }
  }

  private pickDefault(fallback?: T): T | null {
    if (fallback !== undefined) return fallback;
    return this.defaultValue !== undefined ? this.defaultValue : null;
  }

  private storage(): Storage | null {
    try {
      if (typeof window === 'undefined' || !window[this.type]) return null;
      return window[this.type];
    } catch {
      return null;
    }
  }

  private readRaw(): string | null {
    const storage = this.storage();
    if (!storage) return null;
    try {
      return storage.getItem(this.key);
    } catch {
      return null;
    }
  }
}

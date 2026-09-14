/**
 * Методы instance + prototype (кроме constructor), без полей-не-функций.
 */
export function methodsOf(instance: object): string[] {
  const names = new Set<string>();
  let proto: object | null = instance;

  while (proto && proto !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key === 'constructor') continue;
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (!desc || desc.value === undefined) continue;
      if (typeof desc.value === 'function') {
        names.add(key);
      }
    }
    proto = Object.getPrototypeOf(proto);
  }

  return [...names];
}

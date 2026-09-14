/** Password encoding for the monitoring example (SRS §9). */

export const SALT = 'S@lt_For-Pa$$w0rd';

/** Default password for users created by `su` CRUD. */
export const DEFAULT_USER_PASSWORD = 'Qwerty!234!@#$';

export function hashPassword(password: string): string {
  let saltIndex = 0;
  let mixed = '';
  for (const p of password) {
    let chunk = '';
    for (let i = 0; i < 2; i++) {
      chunk += SALT[saltIndex % SALT.length]!;
      saltIndex += 1;
    }
    mixed += p + chunk;
  }
  return mixed.split('').reverse().join('');
}

export function verifyPassword(password: string, storedHash: string): boolean {
  return hashPassword(password) === storedHash;
}

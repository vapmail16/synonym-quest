import bcrypt from 'bcryptjs';

/** Must stay aligned with historical passwords and AuthService. */
export const AUTH_BCRYPT_ROUNDS = 12;

export async function hashPasswordForStorage(plain: string): Promise<string> {
  return bcrypt.hash(plain, AUTH_BCRYPT_ROUNDS);
}

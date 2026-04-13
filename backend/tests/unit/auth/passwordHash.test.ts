import bcrypt from 'bcryptjs';
import {
  AUTH_BCRYPT_ROUNDS,
  hashPasswordForStorage,
} from '../../../src/auth/passwordHash';

describe('passwordHash', () => {
  it('uses 12 bcrypt rounds (must match AuthService)', () => {
    expect(AUTH_BCRYPT_ROUNDS).toBe(12);
  });

  it('produces hashes that bcrypt.compare accepts', async () => {
    const hash = await hashPasswordForStorage('secretPass123');
    expect(await bcrypt.compare('secretPass123', hash)).toBe(true);
    expect(await bcrypt.compare('wrong', hash)).toBe(false);
  });
});

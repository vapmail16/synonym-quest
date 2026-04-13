/**
 * Admin-style reset: sets password hash for an active user by email.
 * Usage: npx ts-node src/scripts/reset-user-password.ts <email> [newPassword]
 * If newPassword is omitted, a random one is generated and printed once.
 */

import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

import { sequelize, User, UserSession } from '../models';
import { hashPasswordForStorage } from '../auth/passwordHash';

async function main(): Promise<void> {
  const email = process.argv[2]?.trim().toLowerCase();
  let plain = process.argv[3];

  if (!email) {
    console.error('Usage: ts-node src/scripts/reset-user-password.ts <email> [newPassword]');
    process.exit(1);
  }

  if (!plain) {
    plain = crypto.randomBytes(18).toString('base64url');
  }

  await sequelize.authenticate();

  const user = await User.findByEmail(email);
  if (!user) {
    console.error(`No active user with email: ${email}`);
    process.exit(1);
  }

  user.password = await hashPasswordForStorage(plain);
  await user.save();
  await UserSession.deactivateAllUserSessions(user.id);

  console.log(`Password updated for ${email}`);
  console.log('New password:', plain);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await sequelize.close();
  });

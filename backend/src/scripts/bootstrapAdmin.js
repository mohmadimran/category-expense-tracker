import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

dotenv.config();

const bootstrap = async () => {
  const { MONGODB_URI, BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD } = process.env;
  if (!MONGODB_URI || !BOOTSTRAP_ADMIN_NAME || !BOOTSTRAP_ADMIN_EMAIL || !BOOTSTRAP_ADMIN_PASSWORD) {
    throw new Error('Set MONGODB_URI, BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL, and BOOTSTRAP_ADMIN_PASSWORD');
  }
  if (Buffer.byteLength(BOOTSTRAP_ADMIN_PASSWORD, 'utf8') < 12 || Buffer.byteLength(BOOTSTRAP_ADMIN_PASSWORD, 'utf8') > 72) {
    throw new Error('BOOTSTRAP_ADMIN_PASSWORD must contain 12 to 72 UTF-8 bytes');
  }
  await mongoose.connect(MONGODB_URI);
  if (await User.exists({ role: 'admin', isActive: true })) {
    throw new Error('An active admin already exists; bootstrap is only for the first admin');
  }
  await User.create({
    name: BOOTSTRAP_ADMIN_NAME.trim(),
    email: BOOTSTRAP_ADMIN_EMAIL.trim().toLowerCase(),
    passwordHash: await bcrypt.hash(BOOTSTRAP_ADMIN_PASSWORD, 12),
    role: 'admin',
  });
  console.log(`Initial administrator created for ${BOOTSTRAP_ADMIN_EMAIL.trim().toLowerCase()}`);
};

bootstrap().catch(error => {
  console.error('Admin bootstrap failed:', error.message);
  process.exitCode = 1;
}).finally(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
});

import jwt from 'jsonwebtoken';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';

const ACCESS_TOKEN_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_MS = 30 * 24 * 60 * 60 * 1000;
const ISSUER = 'category-expense-tracker';
const digest = value => createHash('sha256').update(value).digest('hex');
const cookieBase = () => ({
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
});

const setAccessCookie = (res, token) => res.cookie('session', token, {
  ...cookieBase(), httpOnly: true, path: '/api', maxAge: ACCESS_TOKEN_MS,
});

const setRefreshCookie = (res, token) => res.cookie('refresh', token, {
  ...cookieBase(), httpOnly: true, path: '/api/auth/refresh', maxAge: REFRESH_TOKEN_MS,
});

const setCsrfCookie = (res, token) => res.cookie('csrf', token, {
  ...cookieBase(), httpOnly: false, path: '/api', maxAge: REFRESH_TOKEN_MS,
});

const signAccessToken = (user, familyId) => jwt.sign({
  sub: user.id,
  ver: user.tokenVersion,
  sid: familyId,
}, process.env.JWT_SECRET, { expiresIn: '15m', issuer: ISSUER });

const storeRefreshToken = async (user, familyId, expiresAt, res, csrfToken = randomBytes(32).toString('base64url')) => {
  const refreshToken = randomBytes(48).toString('base64url');
  await RefreshToken.create({
    tokenHash: digest(refreshToken),
    familyId,
    user: user._id,
    userTokenVersion: user.tokenVersion,
    expiresAt,
  });
  setAccessCookie(res, signAccessToken(user, familyId));
  setRefreshCookie(res, refreshToken);
  setCsrfCookie(res, csrfToken);
  return csrfToken;
};

export const createSession = async (user, res) => {
  const familyId = randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MS);
  const csrfToken = await storeRefreshToken(user, familyId, expiresAt, res);
  return { csrfToken };
};

export const refreshSession = async (req, res) => {
  const rawToken = req.cookies?.refresh;
  if (!rawToken) return { error: 'Refresh session is missing' };

  const tokenHash = digest(rawToken);
  const currentToken = await RefreshToken.findOne({ tokenHash });
  const now = new Date();
  if (!currentToken || currentToken.expiresAt <= now || currentToken.revokedAt) {
    return { error: 'Refresh session is invalid or expired' };
  }

  if (currentToken.usedAt) {
    await RefreshToken.updateMany({ familyId: currentToken.familyId, revokedAt: null }, { $set: { revokedAt: now } });
    return { error: 'Refresh token reuse detected; sign in again' };
  }

  const user = await User.findById(currentToken.user);
  if (!user || !user.isActive || user.tokenVersion !== currentToken.userTokenVersion) {
    await RefreshToken.updateMany({ familyId: currentToken.familyId, revokedAt: null }, { $set: { revokedAt: now } });
    return { error: 'Account session is no longer valid' };
  }

  const consumed = await RefreshToken.findOneAndUpdate(
    { _id: currentToken._id, usedAt: null, revokedAt: null, expiresAt: { $gt: now } },
    { $set: { usedAt: now } },
    { new: true },
  );
  if (!consumed) {
    await RefreshToken.updateMany({ familyId: currentToken.familyId, revokedAt: null }, { $set: { revokedAt: now } });
    return { error: 'Refresh token reuse detected; sign in again' };
  }

  try {
    const csrfToken = await storeRefreshToken(user, currentToken.familyId, currentToken.expiresAt, res);
    return { user, csrfToken };
  } catch (error) {
    await RefreshToken.updateMany({ familyId: currentToken.familyId, revokedAt: null }, { $set: { revokedAt: now } });
    throw error;
  }
};

export const clearSession = res => {
  const options = cookieBase();
  res.clearCookie('session', { ...options, httpOnly: true, path: '/api' });
  res.clearCookie('refresh', { ...options, httpOnly: true, path: '/api/auth/refresh' });
  res.clearCookie('csrf', { ...options, httpOnly: false, path: '/api' });
};

export const requireAuth = async (req, res, next) => {
  let claims;
  try {
    const token = req.cookies?.session;
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    claims = jwt.verify(token, process.env.JWT_SECRET, { issuer: ISSUER });
  } catch {
    return res.status(401).json({ error: 'Session is invalid or expired' });
  }

  if (typeof claims === 'string' || typeof claims.sub !== 'string' || typeof claims.ver !== 'number' || typeof claims.sid !== 'string') {
    return res.status(401).json({ error: 'Invalid session' });
  }

  try {
    const [user, activeFamily] = await Promise.all([
      User.findById(claims.sub),
      RefreshToken.exists({ familyId: claims.sid, user: claims.sub, revokedAt: null, usedAt: null, expiresAt: { $gt: new Date() } }),
    ]);
    if (!user || !user.isActive || user.tokenVersion !== claims.ver || !activeFamily) {
      return res.status(401).json({ error: 'Session is no longer valid' });
    }

    req.user = user;
    req.authClaims = claims;
    return next();
  } catch (error) {
    return next(error);
  }
};

export const requireCsrf = (req, res, next) => {
  const headerToken = req.get('x-csrf-token');
  const cookieToken = req.cookies?.csrf;
  const headerBuffer = Buffer.from(headerToken || '');
  const cookieBuffer = Buffer.from(cookieToken || '');
  if (!headerToken || !cookieToken || headerBuffer.length !== cookieBuffer.length ||
      !timingSafeEqual(headerBuffer, cookieBuffer)) {
    return res.status(403).json({ error: 'CSRF validation failed' });
  }
  return next();
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'You do not have permission to perform this action' });
  }
  return next();
};

export const publicUser = user => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});

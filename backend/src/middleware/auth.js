import jwt from 'jsonwebtoken';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import User from '../models/User.js';

const getJwtSecret = () => process.env.JWT_SECRET;

export const issueSession = (user, res) => {
  const csrfToken = randomBytes(32).toString('base64url');
  const token = jwt.sign({
    sub: user.id,
    ver: user.tokenVersion,
    csrf: csrfToken,
  }, getJwtSecret(), { expiresIn: '8h', issuer: 'category-expense-tracker' });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/api',
    maxAge: 8 * 60 * 60 * 1000,
  };
  res.cookie('session', token, cookieOptions);
  res.cookie('csrf', csrfToken, cookieOptions);
  return csrfToken;
};

export const clearSession = res => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/api',
  };
  res.clearCookie('session', cookieOptions);
  res.clearCookie('csrf', cookieOptions);
};

export const requireAuth = async (req, res, next) => {
  let claims;
  try {
    const token = req.cookies?.session;
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    claims = jwt.verify(token, getJwtSecret(), { issuer: 'category-expense-tracker' });
  } catch {
    return res.status(401).json({ error: 'Session is invalid or expired' });
  }

  if (typeof claims === 'string' || typeof claims.sub !== 'string' || typeof claims.ver !== 'number' || typeof claims.csrf !== 'string') {
    return res.status(401).json({ error: 'Invalid session' });
  }

  try {
    const user = await User.findById(claims.sub);
    if (!user || !user.isActive || user.tokenVersion !== claims.ver) {
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
  const claimToken = req.authClaims?.csrf;
  const headerBuffer = Buffer.from(headerToken || '');
  const cookieBuffer = Buffer.from(cookieToken || '');
  const claimBuffer = Buffer.from(claimToken || '');
  if (!headerToken || !cookieToken || !claimToken ||
      headerBuffer.length !== cookieBuffer.length || headerBuffer.length !== claimBuffer.length ||
      !timingSafeEqual(headerBuffer, cookieBuffer) || !timingSafeEqual(headerBuffer, claimBuffer)) {
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

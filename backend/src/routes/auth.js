import express from 'express';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import { body, param, validationResult } from 'express-validator';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import { clearSession, createSession, publicUser, refreshSession, requireAuth, requireCsrf, requireRole } from '../middleware/auth.js';
import { sendServerError } from '../utils/httpError.js';

const router = express.Router();
const passwordRounds = 12;
const dummyPasswordHash = bcrypt.hashSync('invalid-account-password-dummy', passwordRounds);
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Try again later.' },
});
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Try again later.' },
});
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many session refresh attempts. Try again later.' },
});

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array().map(error => error.msg) });
  }
  return next();
};

const passwordRules = field => body(field)
  .isString().withMessage(`${field} must be text`)
  .isLength({ min: 12, max: 72 }).withMessage(`${field} must be between 12 and 72 characters`)
  .custom(password => Buffer.byteLength(password, 'utf8') <= 72).withMessage(`${field} must be no more than 72 bytes`);

router.post('/register', registrationLimiter, [
  body('name').isString().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters'),
  body('email').isString().trim().isEmail().withMessage('A valid email is required').toLowerCase(),
  passwordRules('password'),
], validateRequest, async (req, res) => {
  try {
    const user = await User.create({
      name: req.body.name.trim(),
      email: req.body.email.toLowerCase(),
      passwordHash: await bcrypt.hash(req.body.password, passwordRounds),
      role: 'member',
    });
    const { csrfToken } = await createSession(user, res);
    return res.status(201).json({ user: publicUser(user), csrfToken });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'An account with this email already exists' });
    if (error.name === 'ValidationError') {
      return res.status(400).json({ errors: Object.values(error.errors).map(item => item.message) });
    }
    return sendServerError(res, error, 'Registration failed');
  }
});

router.post('/login', authLimiter, [
  body('email').isString().trim().isEmail().withMessage('A valid email is required').toLowerCase(),
  body('password').isString().withMessage('Password is required'),
], validateRequest, async (req, res) => {
  try {
    const email = req.body.email.toLowerCase();
    const user = await User.findOne({ email }).select('+passwordHash');
    const passwordValid = await bcrypt.compare(req.body.password, user?.passwordHash || dummyPasswordHash);
    if (!user || !user.isActive || !passwordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { csrfToken } = await createSession(user, res);
    return res.json({ user: publicUser(user), csrfToken });
  } catch (error) {
    return sendServerError(res, error, 'Login failed');
  }
});

router.get('/csrf', (req, res) => {
  res.json({ csrfToken: req.cookies?.csrf || null });
});

router.get('/session', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user), csrfToken: req.cookies.csrf });
});

router.post('/refresh', refreshLimiter, requireCsrf, async (req, res) => {
  try {
    const result = await refreshSession(req, res);
    if (result.error) {
      clearSession(res);
      return res.status(401).json({ error: result.error });
    }
    return res.json({ user: publicUser(result.user), csrfToken: result.csrfToken });
  } catch (error) {
    return sendServerError(res, error, 'Session refresh failed');
  }
});

router.post('/logout', requireAuth, requireCsrf, async (req, res) => {
  try {
    await RefreshToken.updateMany(
      { familyId: req.authClaims.sid, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    clearSession(res);
    return res.json({ message: 'Signed out' });
  } catch (error) {
    return sendServerError(res, error, 'Logout failed');
  }
});

router.post('/change-password', requireAuth, requireCsrf, [
  body('currentPassword').isString().withMessage('Current password is required'),
  passwordRules('newPassword'),
], validateRequest, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+passwordHash');
    const currentPasswordValid = user && await bcrypt.compare(req.body.currentPassword, user.passwordHash);
    if (!currentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    user.passwordHash = await bcrypt.hash(req.body.newPassword, passwordRounds);
    user.tokenVersion += 1;
    await user.save();
    await RefreshToken.updateMany({ user: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
    clearSession(res);
    const { csrfToken } = await createSession(user, res);
    return res.json({ user: publicUser(user), csrfToken });
  } catch (error) {
    return sendServerError(res, error, 'Password change failed');
  }
});

router.get('/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const users = await User.find().select('name email role isActive createdAt').sort({ name: 1 });
    return res.json(users.map(user => ({ ...publicUser(user), isActive: user.isActive, createdAt: user.createdAt })));
  } catch (error) {
    return sendServerError(res, error, 'List users failed');
  }
});

router.post('/users', requireAuth, requireCsrf, requireRole('admin'), [
  body('name').isString().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters'),
  body('email').isString().trim().isEmail().withMessage('A valid email is required').toLowerCase(),
  passwordRules('password'),
  body('role').optional().isIn(['admin', 'member']).withMessage('Role must be admin or member'),
], validateRequest, async (req, res) => {
  try {
    const email = req.body.email.toLowerCase();
    const passwordHash = await bcrypt.hash(req.body.password, passwordRounds);
    const user = await User.create({
      name: req.body.name.trim(),
      email,
      passwordHash,
      role: req.body.role || 'member',
    });
    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'An account with this email already exists' });
    if (error.name === 'ValidationError') {
      return res.status(400).json({ errors: Object.values(error.errors).map(item => item.message) });
    }
    return sendServerError(res, error, 'Create user failed');
  }
});

router.patch('/users/:id', requireAuth, requireCsrf, requireRole('admin'), [
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('role').optional().isIn(['admin', 'member']).withMessage('Role must be admin or member'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean').toBoolean(),
], validateRequest, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.id === req.user.id && (req.body.role === 'member' || req.body.isActive === false)) {
      return res.status(400).json({ error: 'You cannot remove your own admin access or disable your own account' });
    }

    const losesAdminAccess = user.role === 'admin' && user.isActive &&
      (req.body.role === 'member' || req.body.isActive === false);
    if (losesAdminAccess && await User.countDocuments({ role: 'admin', isActive: true }) <= 1) {
      return res.status(409).json({ error: 'At least one active admin account is required' });
    }

    if (req.body.role !== undefined) user.role = req.body.role;
    if (req.body.isActive !== undefined) user.isActive = req.body.isActive;
    if (user.isModified()) user.tokenVersion += 1;
    await user.save();
    return res.json({ user: { ...publicUser(user), isActive: user.isActive } });
  } catch (error) {
    return sendServerError(res, error, 'Update user failed');
  }
});

export default router;

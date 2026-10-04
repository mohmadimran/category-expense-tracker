import assert from 'node:assert/strict';
import cookieParser from 'cookie-parser';
import express from 'express';
import mongoose from 'mongoose';
import { createServer } from 'node:http';
import { mock, test } from 'node:test';
import User from '../src/models/User.js';
import RefreshToken from '../src/models/RefreshToken.js';
import authRoutes from '../src/routes/auth.js';
import { requireAuth, requireCsrf, requireRole } from '../src/middleware/auth.js';

process.env.JWT_SECRET = 'backend-test-secret-that-is-at-least-32-bytes';

const cookieOptions = new Map([
  ['session', '/api'],
  ['refresh', '/api/auth/refresh'],
  ['csrf', '/api'],
]);

const applyResponseCookies = (response, jar) => {
  for (const header of response.headers.getSetCookie()) {
    const [pair, ...attributes] = header.split(';');
    const separator = pair.indexOf('=');
    const name = pair.slice(0, separator);
    const value = pair.slice(separator + 1);
    const maxAge = attributes.find(attribute => attribute.trim().toLowerCase().startsWith('max-age='));
    if (maxAge?.trim().toLowerCase() === 'max-age=0') jar.delete(name);
    else jar.set(name, value);
  }
};

const request = async (baseUrl, jar, path, { method = 'GET', body, headers = {} } = {}) => {
  const pathname = new URL(path, baseUrl).pathname;
  const cookieHeader = [...jar]
    .filter(([name]) => pathname.startsWith(cookieOptions.get(name)))
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
  const response = await fetch(new URL(path, baseUrl), {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  applyResponseCookies(response, jar);
  return { response, data: await response.json() };
};

test('registration, login, session refresh, authorization, logout, and signup limiting work end to end', async t => {
  const users = new Map();
  const refreshTokens = new Map();
  const nextId = () => new mongoose.Types.ObjectId();

  t.mock.method(User, 'create', async data => {
    const existing = [...users.values()].find(user => user.email === data.email);
    if (existing) throw Object.assign(new Error('duplicate email'), { code: 11000 });
    const id = nextId();
    const user = { ...data, _id: id, id: id.toString(), isActive: true, tokenVersion: 0 };
    users.set(user.id, user);
    return user;
  });
  t.mock.method(User, 'findOne', query => ({
    select: async () => [...users.values()].find(user => user.email === query.email) || null,
  }));
  t.mock.method(User, 'findById', async id => users.get(String(id)) || null);
  t.mock.method(RefreshToken, 'create', async data => {
    const row = { ...data, _id: nextId(), usedAt: null, revokedAt: null };
    refreshTokens.set(row.tokenHash, row);
    return row;
  });
  t.mock.method(RefreshToken, 'findOne', async query => refreshTokens.get(query.tokenHash) || null);
  t.mock.method(RefreshToken, 'findOneAndUpdate', async query => {
    const row = [...refreshTokens.values()].find(item => item._id.equals(query._id) && item.usedAt === null && item.revokedAt === null && item.expiresAt > new Date());
    if (!row) return null;
    row.usedAt = new Date();
    return row;
  });
  t.mock.method(RefreshToken, 'exists', async query => [...refreshTokens.values()].some(row =>
    row.familyId === query.familyId && String(row.user) === String(query.user) && row.usedAt === null &&
    row.revokedAt === null && row.expiresAt > new Date()));
  t.mock.method(RefreshToken, 'updateMany', async (query, update) => {
    for (const row of refreshTokens.values()) {
      if ((!query.familyId || row.familyId === query.familyId) && (!query.user || String(row.user) === String(query.user))) {
        row.revokedAt = update.$set.revokedAt;
      }
    }
    return { modifiedCount: 1 };
  });

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRoutes);
  app.get('/api/protected', requireAuth, (req, res) => res.json({ userId: req.user.id }));
  app.post('/api/protected', requireAuth, requireCsrf, (req, res) => res.json({ ok: true }));
  app.get('/api/admin', requireAuth, requireRole('admin'), (req, res) => res.json({ ok: true }));
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const jar = new Map();

  let result = await request(baseUrl, jar, '/api/auth/register', {
    method: 'POST',
    body: { name: 'Test Member', email: 'member@example.test', password: 'a-long-test-password-123', role: 'admin' },
  });
  assert.equal(result.response.status, 201);
  assert.equal(result.data.user.role, 'member', 'public registration must not grant admin access');
  assert.equal('passwordHash' in result.data.user, false);
  const registrationCookies = result.response.headers.getSetCookie();
  assert.ok(registrationCookies.find(cookie => cookie.startsWith('session=')).includes('HttpOnly'));
  assert.ok(registrationCookies.find(cookie => cookie.startsWith('refresh=')).includes('HttpOnly'));
  assert.ok(!registrationCookies.find(cookie => cookie.startsWith('csrf=')).includes('HttpOnly'));
  const originalRefresh = jar.get('refresh');

  result = await request(baseUrl, jar, '/api/auth/session');
  assert.equal(result.response.status, 200);
  assert.equal(result.data.user.email, 'member@example.test');

  result = await request(baseUrl, jar, '/api/protected');
  assert.equal(result.response.status, 200);
  result = await request(baseUrl, jar, '/api/admin');
  assert.equal(result.response.status, 403);
  result = await request(baseUrl, jar, '/api/protected', { method: 'POST' });
  assert.equal(result.response.status, 403, 'writes must require a CSRF header');
  result = await request(baseUrl, jar, '/api/protected', {
    method: 'POST', headers: { 'x-csrf-token': jar.get('csrf') },
  });
  assert.equal(result.response.status, 200);

  result = await request(baseUrl, jar, '/api/auth/login', {
    method: 'POST', body: { email: 'member@example.test', password: 'incorrect-password' },
  });
  assert.equal(result.response.status, 401);

  result = await request(baseUrl, jar, '/api/auth/refresh', {
    method: 'POST', headers: { 'x-csrf-token': jar.get('csrf') },
  });
  assert.equal(result.response.status, 200);
  assert.notEqual(jar.get('refresh'), originalRefresh, 'refresh tokens must rotate');
  assert.equal((await request(baseUrl, jar, '/api/protected')).response.status, 200);

  result = await request(baseUrl, jar, '/api/auth/refresh', {
    method: 'POST', headers: { 'x-csrf-token': jar.get('csrf') },
    body: undefined,
  });
  // The active refresh token succeeds; a consumed token replay revokes its family.
  assert.equal(result.response.status, 200);
  jar.set('refresh', originalRefresh);
  result = await request(baseUrl, jar, '/api/auth/refresh', {
    method: 'POST', headers: { 'x-csrf-token': jar.get('csrf') },
  });
  assert.equal(result.response.status, 401);
  assert.equal((await request(baseUrl, jar, '/api/protected')).response.status, 401);

  result = await request(baseUrl, jar, '/api/auth/login', {
    method: 'POST', body: { email: 'member@example.test', password: 'a-long-test-password-123' },
  });
  assert.equal(result.response.status, 200);
  assert.equal((await request(baseUrl, jar, '/api/protected')).response.status, 200);
  result = await request(baseUrl, jar, '/api/auth/logout', {
    method: 'POST', headers: { 'x-csrf-token': jar.get('csrf') },
  });
  assert.equal(result.response.status, 200);
  assert.equal((await request(baseUrl, jar, '/api/protected')).response.status, 401);

  for (let attempt = 0; attempt < 8; attempt++) {
    result = await request(baseUrl, jar, '/api/auth/login', {
      method: 'POST', body: { email: 'member@example.test', password: 'wrong-password' },
    });
    assert.equal(result.response.status, 401);
  }
  result = await request(baseUrl, jar, '/api/auth/login', {
    method: 'POST', body: { email: 'member@example.test', password: 'wrong-password' },
  });
  assert.equal(result.response.status, 429, 'login rate limit must stop attempts after ten per 15 minutes');

  for (let attempt = 0; attempt < 4; attempt++) {
    result = await request(baseUrl, jar, '/api/auth/register', {
      method: 'POST', body: { name: 'Duplicate', email: 'member@example.test', password: 'a-long-test-password-123' },
    });
    assert.equal(result.response.status, 409);
  }
  result = await request(baseUrl, jar, '/api/auth/register', {
    method: 'POST', body: { name: 'Limited', email: 'limited@example.test', password: 'a-long-test-password-123' },
  });
  assert.equal(result.response.status, 429, 'signup rate limit must stop attempts after five per hour');
});

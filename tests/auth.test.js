'use strict';

/**
 * Tests for backend/src/middleware/auth.js
 * Issue #63 — API Authentication Layer
 */

const jwt = require('jsonwebtoken');

const TEST_SECRET = 'test-secret-for-jest';

// Set JWT_SECRET before requiring the middleware
process.env.JWT_SECRET = TEST_SECRET;

const { requireAdminAuth } = require('../backend/src/middleware/auth');

// Minimal Express-like mock helpers
function mockReq(authHeader) {
  return { headers: { authorization: authHeader } };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

function makeToken(payload, secret = TEST_SECRET, options = {}) {
  return jwt.sign(payload, secret, { expiresIn: '1h', ...options });
}

describe('requireAdminAuth middleware', () => {
  let next;

  beforeEach(() => {
    next = jest.fn();
  });

  it('blocks requests with no Authorization header', () => {
    const req = mockReq(undefined);
    const res = mockRes();
    requireAdminAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'MISSING_AUTH_TOKEN' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks requests with non-Bearer scheme', () => {
    const req = mockReq('Basic dXNlcjpwYXNz');
    const res = mockRes();
    requireAdminAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'MISSING_AUTH_TOKEN' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks requests with an invalid token', () => {
    const req = mockReq('Bearer not.a.valid.token');
    const res = mockRes();
    requireAdminAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_AUTH_TOKEN' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks requests with a token signed by a different secret', () => {
    const token = makeToken({ role: 'admin' }, 'wrong-secret');
    const req = mockReq(`Bearer ${token}`);
    const res = mockRes();
    requireAdminAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_AUTH_TOKEN' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks requests with an expired token', () => {
    const token = makeToken({ role: 'admin' }, TEST_SECRET, { expiresIn: '-1s' });
    const req = mockReq(`Bearer ${token}`);
    const res = mockRes();
    requireAdminAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'TOKEN_EXPIRED' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks valid tokens without admin role', () => {
    const token = makeToken({ role: 'user', sub: 'u1' });
    const req = mockReq(`Bearer ${token}`);
    const res = mockRes();
    requireAdminAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INSUFFICIENT_ROLE' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('allows valid admin tokens and attaches decoded payload to req.admin', () => {
    const token = makeToken({ role: 'admin', sub: 'admin-user' });
    const req = mockReq(`Bearer ${token}`);
    const res = mockRes();
    requireAdminAuth(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.admin).toBeDefined();
    expect(req.admin.role).toBe('admin');
    expect(req.admin.sub).toBe('admin-user');
    expect(res.status).not.toHaveBeenCalled();
  });
});

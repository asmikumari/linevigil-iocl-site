const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { getJwtSecret } = require('../lib/config');
const { asyncHandler, badRequest, conflict } = require('../lib/http');
const rateLimit = require('../lib/rateLimit');

const router = express.Router();
// Attempts per minute per IP for signup and login (raised in tests).
const AUTH_RATE_LIMIT = Number(process.env.AUTH_RATE_LIMIT) || 10;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

// Self-service signup is for contractors only. Admin and patrol accounts are created by an admin,
// so the requested role is ignored rather than trusted.
router.post('/signup', rateLimit({ windowMs: 60_000, max: AUTH_RATE_LIMIT }), asyncHandler(async (req, res) => {
  const { name, email, password } = req.body || {};
  const errors = {};
  if (typeof name !== 'string' || name.trim().length < 2) errors.name = 'Enter your name';
  if (typeof email !== 'string' || !EMAIL.test(email.trim())) errors.email = 'Enter a valid email address';
  if (typeof password !== 'string' || password.length < 8) errors.password = 'Use at least 8 characters';
  if (Object.keys(errors).length) throw badRequest('Check the highlighted fields', errors);

  const normalized = email.trim().toLowerCase();
  if (await db.findUserByEmail(normalized)) throw conflict('An account with this email already exists');

  const user = await db.createUser({
    name: name.trim(),
    email: normalized,
    password: await bcrypt.hash(password, 10),
    role: 'contractor',
  });
  res.status(201).json(publicUser(user));
}));

router.post('/login', rateLimit({ windowMs: 60_000, max: AUTH_RATE_LIMIT }), asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    throw badRequest('Enter your email and password');
  }

  const user = await db.findUserByEmail(email);
  // Same message for unknown email and wrong password, so accounts cannot be discovered.
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "That email and password don't match an account" });
  }

  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, getJwtSecret(), { expiresIn: '1d' });
  res.json({ token, user: publicUser(user) });
}));

module.exports = router;

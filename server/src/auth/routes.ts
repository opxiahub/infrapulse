import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import passport from './passport.js';
import { getDb } from '../db/connection.js';
import { config } from '../config.js';
import type { User } from './passport.js';

const router = Router();

router.post('/register', (req: Request, res: Response) => {
  const { email, password, displayName } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)'
  ).run(email, hash, displayName || email.split('@')[0]);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as User;

  req.login(user, (err) => {
    if (err) return res.status(500).json({ error: 'Login failed after registration' });
    res.json({ user: sanitizeUser(user) });
  });
});

router.post('/login', (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('local', (err: any, user: User | false, info: any) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info?.message || 'Login failed' });
    req.login(user, (err) => {
      if (err) return next(err);
      res.json({ user: sanitizeUser(user) });
    });
  })(req, res, next);
});

router.post('/logout', (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.json({ ok: true });
  });
});

router.get('/me', (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ user: sanitizeUser(req.user as User) });
});

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (_req: Request, res: Response) => {
    res.redirect(config.clientUrl);
  }
);

function sanitizeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    googleId: user.google_id ? true : false,
  };
}

export default router;

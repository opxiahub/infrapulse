import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/connection.js';
import { config } from '../config.js';

export interface User {
  id: number;
  email: string;
  password_hash: string | null;
  google_id: string | null;
  display_name: string | null;
  created_at: string;
}

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser((id: number, done) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
    done(null, user || null);
  } catch (err) {
    done(err);
  }
});

passport.use(new LocalStrategy(
  { usernameField: 'email' },
  (email, password, done) => {
    try {
      const db = getDb();
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
      if (!user || !user.password_hash) {
        return done(null, false, { message: 'Invalid email or password' });
      }
      if (!bcrypt.compareSync(password, user.password_hash)) {
        return done(null, false, { message: 'Invalid email or password' });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

if (config.google.clientId && config.google.clientSecret) {
  passport.use(new GoogleStrategy(
    {
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.callbackUrl,
    },
    (_accessToken, _refreshToken, profile, done) => {
      try {
        const db = getDb();
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email from Google'));

        let user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(profile.id) as User | undefined;
        if (!user) {
          user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
          if (user) {
            db.prepare('UPDATE users SET google_id = ? WHERE id = ?').run(profile.id, user.id);
            user.google_id = profile.id;
          } else {
            const result = db.prepare(
              'INSERT INTO users (email, google_id, display_name) VALUES (?, ?, ?)'
            ).run(email, profile.id, profile.displayName);
            user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as User;
          }
        }
        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    }
  ));
}

export default passport;

import { Store } from 'express-session';
import { getDb } from '../db/connection.js';

export class SQLiteSessionStore extends Store {
  constructor() {
    super();
  }

  get(sid: string, callback: (err?: any, session?: any) => void) {
    try {
      const db = getDb();
      const row = db.prepare(
        'SELECT sess FROM sessions WHERE sid = ? AND expired_at > datetime(\'now\')'
      ).get(sid) as any;
      callback(null, row ? JSON.parse(row.sess) : null);
    } catch (err) {
      callback(err);
    }
  }

  set(sid: string, session: any, callback?: (err?: any) => void) {
    try {
      const db = getDb();
      const maxAge = session.cookie?.maxAge || 86400000;
      const expiredAt = new Date(Date.now() + maxAge).toISOString();
      db.prepare(`
        INSERT OR REPLACE INTO sessions (sid, sess, expired_at) VALUES (?, ?, ?)
      `).run(sid, JSON.stringify(session), expiredAt);
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  destroy(sid: string, callback?: (err?: any) => void) {
    try {
      const db = getDb();
      db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  touch(sid: string, session: any, callback?: (err?: any) => void) {
    try {
      const db = getDb();
      const maxAge = session.cookie?.maxAge || 86400000;
      const expiredAt = new Date(Date.now() + maxAge).toISOString();
      db.prepare('UPDATE sessions SET expired_at = ? WHERE sid = ?').run(expiredAt, sid);
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }
}

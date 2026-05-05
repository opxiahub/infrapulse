import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { getDb } from '../db/connection.js';
import { config } from '../config.js';

let io: Server;

export function setupSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.clientUrl,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const cookieHeader = socket.handshake.headers.cookie;
    if (!cookieHeader) {
      return next(new Error('No session cookie'));
    }

    // Extract connect.sid from cookies
    const sidMatch = cookieHeader.match(/connect\.sid=s%3A([^.]+)/);
    if (!sidMatch) {
      return next(new Error('No session ID'));
    }

    const sid = sidMatch[1];
    const db = getDb();
    const row = db.prepare(
      "SELECT sess FROM sessions WHERE sid = ? AND expired_at > datetime('now')"
    ).get(sid) as any;

    if (!row) {
      return next(new Error('Invalid session'));
    }

    const session = JSON.parse(row.sess);
    const userId = session.passport?.user;
    if (!userId) {
      return next(new Error('Not authenticated'));
    }

    (socket as any).userId = userId;
    next();
  });

  io.on('connection', (socket) => {
    const userId = (socket as any).userId;
    socket.join(`user:${userId}`);
    console.log(`Socket connected: user ${userId}`);

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: user ${userId}`);
    });
  });

  return io;
}

export function getIo(): Server {
  return io;
}

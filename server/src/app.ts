import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from './auth/passport.js';
import { SQLiteSessionStore } from './auth/session.js';
import { config } from './config.js';
import authRoutes from './auth/routes.js';
import providerRoutes from './providers/routes.js';
import graphRoutes from './graph/routes.js';
import chatRoutes from './chatbot/routes.js';
import kubernetesRoutes from './kubernetes/routes.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.use(cors({
    origin: config.clientUrl,
    credentials: true,
  }));
  app.use(express.json());

  app.use(session({
    store: new SQLiteSessionStore(),
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      sameSite: 'lax',
    },
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/providers', providerRoutes);
  app.use('/api/graph', graphRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/kubernetes', kubernetesRoutes);

  // Serve client in production
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  return app;
}

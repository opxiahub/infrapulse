import http from 'http';
import { createApp } from './app.js';
import { runMigrations } from './db/migrate.js';
import { setupSocket } from './realtime/socket.js';
import { config } from './config.js';

// Run migrations
runMigrations();

// Create server
const app = createApp();
const server = http.createServer(app);

// Setup Socket.io
setupSocket(server);

server.listen(config.port, () => {
  console.log(`InfraPulse server running on port ${config.port}`);
});

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const defaultDbPath = path.resolve(__dirname, '../../infrapulse.db');
const configuredDataDir = process.env.DATA_DIR;
const configuredDbPath = process.env.DB_PATH;

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  sessionSecret: process.env.SESSION_SECRET || 'default-secret-change-me',
  encryptionKey: process.env.CREDENTIAL_ENCRYPTION_KEY || 'default-key-change-me-32chars!!',
  dbPath: configuredDbPath
    ? path.resolve(configuredDbPath)
    : configuredDataDir
      ? path.resolve(configuredDataDir, 'infrapulse.db')
      : defaultDbPath,
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};

CREATE TABLE IF NOT EXISTS kubernetes_clusters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  cluster_type TEXT NOT NULL DEFAULT 'rosa',
  api_server_url TEXT NOT NULL,
  encrypted_credentials TEXT NOT NULL,
  skip_tls_verify INTEGER NOT NULL DEFAULT 0,
  verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cached_graphs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id INTEGER NOT NULL REFERENCES provider_credentials(id) ON DELETE CASCADE,
  resource_types TEXT NOT NULL,
  graph_data TEXT NOT NULL,
  scanned_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, provider_id)
);

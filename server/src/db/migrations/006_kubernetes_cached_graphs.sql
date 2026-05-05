CREATE TABLE IF NOT EXISTS cached_kubernetes_graphs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cluster_id INTEGER NOT NULL REFERENCES kubernetes_clusters(id) ON DELETE CASCADE,
  namespace TEXT NOT NULL,
  resource_types TEXT NOT NULL,
  graph_data TEXT NOT NULL,
  scanned_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, cluster_id, namespace)
);

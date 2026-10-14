CREATE TABLE feedback (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  dialect     TEXT    NOT NULL,
  entry       TEXT    NOT NULL,
  lang        TEXT    NOT NULL,
  type        TEXT    NOT NULL,
  message     TEXT    NOT NULL,
  background  TEXT,
  contact     TEXT,
  status      TEXT    NOT NULL DEFAULT 'new'
);

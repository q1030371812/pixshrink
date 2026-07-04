-- Schema for the pixshrink-ai-bot-tracker D1 database.
-- Apply with:  wrangler d1 execute pixshrink-ai-bot-tracker --file schema.sql

CREATE TABLE IF NOT EXISTS ai_bot_hits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  bot TEXT NOT NULL,
  ua TEXT,
  path TEXT,
  country TEXT,
  rule TEXT
);

CREATE INDEX IF NOT EXISTS idx_ts  ON ai_bot_hits(ts);
CREATE INDEX IF NOT EXISTS idx_bot ON ai_bot_hits(bot);
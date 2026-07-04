# pixshrink-ai-bot-logger

Cloudflare Worker that logs every AI bot hit to `pixshrink.gamechill.org` into a D1 database, and exposes an admin endpoint with aggregated stats.

## What it does

- Runs on every request to the zone (installed as a route on the custom domain).
- Matches the request `User-Agent` against the canonical 2026 list of AI crawlers: GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, Claude-User, Claude-SearchBot, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended, Amazonbot, Bytespider, CCBot, Meta-ExternalAgent, DeepSeekBot, Grok, MistralAI-User, YouBot.
- For matches, writes a row to D1 (`ai_bot_hits` table): timestamp, bot name, full UA, request path, country, and the rule that matched.
- Exposes `GET /admin/ai-bot-stats` returning aggregated counts (total, by bot, last 24h). HTML by default; pass `Accept: application/json` for JSON.

## Files

| File           | Purpose                                                  |
| -------------- | -------------------------------------------------------- |
| `worker.js`    | The Worker source.                                       |
| `schema.sql`   | D1 table + indexes.                                      |
| `wrangler.toml`| Worker + D1 binding config.                              |
| `README.md`    | This file.                                               |

## Deploy

Prereqs: `wrangler` logged in to the Cloudflare account that owns `pixshrink.gamechill.org`.

```bash
cd cloudflare/ai-bot-logger

# 1. Create the D1 database.
wrangler d1 create pixshrink-ai-bot-tracker
# Wrangler prints a JSON block containing "database_id". Copy that value
# into wrangler.toml, replacing the placeholder in [[d1_databases]].

# 2. Apply the schema.
wrangler d1 execute pixshrink-ai-bot-tracker --file schema.sql

# 3. Deploy the Worker.
wrangler deploy
```

### Wire it into the custom domain

The Worker runs at `https://pixshrink-ai-bot-logger.<account>.workers.dev` after step 3. To run it in front of `pixshrink.gamechill.org`:

1. Cloudflare dashboard → `pixshrink.gamechill.org` zone → **Workers Routes**.
2. Add route:
   - Route: `*pixshrink.gamechill.org/*`
   - Worker: `pixshrink-ai-bot-logger`
3. Save. The Worker now sees every request to the zone, and `ctx.waitUntil(...)` keeps the D1 write off the critical path.

### Verify

```bash
# Hit the stats endpoint over the custom domain (JSON).
curl -H "Accept: application/json" https://pixshrink.gamechill.org/admin/ai-bot-stats

# Or view in a browser:
#   https://pixshrink.gamechill.org/admin/ai-bot-stats
```

To generate a sample row quickly:

```bash
curl -A "GPTBot/1.0 (+https://openai.com/gptbot)" https://pixshrink.gamechill.org/
```

Then re-check `/admin/ai-bot-stats`.

## Local development

```bash
wrangler dev
# Then:
curl -A "ClaudeBot/1.0" http://localhost:8787/
```

`wrangler dev` uses a local SQLite-backed D1; the same `schema.sql` applies.

## Schema

```sql
CREATE TABLE ai_bot_hits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  bot TEXT NOT NULL,
  ua TEXT,
  path TEXT,
  country TEXT,
  rule TEXT
);
CREATE INDEX idx_ts  ON ai_bot_hits(ts);
CREATE INDEX idx_bot ON ai_bot_hits(bot);
```

## Notes

- The D1 write is fired with `ctx.waitUntil(...)` so it does not block the response to the visitor.
- Non-bot traffic is passed through to the origin with `return fetch(request)`, so this Worker acts as transparent middleware.
- The bot list lives in `AI_BOT_RULES` at the top of `worker.js`. Order matters — more specific patterns come first so we log the right `bot` name (e.g. `Claude-User` before `ClaudeBot`).
// Cloudflare Worker: AI Bot Hit Logger
// Routes every request on the zone; logs AI bot User-Agents to D1.
// Exposes /admin/ai-bot-stats for aggregated stats.
//
// Deploy:
//   1. wrangler d1 create pixshrink-ai-bot-tracker
//   2. paste the returned database_id into wrangler.toml
//   3. wrangler d1 execute pixshrink-ai-bot-tracker --file schema.sql
//   4. wrangler deploy

// ---------------------------------------------------------------------------
// AI bot detection rules
// Ordered from most-specific (long literal token) to most-generic ("Bot"),
// so we log a meaningful rule name rather than a generic fallback.
// ---------------------------------------------------------------------------
const AI_BOT_RULES = [
  // OpenAI family
  { bot: "OAI-SearchBot", pattern: /OAI-SearchBot/i },
  { bot: "ChatGPT-User",  pattern: /ChatGPT-User/i },
  { bot: "GPTBot",        pattern: /\bGPTBot\b/i },

  // Anthropic / Claude family
  { bot: "Claude-SearchBot", pattern: /Claude-SearchBot/i },
  { bot: "Claude-User",      pattern: /Claude-User/i },
  { bot: "ClaudeBot",        pattern: /ClaudeBot/i },

  // Perplexity
  { bot: "Perplexity-User", pattern: /Perplexity-User/i },
  { bot: "PerplexityBot",   pattern: /PerplexityBot/i },

  // Apple / Google / Amazon training crawlers
  { bot: "Applebot-Extended", pattern: /Applebot-Extended/i },
  { bot: "Google-Extended",   pattern: /Google-Extended/i },
  { bot: "Amazonbot",         pattern: /Amazonbot/i },

  // ByteDance
  { bot: "Bytespider", pattern: /Bytespider/i },

  // Common Crawl
  { bot: "CCBot", pattern: /CCBot/i },

  // Meta
  { bot: "Meta-ExternalAgent", pattern: /Meta-ExternalAgent/i },

  // DeepSeek
  { bot: "DeepSeekBot", pattern: /DeepSeekBot/i },

  // xAI
  { bot: "Grok", pattern: /\bGrok\b/i },

  // Mistral
  { bot: "MistralAI-User", pattern: /MistralAI-User/i },

  // You.com
  { bot: "YouBot", pattern: /YouBot/i },
];

/**
 * Match a User-Agent string against the AI bot list.
 * Returns { bot, rule } on first hit, or null if nothing matches.
 */
function matchBot(ua) {
  if (!ua) return null;
  for (const { bot, pattern } of AI_BOT_RULES) {
    if (pattern.test(ua)) {
      return { bot, rule: bot };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// D1 helpers
// ---------------------------------------------------------------------------

/**
 * Insert a hit record. Fire-and-forget; we do not block the response on the
 * write — Cloudflare's D1 driver returns a promise that we let run in the
 * background. Errors are logged but never surface to the visitor.
 */
async function logHit(env, hit) {
  try {
    await env.DB.prepare(
      "INSERT INTO ai_bot_hits (ts, bot, ua, path, country, rule) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
    ).bind(
      hit.ts,
      hit.bot,
      hit.ua,
      hit.path,
      hit.country,
      hit.rule
    ).run();
  } catch (err) {
    console.error("D1 insert failed", err);
  }
}

/**
 * Build aggregated stats: total hits, hits by bot, last-24h hits by bot.
 */
async function buildStats(env) {
  const now = Math.floor(Date.now() / 1000);
  const dayAgo = now - 86400;

  const [totalRow, byBot, last24h] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS n FROM ai_bot_hits").first(),
    env.DB.prepare(
      "SELECT bot, COUNT(*) AS n FROM ai_bot_hits GROUP BY bot ORDER BY n DESC"
    ).all(),
    env.DB.prepare(
      "SELECT bot, COUNT(*) AS n FROM ai_bot_hits WHERE ts >= ?1 GROUP BY bot ORDER BY n DESC"
    ).bind(dayAgo).all(),
  ]);

  return {
    total_hits: totalRow?.n ?? 0,
    last_24h: last24h.results ?? [],
    by_bot: byBot.results ?? [],
    as_of: new Date(now * 1000).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Stats endpoint
// ---------------------------------------------------------------------------

function renderStatsHTML(stats) {
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));

  const renderTable = (rows) => {
    if (!rows.length) return "<p><em>No hits recorded yet.</em></p>";
    return `<table>
      <thead><tr><th>Bot</th><th>Hits</th></tr></thead>
      <tbody>
        ${rows.map((r) => `<tr><td>${esc(r.bot)}</td><td>${esc(r.n)}</td></tr>`).join("")}
      </tbody>
    </table>`;
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Pixshrink AI Bot Stats</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body { font: 14px/1.5 -apple-system, system-ui, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 16px; color: #222; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .meta { color: #666; margin-bottom: 24px; }
    h2 { font-size: 15px; margin-top: 32px; margin-bottom: 8px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #eee; }
    th { background: #fafafa; font-weight: 600; }
    .big { font-size: 28px; font-weight: 600; margin: 4px 0 24px; }
  </style>
</head>
<body>
  <h1>Pixshrink AI Bot Hit Stats</h1>
  <div class="meta">as of ${esc(stats.as_of)}</div>
  <div class="big">${esc(stats.total_hits)} total hits</div>

  <h2>Last 24 hours</h2>
  ${renderTable(stats.last_24h)}

  <h2>All time — by bot</h2>
  ${renderTable(stats.by_bot)}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Fetch handler
// ---------------------------------------------------------------------------

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Stats endpoint — short-circuit before any bot matching.
    if (url.pathname === "/admin/ai-bot-stats") {
      const accept = request.headers.get("Accept") || "";
      const stats = await buildStats(env);
      if (accept.includes("application/json")) {
        return new Response(JSON.stringify(stats, null, 2), {
          headers: { "Content-Type": "application/json; charset=utf-8" },
        });
      }
      return new Response(renderStatsHTML(stats), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Detection — read UA, classify, log if match.
    const ua = request.headers.get("User-Agent") || "";
    const match = matchBot(ua);

    if (match) {
      const hit = {
        ts: Math.floor(Date.now() / 1000),
        bot: match.bot,
        ua,
        path: url.pathname + url.search,
        country: request.cf?.country || null,
        rule: match.rule,
      };
      // Run the D1 write in the background; do not block the response.
      ctx.waitUntil(logHit(env, hit));
    }

    // Pass through to the origin. The route is installed on the zone, so
    // returning fetch() lets the worker act as transparent middleware.
    return fetch(request);
  },
};
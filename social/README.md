# X (Twitter) Auto-Poster for Pixshrink

Post one tweet per week from `tweet-queue.json` to promote https://pixshrink.gamechill.org.

## How it works

1. GitHub Actions runs `.github/workflows/x-autopost.yml` weekly (Monday 14:00 UTC).
2. Workflow installs `tweepy` and runs `social/post-tweet.py --dry-run` first to verify the queue.
3. If dry-run succeeds, it calls `social/post-tweet.py` for real.
4. Script tracks the last posted index in `STATE_FILE` (a temp file inside the runner), advances one slot, posts, exits 0 on success.

## Queue format

`social/tweet-queue.json` is an ordered JSON array.  Each element has:

- `id` - integer
- `lang` - ISO-639-1 code (en, ja, zh, es, fr, de, ko, pt, ru, ar, it, hi, tr)
- `category` - technical | privacy | comparison | meme
- `text` - the actual tweet, 280 chars or less

To reshuffle, edit the order in place.  The script wraps around automatically.

## Required GitHub secrets

| Secret | Where to get it |
| --- | --- |
| `X_API_KEY` | X Developer Portal → App → Keys and tokens |
| `X_API_SECRET` | X Developer Portal → App → Keys and tokens |
| `X_ACCESS_TOKEN` | X Developer Portal → App → Keys and tokens (user context) |
| `X_ACCESS_TOKEN_SECRET` | X Developer Portal → App → Keys and tokens |

## X API tier reality check (read this before enabling)

The X API was restructured in 2023-2024.  As of the last update:

- **Free tier** — READ-ONLY.  You can fetch timelines, search, look up users.
- **Basic tier** — $100/month.  Required for `POST /2/tweets`.
- **Pro tier** — $5,000/month.  Way overkill for a weekly promo.

**If your account is on the Free tier, every real run of `post-tweet.py` will return HTTP 403 Forbidden.**  The script detects this, logs a clear message, and exits 1 so the workflow surfaces a failure in the Actions tab — no silent retries.

### Three options to actually ship

1. **Pay for Basic ($100/mo).**  Add the four secrets above, flip the workflow on.  Cleanest path.
2. **User OAuth (free but manual).**  Use a tool like `twint` or a self-hosted bridge that authenticates with your *user* session cookie and posts via a private endpoint.  Out of scope for this repo and against X's automation rules without explicit approval.
3. **Manual posting.**  Open `tweet-queue.json`, copy the next tweet, paste into X yourself.  Takes ~30 seconds per week and is the safest until you have Basic.

The infrastructure is ready for option 1.  Until then, lean on option 3.

## Local testing

```bash
pip install tweepy>=4.14
python social/post-tweet.py --dry-run
```

`--dry-run` skips the API call but still consumes a queue slot, which is useful for end-to-end pipeline checks.

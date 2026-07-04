# Reddit Hybrid Agent (v0 stub)

Read-only scanner + drafter + karma watchdog for Reddit outreach about
Pixshrink (an in-browser image compressor). **Posts require human approval.**

## Pipeline

```
   ┌─────────┐    ┌──────────────┐    ┌──────────┐    ┌─────────────┐
   │ fetcher │ -> │  classifier  │ -> │ drafter  │ -> │  state (DB) │
   └─────────┘    └──────────────┘    └──────────┘    └─────────────┘
                                                            |
                                  ┌──── human approves ────┘
                                  ▼
                             ┌──────────┐
                             │ poster   │   ← HARD GATE: approved=1
                             └──────────┘
                                  │
                                  ▼
                             ┌──────────┐
                             │ watchdog │  ← deletes if karma < -2
                             └──────────┘
```

## Files

| File | Purpose |
| --- | --- |
| `config.py` | Subreddit list, rate limits, regex triggers |
| `state.py` | SQLite-backed post tracking, approval flag |
| `fetcher.py` | Read-only `.json` fetcher (no praw) |
| `classifier.py` | Keyword match against title + body |
| `drafter.py` | Anthropic SDK draft with hard-coded system prompt |
| `poster.py` | Posts only if `approved=1` in the DB |
| `watchdog.py` | Karma checks, Slack alert, marks for deletion |
| `main.py` | Entry point: `draft`, `watch`, `all` |

## Setup

```bash
pip install requests anthropic
cp .env.example .env
# fill in tokens later — see TODOs
```

## Usage

```bash
# 1. Draft cycle — fetches, classifies, writes drafts to DB (approved=0)
python -m reddit_agent.main draft

# 2. Review drafts in the DB
sqlite3 reddit_agent.db "SELECT id, subreddit, draft_body FROM posts WHERE status='draft' ORDER BY id DESC LIMIT 20;"

# 3. Manually approve a draft
sqlite3 reddit_agent.db "UPDATE posts SET approved=1 WHERE id=<id>;"

# 4. Post the approved drafts (prints HARD WARNING first)
python -m reddit_agent.poster post

# 5. Karma watchdog
python -m reddit_agent.main watch
```

## Risk warnings

- **Account bans** — Reddit detects coordinated self-promotion. The current
  numbers (max 2 posts/day/account, 50 karma minimum, 2-hour cooldown) are
  deliberately conservative. Tune *down*, not up.
- **Subreddit rules** — every target subreddit bans or restricts self-promotion.
  Read each `r/<sub>/rules` page before enabling it in `config.py`.
- **Hallucinated features** — the drafter system prompt forbids lying about
  Pixshrink, but you must spot-check every draft before approval. The tool
  never knows what your product actually does.
- **No OAuth is wired in yet.** `poster.py` is a stub. Until
  `REDDIT_CLIENT_ID/SECRET/USERNAME/PASSWORD` are provided and the OAuth
  block is implemented, the posting step prints a stub `reddit_post_id` and
  relies on the human reviewer to actually paste the comment manually.

## TODOs

- [ ] Wire Reddit OAuth (`api_type=json` + modhash) into `poster.py`
- [ ] Replace `_find_our_comment_score` with the real comment-id lookup
- [ ] Add a Slack "drafts ready for review" message in `main.run_draft_cycle`
- [ ] Per-account rate buckets (currently single `REDDIT_ACCOUNT` env var)
- [ ] Optional: store raw `thread.json` snapshots in a separate table for
      audit trail / re-classification

## Why no praw?

The read path is plain `requests` + JSON (Reddit's public `.json` endpoints
require no auth for read). praw adds a heavy dependency and would force
script-app OAuth even for fetching. We only need praw/OAuth for *writing*,
which a human will gate anyway.

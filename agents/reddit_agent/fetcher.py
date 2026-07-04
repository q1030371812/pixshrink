"""Reddit Hybrid Agent - read-only thread fetcher using the JSON endpoints.

Uses Reddit's public .json endpoints — no auth needed for read, no praw required.
"""
import os
import time
from typing import Optional

import requests

from .config import SUBREDDITS, LIMITS

USER_AGENT = os.environ.get(
    "REDDIT_USER_AGENT",
    "pixshrink-reddit-agent/0.1 (read-only)",
)

# Be a polite citizen — Reddit's API is rate-limited.
DEFAULT_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "application/json",
}

REQUEST_TIMEOUT = 15
RETRY_BACKOFF_SECONDS = 5


def _get(url: str) -> Optional[dict]:
    """GET with a single retry on network failure."""
    last_err = None
    for attempt in range(2):
        try:
            resp = requests.get(
                url, headers=DEFAULT_HEADERS, timeout=REQUEST_TIMEOUT
            )
            if resp.status_code == 200:
                return resp.json()
            if resp.status_code == 429:
                # rate-limited — back off
                time.sleep(RETRY_BACKOFF_SECONDS * (attempt + 1))
                continue
            last_err = f"HTTP {resp.status_code}"
            break
        except requests.RequestException as e:
            last_err = str(e)
            time.sleep(RETRY_BACKOFF_SECONDS * (attempt + 1))
    print(f"[fetcher] failed {url}: {last_err}")
    return None


def fetch_new_threads(
    subreddit: str, limit: int = 50
) -> list[dict]:
    """List new threads in a subreddit.

    Returns a list of dicts: {id, title, selftext, permalink, url, author, created_utc}.
    """
    url = f"https://www.reddit.com/r/{subreddit}/new.json?limit={limit}"
    data = _get(url)
    if not data:
        return []
    out: list[dict] = []
    for child in data.get("data", {}).get("children", []):
        d = child.get("data", {})
        if d.get("stickied") or d.get("pinned"):
            continue
        out.append(
            {
                "id": d.get("id"),
                "title": d.get("title", ""),
                "selftext": d.get("selftext", ""),
                "permalink": d.get("permalink", ""),
                "url": d.get("url_overridden_by_dest") or d.get("url", ""),
                "author": d.get("author", ""),
                "created_utc": d.get("created_utc", 0),
                "subreddit": subreddit,
            }
        )
    return out


def fetch_recent_comments(submission_id: str, limit: int = 50) -> list[dict]:
    """Fetch recent top comments on a submission, used by watchdog to read karma."""
    url = (
        f"https://www.reddit.com/comments/{submission_id}.json"
        f"?limit={limit}&sort=top"
    )
    data = _get(url)
    if not data or not isinstance(data, list):
        return []
    if len(data) < 2:
        return []
    comments = data[1].get("data", {}).get("children", [])
    out = []
    for c in comments:
        d = c.get("data", {})
        out.append(
            {
                "id": d.get("id"),
                "author": d.get("author"),
                "body": d.get("body", ""),
                "score": d.get("score", 0),
                "created_utc": d.get("created_utc", 0),
            }
        )
    return out


def gather_all(limit_per_sub: int = 50) -> list[dict]:
    """Convenience: fetch new threads from every configured subreddit."""
    results = []
    max_age_seconds = LIMITS.get("max_post_age_hours", 24) * 3600
    now = time.time()
    for sub in SUBREDDITS:
        threads = fetch_new_threads(sub, limit=limit_per_sub)
        for t in threads:
            age = now - t["created_utc"]
            if age > max_age_seconds:
                continue
            results.append(t)
    return results

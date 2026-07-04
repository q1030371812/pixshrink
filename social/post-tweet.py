#!/usr/bin/env python3
"""
Pixshrink X (Twitter) auto-poster.

Reads tweets from social/tweet-queue.json (ordered) and posts them one-by-one
to the X API v2 endpoint via tweepy.

Free tier notes (as of 2025):
- X API Free tier is READ-ONLY.  Posting tweets requires the Basic tier
  ($100/month) or higher.  If POST returns 403/Forbidden, the script logs the
  failure and exits non-zero so the workflow can alert.
- If you are not ready to pay, see social/README.md for the manual fallback
  (browser cookie / OAuth user-context approach).

Required GitHub Actions secrets:
    X_API_KEY            - consumer key
    X_API_SECRET         - consumer secret
    X_ACCESS_TOKEN       - user access token
    X_ACCESS_TOKEN_SECRET - user access token secret
"""
import json
import os
import sys
import tempfile
import time
from pathlib import Path

try:
    import tweepy
except ImportError:
    print("ERROR: tweepy not installed.  Run: pip install tweepy>=4.14", file=sys.stderr)
    sys.exit(2)

QUEUE_FILE = Path(__file__).parent / "tweet-queue.json"
STATE_FILE = Path(tempfile.gettempdir()) / "pixshrink-x-queue-state.txt"


def load_queue() -> list:
    if not QUEUE_FILE.exists():
        print(f"ERROR: queue file not found: {QUEUE_FILE}", file=sys.stderr)
        sys.exit(2)
    with QUEUE_FILE.open(encoding="utf-8") as fp:
        data = json.load(fp)
    if not isinstance(data, list) or not data:
        print("ERROR: queue file is empty or malformed", file=sys.stderr)
        sys.exit(2)
    return data


def last_index() -> int:
    if STATE_FILE.exists():
        try:
            return int(STATE_FILE.read_text().strip())
        except ValueError:
            return -1
    return -1


def save_index(idx: int) -> None:
    STATE_FILE.write_text(str(idx))


def get_client() -> tweepy.Client:
    missing = [k for k in ("X_API_KEY", "X_API_SECRET",
                           "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET")
               if not os.environ.get(k)]
    if missing:
        print(f"ERROR: missing env vars: {', '.join(missing)}", file=sys.stderr)
        sys.exit(2)
    return tweepy.Client(
        consumer_key=os.environ["X_API_KEY"],
        consumer_secret=os.environ["X_API_SECRET"],
        access_token=os.environ["X_ACCESS_TOKEN"],
        access_token_secret=os.environ["X_ACCESS_TOKEN_SECRET"],
    )


def post_one(client: tweepy.Client, queue: list, idx: int, dry_run: bool) -> bool:
    item = queue[idx % len(queue)]
    text = item["text"]
    tag = f"[#{item['id']}/{item['category']}/{item['lang']}]"
    print(f"Posting {tag}: {text[:80]}...")
    if dry_run:
        print("  -> DRY RUN, skipping actual API call")
        return True
    try:
        resp = client.create_tweet(text=text)
    except tweepy.errors.Forbidden as exc:
        print(f"  -> 403 Forbidden (likely Free tier): {exc}", file=sys.stderr)
        print("  -> Posting requires X Basic tier ($100/mo).  See README.", file=sys.stderr)
        return False
    except tweepy.errors.TweepyException as exc:
        print(f"  -> API error: {exc}", file=sys.stderr)
        return False
    tweet_id = getattr(resp, "data", {}).get("id", "?") if resp else "?"
    print(f"  -> posted, id={tweet_id}")
    return True


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    queue = load_queue()
    client = None if dry_run else get_client()
    idx = (last_index() + 1) % len(queue)
    ok = post_one(client, queue, idx, dry_run)
    if ok:
        save_index(idx)
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())

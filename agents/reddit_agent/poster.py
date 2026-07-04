"""Reddit Hybrid Agent - posting. HARD GATE: approved=True in DB required.

This module refuses to post anything that has not been explicitly approved
by a human reviewer (state.approve(post_id)). Until then it logs and returns.

Reddit's JSON write endpoints require an OAuth-authenticated session. We
use the standard `api_type=json` + `uh=` (modhash) flow with username/password
or, preferably, a refresh-token script-app auth.

TODO: implement actual OAuth. For now this is a stub gated on approved=True
so dry-runs and watchdog flows can be exercised without risking an account.
"""
import os
import sys
from typing import Optional

import requests

from . import state
from .config import LIMITS

USER_AGENT = os.environ.get("REDDIT_USER_AGENT", "pixshrink-reddit-agent/0.1")
ACCOUNT = os.environ.get("REDDIT_ACCOUNT", "primary")

HUMAN_WARNING = (
    "============================================================\n"
    "  REDDIT POSTING — HUMAN-IN-THE-LOOP REQUIRED\n"
    "  This script will NOT post unless approved=True exists in DB.\n"
    "  To approve a draft, run:\n"
    "    sqlite3 reddit_agent.db \"UPDATE posts SET approved=1 WHERE id=<id>;\"\n"
    "============================================================"
)


def _warn_human() -> None:
    print(HUMAN_WARNING)


def _within_daily_limit(account: str = ACCOUNT) -> bool:
    n = state.account_post_count_today(account)
    if n >= LIMITS["max_posts_per_day_per_account"]:
        print(f"[poster] daily limit reached for {account}: {n}")
        return False
    return True


def post_approved(post_id: int) -> bool:
    """Post a single approved draft. Returns True on success.

    Refuses unless `approved=1` is present in the DB row.
    """
    with state.get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM posts WHERE id=?", (post_id,)
        ).fetchone()
    if not row:
        print(f"[poster] no draft with id={post_id}")
        return False
    row = dict(row)

    if not row.get("approved"):
        _warn_human()
        print(f"[poster] REFUSED: post {post_id} is not approved (approved=0)")
        return False

    if row["status"] == "posted":
        print(f"[poster] post {post_id} already posted")
        return False

    if not _within_daily_limit(row["account"]):
        return False

    if state.has_pending_or_recent_post(
        row["account"], row["subreddit"], row["thread_id"]
    ):
        print(f"[poster] already engaged with thread {row['thread_id']}")
        return False

    _warn_human()

    # TODO: replace this stub with real Reddit OAuth POST when credentials land.
    reddit_post_id = f"stub_{post_id}_{row['thread_id']}"

    state.mark_posted(post_id, reddit_post_id)
    print(f"[poster] stub-posted draft {post_id} as {reddit_post_id}")
    return True


def post_all_approved() -> int:
    """Post every approved draft. Returns count posted."""
    pending = state.get_approved_pending()
    n_posted = 0
    for row in pending:
        if post_approved(row["id"]):
            n_posted += 1
    return n_posted


if __name__ == "__main__":  # pragma: no cover
    if len(sys.argv) > 1 and sys.argv[1] == "post":
        _warn_human()
        posted = post_all_approved()
        print(f"posted: {posted}")
    else:
        print("usage: python -m reddit_agent.poster post")

"""Reddit Hybrid Agent - karma watchdog.

For every active post, fetch the comment score. If karma < floor, mark the
post as deleted in the DB (and print the action — actual delete from Reddit
is also a TODO until OAuth is wired in).
"""
import os
from typing import Optional

from . import state
from .config import LIMITS
from .fetcher import fetch_recent_comments

FLOOR = LIMITS.get("watchdog_karma_floor", -2)
SLACK_WEBHOOK_URL = os.environ.get("SLACK_WEBHOOK_URL")


def _slack(msg: str) -> None:
    """Best-effort Slack notification. Never raise."""
    if not SLACK_WEBHOOK_URL:
        return
    try:
        import requests  # local import to keep startup light
        requests.post(SLACK_WEBHOOK_URL, json={"text": msg}, timeout=10)
    except Exception:
        pass


def _find_our_comment_score(comments: list[dict], reddit_post_id: str) -> Optional[int]:
    """Reddit comment ids share a prefix with their parent submission in some
    endpoints — for simplicity we look for our stub_id inside the body. If
    real OAuth is wired in (TODO), prefer the returned comment id."""
    for c in comments:
        body = c.get("body", "") or ""
        if reddit_post_id in body:
            return c.get("score")
    return None


def check_one(post: dict) -> str:
    """Return 'ok', 'deleted', or 'skipped'."""
    rid = post.get("reddit_post_id")
    if not rid or rid.startswith("stub_"):
        # watchdog only matters for real posts
        return "skipped"

    comments = fetch_recent_comments(post["thread_id"])
    if not comments:
        return "skipped"

    score = _find_our_comment_score(comments, rid)
    if score is None:
        return "skipped"

    state.update_karma(post["id"], score)

    if score <= FLOOR:
        state.mark_deleted(post["id"], reason=f"karma {score} <= floor {FLOOR}")
        _slack(
            f":warning: Deleting reddit post id={post['id']} "
            f"(karma={score}, thread={post['thread_id']})"
        )
        # TODO: when OAuth is wired up, also call DELETE on the comment.
        print(
            f"[watchdog] WOULD delete post {post['id']} (karma={score}, "
            f"thread={post['thread_id']})"
        )
        return "deleted"
    return "ok"


def check_all() -> dict:
    active = state.get_active_posts()
    counts = {"ok": 0, "deleted": 0, "skipped": 0}
    for p in active:
        result = check_one(p)
        counts[result] += 1
    return counts


if __name__ == "__main__":  # pragma: no cover
    print(check_all())

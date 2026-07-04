"""Reddit Hybrid Agent - State tracking via sqlite3.

Schema:
  - posts: every post we have ever created/drafted, with karma and approval flag
"""
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Iterator, Optional

DB_PATH = os.environ.get("REDDIT_AGENT_DB", "reddit_agent.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account TEXT NOT NULL,
    subreddit TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    thread_title TEXT,
    parent_comment_id TEXT,
    draft_body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',  -- draft | approved | posted | deleted
    approved INTEGER NOT NULL DEFAULT 0,   -- 0/1 — must be 1 to post
    reddit_post_id TEXT,
    karma INTEGER DEFAULT 0,
    error TEXT,
    created_at TEXT NOT NULL,
    posted_at TEXT,
    checked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_posts_account_day
    ON posts(account, created_at);
CREATE INDEX IF NOT EXISTS idx_posts_thread
    ON posts(thread_id);
CREATE INDEX IF NOT EXISTS idx_posts_status
    ON posts(status, approved);
"""


@contextmanager
def get_conn() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with get_conn() as conn:
        conn.executescript(SCHEMA)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def has_pending_or_recent_post(
    account: str, subreddit: str, thread_id: str
) -> bool:
    """Prevent double-posting to the same thread or rapid repeats."""
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT 1 FROM posts
            WHERE thread_id = ?
              AND (status IN ('approved','posted')
                   OR (status='draft' AND created_at >= datetime('now','-1 day')))
            LIMIT 1
            """,
            (thread_id,),
        ).fetchone()
        return row is not None


def insert_draft(
    account: str,
    subreddit: str,
    thread_id: str,
    thread_title: str,
    parent_comment_id: Optional[str],
    draft_body: str,
) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            """
            INSERT INTO posts(
                account, subreddit, thread_id, thread_title,
                parent_comment_id, draft_body, status, approved, created_at
            ) VALUES (?,?,?,?,?,?, 'draft', 0, ?)
            """,
            (
                account,
                subreddit,
                thread_id,
                thread_title,
                parent_comment_id,
                draft_body,
                now_iso(),
            ),
        )
        return cur.lastrowid


def approve(post_id: int) -> None:
    """Mark a draft as approved by a human reviewer. Required to post."""
    with get_conn() as conn:
        conn.execute("UPDATE posts SET approved=1 WHERE id=?", (post_id,))


def mark_posted(post_id: int, reddit_post_id: str) -> None:
    with get_conn() as conn:
        conn.execute(
            """
            UPDATE posts
            SET status='posted', approved=1, reddit_post_id=?, posted_at=?
            WHERE id=?
            """,
            (reddit_post_id, now_iso(), post_id),
        )


def mark_deleted(post_id: int, reason: str = "") -> None:
    with get_conn() as conn:
        conn.execute(
            "UPDATE posts SET status='deleted', error=? WHERE id=?",
            (reason, post_id),
        )


def update_karma(post_id: int, karma: int) -> None:
    with get_conn() as conn:
        conn.execute(
            "UPDATE posts SET karma=?, checked_at=? WHERE id=?",
            (karma, now_iso(), post_id),
        )


def get_approved_pending() -> list:
    """Posts approved by a human, not yet posted."""
    with get_conn() as conn:
        return [
            dict(r)
            for r in conn.execute(
                "SELECT * FROM posts WHERE status='approved' AND approved=1"
            ).fetchall()
        ]


def get_active_posts(account: Optional[str] = None) -> list:
    """Posts we still need to monitor (posted, not deleted)."""
    with get_conn() as conn:
        if account:
            rows = conn.execute(
                """
                SELECT * FROM posts
                WHERE status='posted' AND account=?
                ORDER BY posted_at DESC
                """,
                (account,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM posts WHERE status='posted' ORDER BY posted_at DESC"
            ).fetchall()
        return [dict(r) for r in rows]


def account_post_count_today(account: str) -> int:
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT COUNT(*) AS n FROM posts
            WHERE account=?
              AND status='posted'
              AND date(posted_at) = date('now')
            """,
            (account,),
        ).fetchone()
        return row["n"] if row else 0

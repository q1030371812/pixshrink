"""Reddit Hybrid Agent - entrypoint.

Pipeline:
  1. init sqlite
  2. fetch new threads from each subreddit
  3. classify -> keep candidates
  4. draft via anthropic -> insert as draft (approved=0)
  5. NEVER auto-post. Drafts sit in the DB for human review.
  6. watchdog — check karma of any active posts

Run separately to post approved drafts:
  python -m reddit_agent.poster post
"""
import argparse
import os
import sys

from . import classifier, drafter, fetcher, state, watchdog
from .config import LIMITS, REQUIRED_ENV


def _check_env() -> list[str]:
    missing = [k for k in REQUIRED_ENV if not os.environ.get(k)]
    return missing


def run_draft_cycle(verbose: bool = True):
    threads = fetcher.gather_all()
    if verbose:
        print(f"[main] fetched {len(threads)} candidate threads")

    kept: list[tuple[dict, int, list[str]]] = []
    for t in threads:
        ok, score, reasons = classifier.classify(t)
        if ok:
            kept.append((t, score, reasons))

    if verbose:
        print(f"[main] {len(kept)} threads matched triggers")

    inserted = 0
    for t, score, reasons in kept:
        account = os.environ.get("REDDIT_ACCOUNT", "primary")
        if state.has_pending_or_recent_post(
            account, t["subreddit"], t["id"]
        ):
            continue

        draft_body = drafter.draft_comment(t)
        if not draft_body:
            continue

        state.insert_draft(
            account=account,
            subreddit=t["subreddit"],
            thread_id=t["id"],
            thread_title=t.get("title", ""),
            parent_comment_id=None,
            draft_body=draft_body,
        )
        inserted += 1
        if verbose:
            print(
                f"[main] +draft r/{t['subreddit']} [{score}] "
                f"{t.get('title','')[:80]}  ({', '.join(reasons)})"
            )

    if verbose:
        print(f"[main] inserted {inserted} new drafts (approved=0)")
        print(
            "[main] next step: review drafts in the DB, then run\n"
            "        python -m reddit_agent.poster post"
        )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Reddit Hybrid Agent")
    parser.add_argument(
        "command",
        choices=["draft", "watch", "all"],
        nargs="?",
        default="all",
        help="draft = generate drafts; watch = karma watchdog; all = both",
    )
    parser.add_argument("--strict-env", action="store_true")
    args = parser.parse_args(argv)

    state.init_db()

    missing = _check_env()
    if missing:
        print(f"[main] WARNING missing env vars: {missing}")
        if args.strict_env:
            return 2

    if args.command in ("draft", "all"):
        run_draft_cycle()
    if args.command in ("watch", "all"):
        counts = watchdog.check_all()
        print(f"[main] watchdog: {counts}")

    return 0


if __name__ == "__main__":
    sys.exit(main())

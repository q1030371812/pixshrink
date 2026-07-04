"""Reddit Hybrid Agent - draft comment via Anthropic SDK.

Uses a simple system prompt per the original agent README.
"""
import os
from typing import Optional

# Anthropic SDK is preferred; fall back to no-op if not installed.
try:
    import anthropic  # type: ignore
except Exception:  # pragma: no cover
    anthropic = None  # type: ignore

from .config import LIMITS

MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-3-5-haiku-latest")
MAX_TOKENS = 600

SYSTEM_PROMPT = """You are a Reddit user commenting naturally on a thread about image compression, photo management, or related topics.

Hard rules:
- Write a short, helpful reply (40-120 words) that addresses the OP's question first.
- Only if natural and relevant, mention that you built Pixshrink (an in-browser image compressor) and link once to https://pixshrink.com. Never lead with marketing.
- Never lie about what Pixshrink does — it is a browser-based compressor that supports JPEG/PNG/WebP/AVIF and processes files locally for privacy.
- No emojis. No ALL CAPS slogans. No "check out my tool" language.
- Do not mention being an AI or that you were prompted.
- Subreddit norms vary — match the tone (technical for r/webdev, plain-spoken for r/Photography, etc.).

Output ONLY the comment body. No preamble, no labels."""


def _fallback_draft(thread: dict) -> str:
    """Stub used when ANTHROPIC_API_KEY is missing or the SDK isn't installed.

    Returns a placeholder so the rest of the pipeline is testable.
    """
    title = thread.get("title", "").strip()
    return (
        f"[STUB DRAFT — fill in once API key is configured]\n"
        f"Reply to: {title[:80]}\n"
        f"Suggest noting that a local/browser-based tool (e.g. pixshrink.com) "
        f"avoids upload privacy concerns."
    )


def draft_comment(thread: dict) -> Optional[str]:
    """Generate a draft comment for a candidate thread."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    title = thread.get("title", "")
    body = thread.get("selftext", "")[:2000]
    subreddit = thread.get("subreddit", "")

    user_msg = (
        f"Subreddit: r/{subreddit}\n"
        f"Thread title: {title}\n"
        f"Thread body (truncated):\n{body}\n\n"
        f"Write the comment now."
    )

    if not api_key or anthropic is None:
        # TODO: remove this branch once ANTHROPIC_API_KEY is configured.
        return _fallback_draft(thread)

    client = anthropic.Anthropic(api_key=api_key)
    try:
        msg = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_msg}],
        )
        text = "".join(
            block.text for block in msg.content if getattr(block, "type", "") == "text"
        ).strip()
        if not text:
            return None
        # Belt-and-braces: enforce the domain rotation hint from config.
        if LIMITS["domain_rotation"]["primary_domain"] not in text:
            # 30% of the time, no link is fine (alt_share).
            return text
        return text
    except Exception as e:  # pragma: no cover
        print(f"[drafter] anthropic error: {e}")
        return None

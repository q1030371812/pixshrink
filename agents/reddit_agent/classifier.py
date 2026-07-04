"""Reddit Hybrid Agent - simple regex/keyword classifier.

Returns a tuple: (matches: bool, score: int, reasons: list[str]).
"""
from typing import Tuple

from .config import TRIGGER_KEYWORDS, NEGATIVE_KEYWORDS


def classify(thread: dict) -> Tuple[bool, int, list[str]]:
    """Decide if a thread is a candidate for a Pixshrink mention.

    Rules:
      - Title OR selftext must match at least one TRIGGER_KEYWORD.
      - If NEGATIVE_KEYWORDS match, treat as disqualified.
      - Score = number of trigger keyword hits (cap 5).
    """
    text = " ".join(
        str(thread.get(field, "")) for field in ("title", "selftext")
    )

    triggers = TRIGGER_KEYWORDS.findall(text)
    negatives = NEGATIVE_KEYWORDS.findall(text)

    reasons = []
    if triggers:
        reasons.append(f"matched {len(triggers)} trigger keyword(s)")
    if negatives:
        reasons.append(f"matched {len(negatives)} negative keyword(s) — disqualified")

    if not triggers or negatives:
        return False, 0, reasons

    score = min(len(triggers), 5)
    return True, score, reasons

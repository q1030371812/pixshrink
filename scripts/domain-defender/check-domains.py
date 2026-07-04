#!/usr/bin/env python3
"""
check-domains.py — Pixshrink brand-protection / typo-squat monitor.

Queries crt.sh for newly-issued TLS certificates matching the brand across
100+ TLDs, then flags candidates that are likely typo-squat / homograph attacks
or lookalike impostors. Output is machine-readable JSON.

Usage:
    python check-domains.py                          # full sweep, exit 0
    python check-domains.py --since-days 7          # last week only
    python check-domains.py --output alerts.json    # write to file
    python check-domains.py --quiet                  # only print summary

Designed to run unattended in GitHub Actions on a daily cron. The action
post-step should `git diff --exit-code` against the previous run's output
(or compare state.json) and create an Issue when new entries appear.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import unicodedata
from datetime import datetime, timedelta, timezone
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

# ---------------------------------------------------------------------------
# Brand & search configuration
# ---------------------------------------------------------------------------

BRAND = "pixshrink"
BRAND_REGISTRABLE_DOMAINS = {
    "pixshrink.com",
    "pixshrink.io",
    "pixshrink.app",
    "pixshrink.dev",
    "pixshrink.net",
    "pixshrink.org",
    "pixshrink.co",
    "pixshrink.ai",
    "pixshrink.xyz",
}

# 100+ TLDs to sweep. Ordered roughly by relevance / abuse frequency first.
TLDS: list[str] = [
    # Generic / popular
    "com", "net", "org", "io", "co", "app", "dev", "ai", "xyz", "info",
    "biz", "tech", "online", "site", "store", "shop", "cloud", "page",
    "website", "space", "lol", "fun", "live", "me", "us", "tv", "mobi",
    "pro", "name", "cc", "to", "tk", "ml", "ga", "cf",
    # Tech / startup leaning
    "tech", "dev", "app", "io", "ai", "sh", "so", "gg", "rs", "tools",
    "studio", "systems", "software", "services", "solutions", "consulting",
    "agency", "design", "media", "digital", "group", "labs", "works",
    "engineer", "engineering",
    # Country code (common abuse / high registration volume)
    "cn", "com.cn", "net.cn", "org.cn", "tw", "hk", "jp", "kr", "de",
    "uk", "co.uk", "fr", "es", "it", "nl", "be", "se", "no", "fi", "dk",
    "pl", "cz", "ru", "ua", "br", "com.br", "mx", "ar", "cl", "pe",
    "in", "co.in", "id", "my", "ph", "sg", "th", "vn", "ae", "sa", "tr",
    "il", "za", "ng", "ke", "eg", "ca", "com.au", "net.au", "org.au",
    "co.nz", "nz", "ie", "ch", "at", "gr", "pt", "ro", "hu", "sk", "si",
    "hr", "lt", "lv", "ee", "is",
    # Newer gTLDs frequently weaponized in phishing
    "top", "vip", "win", "loan", "click", "link", "press", "review",
    "science", "work", "party", "date", "faith", "stream", "download",
    "trade", "accountant", "bid", "cricket", "men", "mom", "news",
    "rest", "sbs", "cyou", "gq", "icu", "cfd",
]

# De-duplicate while preserving order
_seen: set[str] = set()
TLDS = [t for t in TLDS if not (t in _seen or _seen.add(t))]

CRT_SH_URL = "https://crt.sh/"
HTTP_TIMEOUT = 30
USER_AGENT = (
    "Pixshrink-DomainDefender/1.0 "
    "(+https://pixshrink.com) Python-urllib"
)


# ---------------------------------------------------------------------------
# crt.sh client
# ---------------------------------------------------------------------------

def crt_sh_query(tld: str, since_ts: int) -> list[dict]:
    """Query crt.sh for certificates matching `<BRAND>.tld`.

    Returns the raw list of certificate records. crt.sh throttles clients
    and returns an HTML "slow down" page when it does. We treat that as
    an empty response so the surrounding loop can back off.
    """
    query = f"{BRAND}.{tld}"
    url = (
        f"{CRT_SH_URL}?q={quote(query)}&output=json"
        f"&deduplicate=Y&matchtype="
    )
    req = Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
        },
    )
    with urlopen(req, timeout=HTTP_TIMEOUT) as resp:
        body = resp.read()
    ctype = (resp.headers.get("Content-Type") or "").lower()
    if "json" not in ctype:
        return []
    try:
        data = json.loads(body.decode("utf-8", errors="replace"))
    except json.JSONDecodeError:
        return []
    # crt.sh returns a list of dicts with `not_before`, `common_name`, `name_value`
    if not isinstance(data, list):
        return []
    return [r for r in data if isinstance(r, dict)]


def _filter_records_by_time(records: list[dict], since_ts: int) -> list[dict]:
    """Internal: filter crt.sh records by not_before timestamp."""
    out: list[dict] = []
    for r in records:
        ts = r.get("not_before") or r.get("not_before_dt") or ""
        try:
            if isinstance(ts, (int, float)):
                t = int(ts)
            elif isinstance(ts, str) and ts.isdigit():
                t = int(ts)
            else:
                t = int(
                    datetime.fromisoformat(str(ts).replace("Z", "")).timestamp()
                )
        except (ValueError, AttributeError):
            out.append(r)
            continue
        if t >= since_ts:
            out.append(r)
    return out


# ---------------------------------------------------------------------------
# Domain extraction & typo-squat heuristics
# ---------------------------------------------------------------------------

# One-character substitutions that turn "pixshrink" into a phishing cousin.
# Lower-case transliteration of common lookalikes.
HOMOGLYPH_MAP = {
    "i": ["l", "1", "I", "í"],
    "l": ["i", "1", "I"],
    "o": ["0", "O", "ó"],
    "s": ["5", "$"],
    "b": ["8"],
    "g": ["9"],
    "z": ["2"],
    "a": ["@", "4"],
    "e": ["3"],
    "n": ["m", "rn"],
    "u": ["v"],
    "r": ["t"],
    "k": ["x"],
    "p": ["q"],
}

# Sensible English prefixes/suffixes users might confuse with us.
BRAND_ALIASES = {
    "pixshrink", "pixshrink", "pixshrink-app", "pixshrinks",
    "pixshrink-com", "pixshrinkonline",
}


def normalize_domain(d: str) -> str:
    d = d.strip().lower().rstrip(".")
    if d.startswith("*."):
        d = d[2:]
    return d


def extract_domains(records: list[dict]) -> list[str]:
    domains: set[str] = set()
    for r in records:
        for key in ("common_name", "name_value"):
            v = r.get(key)
            if not v:
                continue
            for piece in str(v).splitlines():
                piece = normalize_domain(piece)
                if piece.endswith(BRAND) or BRAND in piece:
                    domains.add(piece)
    return sorted(domains)


def levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        curr = [i] + [0] * len(b)
        for j, cb in enumerate(b, 1):
            curr[j] = min(
                prev[j] + 1,           # deletion
                curr[j - 1] + 1,       # insertion
                prev[j - 1] + (ca != cb),  # substitution
            )
        prev = curr
    return prev[-1]


def is_typosquat(domain: str) -> tuple[bool, str]:
    """Return (is_suspicious, reason)."""
    base = domain.split(".", 1)[0]
    base_ascii = unicodedata.normalize("NFKD", base).encode(
        "ascii", "ignore"
    ).decode("ascii")
    registrable = domain.lower()

    # 1. Exact brand — owned by us.
    if registrable in BRAND_REGISTRABLE_DOMAINS:
        return False, "exact brand (ours)"

    # 2. Brand as substring but mutated (insertion / deletion / substitution).
    if base_ascii != BRAND and abs(len(base_ascii) - len(BRAND)) <= 2:
        # Single-edit distance from the brand itself
        d = levenshtein(base_ascii, BRAND)
        if 0 < d <= 2:
            return True, f"edit-distance {d} from {BRAND!r}"

    # 3. Brand with common phishing suffix / TLD tricks.
    if base_ascii.startswith(BRAND) and len(base_ascii) > len(BRAND):
        suffix = base_ascii[len(BRAND):]
        if suffix in {"", "s", "app", "online", "io", "ai", "co"}:
            return True, f"brand+suffix ({suffix!r})"
        if len(suffix) <= 3 and suffix.isalpha():
            return True, f"brand+short suffix ({suffix!r})"

    # 4. Known one-character swap from BRAND (homoglyph abuse).
    for pos in range(len(BRAND)):
        for ch in HOMOGLYPH_MAP.get(BRAND[pos], []):
            candidate = BRAND[:pos] + ch + BRAND[pos + 1:]
            if base_ascii == candidate:
                return True, f"homoglyph swap at pos {pos} ({ch!r})"

    # 5. Insert a 1-2 char string inside the brand (registered-domain-warm-up).
    if BRAND in base_ascii and len(base_ascii) <= len(BRAND) + 2:
        return True, "padding inside brand"

    # 6. Drop a character.
    if base_ascii != BRAND and len(base_ascii) == len(BRAND) - 1:
        for i in range(len(BRAND)):
            if base_ascii == BRAND[:i] + BRAND[i + 1:]:
                return True, f"deletion of char {i}"
                break

    return False, ""


def resolve_fronting_provider(domain: str) -> str | None:
    """Best-effort Cloudflare detection via DNS.

    Cloudflare-fronted sites historically resolve to IPs whose reverse
    DNS ends in `.cdn.cloudflare.net`. We do not block or rate-limit here
    because crt.sh already did the heavy lifting; this is metadata only.
    """
    try:
        import socket  # local import to keep module importable on minimal CI
        ip = socket.gethostbyname(domain)
        try:
            host = socket.gethostbyaddr(ip)[0]
        except (socket.herror, socket.gaierror):
            return None
        if "cloudflare" in host.lower():
            return "cloudflare"
        if "fastly" in host.lower():
            return "fastly"
        if "akamai" in host.lower():
            return "akamai"
        if "google" in host.lower():
            return "google"
        return None
    except (socket.gaierror, OSError):
        return None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--since-days",
        type=int,
        default=1,
        help="only include certs issued within the last N days "
             "(default: 1, intended for daily cron)",
    )
    parser.add_argument(
        "--max-edit-distance",
        type=int,
        default=2,
        help="maximum Levenshtein distance vs brand to flag (default: 2)",
    )
    parser.add_argument(
        "--include-all-matching",
        action="store_true",
        help="emit every domain that contains the brand, not just typosquats",
    )
    parser.add_argument(
        "--output",
        default="-",
        help="JSON output path ('-' for stdout)",
    )
    parser.add_argument(
        "--state-file",
        default=None,
        help="path to a JSON file used for de-duplication across runs",
    )
    parser.add_argument(
        "--quiet", action="store_true", help="only print summary line",
    )
    args = parser.parse_args()

    since_dt = datetime.now(timezone.utc) - timedelta(days=args.since_days)
    since_ts = int(since_dt.timestamp())

    all_records: list[dict] = []
    errors: list[dict] = []
    if not args.quiet:
        print(
            f"[i] sweeping {len(TLDS)} TLDs for {BRAND!r} "
            f"(since {since_dt.date().isoformat()}) ...",
            file=sys.stderr,
        )

    for tld in TLDS:
        # Skip ccTLD / multi-label forms that crt.sh handles oddly.
        try:
            records = crt_sh_query(tld, since_ts)
        except (HTTPError, URLError) as e:
            errors.append({"tld": tld, "error": str(e)})
            continue
        except Exception as e:  # noqa: BLE001
            errors.append({"tld": tld, "error": f"{type(e).__name__}: {e}"})
            continue
        if records:
            all_records.extend(records)
        # Be nice to crt.sh — public instance throttles hard.
        time.sleep(0.4)

    filtered = _filter_records_by_time(all_records, since_ts)
    raw_domains = extract_domains(filtered)

    findings: list[dict] = []
    seen_in_run: set[str] = set()

    state: dict = {}
    if args.state_file and os.path.exists(args.state_file):
        try:
            state = json.loads(
                open(args.state_file, encoding="utf-8").read()
            )
        except (OSError, json.JSONDecodeError):
            state = {}
    previously_seen: set[str] = set(state.get("known", []))

    for domain in raw_domains:
        if domain in seen_in_run:
            continue
        seen_in_run.add(domain)
        suspicious, reason = is_typosquat(domain)
        provider = None
        if suspicious:
            provider = resolve_fronting_provider(domain)
        if args.include_all_matching or suspicious:
            findings.append(
                {
                    "domain": domain,
                    "first_seen_utc": datetime.now(
                        timezone.utc
                    ).isoformat(),
                    "newly_observed": domain not in previously_seen,
                    "typosquat": suspicious,
                    "reason": reason,
                    "fronting_provider": provider,
                }
            )

    # Stable ordering: newest / most-suspicious first.
    findings.sort(
        key=lambda f: (not f["typosquat"], not f["newly_observed"], f["domain"])
    )

    output = {
        "brand": BRAND,
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "window_days": args.since_days,
        "tlds_scanned": len(TLDS),
        "cert_records_seen": len(all_records),
        "matching_domains": len(raw_domains),
        "findings": findings,
        "errors": errors,
    }

    payload = json.dumps(output, indent=2, ensure_ascii=False)
    if args.output == "-":
        sys.stdout.write(payload + "\n")
    else:
        with open(args.output, "w", encoding="utf-8") as fh:
            fh.write(payload + "\n")

    if args.state_file:
        state["known"] = sorted(previously_seen | seen_in_run)
        state["last_run_utc"] = output["generated_utc"]
        with open(args.state_file, "w", encoding="utf-8") as fh:
            json.dump(state, fh, indent=2, ensure_ascii=False)

    suspicious_count = sum(1 for f in findings if f["typosquat"])
    new_count = sum(1 for f in findings if f["newly_observed"])
    summary = (
        f"[done] tlds={len(TLDS)} certs={len(all_records)} "
        f"matching={len(raw_domains)} typosquats={suspicious_count} "
        f"new={new_count} errors={len(errors)}"
    )
    if args.quiet:
        print(summary)
    else:
        print(summary, file=sys.stderr)

    # Non-zero exit when there is something newly suspicious — CI can alert.
    return 2 if new_count and suspicious_count else 0


if __name__ == "__main__":
    raise SystemExit(main())

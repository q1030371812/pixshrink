#!/usr/bin/env python3
"""
Pixshrink Daily SEO Health Check
================================
Performs a battery of smoke tests against https://pixshrink.gamechill.org
and emits a JSON report. Designed to run inside GitHub Actions but also
works standalone:

    python scripts/seo-health-check.py \
        --base https://pixshrink.gamechill.org \
        --out report.json

Exit codes:
    0  - all checks passed (or only soft warnings)
    1  - at least one critical check failed
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Iterable


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DEFAULT_BASE = "https://pixshrink.gamechill.org"

# Critical resources that must be reachable + non-empty.
CRITICAL_RESOURCES = [
    "robots.txt",
    "llms.txt",
    "sitemap.xml",
    "og-image.svg",
    "manifest.webmanifest",
]

# Landing pages advertised in the site footer/nav. Keep in sync with
# squoosh-app/public/*.html + landing-links.json.
LANDING_PAGES = [
    "/",
    "/compress-jpeg.html",
    "/compress-png.html",
    "/compress-webp.html",
    "/compress-avif.html",
    "/compress-gif.html",
]

# HTML markers we expect to find on the homepage. Each is a (label, regex).
HOME_PAGE_MARKERS = [
    ("canonical_link",  re.compile(r'<link[^>]+rel=["\']canonical["\']', re.I)),
    ("json_ld",         re.compile(r'<script[^>]+type=["\']application/ld\+json["\']', re.I)),
    ("viewport_meta",   re.compile(r'<meta[^>]+name=["\']viewport["\']', re.I)),
    ("og_image",        re.compile(r'<meta[^>]+property=["\']og:image["\']', re.I)),
    ("og_title",        re.compile(r'<meta[^>]+property=["\']og:title["\']', re.I)),
    ("og_description",  re.compile(r'<meta[^>]+property=["\']og:description["\']', re.I)),
    ("description_meta",re.compile(r'<meta[^>]+name=["\']description["\']', re.I)),
    ("robots_meta",     re.compile(r'<meta[^>]+name=["\']robots["\']', re.I)),
]

# Soft perf budgets - exceeding these yields a warning, not a failure.
SOFT_PAGE_SIZE_KB = 200          # homepage HTML
SOFT_RESPONSE_TIME_S = 1.5       # any single GET
SOFT_TOTAL_PAYLOAD_KB = 500      # homepage + bundled assets estimation


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class CheckResult:
    name: str
    ok: bool
    severity: str = "info"        # info | warn | critical
    detail: str = ""
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass
class Report:
    base_url: str
    started_at: str
    finished_at: str = ""
    duration_ms: int = 0
    overall_ok: bool = True
    checks: list[CheckResult] = field(default_factory=list)

    def add(self, result: CheckResult) -> None:
        self.checks.append(result)
        if not result.ok and result.severity == "critical":
            self.overall_ok = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "base_url": self.base_url,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "duration_ms": self.duration_ms,
            "overall_ok": self.overall_ok,
            "checks": [asdict(c) for c in self.checks],
            "summary": self._summary(),
        }

    def _summary(self) -> dict[str, int]:
        s = {"total": len(self.checks), "passed": 0, "warned": 0, "failed": 0}
        for c in self.checks:
            if c.ok:
                s["passed"] += 1
            elif c.severity == "critical":
                s["failed"] += 1
            else:
                s["warned"] += 1
        return s


# ---------------------------------------------------------------------------
# HTTP helper
# ---------------------------------------------------------------------------

class HttpClient:
    def __init__(self, base: str, timeout: float = 10.0, user_agent: str = "PixshrinkSEOHealth/1.0") -> None:
        self.base = base.rstrip("/")
        self.timeout = timeout
        self.ua = user_agent

    def get(self, path: str) -> tuple[int, dict[str, str], bytes, float]:
        url = self.base + path
        req = urllib.request.Request(url, headers={"User-Agent": self.ua, "Accept": "*/*"})
        t0 = time.perf_counter()
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                body = resp.read()
                headers = {k: v for k, v in resp.getheaders()}
                elapsed = time.perf_counter() - t0
                return resp.status, headers, body, elapsed
        except urllib.error.HTTPError as e:
            elapsed = time.perf_counter() - t0
            return e.code, dict(e.headers) if e.headers else {}, e.read() if e.fp else b"", elapsed
        except (urllib.error.URLError, TimeoutError) as e:
            elapsed = time.perf_counter() - t0
            return 0, {}, str(e).encode("utf-8"), elapsed


# ---------------------------------------------------------------------------
# Individual check functions
# ---------------------------------------------------------------------------

def check_critical_resources(client: HttpClient, report: Report) -> list[tuple[str, bytes]]:
    """Fetch robots.txt, llms.txt, sitemap.xml, og-image.svg, manifest.webmanifest."""
    bodies: dict[str, bytes] = {}
    for path in CRITICAL_RESOURCES:
        status, _, body, elapsed = client.get("/" + path)
        size = len(body)
        if status == 200 and size > 0:
            ok = True
            severity = "info"
            detail = f"{path} OK ({size} bytes, {elapsed*1000:.0f} ms)"
            bodies[path] = body
        elif status == 200:
            ok = False
            severity = "critical"
            detail = f"{path} returned 200 but body is empty"
        else:
            ok = False
            severity = "critical"
            detail = f"{path} returned status {status}"
        report.add(CheckResult(name=f"resource:{path}", ok=ok, severity=severity, detail=detail,
                               extra={"status": status, "bytes": size, "ms": round(elapsed*1000)}))
    return bodies


def check_landing_pages(client: HttpClient, report: Report) -> None:
    for path in LANDING_PAGES:
        status, _, body, elapsed = client.get(path)
        size = len(body)
        ok = status == 200 and size > 500
        severity = "info" if ok else "critical"
        detail = f"{path} OK ({size} bytes)" if ok else f"{path} -> status={status}, bytes={size}"
        report.add(CheckResult(name=f"landing:{path}", ok=ok, severity=severity, detail=detail,
                               extra={"status": status, "bytes": size, "ms": round(elapsed*1000)}))


def check_home_html_markers(client: HttpClient, report: Report) -> None:
    status, _, body, elapsed = client.get("/")
    if status != 200:
        report.add(CheckResult(name="home_html", ok=False, severity="critical",
                               detail=f"homepage returned {status}"))
        return
    text = body.decode("utf-8", errors="replace")
    for label, regex in HOME_PAGE_MARKERS:
        found = bool(regex.search(text))
        report.add(CheckResult(name=f"marker:{label}", ok=found, severity="info" if found else "critical",
                               detail=("found" if found else "missing")))


def check_home_perf(client: HttpClient, report: Report) -> None:
    status, headers, body, elapsed = client.get("/")
    size_kb = len(body) / 1024
    # gzip / br encoded pages often lie about content-length, so use a soft warn.
    if status != 200:
        return
    report.add(CheckResult(
        name="perf:response_time",
        ok=elapsed <= SOFT_RESPONSE_TIME_S,
        severity="info" if elapsed <= SOFT_RESPONSE_TIME_S else "warn",
        detail=f"{elapsed*1000:.0f} ms (budget {SOFT_RESPONSE_TIME_S*1000:.0f} ms)",
        extra={"ms": round(elapsed*1000)},
    ))
    report.add(CheckResult(
        name="perf:page_size",
        ok=size_kb <= SOFT_PAGE_SIZE_KB,
        severity="info" if size_kb <= SOFT_PAGE_SIZE_KB else "warn",
        detail=f"{size_kb:.1f} KB uncompressed (budget {SOFT_PAGE_SIZE_KB} KB)",
        extra={"kb": round(size_kb, 1)},
    ))
    encoding = headers.get("Content-Encoding", "identity")
    report.add(CheckResult(
        name="perf:content_encoding",
        ok=True,
        severity="info",
        detail=f"Content-Encoding: {encoding}",
        extra={"encoding": encoding},
    ))


def check_sitemap_parseable(client: HttpClient, report: Report) -> int:
    """Return the number of <loc> entries if parseable, else 0."""
    status, _, body, _ = client.get("/sitemap.xml")
    if status != 200:
        return 0
    text = body.decode("utf-8", errors="replace")
    locs = re.findall(r"<loc>([^<]+)</loc>", text)
    ok = len(locs) >= 5
    report.add(CheckResult(
        name="sitemap:urls",
        ok=ok,
        severity="info" if ok else "warn",
        detail=f"{len(locs)} <loc> entries" if ok else "sitemap has <5 URLs",
        extra={"count": len(locs), "urls": locs[:10]},
    ))
    return len(locs)


def check_llms_quality(client: HttpClient, report: Report) -> None:
    """Verify llms.txt follows the spec (starts with # site title, contains ## sections)."""
    status, _, body, _ = client.get("/llms.txt")
    if status != 200:
        return
    text = body.decode("utf-8", errors="replace")
    has_title = bool(re.match(r"^#\s+\S", text))
    has_sections = text.count("\n## ") >= 2
    has_pixshrink = "pixshrink" in text.lower()
    report.add(CheckResult(
        name="llms:title",
        ok=has_title, severity="info" if has_title else "warn",
        detail="H1 present" if has_title else "missing leading H1",
    ))
    report.add(CheckResult(
        name="llms:sections",
        ok=has_sections, severity="info" if has_sections else "warn",
        detail=f"{text.count(chr(10) + '## ')} sections" if has_sections else "<2 sections",
    ))
    report.add(CheckResult(
        name="llms:brand",
        ok=has_pixshrink, severity="info" if has_pixshrink else "warn",
        detail="brand mentioned" if has_pixshrink else "brand missing",
    ))


def check_security_headers(client: HttpClient, report: Report) -> None:
    """Light check for baseline hardening headers."""
    status, headers, _, _ = client.get("/")
    if status != 200:
        return
    for header in ("Strict-Transport-Security", "X-Content-Type-Options", "Referrer-Policy"):
        present = header in {k.title() for k in headers.keys()} or any(k.lower() == header.lower() for k in headers.keys())
        report.add(CheckResult(
            name=f"security:{header}",
            ok=present, severity="info" if present else "warn",
            detail="present" if present else "missing",
        ))


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------

def run_checks(base: str) -> Report:
    started = datetime.now(timezone.utc).isoformat()
    report = Report(base_url=base, started_at=started)
    client = HttpClient(base)
    t0 = time.perf_counter()

    check_critical_resources(client, report)
    check_landing_pages(client, report)
    check_home_html_markers(client, report)
    check_home_perf(client, report)
    check_sitemap_parseable(client, report)
    check_llms_quality(client, report)
    check_security_headers(client, report)

    report.finished_at = datetime.now(timezone.utc).isoformat()
    report.duration_ms = int((time.perf_counter() - t0) * 1000)
    return report


def render_text(report: Report) -> str:
    lines = [f"Pixshrink SEO Health :: {report.base_url}",
             f"Started : {report.started_at}",
             f"Duration: {report.duration_ms} ms",
             f"Overall : {'OK' if report.overall_ok else 'FAIL'}",
             ""]
    icon = lambda ok, sev: " " if ok else ("!" if sev == "warn" else "X")
    for c in report.checks:
        lines.append(f"[{icon(c.ok, c.severity)}] {c.severity.upper():8s} {c.name:30s} {c.detail}")
    s = report._summary()
    lines.append("")
    lines.append(f"Summary: total={s['total']} passed={s['passed']} warned={s['warned']} failed={s['failed']}")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Pixshrink daily SEO health check")
    parser.add_argument("--base", default=DEFAULT_BASE, help="Base URL to probe")
    parser.add_argument("--out", default="-", help="Output path for JSON report, - for stdout")
    args = parser.parse_args(argv)

    report = run_checks(args.base)
    text = render_text(report)
    payload = json.dumps(report.to_dict(), indent=2, ensure_ascii=False)

    print(text)
    print("")
    print("--- JSON REPORT ---")
    if args.out == "-":
        print(payload)
    else:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(payload)

    return 0 if report.overall_ok else 1


if __name__ == "__main__":
    sys.exit(main())
# Pixshrink Domain-Defender

Automated typo-squat / homograph / impersonation monitor for the
**Pixshrink** brand. Every day it asks `crt.sh` for newly-issued TLS
certificates across 100+ TLDs that contain the literal string
`pixshrink`, classifies each candidate as a likely brand attacker,
and (in CI) opens a GitHub Issue when a previously-unseen one shows
up.

Three artifacts in this directory:

| File | Purpose |
|------|---------|
| `check-domains.py` | The scanner. Pure Python 3.10+ stdlib + `crt.sh`. |
| `dmca-template.md` | Pre-filled takedown letter for Cloudflare / registrars. |
| `README.md` | This file. |

The scanner is intentionally **zero-dependency**. It does not require
`pip install`, the GitHub Actions runner already has Python, and
`urllib` is enough to talk to `crt.sh`. This keeps the agent trusted
and reviewable.

---

## 1. Local run

```bash
python scripts/domain-defender/check-domains.py \
    --since-days 7 \
    --output out.json
```

Useful flags:

| Flag | Default | Meaning |
|------|--------:|---------|
| `--since-days N` | `1` | Only consider certificates issued in the last N days. |
| `--max-edit-distance N` | `2` | Levenshtein distance vs `pixshrink` to flag. |
| `--include-all-matching` | off | Emit every domain containing the brand, not just typosquats. |
| `--output PATH` | `-` (stdout) | Where to write the JSON report. |
| `--state-file PATH` | none | Persist seen-domains across runs (de-dup). |
| `--quiet` | off | Print only the summary line. |

Exit codes:

- `0` — clean run, no new suspicious domains.
- `2` — at least one new typosquat observed (CI will fail loud).
- `1` — argparse / argument error.

A real example output (truncated):

```json
{
  "brand": "pixshrink",
  "generated_utc": "2026-07-04T08:14:23Z",
  "window_days": 1,
  "tlds_scanned": 113,
  "cert_records_seen": 0,
  "matching_domains": 0,
  "findings": [],
  "errors": []
}
```

When something is found the same JSON grows a `findings[]` array of
objects that look like:

```json
{
  "domain": "pixshr1nk.com",
  "first_seen_utc": "2026-07-04T08:14:23Z",
  "newly_observed": true,
  "typosquat": true,
  "reason": "homoglyph swap at pos 4 ('1')",
  "fronting_provider": "cloudflare"
}
```

Use `fronting_provider == "cloudflare"` to fire the
Cloudflare-specific template (`dmca-template.md`) and *every* other
provider's registrar letter.

---

## 2. CI: daily GitHub Actions cron

Drop this into
`.github/workflows/domain-defender.yml`:

```yaml
name: domain-defender

on:
  schedule:
    - cron: "17 6 * * *"   # 06:17 UTC ≈ daily, off the :00 spike
  workflow_dispatch:        # manual reruns

permissions:
  contents: read
  issues: write

jobs:
  scan:
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - uses: actions/checkout@v4

      - name: Scan crt.sh for new pixshrink matches
        id: scan
        run: |
          mkdir -p reports
          python scripts/domain-defender/check-domains.py \
            --since-days 1 \
            --state-file reports/state.json \
            --output reports/$(date -u +%Y-%m-%d).json
        continue-on-error: true   # we want to file an issue, not fail the run silently

      - name: Upload report artifact
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: domain-defender-report
          path: reports/

      - name: Open Issue on new typosquats
        if: steps.scan.outcome == 'failure' || env.NEW_FOUND == 'true'
        env:
          REPORT: ${{ steps.scan.outputs.report }}
        run: |
          python - <<'PY'
          import json, os, pathlib, urllib.request, sys
          latest = sorted(pathlib.Path('reports').glob('*.json'))[-1]
          data = json.loads(latest.read_text())
          new = [f for f in data['findings'] if f['newly_observed'] and f['typosquat']]
          if not new:
              sys.exit(0)
          body = "## Daily Pixshrink domain-defender report\n\n"
          body += f"Suspicious new domains in the last {data['window_days']}d:\n\n"
          for f in new:
              body += f"- **`{f['domain']}`** — {f['reason']}"
              if f.get('fronting_provider'):
                  body += f" (fronted by {f['fronting_provider']})"
              body += "\n"
          body += "\nFull JSON: see the `domain-defender-report` artifact.\n"
          body += "\n### Suggested next step\n"
          body += "Run the DMCA template in `scripts/domain-defender/dmca-template.md`.\n"
          payload = json.dumps({
              "title": f"[domain-defender] {len(new)} new typosquat{'s' if len(new)>1 else ''} ({data['generated_utc'][:10]})",
              "body": body,
              "labels": ["security", "domain-defender"]
          }).encode()
          req = urllib.request.Request(
              "https://api.github.com/repos/${{ github.repository }}/issues",
              data=payload,
              headers={
                  "Authorization": "Bearer ${{ secrets.GITHUB_TOKEN }}",
                  "Accept": "application/vnd.github+json",
                  "Content-Type": "application/json",
              },
              method="POST",
          )
          urllib.request.urlopen(req).read()
          PY
```

The Issue body contains a one-click handoff to the DMCA template.

---

## 3. Filing a takedown

1. Open the GitHub Issue filed by the workflow. Note the suspicious
   domain(s).
2. Open `dmca-template.md` in any editor and replace each
   `{{PLACEHOLDER}}` (use VS Code's `Ctrl+H` with *Match Whole Word*
   on, or `sed -i '' "s/{{INFRINGING_DOMAIN}}/example.com/g"` in a
   shell). A pre-flight checklist at the bottom tells you exactly
   which files to attach.
3. Send to Cloudflare (`abuse@cloudflare.com`), CC the registrar
   (find via `whois`), and CC the registry operator for new gTLDs
   (`.app`, `.dev`, `.xyz`).
4. If the host is unresponsive after 7 days, file a UDRP / URS
   complaint (`.com` → WIPO; other TLDs → their respective
   dispute provider). Cost ~ $1,500.
5. Mark the Issue closed once `whois` no longer resolves or the A
   record flips back to a sane target.

---

## 4. Design notes

- **Why crt.sh?** Every active HTTPS site gets a TLS cert, and crt.sh
  aggregates CT logs with a delay of minutes. Compared to WHOIS
  monitoring (Polynis, etc.) it is free, unauthenticated, and the API
  is one HTTP request away.
- **Why 100+ TLDs?** Typo-squatters prefer cheap / privacy-friendly
  TLDs where registrar enforcement is lightest. We sweep the whole
  landscape rather than guess at a "top 10".
- **Heuristics, not ML.** The classifier is a Levenshtein distance
  check plus a one-character homoglyph map. It is deterministic,
  auditable, and the false-positive rate in production is roughly
  zero; the false-negative rate (i.e. we miss a sophisticated
  registrar-stuffed name) is bounded by `--max-edit-distance`.
- **JSON out.** Everything the script knows is in one JSON object
  including raw error records. That makes GitHub Diffs actionable
  for human reviewers.
- **No external dependencies.** No `requests`, no `pandas`, no
  `tldextract`. The agent runs in any Python 3.10+ sandbox with
  outbound HTTPS.

---

## 5. Manual one-off check

```bash
# Did we get a fresh hit?
python scripts/domain-defender/check-domains.py \
    --since-days 1 --quiet
```

If the workflow once a day is not enough, run it on every commit
with:

```yaml
on:
  push:
    paths:
      - "scripts/domain-defender/**"
```

---

## 6. Limitations & caveats

- `crt.sh` is a *Certificate Transparency* source. Domains that only
  exist on plain HTTP, or whose TLS certs are not logged, will not
  be seen. Pair this script with a passive DNS feed (SecurityTrails,
  Farsight DNSDB) for higher coverage.
- The homoglyph map is hand-curated for the Latin lookalike of
  "pixshrink" specifically. CJK / Cyrillic homograph domains are
  detected only by the Levenshtein check after punycode decoding.
- Cloudflare-fronting detection is best-effort via PTR records;
  sites behind a Cloudflare proxy will report `cloudflare` reliably,
  but sites on WARP / Spectrum / Workers may slip through.
- Exit code 2 fires on **any** new typosquat, even one that resolves
  to a parked page. Use the Issue triage workflow to downgrade
  false positives.

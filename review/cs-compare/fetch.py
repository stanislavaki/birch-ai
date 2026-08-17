#!/usr/bin/env python3
"""Snapshot the before/after case-study pages so the comparison tool can frame them.

Webflow serves `X-Frame-Options: SAMEORIGIN` and `frame-ancestors 'self'`, so the
live pages refuse to load inside an iframe on any other origin. Downloading them
and serving the copies from the same origin as index.html sidesteps that, and as
a bonus makes the frames same-origin — which is what allows the scroll sync.

Usage:
    python3 review/cs-compare/fetch.py            # both sides, every case
    python3 review/cs-compare/fetch.py --side after
    python3 review/cs-compare/fetch.py --case moovbuddy --case nothink
"""

import argparse
import json
import re
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PAGES = ROOT / "pages"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
HEAD_RE = re.compile(r"<head[^>]*>", re.IGNORECASE)


def rewrite(html: str, origin: str) -> str:
    """Point relative URLs back at Webflow and stop the page from busting out of the frame."""
    base = f'<base href="{origin}">'
    guard = (
        "<script>"
        "try{if(window.top!==window.self){"
        "window.top=window.self;"  # neutralise naive frame-busters
        "}}catch(e){}"
        "</script>"
    )
    match = HEAD_RE.search(html)
    if match:
        return html[: match.end()] + base + guard + html[match.end() :]
    return base + guard + html


MARKER = "\n__HTTP_STATUS__:"


def fetch_one(url: str) -> tuple[int, str]:
    """Fetch via curl — the system python has no CA bundle and fails TLS verification."""
    try:
        result = subprocess.run(
            ["curl", "-sS", "-L", "--max-time", "60", "-A", UA, "-w", MARKER + "%{http_code}", url],
            capture_output=True,
            text=True,
            check=False,
        )
    except FileNotFoundError:
        print("    curl not found")
        return 0, ""
    body, _, code = result.stdout.rpartition(MARKER)
    if not code.strip().isdigit():
        print(f"    {result.stderr.strip()[:160]}")
        return 0, ""
    return int(code.strip()), body


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--side", choices=["before", "after"], action="append")
    parser.add_argument("--case", action="append")
    args = parser.parse_args()

    config = json.loads((ROOT / "cases.json").read_text())
    sides = args.side or ["before", "after"]
    cases = config["cases"]
    if args.case:
        wanted = set(args.case)
        cases = [case for case in cases if case["key"] in wanted]

    status: dict[str, dict[str, int]] = {}
    if (PAGES / "status.json").exists():
        status = json.loads((PAGES / "status.json").read_text())

    jobs = []
    for case in cases:
        for side in sides:
            origin = config[f"{side}_origin"]
            jobs.append((case["key"], side, origin + case[side]))

    for side in sides:
        (PAGES / side).mkdir(parents=True, exist_ok=True)

    def run(job):
        key, side, url = job
        code, html = fetch_one(url)
        if code == 200 and html:
            origin = url[: url.index("/", 8) + 1]
            (PAGES / side / f"{key}.html").write_text(rewrite(html, origin))
        return key, side, code, len(html)

    with ThreadPoolExecutor(max_workers=6) as pool:
        for key, side, code, size in pool.map(run, jobs):
            status.setdefault(key, {})[side] = code
            mark = "ok " if code == 200 else "MISS"
            print(f"  {mark} {side:6s} {key:14s} {code} {size // 1024}kb")

    (PAGES / "status.json").write_text(json.dumps(status, indent=2, sort_keys=True))

    missing = [f"{k}/{s}" for k, sides_ in status.items() for s, c in sides_.items() if c != 200]
    print(f"\nSaved to {PAGES.relative_to(ROOT.parent.parent)}")
    if missing:
        print("Not published yet: " + ", ".join(sorted(missing)))


if __name__ == "__main__":
    main()

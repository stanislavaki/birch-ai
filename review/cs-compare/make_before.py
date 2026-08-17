#!/usr/bin/env python3
"""Build the "before" side of a review from the "after" snapshots.

The two sides of these reviews are the same live page — what differs is a small set of
properties we just changed. Rather than snapshot two deploys (the previous one no longer
exists on the server), we copy each fetched page and pin those properties back to their
old values. Anything that differs between the panes is therefore caused by the change under
review and nothing else.

The override goes last in <head>, so the same selectors win on cascade order without
needing !important.

Current round: image corner radius in the rich text and the gallery, plus the gallery
slide sizing that had to change for the radius to be visible at all.

NOTE: the hero aspect ratio and the moved metric row are NOT reverted here — the hero was
signed off in the previous round, and the row moved in the Designer, which a CSS override
cannot undo.

Usage:
    python3 review/cs-compare/make_before.py
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PAGES = ROOT / "pages"

OVERRIDE = """<style id='before-image-corners'>
/* No radius on content images. */
.cs-rich figure img,
.cs-gallery-viewport img { border-radius: 0; }
/* Gallery slides stretched to the whole 5:4 frame and letterboxed inside it, so the
   element box was the frame rather than the picture. */
.cs-gallery-viewport img {
  position: absolute; inset: auto; top: 0; left: 0; margin: 0;
  width: 100%; height: 100%; max-width: none; max-height: none;
  object-fit: contain;
}
</style>"""

HEAD_END = re.compile(r"</head>", re.IGNORECASE)


def main() -> None:
    src, dst = PAGES / "after", PAGES / "before"
    dst.mkdir(parents=True, exist_ok=True)
    made = 0
    for page in sorted(src.glob("*.html")):
        html = page.read_text()
        out, count = HEAD_END.subn(OVERRIDE + "</head>", html, count=1)
        if not count:
            print(f"  SKIP {page.stem} — no </head> to inject into")
            continue
        (dst / page.name).write_text(out)
        made += 1
    print(f"\n{made} pages written to pages/before — image corners pinned to their old values")


if __name__ == "__main__":
    main()

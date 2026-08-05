#!/usr/bin/env python3
"""Bundle use-cases.html into a single self-contained file for the marketer
REVIEW artifact, with the comment layer (review/cmtx.{css,js}) injected.

It inlines the stylesheets, embeds the brand font + SVGs as data URIs, strips
external links (blocked by the artifact CSP), and drops the html/head/body
wrappers (the Artifact runtime supplies its own).

Run from anywhere:  python3 review/build_review.py
Outputs (both gitignored, regenerated on demand):
  use-cases-review.html       — the fragment to publish as an Artifact
  use-cases-review-test.html  — same, wrapped in a doctype for local preview
                                (standards mode, matches the artifact)

After building, republish use-cases-review.html to the SAME artifact URL.
"""
import base64, re, pathlib

HERE = pathlib.Path(__file__).resolve().parent   # review/
ROOT = HERE.parent                               # repo root

def b64(rel):
    return base64.b64encode((ROOT / rel).read_bytes()).decode()

def svg_uri(name):
    return "data:image/svg+xml;base64," + b64("images/use-cases/" + name)

html   = (ROOT / "use-cases.html").read_text()
tokens = (ROOT / "design-system/tokens.css").read_text()
env    = (ROOT / "design-system/webflow-env.css").read_text()
cmtxcss = (HERE / "cmtx.css").read_text()
cmtxjs  = (HERE / "cmtx.js").read_text()

# Embed the brand font once (in env's @font-face); drop tokens' duplicate so the
# 856 KB font is not embedded twice (family name matches case-insensitively).
font_uri = "data:font/woff2;base64," + b64("fonts/TT_Commons_Pro_Variable.woff2")
env = env.replace('../fonts/TT_Commons_Pro_Variable.woff2', font_uri)
tokens = re.sub(r'@font-face\s*\{.*?\}\s*', '', tokens, flags=re.S)

# SVGs referenced by CSS masks and <img>
SVGS = ["seal.svg", "copy-icon-outline.svg", "copy-icon-black.svg",
        "birch-ai.svg", "birch-mcp.svg", "meta-mcp.svg"]
uri = {s: svg_uri(s) for s in SVGS}

def inline_svgs(text):
    for s in SVGS:
        text = text.replace("images/use-cases/" + s, uri[s])
    return text

# The page's own <style> (from <head>) and the <body> inner html
page_css = re.search(r"<style>(.*?)</style>", html, re.S).group(1)
body     = re.search(r"<body>(.*?)</body>", html, re.S).group(1)

page_css = inline_svgs(page_css)
body     = inline_svgs(body)

combined_css = "\n".join([
    "/* tokens.css */", tokens,
    "/* webflow-env.css (brand font embedded) */", env,
    "/* page styles */", page_css,
    "/* review comments layer */", cmtxcss,
])

fragment = (
    "<style>\n" + combined_css + "\n</style>\n"
    + body
    + "\n<script>\n" + cmtxjs + "\n</script>\n"
)

(ROOT / "use-cases-review.html").write_text(fragment)
(ROOT / "use-cases-review-test.html").write_text(
    '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width, initial-scale=1">'
    '<title>Use cases — review</title></head><body>\n' + fragment + '\n</body></html>'
)

print("built use-cases-review.html —", len(fragment), "bytes")
for bad in ["images/use-cases/", "fonts.googleapis", "../fonts/"]:
    n = fragment.count(bad)
    print(("  LEFTOVER " if n else "  ok       ") + bad, "x", n)

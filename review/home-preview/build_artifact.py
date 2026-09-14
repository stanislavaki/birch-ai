#!/usr/bin/env python3
"""Bundle home-preview.html (the home hero and the home slider in one scroll)
into a single self-contained fragment for a private claude.ai Artifact.

home-preview.html stitches home-hero.html and home-slides.html together at
runtime with fetch(), and the artifact CSP blocks fetch, external stylesheets
and external images. So this script performs the same stitch at build time, in
the same order, and embeds everything:

  CSS      tokens, webflow-env, button, chat-card, then the slides <style>, the
           hero <style>, and home-preview's #hp-style last (it overrides both)
  font     embedded once, in webflow-env's @font-face; the duplicate rule in
           tokens.css is dropped (family names match case-insensitively)
  images   every images/slides/** asset as a data URI
  hero     the three SVGs home-hero.html loads from the Webflow CDN, taken from
           local copies in review/home-preview/hero/ named by the CDN file
           name. A re-upload changes that name, so the build fails instead of
           quietly shipping the old shape.
  scripts  nav and slider scripts in place, debug/geo-panel.js inlined, the
           hero entrance script last. The hero's dev panel and its old nav
           injection are skipped, exactly as home-preview.html skips them.
  links    root-relative nav links point at https://bir.ch, because "/pricing"
           means nothing on the artifact host
  wrapper  no html/head/body (the Artifact runtime adds its own), plus one rule
           that undoes the runtime's 14px body font (see RESET_FIX)

Run from anywhere:  python3 review/home-preview/build_artifact.py
Outputs (gitignored):
  review/home-preview/home-preview-artifact.html  the fragment to publish
  review/home-preview/_local_check.html           the same inside a doctype,
      with a stand-in for the runtime's reset, for a local look over http://
"""
import base64
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent     # review/home-preview/
ROOT = HERE.parents[1]                             # repo root

STYLESHEETS = [
    "design-system/tokens.css",
    "design-system/webflow-env.css",
    "design-system/components/button.css",
    "design-system/components/chat-card.css",
]
FONT = "fonts/TT_Commons_Pro_Variable.woff2"
GEO_PANEL = "debug/geo-panel.js"
HERO_SCRIPT_SKIP = re.compile(r"hh-dev|webflow-env-nav")   # same filter as home-preview.html
MIME = {".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2"}

# The artifact runtime's reset gives <body> a 14px system font. The site never
# sets a body font-size (body inherits the fluid root from webflow-env.css), and
# em-based tokens such as --nav-height: 6.5em resolve against the element that
# uses them. Without this rule the sticky offset and the canvas height clamp
# would disagree with the slider script, which measures against the root.
RESET_FIX = "body { font-size: 1rem; line-height: normal; }"

# Stand-in for that reset in the local check, so the check sees what the
# runtime does rather than a clean document.
LOCAL_RESET = ("<style>:root{color-scheme:light}"
               "body{margin:0;font:14px/1.5 system-ui,sans-serif;background:#f7f7f5}"
               "img{max-width:100%}[hidden]{display:none!important}</style>")


def fail(msg):
    sys.exit("build_artifact: " + msg)


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def data_uri(path):
    return "data:%s;base64,%s" % (MIME[path.suffix], base64.b64encode(path.read_bytes()).decode())


def one(pattern, text, what):
    found = list(re.finditer(pattern, text, re.S))
    if len(found) != 1:
        fail("expected exactly one %s, found %d" % (what, len(found)))
    return found[0]


_uris = {}


def asset(m):
    rel = m.group(0)
    if rel not in _uris:
        _uris[rel] = data_uri(ROOT / rel)
    return _uris[rel]


ASSET = re.compile(r"images/slides/[\w-]+/[\w.-]+\.(?:webp|svg)")

slides = read("home-slides.html")
hero = read("home-hero.html")
preview = read("home-preview.html")

# -- home-slides.html -----------------------------------------------------
s_head = one(r"<head>(.*?)</head>", slides, "<head> in home-slides.html").group(1)
s_style = one(r"<style>(.*?)</style>", s_head, "<style> in the home-slides <head>").group(1)
body = one(r"<body>(.*)</body>", slides, "<body> in home-slides.html").group(1)
s_style = ASSET.sub(asset, s_style)
body = ASSET.sub(asset, body)
body, nav_links = re.subn(r'href="/(?!/)([^"]*)"', r'href="https://bir.ch/\1"', body)

# -- home-hero.html -------------------------------------------------------
h_head = one(r"<head>(.*?)</head>", hero, "<head> in home-hero.html").group(1)
h_style = one(r"<style>(.*?)</style>", h_head, "<style> in the home-hero <head>").group(1)
h_body = one(r"<body>(.*)</body>", hero, "<body> in home-hero.html").group(1)

# A stylesheet added to either page would otherwise go missing silently.
linked = re.findall(r'<link rel="stylesheet" href="([^"]+)"', s_head + h_head)
unknown = sorted(set(linked) - set(STYLESHEETS))
if unknown:
    fail("unknown stylesheet(s) %s, add them to STYLESHEETS" % unknown)

if re.search(r"<script\s[^>]*>", h_body):
    fail("home-hero.html has a <script> with attributes, decide whether it ships")
h_scripts = [m.group(1) for m in re.finditer(r"<script>(.*?)</script>", h_body, re.S)
             if not HERO_SCRIPT_SKIP.search(m.group(1))]

# -- the hero, dressed into home-preview's intro column -------------------
section = one(r'(<section class="hh">)(.*?)</section>', h_body, "section.hh")
h1 = one(r'<h1 class="hh__h1"[^>]*>.*?</h1>', section.group(2), "h1.hh__h1").group(0)
if section.group(2).replace(h1, "").strip():
    fail("section.hh holds more than the h1, but home-preview.html only moves the h1")

tpl = one(r'<template id="hp-intro-tpl">(.*?)</template>', preview, "#hp-intro-tpl").group(1)
SLOT = "<div data-h1-slot></div>"
if tpl.count(SLOT) != 1:
    fail("the intro template no longer has exactly one h1 slot")
hero_section = section.group(1) + "\n" + tpl.replace(SLOT, h1).strip() + "\n</section>"

CDN_SVG = re.compile(r'https://cdn\.prod\.website-files\.com/[^"\s]*/([^/"\s]+\.svg)')


def local_svg(m):
    path = HERE / "hero" / m.group(1)
    if not path.exists():
        fail("no local copy of %s, save it as %s" % (m.group(0), path.relative_to(ROOT)))
    return data_uri(path)


hero_section = CDN_SVG.sub(local_svg, hero_section)
hp_style = one(r'<style id="hp-style">(.*?)</style>', preview, "#hp-style").group(1)

# -- assemble the body in home-preview's order ----------------------------
TRACK = '<section class="section hs" id="hs">'
if body.count(TRACK) != 1:
    fail("the slider track was not found exactly once")
body = body.replace(TRACK, hero_section + "\n\n" + TRACK)

GEO_TAG = '<script src="%s"></script>' % GEO_PANEL
if body.count(GEO_TAG) != 1:
    fail("the geometry panel script tag was not found exactly once")
body = body.replace(GEO_TAG, "<script>\n" + read(GEO_PANEL) + "\n</script>")
body = body.strip() + "".join("\n<script>" + s + "</script>" for s in h_scripts) + "\n"

# -- stylesheets ----------------------------------------------------------
tokens = read(STYLESHEETS[0])
tokens, dropped = re.subn(r"@font-face\s*\{.*?\}\s*", "", tokens, flags=re.S)
env = read(STYLESHEETS[1])
if dropped != 1 or env.count("../" + FONT) != 1:
    fail("the @font-face layout in tokens.css / webflow-env.css changed")
env = env.replace("../" + FONT, data_uri(ROOT / FONT))

css = "\n".join([
    "/* design-system/tokens.css (its @font-face dropped, see webflow-env) */", tokens,
    "/* design-system/webflow-env.css (brand font embedded) */", env,
    "/* artifact runtime reset, undone */", RESET_FIX,
    "/* design-system/components/button.css */", read(STYLESHEETS[2]),
    "/* design-system/components/chat-card.css */", read(STYLESHEETS[3]),
    "/* home-slides.html */", s_style,
    "/* home-hero.html */", h_style,
    "/* home-preview.html #hp-style */", hp_style,
])

fragment = "<title>Bïrch Home Preview</title>\n<style>\n" + css + "\n</style>\n" + body

out = HERE / "home-preview-artifact.html"
out.write_text(fragment, encoding="utf-8")
(HERE / "_local_check.html").write_text(
    '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width, initial-scale=1">'
    + LOCAL_RESET + "</head><body>\n" + fragment + "</body></html>",
    encoding="utf-8")

print("built %s: %.2f MB, %d slide assets, %d hero script(s), %d nav links rewritten"
      % (out.relative_to(ROOT), len(fragment.encode()) / 1e6, len(_uris), len(h_scripts), nav_links))
leftovers = ["images/slides/", "../fonts/", "website-files.com", 'src="debug/',
             'href="design-system', 'href="/', "fetch("]
# Comments quote file paths (webflow-env.css shows its own <link> tag in its
# header), so the scan runs on the fragment with CSS/JS and HTML comments stripped.
scan = re.sub(r"/\*.*?\*/|<!--.*?-->", "", fragment, flags=re.S)
bad = [(s, scan.count(s)) for s in leftovers if scan.count(s)]
for s, n in bad:
    print("  LEFTOVER %s x %d" % (s, n))
if bad:
    sys.exit(1)
print("  no leftovers")

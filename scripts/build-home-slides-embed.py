#!/usr/bin/env python3
"""Build the Webflow-safe Home slides embeds from home-slides.html.

Webflow limits each Code Embed element to roughly 50 KB. The component is
therefore emitted as three neighboring snippets: styles, markup, and script.
Each part is self-contained and stays below the per-element limit.
"""

from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "home-slides.html"
OUT_HTML = ROOT / "embed/home-slides-embed.html"
OUT_CSS = ROOT / "embed/home-slides-embed.css"
OUT_JS = ROOT / "embed/home-slides-embed.js"
OUT_STYLE_EMBED = ROOT / "embed/home-slides-style-embed.html"
OUT_SCRIPT_EMBED = ROOT / "embed/home-slides-script-embed.html"
PUBLIC_BASE = "https://stanislavaki.github.io/birch-ai"
WEBFLOW_EMBED_LIMIT = 50_000

STATE_CLASSES = (
    "is-active",
    "is-blinking",
    "is-closed",
    "is-core",
    "is-done",
    "is-down",
    "is-dragging",
    "is-forced",
    "is-gone",
    "is-guides",
    "is-in",
    "is-intro",
    "is-lit",
    "is-live",
    "is-on",
    "is-stacked",
    "is-visible",
)

ID_MAP = {
    "card": "hse-card",
    "canvas": "hse-canvas",
    "coreBox": "hse-core-box",
    "hsAnswerA": "hse-answer-a",
    "hsAnswerB": "hse-answer-b",
    "hsBubble": "hse-bubble",
    "hsCursor": "hse-cursor",
    "hsPlaceholder": "hse-placeholder",
    "hsResponse": "hse-response",
    "hsSend": "hse-send",
    "hsTools": "hse-tools",
    "hsTyped": "hse-typed",
    "hsUsed": "hse-used",
    "hsUsedRow": "hse-used-row",
    "phA": "hse-phone-answer",
    "phGreet": "hse-phone-greeting",
    "phKb": "hse-phone-keyboard",
    "phKeys": "hse-phone-keys",
    "phMsg": "hse-phone-message",
    "phQ": "hse-phone-question",
    "phScroll": "hse-phone-scroll",
    "phTyped": "hse-phone-typed",
    "phTypedText": "hse-phone-typed-text",
}


def extract_between(text: str, start: str, end: str, offset: int = 0) -> str:
    start_index = text.index(start, offset) + len(start)
    end_index = text.index(end, start_index)
    return text[start_index:end_index]


def rename_local_symbols(text: str) -> str:
    replacements = (
        ("chat-card", "hse-chat-card"),
        ("cursorBlink", "hse-cursor-blink"),
        ("hs-no-anim", "hse-no-anim"),
        ("hsm__", "hse-hsm__"),
        ("hs__", "hse-hs__"),
        ("hs-blink", "hse-blink"),
        ("hs-ring", "hse-ring"),
        ("hs-caret", "hse-caret"),
        ("--ring-angle", "--hse-ring-angle"),
    )
    for old, new in replacements:
        text = text.replace(old, new)
    text = re.sub(r"--in\b", "--hse-in", text)
    for name in STATE_CLASSES:
        text = re.sub(rf"\b{re.escape(name)}\b", f"hse-{name}", text)
    return text


def strip_css_comments(text: str) -> str:
    return re.sub(r"/\*.*?\*/", "", text, flags=re.S)


def strip_html_comments(text: str) -> str:
    return re.sub(r"<!--.*?-->", "", text, flags=re.S)


def strip_standalone_javascript_comments(text: str) -> str:
    """Remove only block comments that begin a line.

    This deliberately leaves inline comments alone. Matching comments only at
    line starts avoids treating comment-like text inside strings or regexes as
    syntax while removing enough prose to fit Webflow's Code Embed limit.
    """
    return re.sub(r"^[ \t]*/\*.*?\*/[ \t]*\n", "", text, flags=re.M | re.S)


def ascii_html(text: str) -> str:
    return "".join(ch if ord(ch) < 128 else f"&#x{ord(ch):X};" for ch in text)


def ascii_javascript(text: str) -> str:
    out: list[str] = []
    for ch in text:
        code = ord(ch)
        if code < 128:
            out.append(ch)
        elif code <= 0xFFFF:
            out.append(f"\\u{code:04x}")
        else:
            code -= 0x10000
            out.append(f"\\u{0xD800 + (code >> 10):04x}\\u{0xDC00 + (code & 0x3FF):04x}")
    return "".join(out)


def ascii_css(text: str) -> str:
    return "".join(ch if ord(ch) < 128 else f"\\{ord(ch):X} " for ch in text)


def build_css(source: str) -> str:
    source_css = extract_between(source, "<style>", "</style>")
    source_css = source_css.replace(":root {", ".home-slides-e {", 1)
    source_css = re.sub(r"\.hs(?=[\s,{:#>])", ".hse-hs", source_css)
    source_css = re.sub(r"\.hsm(?=[\s,{:#>])", ".hse-hsm", source_css)
    source_css = rename_local_symbols(source_css)
    source_css = source_css.replace(".hse-hs__sticky > .container", ".hse-hs__sticky > .hse-container-e")
    source_css = source_css.replace(".container.hse-hsm", ".hse-container-e.hse-hsm")
    source_css = re.sub(r"\.btn\b", ".hse-btn", source_css)
    source_css = source_css.replace("var(--nav-height)", "var(--nav-height, 0px)")
    source_css = source_css.replace("url(images/", f"url({PUBLIC_BASE}/images/")
    source_css = re.sub(
        r"(\.hse-hs\s*\{[^{}]*?)padding-block:\s*var\([^;]+;",
        r"\1padding-block: 0;",
        source_css,
        flags=re.S,
    )
    source_css = strip_css_comments(source_css)

    button_css = (ROOT / "design-system/components/button.css").read_text()
    button_css = button_css.replace(".btn", ".hse-btn")
    button_css = strip_css_comments(button_css)

    chat_css = (ROOT / "design-system/components/chat-card.css").read_text()
    chat_css = rename_local_symbols(chat_css)
    chat_css = strip_css_comments(chat_css)

    prelude = """
/* Generated from home-slides.html. Do not edit this file directly. */
.home-slides-e {
  --font: "TT Commons Pro Variable", "Inter", Arial, sans-serif;
  --color-primary: #FFE243;
  --color-accent-green: #04DE00;
  --color-accent-pink: #FF21A6;
  --color-accent-blue: #1877F2;
  --color-accent-light-blue: #59DBFF;
  --color-accent-purple: #5B45CD;
  --color-text: #FFFFFF;
  --color-text-inverted: #000000;
  --color-text-grey: #909090;
  --text-h5-size: 1.2rem;
  --text-h5-lh: 1.2;
  --text-h5-ls: 0em;
  --text-body-size: 0.9rem;
  --text-body-lh: 1.2;
  --text-body-ls: 0em;
  --text-btn-size: 1.5rem;
  --text-btn-lh: 1;
  --text-btn-ls: -0.02em;
  --text-btn-xs-size: 0.9rem;
  --space-sm: 1rem;
  --space: 1.5rem;
  --space-md: 2rem;
  --space-lg: 3rem;
  --space-xl: 5rem;
  --gap-sm: 0.5rem;
  --gap-main: 1rem;
  --gap-md: 1.5rem;
  --pad-card: 1.5rem;
  --btn-h-xs: 2.5rem;
  --btn-h-s: 6.25rem;
  --radius-sm: 0.5rem;
  --radius-lg: 1rem;
  --radius-xl: 1.5rem;
  --radius-pill: 9999px;
  /* Webflow nests this embed inside a Container that repeats the gutter its
     own parent already applies, so the card ends up narrower than every
     other block on the page. The block script measures that inner container
     and writes the amount to cancel here; it stays 0 when the embed is not
     double-wrapped, so removing the inner Container in Designer needs no
     change on this side. */
  --hse-host-gutter: 0px;
  width: calc(100% + var(--hse-host-gutter) + var(--hse-host-gutter));
  margin-inline: calc(0px - var(--hse-host-gutter));
  position: relative;
  font-family: var(--font);
  font-weight: 600;
  -webkit-font-smoothing: antialiased;
  /* no background - comes from Webflow */
}
.home-slides-e,
.home-slides-e *,
.home-slides-e *::before,
.home-slides-e *::after { box-sizing: border-box; }
.home-slides-e img,
.home-slides-e svg { display: block; max-width: 100%; }
.home-slides-e a:not(.hse-btn) { color: inherit; text-decoration: none; }
.home-slides-e button { font: inherit; cursor: pointer; border: 0; background: none; padding: 0; }
.home-slides-e .hse-container-e {
  /* No cap of its own. The host page decides how wide a block is, and this
     one has to follow its neighbours: a fixed 1280px left the card 99px
     narrower per side than the blocks above and below it on a 1900px window,
     and — because the type inside scales with the site's fluid root while the
     card did not — pushed the second button out past the card's edge. The
     scene is authored in design units against the card's own width (--u-w),
     so a wider card scales the whole composition instead of breaking it. */
  width: 100%;
  margin-inline: auto;
  padding-inline: 0;
  font-size: 16px;
}
.home-slides-e .hse-t-h5 {
  font-family: var(--font);
  font-size: var(--text-h5-size);
  line-height: var(--text-h5-lh);
  letter-spacing: var(--text-h5-ls);
  font-weight: 600;
}
.home-slides-e .hse-t-body {
  font-family: var(--font);
  font-size: var(--text-body-size);
  line-height: var(--text-body-lh);
  letter-spacing: var(--text-body-ls);
  font-weight: 600;
}
"""
    css = prelude + "\n" + button_css + "\n" + chat_css + "\n" + source_css
    css = re.sub(r"[ \t]+\n", "\n", css)
    css = re.sub(r"\n{3,}", "\n\n", css)
    return ascii_css(css).strip() + "\n"


def build_html(source: str) -> str:
    start = source.index('<section class="section hs" id="hs">')
    script_start = source.index("\n<script>", start)
    html = source[start:script_start]
    html = html.replace(
        '<section class="section hs" id="hs">',
        '<div class="home-slides-e hse-hs" data-hse-root>',
        1,
    )
    close = html.rfind("</section>")
    html = html[:close] + "</div>" + html[close + len("</section>") :]
    html = rename_local_symbols(html)
    html = html.replace('class="container hsm"', 'class="container hse-hsm"')
    html = re.sub(r"\bcontainer\b", "hse-container-e", html)
    html = re.sub(r"\bbtn\b", "hse-btn", html)
    html = re.sub(r"\bt-h5\b", "hse-t-h5", html)
    html = re.sub(r"\bt-body\b", "hse-t-body", html)
    for old, new in ID_MAP.items():
        html = html.replace(f'id="{old}"', f'id="{new}"')
    html = html.replace('href="#">Explore integrations', 'href="/integrations">Explore integrations')
    html = html.replace('href="#">More about Rules', 'href="/manage">More about Rules')
    html = html.replace('href="#">See how it thinks', 'href="/ai">See how it thinks')
    html = html.replace('href="#">More about Birch AI', 'href="/ai">More about Birch AI')
    html = html.replace('href="#">Explore MCP', 'href="/mcp">Explore MCP')
    html = html.replace('href="#">More about MCP', 'href="/mcp">More about MCP')
    html = re.sub(r'(?<=src=")images/', f"{PUBLIC_BASE}/images/", html)
    html = html.replace("url(images/", f"url({PUBLIC_BASE}/images/")
    html = strip_html_comments(html)
    html = re.sub(r"\n\s*\n", "\n", html).strip()

    header = """<!--
  BIRCH HOME SLIDES - PART 2 OF 3: MARKUP
  Placement: Home page, immediately after the Trusted by block.
  Keep this between the adjacent Styles and Script Code Embeds.
  Webflow owns the outer Section and Container. Keep ancestor overflow visible.
-->
"""
    return ascii_html(header + html + "\n")


def build_js(source: str) -> str:
    section_start = source.index('<section class="section hs" id="hs">')
    script_open = source.index("<script>", section_start)
    script = extract_between(source, "<script>", "</script>", script_open)
    script = rename_local_symbols(script)
    for old, new in ID_MAP.items():
        script = script.replace(f"'{old}'", f"'{new}'")

    script = script.replace(
        "  var track  = document.getElementById('hs');\n"
        "  var sticky = track.querySelector('.hse-hs__sticky');\n"
        "  var card   = document.getElementById('hse-card');\n"
        "  var canvas = document.getElementById('hse-canvas');\n"
        "  var bars   = [].slice.call(track.querySelectorAll('.hse-hs__bar'));\n"
        "  var root   = document.documentElement;",
        "  var track  = embedRoot;\n"
        "  var sticky = track.querySelector('.hse-hs__sticky');\n"
        "  var card   = track.querySelector('#hse-card');\n"
        "  var canvas = track.querySelector('#hse-canvas');\n"
        "  var bars   = [].slice.call(track.querySelectorAll('.hse-hs__bar'));\n"
        "  var root   = document.documentElement;\n"
        "  if (!sticky || !card || !canvas) return;",
    )
    script = script.replace("document.querySelectorAll('[data-hsm-drag]')", "track.querySelectorAll('[data-hsm-drag]')")
    script = script.replace("document.querySelector('[data-hsm-chat]')", "track.querySelector('[data-hsm-chat]')")
    script = script.replace("document.querySelector('[data-hsm-phone]')", "track.querySelector('[data-hsm-phone]')")
    script = re.sub(
        r"document\.getElementById\('([^']+)'\)",
        lambda match: f"track.querySelector('#{match.group(1)}')",
        script,
    )

    script = script.replace(
        "  new ResizeObserver(lockBarHeight).observe(document.body);",
        "  new ResizeObserver(lockBarHeight).observe(track);",
    )
    script = re.sub(r"\n\s*window\.__hs\s*=\s*\{[^;]+;", "", script)
    script = re.sub(r"\n\s*window\.__hsIntroReplay\s*=\s*function \(\) \{[^\n]+", "", script)
    script = re.sub(r"\n\s*window\.__hsApply\s*=\s*apply;", "", script)
    script = script.replace("  addEventListener('scroll',", "  window.addEventListener('scroll',")
    script = script.replace("  addEventListener('resize',", "  window.addEventListener('resize',")

    marker = "(function () {\n  'use strict';"
    script = script.replace(
        marker,
        marker
        + "\n\n  document.querySelectorAll('.home-slides-e:not([data-hse-ready])').forEach(function (embedRoot) {\n"
        + "    embedRoot.setAttribute('data-hse-ready', '');",
        1,
    )
    end = script.rfind("})();")
    script = script[:end] + "  });\n" + script[end:]
    return ascii_javascript(script).strip() + "\n"


def main() -> None:
    source = SOURCE.read_text()
    css = build_css(source)
    javascript = build_js(source)
    markup_embed = build_html(source)
    style_embed = (
        "<!-- BIRCH HOME SLIDES - PART 1 OF 3: STYLES -->\n"
        "<style>\n" + css + "</style>\n"
    )
    script_embed = (
        "<!-- BIRCH HOME SLIDES - PART 3 OF 3: SCRIPT -->\n"
        "<script>\n"
        + strip_standalone_javascript_comments(javascript)
        + "</script>\n"
    )

    snippets = {
        OUT_STYLE_EMBED: style_embed,
        OUT_HTML: markup_embed,
        OUT_SCRIPT_EMBED: script_embed,
    }
    for path, snippet in snippets.items():
        size = len(snippet.encode())
        if size >= WEBFLOW_EMBED_LIMIT:
            raise ValueError(f"{path.name} is {size} bytes; Webflow limit is {WEBFLOW_EMBED_LIMIT}")
        path.write_text(snippet)

    OUT_CSS.write_text(css)
    OUT_JS.write_text(javascript)
    for path in (*snippets, OUT_CSS, OUT_JS):
        print(f"Wrote {path.relative_to(ROOT)} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()

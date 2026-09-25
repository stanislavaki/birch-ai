"""docx -> Webflow rich-text HTML for the Birch legal documents.

Deliberately narrow: it handles exactly what these four files contain and
raises on anything it does not recognise, rather than silently dropping it.
Legal text must not lose a clause to a converter being lenient.
"""
import zipfile, re, html
import xml.etree.ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"

# A segment that looks like a numbered section title. Short on purpose: body
# paragraphs also start with "(b)" or "12 months", and only a short segment
# beginning "<number>. <Word>" is a heading that lost its style.
HEADING_RE = re.compile(r"^\d+\.\s+\S")
HEADING_MAX = 90

# A bare address in the text is still an address. The lawyers mark only some of
# them as links in Word — in the 23.09 set, 8 out of roughly a dozen — and the
# ones they miss are the cross-references between these very documents, so a
# reader of the Terms cannot click through to the Privacy Policy. Linking them
# here changes no character of the text: the address stays exactly as written
# and merely becomes clickable, which is presentation, not content.
URL_RE = re.compile(r"(?<![\w@/])(https?://[^\s<>\"]+)")
ANCHOR_RE = re.compile(r"<a\b[^>]*>.*?</a>", re.S)

def linkify(fragment):
    """Wrap bare URLs in anchors, leaving text already inside an anchor alone."""
    out, last = [], 0
    for m in ANCHOR_RE.finditer(fragment):
        out.append(_linkify_plain(fragment[last:m.start()]))
        out.append(m.group(0))
        last = m.end()
    out.append(_linkify_plain(fragment[last:]))
    return "".join(out)

def _linkify_plain(text):
    def repl(m):
        url = m.group(1)
        # A sentence ends after the address far more often than an address ends
        # in punctuation, so trailing marks are given back to the sentence.
        trail = ""
        while url and url[-1] in ".,;:!?)]»”\u0022'":
            trail = url[-1] + trail
            url = url[:-1]
        if not url:
            return m.group(0)
        return f'<a href="{url}">{url}</a>{trail}'
    return URL_RE.sub(repl, text)


STRONG_RE = re.compile(r"</?strong>")

def unbold(fragment):
    """Strip <strong> from a heading's own text.

    Word has no notion of "heading" beyond a style, so a heading there is a bold
    run, and that bold arrives here as <strong> wrapping the whole title. On the
    page the heading already carries its weight from the design, so the tag adds
    a second helping — the titles came out at 700 against the body's 500, heavier
    than anything else on a legal page.

    Only real headings are cleaned. Inside the body <strong> is the lawyers' own
    emphasis and stays, and so does <em>: the italic subsection labels in the
    Privacy Policy are theirs, not an artefact of the heading style.
    """
    return STRONG_RE.sub("", fragment)


def rels(z):
    try:
        root = ET.fromstring(z.read("word/_rels/document.xml.rels"))
    except KeyError:
        return {}
    return {rel.get("Id"): rel.get("Target") for rel in root}

def segments(node, rel):
    """Inline HTML split at every <w:br/>.

    Word uses a line break for two different jobs in these files: separating
    blocks that were never made into real paragraphs (a section title glued to
    the end of the paragraph above it), and breaking a line inside one block
    (an address, or a bold label above its definition). Dropping them — which
    the first version of this converter did — runs the two together.
    """
    segs, cur = [], []
    for child in node:
        if child.tag == W + "hyperlink":
            sub = segments(child, rel)
            if child.get(W + "anchor"):
                raise SystemExit("внутренний якорь: rich text их не переживёт")
            href = rel.get(child.get(R + "id"), "")
            inner = "<br>".join(sub)
            cur.append(f'<a href="{html.escape(href)}">{inner}</a>' if href else inner)
        elif child.tag == W + "r":
            # A section title left inside a paragraph instead of being made one.
            # In these files it is always a bold run of the form "N. Title", set
            # at roughly twice the body size; the 23.09 Terms carries exactly one
            # ("4. Disclaimer and limitation of liability" glued to the end of the
            # paragraph above it). Split before such a run so the title can become
            # a heading of its own.
            rt = "".join(t.text or "" for t in child.iter(W + "t")).strip()
            rpr = child.find(W + "rPr")
            bold = rpr is not None and rpr.find(W + "b") is not None
            if bold and len(rt) <= HEADING_MAX and HEADING_RE.match(rt) and (cur or segs):
                segs.append("".join(cur)); cur = []

            for node2 in child:
                if node2.tag == W + "br":
                    segs.append("".join(cur)); cur = []
                elif node2.tag == W + "t":
                    s = html.escape(node2.text or "")
                    if not s:
                        continue
                    pr = child.find(W + "rPr")
                    if pr is not None and pr.find(W + "b") is not None:
                        s = f"<strong>{s}</strong>"
                    if pr is not None and pr.find(W + "i") is not None:
                        s = f"<em>{s}</em>"
                    cur.append(s)
    segs.append("".join(cur))
    return [linkify(x) for x in segs]

def plain(h):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", h))).strip()

def footnotes(z):
    """Real Word footnotes, which live outside word/document.xml entirely.

    Lost silently on the 23.09.2026 DPA import: the converter read only
    document.xml, so a footnote the lawyers had attached to the payment-data
    paragraph never reached the site, and the line-by-line check missed it
    because it compared against document.xml too — the same blind spot that
    swallowed the <w:br/> line breaks. Separators and continuation notices carry
    no text and are skipped; anything with text is a real note.

    Returns [(id, text)] so the caller can refuse to import silently.
    """
    if "word/footnotes.xml" not in z.namelist():
        return []
    root = ET.fromstring(z.read("word/footnotes.xml"))
    found = []
    for fn in root.iter(W + "footnote"):
        text = " ".join(t.text or "" for t in fn.iter(W + "t")).strip()
        if text:
            found.append((fn.get(W + "id"), re.sub(r"\s+", " ", text)))
    return found


def convert(path, heading_map, demote_over=None):
    z = zipfile.ZipFile(path)
    rel = rels(z)
    body = ET.fromstring(z.read("word/document.xml")).find(W + "body")

    # Stop rather than drop: a footnote has to be placed by hand (marker at the
    # anchor, note at the end of the body), and silence is how one went missing.
    notes = footnotes(z)
    if notes:
        raise SystemExit(
            "В документе есть сноски Word — их надо разместить вручную, "
            "конвертер их не переносит:\n" +
            "\n".join(f"  #{i}: {t}" for i, t in notes))

    out, in_list, dropped, promoted = [], False, [], []

    def close_list():
        nonlocal in_list
        if in_list:
            out.append("</ul>"); in_list = False

    for el in body:
        if el.tag == W + "tbl":
            close_list(); out.append(table_html(el)); continue
        if el.tag != W + "p":
            continue

        pr = el.find(W + "pPr")
        style, listed = "", False
        if pr is not None:
            st = pr.find(W + "pStyle")
            if st is not None: style = st.get(W + "val") or ""
            listed = pr.find(W + "numPr") is not None

        segs = [s for s in segments(el, rel) if plain(s)]
        if not segs:
            continue

        whole = plain("".join(segs))
        if style == "Heading1":
            dropped.append(whole); continue
        # The page prints the effective date in its own header, so a line that is
        # nothing but that date is chrome and gets dropped. From 23.09.2026 Terms
        # and the DPA continue the same paragraph with the amendment rule ("For
        # accounts open on that date, the changes take effect 30 days after the
        # notice given under Section 13..."), which is substantive text and stays.
        # Cutting only the first sentence is worse than keeping it: the next one
        # opens with "on that date" and would refer to nothing.
        # The opening "Effective date ..." line.
        #
        # When it is nothing but the date (Privacy, Cookie) it is chrome: the page
        # header already prints that date from the CMS field, so it is dropped.
        #
        # When it continues into the applicability rule (Terms, DPA: "For accounts
        # open on that date, the changes take effect 30 days after the notice given
        # under Section 13...") it is the lawyers' own text and stays in the body —
        # tagged h6, which is the one block type a content editor can pick in the
        # CMS rich text toolbar and which these documents never use as a real
        # heading. `.rt-legal h6` renders it as the grey applicability note, and the
        # template footer swaps the tag for a paragraph so the published document
        # outline carries no sentence-long level-six heading.
        if re.match(r"^effective(\s+date)?\s*:", whole, re.I):
            if len(whole) <= 60:
                dropped.append(whole); continue
            close_list()
            out.append(f"<h6>{'<br>'.join(segs)}</h6>")
            continue

        tag = heading_map.get(style)
        if tag and demote_over and len(whole) > demote_over:
            tag = None                                   # абзац, ошибочно размеченный заголовком

        # Разбиваем блок только там, где сегмент сам выглядит заголовком;
        # иначе переносы остаются переносами внутри одного блока.
        idx = next((i for i, s in enumerate(segs)
                    if len(plain(s)) <= HEADING_MAX and HEADING_RE.match(plain(s))), None)

        if idx is not None and not listed:
            before, head, after = segs[:idx], segs[idx], segs[idx+1:]
            close_list()
            if before:
                out.append(f"<p>{'<br>'.join(before)}</p>")
            out.append(f"<h2>{unbold(head)}</h2>")
            promoted.append(plain(head))
            if after:
                out.append(f"<p>{'<br>'.join(after)}</p>")
            continue

        joined = "<br>".join(segs)
        if listed and not tag:
            if not in_list: out.append("<ul>"); in_list = True
            out.append(f"<li>{joined}</li>")
            continue
        close_list()
        if tag and tag.startswith("h") and tag != "h6":
            joined = unbold(joined)
        out.append(f"<{tag}>{joined}</{tag}>" if tag else f"<p>{joined}</p>")

    close_list()
    return "".join(out), dropped, promoted

def table_html(tbl):
    grid = [int(g.get(W + "w")) for g in tbl.iter(W + "gridCol")]
    rows = list(tbl.findall(W + "tr"))
    ncols = max(len(r.findall(W + "tc")) for r in rows)
    if len(grid) > ncols:                    # Word sometimes repeats the grid
        grid = grid[:ncols]
    total = sum(grid) or 1
    cols = "".join(f'<col style="width:{g/total*100:.4g}%">' for g in grid)

    def cells(tr, tag):
        out = []
        for tc in tr.findall(W + "tc"):
            paras = ["<br>".join(s for s in segments(p, {}) if plain(s))
                     for p in tc.findall(W + "p")]
            out.append(f"<{tag}>{'<br>'.join(p for p in paras if plain(p))}</{tag}>")
        return "".join(out)

    head = f"<thead><tr>{cells(rows[0], 'th')}</tr></thead>"
    tbody = "".join(f"<tr>{cells(r, 'td')}</tr>" for r in rows[1:])
    return (f"<div data-rt-embed-type='true'><div class=\"rt-table\">"
            f"<table><colgroup>{cols}</colgroup>{head}<tbody>{tbody}</tbody></table></div></div>")

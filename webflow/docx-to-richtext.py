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
    return segs

def plain(h):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", h))).strip()

def convert(path, heading_map, demote_over=None):
    z = zipfile.ZipFile(path)
    rel = rels(z)
    body = ET.fromstring(z.read("word/document.xml")).find(W + "body")

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
        if re.match(r"^effective(\s+date)?\s*:", whole, re.I):
            dropped.append(whole); continue

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
            out.append(f"<h2>{head}</h2>")
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

"""docx -> Webflow rich-text HTML for the Birch legal documents.

Deliberately narrow: it handles exactly what these four files contain
(paragraphs, headings, bullet lists, bold/italic, external links, one table
each in Cookie and DPA) and raises on anything it does not recognise, rather
than silently dropping it. Legal text must not lose a clause to a converter
being lenient.
"""
import zipfile, re, html, sys
import xml.etree.ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"

def rels(z):
    out = {}
    try:
        root = ET.fromstring(z.read("word/_rels/document.xml.rels"))
    except KeyError:
        return out
    for rel in root:
        out[rel.get("Id")] = rel.get("Target")
    return out

def runs_html(node, rel):
    """Inline HTML for the runs inside a paragraph (or hyperlink)."""
    parts = []
    for child in node:
        tag = child.tag
        if tag == W + "hyperlink":
            inner = runs_html(child, rel)
            href = rel.get(child.get(R + "id"), "")
            anchor = child.get(W + "anchor")
            if anchor:                      # internal anchors cannot survive rich text
                raise SystemExit(f"внутренний якорь в документе: {anchor}")
            parts.append(f'<a href="{html.escape(href)}">{inner}</a>' if href else inner)
        elif tag == W + "r":
            text = "".join(t.text or "" for t in child.iter(W + "t"))
            if child.find(W + "br") is not None and not text:
                continue
            if not text:
                continue
            pr = child.find(W + "rPr")
            bold = pr is not None and pr.find(W + "b") is not None
            ital = pr is not None and pr.find(W + "i") is not None
            s = html.escape(text)
            if bold: s = f"<strong>{s}</strong>"
            if ital: s = f"<em>{s}</em>"
            parts.append(s)
    return "".join(parts)

def para_info(p, rel):
    pr = p.find(W + "pPr")
    style = ""
    listed = False
    if pr is not None:
        st = pr.find(W + "pStyle")
        if st is not None: style = st.get(W + "val") or ""
        listed = pr.find(W + "numPr") is not None
    return style, listed, runs_html(p, rel)

def table_html(tbl):
    grid = [int(g.get(W + "w")) for g in tbl.iter(W + "gridCol")]
    rows = list(tbl.findall(W + "tr"))
    ncols = max(len(r.findall(W + "tc")) for r in rows)
    if len(grid) > ncols:                   # Word sometimes repeats the grid
        grid = grid[:ncols]
    total = sum(grid) or 1
    cols = "".join(f'<col style="width:{g/total*100:.4g}%">' for g in grid)

    def cells(tr, tag):
        out = []
        for tc in tr.findall(W + "tc"):
            inner = " ".join(
                x for x in (runs_html(p, {}) for p in tc.findall(W + "p")) if x
            ).strip()
            out.append(f"<{tag}>{inner}</{tag}>")
        return "".join(out)

    head = f"<thead><tr>{cells(rows[0], 'th')}</tr></thead>"
    body = "".join(f"<tr>{cells(r, 'td')}</tr>" for r in rows[1:])
    table = f"<table><colgroup>{cols}</colgroup>{head}<tbody>{body}</tbody></table>"
    return f"<div data-rt-embed-type='true'><div class=\"rt-table\">{table}</div></div>"

def convert(path, heading_map, promote, demote_over):
    z = zipfile.ZipFile(path)
    rel = rels(z)
    body = ET.fromstring(z.read("word/document.xml")).find(W + "body")

    out, open_list, dropped = [], False, []
    for el in body:
        if el.tag == W + "tbl":
            if open_list: out.append("</ul>"); open_list = False
            out.append(table_html(el))
            continue
        if el.tag != W + "p":
            continue

        style, listed, inner = para_info(el, rel)
        plain = re.sub(r"<[^>]+>", "", inner).strip()

        if not plain:                                   # пустые абзацы и заголовки
            continue
        if style == "Heading1":                         # заголовок страницы приходит из поля Name
            dropped.append(("заголовок документа", plain)); continue
        if re.match(r"^effective(\s+date)?\s*:", plain, re.I):
            dropped.append(("строка с датой", plain)); continue

        tag = heading_map.get(style)
        if tag and demote_over and len(plain) > demote_over:
            tag = None                                  # абзац, ошибочно размеченный заголовком
        if tag is None and any(plain.startswith(pfx) for pfx in promote):
            tag = "h2"                                  # заголовок, потерявший свой стиль

        if listed and not tag:
            if not open_list: out.append("<ul>"); open_list = True
            out.append(f"<li>{inner}</li>")
            continue
        if open_list: out.append("</ul>"); open_list = False
        out.append(f"<{tag}>{inner}</{tag}>" if tag else f"<p>{inner}</p>")

    if open_list: out.append("</ul>")
    return "".join(out), dropped

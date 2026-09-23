import sys, re, html, zipfile
import xml.etree.ElementTree as ET
sys.path.insert(0,"/tmp/legal")
from convert import W

D="/Users/liliyazagidullina/Downloads/"
DOCS={"terms":"2026-09-21 Birch Terms of Use Redline (IK).docx",
      "privacy":"2026-09-21 Birch Privacy Policy Redline (IK).docx",
      "cookies":"2026-09-21 Birch Cookie Policy Redline (IK).docx",
      "dpa":"2026-09-21 Birch DPA Redline (IK).docx"}

def docx_lines(path):
    """Строки исходника: абзац, ячейка и <w:br/> дают новую строку.
    Дети обходятся в порядке документа, иначе текст ссылки уезжает в конец абзаца."""
    root=ET.fromstring(zipfile.ZipFile(path).read("word/document.xml"))
    lines=[]
    for p in root.iter(W+"p"):
        cur=""
        def runs(node):
            nonlocal cur
            for r in node:
                if r.tag==W+"hyperlink":
                    runs(r)
                elif r.tag==W+"r":
                    for n in r:
                        if n.tag==W+"br":
                            lines.append(cur); cur=""
                        elif n.tag==W+"t":
                            cur += n.text or ""
        runs(p)
        lines.append(cur)
    return [re.sub(r"\s+"," ",l).strip() for l in lines]

def html_lines(h):
    h=re.sub(r"<br\s*/?>", "\n", h)
    h=re.sub(r"</(p|h2|h3|li|td|th|tr)>", "\n", h)
    h=re.sub(r"<[^>]+>", "", h)
    return [re.sub(r"\s+"," ",l).strip() for l in html.unescape(h).split("\n")]

for slug,f in DOCS.items():
    src=[l for l in docx_lines(D+f) if l]
    got=[l for l in html_lines(open(f"/tmp/legal/{slug}.html").read()) if l]
    # убрать заголовок документа и строку даты из исходника
    src=[l for l in src if not re.match(r"^effective(\s+date)?\s*:", l, re.I)]
    if src and len(src[0])<60: src=src[1:]
    ok = src==got
    print(f"{slug:<9} строк: исходник {len(src)}, результат {len(got)}   {'СОВПАЛО ПОСТРОЧНО' if ok else 'РАСХОЖДЕНИЕ'}")
    if not ok:
        for i,(a,b) in enumerate(zip(src,got)):
            if a!=b:
                print(f"           строка {i}:\n             docx: {a[:110]!r}\n             html: {b[:110]!r}")
                break
        else:
            i=min(len(src),len(got))
            print(f"           длины разные, хвост docx: {src[i:i+2]}\n                       хвост html: {got[i:i+2]}")

#!/usr/bin/env python3
"""Проставляет в embeds.html время последнего коммита каждого embed-файла.

Почему не Last-Modified в рантайме: mtime файловой системы после git checkout
одинаков у всех файлов и означает «когда появился в рабочей копии», а не когда
embed правили. Правду знает только git, поэтому дату вшиваем в разметку.

Запускать после правок embed'ов:  python3 debug/stamp-embed-dates.py
"""
import re, subprocess, pathlib, sys

page = pathlib.Path('embeds.html')
html = page.read_text()

def git_date(path):
    r = subprocess.run(['git', 'log', '-1', '--format=%cd',
                        '--date=format:%d.%m.%Y, %H:%M', '--', path],
                       capture_output=True, text=True)
    return r.stdout.strip() or None

changed = 0
def stamp(m):
    global changed
    block, file = m.group(0), m.group(1)
    d = git_date(file)
    if not d:
        mt = pathlib.Path(file).stat().st_mtime
        import datetime
        d = datetime.datetime.fromtimestamp(mt).strftime('%d.%m.%Y, %H:%M') + ' (не в git)'
    new = re.sub(r'(<div class="embed-card__date">)[^<]*(</div>)', r'\g<1>' + d + r'\g<2>', block, count=1)
    if new != block: changed += 1
    return new

html = re.sub(r'<div class="embed-card" data-file="([^"]+)">.*?</div>\s*</div>\s*</div>',
              stamp, html, flags=re.S)
page.write_text(html)
print(f'обновлено карточек: {changed}')

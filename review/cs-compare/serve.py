#!/usr/bin/env python3
"""Static server for the comparison tool that also persists review notes to disk.

`python3 -m http.server` answers GET only, so notes typed in the tool would live
in the browser and nowhere else. This serves the repo exactly the same way and
adds a single endpoint — POST /review/cs-compare/notes.json — so the notes end up
in a file that can be read outside the browser.

Usage:
    python3 review/cs-compare/serve.py           # port 8642
    python3 review/cs-compare/serve.py 8791
"""

import json
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
NOTES = HERE / "notes.json"
ENDPOINT = "/review/cs-compare/notes.json"


class Handler(SimpleHTTPRequestHandler):
    def do_POST(self):  # noqa: N802 - name required by BaseHTTPRequestHandler
        if self.path.split("?")[0] != ENDPOINT:
            self.send_error(404, "no such endpoint")
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(length).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            self.send_error(400, "invalid json")
            return
        NOTES.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        self.send_response(204)
        self.end_headers()

    def end_headers(self):
        # Snapshot filenames do not change when fetch.py re-downloads them.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        if self.command == "POST":
            super().log_message(fmt, *args)


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8642
    handler = partial(Handler, directory=str(ROOT))
    try:
        server = ThreadingHTTPServer(("127.0.0.1", port), handler)
    except OSError as error:
        print(f"Port {port} is busy ({error}). Free it, or pass another port:")
        print(f"    python3 {Path(__file__).relative_to(ROOT)} 8791")
        raise SystemExit(1)
    print(f"Serving {ROOT} on http://localhost:{port}")
    print(f"Tool:  http://localhost:{port}/review/cs-compare/")
    print(f"Notes: {NOTES}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")


if __name__ == "__main__":
    main()

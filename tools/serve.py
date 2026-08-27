"""Static dev server with caching disabled.

Chrome caches nested-iframe documents aggressively, so plain
`python3 -m http.server` kept serving stale dev pages after edits.
Usage: python3 tools/serve.py <port>
"""
import http.server, sys

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8657
http.server.ThreadingHTTPServer(('', port), NoCacheHandler).serve_forever()

"""Minimal test server for hosted source integration testing.

Serves sample definition files with CORS headers so the webapp can fetch them.

Routes:
  GET /bundled/definition.yaml          - Full definitions file (bundled mode)
  GET /split/keys.json                  - Key list as JSON (split mode, json format)
  GET /split/keys.yaml                  - Key list as YAML (split mode, yaml format)
  GET /split/<key>.yaml                 - Individual definition (split mode)
  GET /split/presets.yaml               - Shared presets (split mode, optional)
  GET /fixtures/<name>.yaml             - Self-contained fixture files for feature testing
"""

import http.server
import os

SERVE_DIR = os.path.dirname(os.path.abspath(__file__))


class CORSHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=SERVE_DIR, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 9100))
    server = http.server.HTTPServer(("0.0.0.0", port), CORSHandler)
    print(f"Test server listening on :{port}")
    print(f"  Bundled:    http://localhost:{port}/bundled/definition.yaml")
    print(f"  Split list: http://localhost:{port}/split/keys.json (or keys.yaml)")
    print(f"  Split def:  http://localhost:{port}/split/<key>.yaml")
    print(f"  Fixtures:   http://localhost:{port}/fixtures/<name>.yaml")
    server.serve_forever()

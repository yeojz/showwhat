"""Minimal test server for URL source integration testing.

Serves sample definition files with CORS headers so the webapp can fetch them.

Routes:
  GET /single/definition.yaml   - Full definitions file (single mode)
  GET /keyed/keys.json           - Key list as JSON (keyed mode, json format)
  GET /keyed/keys.yaml           - Key list as YAML (keyed mode, yaml format)
  GET /keyed/<key>.yaml          - Individual definition (keyed mode)
  GET /keyed/presets.yaml        - Shared presets (keyed mode, optional)
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
    print(f"  Single: http://localhost:{port}/single/definition.yaml")
    print(f"  Keyed list: http://localhost:{port}/keyed/keys.json (or keys.yaml)")
    print(f"  Keyed def:  http://localhost:{port}/keyed/<key>.yaml")
    server.serve_forever()

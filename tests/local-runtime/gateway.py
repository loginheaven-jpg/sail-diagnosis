"""Local-only transparent Supabase Auth/REST gateway; no production targets."""
import http.client
import ipaddress
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
from urllib.parse import urlsplit

PORT = 54321
CONFIG = json.loads(Path('/tmp/phase1-closeout-private/targets.json').read_text())
if set(CONFIG) != {'auth', 'rest', 'mail'} or any(
    ipaddress.ip_address(host) not in ipaddress.ip_network('172.16.0.0/12')
    for host in CONFIG.values()
):
    raise RuntimeError('Local gateway refuses non-internal Docker addresses')
TARGETS = {'/auth/v1': (CONFIG['auth'], 9999), '/rest/v1': (CONFIG['rest'], 3000)}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass  # Never log token-bearing URLs/headers/bodies.

    def cors(self):
        origin = self.headers.get('Origin', '')
        parsed = urlsplit(origin)
        if parsed.hostname in ('127.0.0.1', 'localhost'):
            self.send_header('Access-Control-Allow-Origin', origin)
        self.send_header('Access-Control-Allow-Credentials', 'true')
        self.send_header('Access-Control-Allow-Headers', 'apikey,authorization,content-type,x-client-info,prefer,range,accept-profile,content-profile,x-supabase-api-version,x-supabase-client-platform,x-supabase-client-platform-version,x-supabase-client-runtime,x-supabase-client-runtime-version')
        self.send_header('Access-Control-Expose-Headers', 'content-range,range,preference-applied,x-total-count')
        self.send_header('Access-Control-Allow-Methods', 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS')

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.end_headers()

    def proxy(self):
        if self.path == '/health':
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'local-isolated-supabase-gateway')
            return
        targets = {'': (CONFIG['mail'], 8025)} if self.server.server_port == 54325 else TARGETS
        for prefix, (host, port) in targets.items():
            if self.path == prefix or self.path.startswith(prefix + '/'):
                path = self.path[len(prefix):] or '/'
                headers = {k: v for k, v in self.headers.items() if k.lower() not in ('host', 'connection', 'content-length')}
                headers['Host'] = '127.0.0.1:54321'
                headers['X-Forwarded-Proto'] = 'http'
                body = self.rfile.read(int(self.headers.get('Content-Length', '0')))
                conn = http.client.HTTPConnection(host, port, timeout=30)
                try:
                    conn.request(self.command, path, body, headers)
                    response = conn.getresponse()
                    payload = response.read()
                    self.send_response(response.status)
                    for key, value in response.getheaders():
                        if key.lower() not in ('connection', 'transfer-encoding', 'content-length', 'access-control-allow-origin', 'access-control-allow-credentials'):
                            self.send_header(key, value)
                    self.cors()
                    self.send_header('Content-Length', str(len(payload)))
                    self.end_headers()
                    if self.command != 'HEAD':
                        self.wfile.write(payload)
                except (OSError, http.client.HTTPException):
                    self.send_response(502)
                    self.end_headers()
                finally:
                    conn.close()
                return
        self.send_response(404)
        self.end_headers()

    do_GET = do_HEAD = do_POST = do_PUT = do_PATCH = do_DELETE = proxy


threading.Thread(target=ThreadingHTTPServer(('127.0.0.1', 54325), Handler).serve_forever, daemon=True).start()
ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()

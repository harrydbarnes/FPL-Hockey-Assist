import http.server
import socketserver
import urllib.request
import urllib.error
import sys
import os

PORT = 8000
FPL_API_BASE = "https://fantasy.premierleague.com/api"

class ProxyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/api/'):
            # Proxy request to FPL API
            target_url = FPL_API_BASE + self.path[4:] # Remove /api prefix

            try:
                # Create a request object
                req = urllib.request.Request(target_url)
                # Forward user-agent to avoid being blocked by FPL
                req.add_header('User-Agent', 'Mozilla/5.0 (compatible; FPL-Proxy/1.0)')

                with urllib.request.urlopen(req) as response:
                    self.send_response(response.status)
                    # Forward headers
                    for key, value in response.getheaders():
                        self.send_header(key, value)
                    self.end_headers()
                    # Forward body
                    self.wfile.write(response.read())
            except urllib.error.HTTPError as e:
                self.send_response(e.code)
                self.end_headers()
                self.wfile.write(e.read())
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode())
        else:
            # Serve static files
            super().do_GET()

if __name__ == "__main__":
    # Change directory to current directory (repo root) to serve src/ etc correctly
    # The default behavior of SimpleHTTPRequestHandler is to serve from current working dir

    Handler = ProxyHTTPRequestHandler

    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving at port {PORT}")
        print(f"Proxying /api/ to {FPL_API_BASE}/")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass

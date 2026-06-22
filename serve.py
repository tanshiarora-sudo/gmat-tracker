import functools, http.server, socketserver, os
DIRECTORY = os.path.expanduser("~/Desktop/gmat-tracker")
PORT = 4187
class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache"); self.send_header("Expires", "0")
        super().end_headers()
Handler = functools.partial(NoCache, directory=DIRECTORY)
class S(socketserver.TCPServer): allow_reuse_address = True
with S(("127.0.0.1", PORT), Handler) as httpd:
    print("serving", DIRECTORY, "on", PORT); httpd.serve_forever()

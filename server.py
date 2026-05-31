import http.server
import socketserver
import os

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'game'))

with socketserver.TCPServer(("", 8080), http.server.SimpleHTTPRequestHandler) as httpd:
    print("Suds Jack running at http://localhost:8080")
    httpd.serve_forever()

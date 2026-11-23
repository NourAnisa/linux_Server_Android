import urllib.request
import base64
import os

cred = base64.b64encode(b"admin:bansos123").decode("ascii")

def upload_file(local_path, remote_path):
    url = f"https://terminal.jokicoding.web.id/api/upload?path={urllib.parse.quote(remote_path)}"
    file_size = os.path.getsize(local_path)
    print(f"Uploading {local_path} ({file_size} bytes) -> {remote_path} via {url}...")
    
    with open(local_path, "rb") as f:
        file_bytes = f.read()

    req = urllib.request.Request(
        url,
        data=file_bytes,
        headers={
            "Authorization": f"Basic {cred}",
            "Content-Type": "application/octet-stream",
            "User-Agent": "Mozilla/5.0"
        },
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        print("Upload Response:", r.status, r.read().decode())

upload_file(r"c:\Users\Nor Anisa\Downloads\bansos 9router\scratch\logo_clean.png", "/var/www/openqris/public/logo.png")
upload_file(r"c:\Users\Nor Anisa\Downloads\bansos 9router\scratch\icon_clean.png", "/var/www/openqris/public/icon.png")
print("Uploads completed successfully!")

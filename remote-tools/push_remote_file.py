import asyncio
import base64
import websockets
import json
import sys
import os
import uuid

async def push_file(local_path: str, remote_path: str):
    if not os.path.exists(local_path):
        print(f"Error: {local_path} not found")
        return False

    with open(local_path, "rb") as f:
        content = f.read()

    b64_str = base64.b64encode(content).decode("ascii")
    print(f"Uploading {local_path} ({len(content)} bytes, {len(b64_str)} b64 chars) -> {remote_path}...")

    uri = "wss://terminal.jokicoding.web.id/ws"
    cred = base64.b64encode(b"admin:bansos123").decode("ascii")
    headers = [
        ("Authorization", f"Basic {cred}"),
        ("User-Agent", "Mozilla/5.0")
    ]

    async with websockets.connect(uri, additional_headers=headers, subprotocols=["tty"], max_size=10*1024*1024) as ws:
        await ws.send(json.dumps({"AuthToken": ""}))
        await ws.send("1" + json.dumps({"columns": 200, "rows": 80}))
        
        await asyncio.sleep(0.4)
        try:
            while True:
                await asyncio.wait_for(ws.recv(), timeout=0.2)
        except asyncio.TimeoutError:
            pass

        tmp_b64 = f"/tmp/upload_{uuid.uuid4().hex[:6]}.b64"
        # Reset /tmp file
        await ws.send("0" + f"rm -f {tmp_b64}\r")
        await asyncio.sleep(0.2)

        # Send in 8000-char chunks for faster & reliable transfer
        chunk_size = 8000
        total_chunks = (len(b64_str) + chunk_size - 1) // chunk_size
        print(f"Sending {total_chunks} chunks...")

        for i in range(0, len(b64_str), chunk_size):
            chunk = b64_str[i:i+chunk_size]
            await ws.send("0" + f"printf '%s' '{chunk}' >> {tmp_b64}\r")
            await asyncio.sleep(0.08)

        await asyncio.sleep(0.5)

        # Decode base64 to target
        marker = uuid.uuid4().hex[:8]
        cmd = f"base64 -d {tmp_b64} > '{remote_path}' && rm -f {tmp_b64} && echo 'DONE_{marker}'\r"
        await ws.send("0" + cmd)

        collected = []
        start_time = asyncio.get_event_loop().time()
        while True:
            if asyncio.get_event_loop().time() - start_time > 20.0:
                break
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=2.0)
                if isinstance(msg, bytes):
                    msg = msg.decode('utf-8', errors='ignore')
                collected.append(msg)
                full = "".join(collected)
                if f"DONE_{marker}" in full:
                    print("Upload successfully verified on server!")
                    return True
            except asyncio.TimeoutError:
                pass

        print("Finished upload.")
        return True

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python push_remote_file.py <local_path> <remote_path>")
        sys.exit(1)
    asyncio.run(push_file(sys.argv[1], sys.argv[2]))

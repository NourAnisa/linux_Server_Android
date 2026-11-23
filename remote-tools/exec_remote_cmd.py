import asyncio
import base64
import websockets
import json
import sys
import re
import uuid

async def exec_cmd(cmd: str, timeout: float = 12.0):
    uri = "wss://terminal.jokicoding.web.id/ws"
    cred = base64.b64encode(b"admin:bansos123").decode("ascii")
    headers = [
        ("Authorization", f"Basic {cred}"),
        ("User-Agent", "Mozilla/5.0")
    ]

    async with websockets.connect(uri, additional_headers=headers, subprotocols=["tty"]) as ws:
        await ws.send(json.dumps({"AuthToken": ""}))
        await ws.send("1" + json.dumps({"columns": 200, "rows": 80}))
        
        # Drain initial prompt
        await asyncio.sleep(0.4)
        try:
            while True:
                await asyncio.wait_for(ws.recv(), timeout=0.2)
        except asyncio.TimeoutError:
            pass

        marker = uuid.uuid4().hex[:8]
        start_marker = f"__ST_{marker}__"
        end_marker = f"__EN_{marker}__"
        
        # Send command
        exec_payload = f"echo {start_marker}; {cmd}; echo {end_marker}\r"
        await ws.send("0" + exec_payload)

        collected = []
        start_time = asyncio.get_event_loop().time()
        while True:
            elapsed = asyncio.get_event_loop().time() - start_time
            if elapsed > timeout:
                break
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=1.0)
                if isinstance(msg, bytes):
                    msg = msg.decode('utf-8', errors='ignore')
                if msg.startswith('0'):
                    msg = msg[1:]
                collected.append(msg)
                full_text = "".join(collected)
                if end_marker in full_text and full_text.count(end_marker) >= 2:
                    break
            except asyncio.TimeoutError:
                # Do NOT break on idle wait; keep listening until overall command timeout or end_marker!
                continue

        full_raw = "".join(collected)
        clean = re.sub(r'\x1b\[[0-9;?]*[a-zA-Z]', '', full_raw)
        clean = clean.replace('\r', '')

        lines = clean.split('\n')
        recording = False
        output_lines = []
        for line in lines:
            line_str = line.strip()
            if line_str == start_marker:
                recording = True
                continue
            elif line_str == end_marker and recording:
                recording = False
                break
            if recording:
                output_lines.append(line)

        print("\n".join(output_lines).strip())

if __name__ == "__main__":
    timeout_sec = 25.0
    args = sys.argv[1:]
    if "--timeout" in args:
        idx = args.index("--timeout")
        timeout_sec = float(args[idx + 1])
        args = args[:idx] + args[idx + 2:]
    
    if len(args) > 0:
        if args[0] == "--b64":
            cmd = base64.b64decode(args[1]).decode("utf-8")
        elif args[0] == "--file":
            with open(args[1], "r", encoding="utf-8") as f:
                cmd = f.read().strip()
        elif args[0] == "-":
            cmd = sys.stdin.read().strip()
        else:
            cmd = " ".join(args)
    else:
        cmd = "uptime"
    asyncio.run(exec_cmd(cmd, timeout=timeout_sec))

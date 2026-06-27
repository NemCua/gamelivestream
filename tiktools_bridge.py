"""
tik.tools → WebSocket Bridge
Usage: python3 tiktools_bridge.py @nemcua_lofi
"""

import asyncio
import json
import sys
import threading
import http.server
import os
import urllib.request
from pathlib import Path
from dotenv import load_dotenv
from websockets import serve as ws_serve, connect as ws_connect

load_dotenv(Path(__file__).parent / ".env")

TIKTOK_USER = (sys.argv[1] if len(sys.argv) > 1 else "@nemcua_lofi").lstrip('@')
API_KEY     = os.environ.get("TIKTOOLS_API_KEY", "")
HTTP_PORT   = 3000
WS_PORT     = 3001
BASE_DIR    = Path(__file__).parent
API         = "https://api.tik.tools"
WS          = "wss://api.tik.tools"

# ── Gift map ─────────────────────────────────────────────────────
GIFT_MAP = {
    # 1 diamond – Đánh Thường
    "rose":                {"team": "A", "giftName": "Rose"},
    "tiktok":              {"team": "B", "giftName": "Rose"},

    # 5 diamond – Tam Kiếm / Hồi Máu / Mưa Tên
    "spinning soccer":     {"team": "A", "giftName": "TikTok"},   # Tam Kiếm đỏ
    "overreact":           {"team": "B", "giftName": "TikTok"},   # Tam Kiếm xanh
    "peach":               {"team": "A", "giftName": "Galavant"}, # Hồi Máu đỏ
    "okay":                {"team": "B", "giftName": "Galavant"}, # Hồi Máu xanh
    "finger heart":        {"team": "A", "giftName": "Cupid"},    # Mưa Tên đỏ
    "divine fingers":      {"team": "B", "giftName": "Cupid"},    # Mưa Tên xanh

    # 10 diamond – Sấm Sét / Tên Rồng / Gacha
    "rosa":                {"team": "A", "giftName": "Lightning"}, # Sấm Sét đỏ
    "intimacy":            {"team": "B", "giftName": "Lightning"}, # Sấm Sét xanh
    "mind blown":          {"team": "A", "giftName": "Dragon"},    # Tên Rồng đỏ
    "friendship necklace": {"team": "B", "giftName": "Dragon"},    # Tên Rồng xanh
    "lucky pig":           {"team": "A", "giftName": "Gacha"},     # Gacha đỏ
    "slow motion":         {"team": "B", "giftName": "Gacha"},     # Gacha xanh

    # 20 diamond – Thiên Thạch (Universe)
    "little kisses":       {"team": "A", "giftName": "Universe"},  # Thiên Thạch đỏ
    "perfume":             {"team": "B", "giftName": "Universe"},  # Thiên Thạch xanh
}

# ── WebSocket clients (game browser) ─────────────────────────────
ws_clients = set()
ws_loop    = None

def broadcast(obj):
    if not ws_clients or ws_loop is None:
        return
    msg = json.dumps(obj, ensure_ascii=False)
    asyncio.run_coroutine_threadsafe(_broadcast(msg), ws_loop)

async def _broadcast(msg):
    dead = set()
    for ws in ws_clients:
        try:
            await ws.send(msg)
        except Exception:
            dead.add(ws)
    ws_clients.difference_update(dead)

async def ws_handler(ws):
    ws_clients.add(ws)
    print(f"[WS] Client connected (total: {len(ws_clients)})")
    try:
        await ws.wait_closed()
    finally:
        ws_clients.discard(ws)

# ── Static HTTP server ────────────────────────────────────────────
class GameHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)
    def log_message(self, fmt, *args):
        pass

def run_http():
    server = http.server.HTTPServer(("", HTTP_PORT), GameHandler)
    print(f"[HTTP] http://localhost:{HTTP_PORT}")
    server.serve_forever()

# ── Mint JWT token (10 min) ───────────────────────────────────────
def mint_jwt(user):
    body = json.dumps({
        "allowed_creators": [user],
        "expire_after": 600,
        "max_websockets": 1
    }).encode()
    req = urllib.request.Request(
        f"{API}/authentication/jwt?apiKey={API_KEY}",
        method="POST",
        headers={"Content-Type": "application/json"},
        data=body
    )
    res = json.loads(urllib.request.urlopen(req).read())
    token = res.get("data", {}).get("token")
    if not token:
        raise Exception(f"JWT mint failed: {res}")
    return token

# ── tik.tools WebSocket listener ─────────────────────────────────
async def tiktools_listen():
    while True:
        try:
            print(f"[tik.tools] Minting JWT for @{TIKTOK_USER}...")
            token = mint_jwt(TIKTOK_USER)
            url = f"{WS}?uniqueId={TIKTOK_USER}&jwtKey={token}"
            print(f"[tik.tools] Connecting...")
            async with ws_connect(url) as ws:
                print(f"[tik.tools] ✅ Connected to @{TIKTOK_USER}")
                broadcast({"type": "connected", "user": TIKTOK_USER})
                async for raw in ws:
                    try:
                        msg = json.loads(raw)
                    except Exception:
                        continue
                    event = msg.get("event", "")
                    if event == "roomInfo":
                        print(f"[tik.tools] Room: {msg.get('roomId')}")
                        continue
                    if event == "gift":
                        print(f"[Gift DUMP] {json.dumps(msg, ensure_ascii=False)}")
                        handle_gift(msg.get("data", {}))
                    elif event in ("chat", "comment"):
                        handle_chat(msg.get("data", {}))

        except Exception as e:
            print(f"[tik.tools] Error: {e}")
            print("[tik.tools] Retrying in 10s...")
            await asyncio.sleep(10)

def handle_gift(d):
    name     = d.get("giftName") or ""
    repeat   = d.get("repeatCount") or 1
    sender   = (d.get("user") or {}).get("nickname") or (d.get("user") or {}).get("uniqueId") or "Ẩn danh"
    diamonds = d.get("diamondCount") or "?"

    # Bỏ qua frame giữa streak
    if d.get("giftType") == 1 and not d.get("repeatEnd", True):
        return

    print(f'[Gift RAW] name="{name}"  diamonds={diamonds}  x{repeat}  from={sender}')

    mapped = GIFT_MAP.get(name.lower().strip())
    if not mapped:
        print(f'[Gift] ⚠️  UNKNOWN: "{name}" – cần thêm vào GIFT_MAP')
        return

    print(f'[Gift] ✅ {sender}  "{name}" x{repeat}  →  Team {mapped["team"]}  ({mapped["giftName"]})')
    broadcast({"type": "gift", "team": mapped["team"], "giftName": mapped["giftName"], "qty": repeat, "sender": sender})

def handle_chat(d):
    text   = (d.get("comment") or "").lower().strip()
    sender = (d.get("user") or {}).get("nickname") or "Ẩn danh"
    for key, val in GIFT_MAP.items():
        if key in text:
            print(f'[Chat] {sender}: "{text}"  →  {val["giftName"]} Team {val["team"]}')
            broadcast({"type": "gift", "team": val["team"], "giftName": val["giftName"], "qty": 1, "sender": sender})
            break

# ── Main ──────────────────────────────────────────────────────────
async def main():
    global ws_loop
    ws_loop = asyncio.get_event_loop()

    ws_server = await ws_serve(ws_handler, "0.0.0.0", WS_PORT)
    print(f"[WS]   ws://localhost:{WS_PORT}")

    threading.Thread(target=run_http, daemon=True).start()

    await tiktools_listen()

if __name__ == "__main__":
    if not API_KEY:
        print("[ERROR] TIKTOOLS_API_KEY không tìm thấy trong .env")
        sys.exit(1)
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[Server] Stopped")

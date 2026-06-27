"""
TikTok Live → WebSocket Bridge
Usage: python3 tiktok_bridge.py @nemcua_lofi
"""

import asyncio
import json
import sys
import threading
import http.server
import mimetypes
import os
from pathlib import Path
from websockets import serve as ws_serve
from TikTokLive import TikTokLiveClient
from TikTokLive.events import ConnectEvent, DisconnectEvent, GiftEvent, CommentEvent

TIKTOK_USER    = sys.argv[1] if len(sys.argv) > 1 else "@nemcua_lofi"
ALLOWED_SENDER = sys.argv[2] if len(sys.argv) > 2 else None  # None = cho phép tất cả
HTTP_PORT      = 3000
WS_PORT        = 3001
BASE_DIR       = Path(__file__).parent

# ── Gift map: tên gift TikTok (lowercase) → { team, giftName } ──
GIFT_MAP = {
    # 1 diamond – Đánh thường
    "rose":            {"team": "A", "giftName": "Rose"},      # id=5655  ✅ confirmed
    "tiktok":          {"team": "B", "giftName": "Rose"},      # id=5269  ✅ confirmed

    # 5-6 diamond – Skill nhẹ
    "bing chiling":    {"team": "A", "giftName": "TikTok"},    # id=7412  ✅ (Tam Kiếm đỏ)
    "overreact":       {"team": "B", "giftName": "TikTok"},    # id=19447 ✅ (Tam Kiếm xanh)
    "peach":           {"team": "A", "giftName": "Galavant"},  # id=10961 ⚠️ chưa xác nhận team/skill
    "divine fingers":  {"team": "B", "giftName": "Cupid"},     # id=118812 ⚠️ chưa xác nhận
    "spinning soccer": {"team": "A", "giftName": "Cupid"},     # id=105781 ⚠️ chưa xác nhận

    # 10 diamond – Skill mạnh
    "mind blown":      {"team": "A", "giftName": "Lightning"}, # id=231958 ⚠️ chưa xác nhận
    "bff necklace":    {"team": "B", "giftName": "Lightning"}, # id=9947  ⚠️ chưa xác nhận
    "intimacy":        {"team": "B", "giftName": "Dragon"},    # id=231957 ⚠️ chưa xác nhận

    # 20 diamond – Thiên Thạch (Universe) – TODO: gửi thật để lấy tên
    # "???":           {"team": "A", "giftName": "Universe"},
    # "???":           {"team": "B", "giftName": "Universe"},

    # Gacha – TODO: xác nhận tên gift gacha
    # "???":           {"team": "A", "giftName": "Gacha"},
    # "???":           {"team": "B", "giftName": "Gacha"},
}

# ── WebSocket clients ────────────────────────────────────────────
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

# ── Static HTTP server ───────────────────────────────────────────
class GameHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)
    def log_message(self, fmt, *args):
        pass  # tắt log mỗi request

def run_http():
    server = http.server.HTTPServer(("", HTTP_PORT), GameHandler)
    print(f"[HTTP] http://localhost:{HTTP_PORT}")
    server.serve_forever()

# ── Dedup: tránh xử lý gift trùng khi reconnect ──────────────────
_seen_gifts = set()

# ── TikTok client factory ─────────────────────────────────────────
def make_client():
    c = TikTokLiveClient(unique_id=TIKTOK_USER)

    @c.on(ConnectEvent)
    async def on_connect(event: ConnectEvent):
        print(f"[TikTok] ✅ Connected to {TIKTOK_USER}")
        broadcast({"type": "connected", "user": TIKTOK_USER, "viewers": 0})

    @c.on(DisconnectEvent)
    async def on_disconnect(event: DisconnectEvent):
        print("[TikTok] Disconnected")
        broadcast({"type": "disconnected"})

    @c.on(GiftEvent)
    async def on_gift(event: GiftEvent):
        name   = event.gift.name or ""
        repeat = event.repeat_count or 1
        sender = event.user.nickname or event.user.unique_id or "Ẩn danh"

        # Bỏ qua frame giữa streak (chỉ xử lý khi streak kết thúc)
        if event.gift.type == 1 and not event.repeat_end:
            return

        # Dedup: tạo key từ msg_id hoặc combo sender+name+repeat
        gift_id = (getattr(event, 'msg_id', None)
                   or getattr(event, 'order_id', None)
                   or getattr(event, 'm_log_id', None)
                   or f"{sender}:{name}:{repeat}:{int(asyncio.get_event_loop().time())//3}")
        if gift_id in _seen_gifts:
            return
        _seen_gifts.add(gift_id)
        if len(_seen_gifts) > 1000:
            _seen_gifts.clear()

        gift_id_raw = getattr(event.gift, 'id', '?')
        diamonds    = getattr(event.gift, 'diamond_count', '?')
        print(f'[Gift RAW] id={gift_id_raw}  name="{name}"  diamonds={diamonds}  ×{repeat}  from={sender}')

        mapped = GIFT_MAP.get(name.lower().strip())
        if not mapped:
            print(f'[Gift] ⚠️  UNKNOWN: "{name}" – cần thêm vào GIFT_MAP')
            return

        print(f'[Gift] ✅ {sender}  "{name}" ×{repeat}  →  Team {mapped["team"]}  ({mapped["giftName"]})')
        broadcast({"type": "gift", "team": mapped["team"], "giftName": mapped["giftName"], "qty": repeat, "sender": sender})

    @c.on(CommentEvent)
    async def on_comment(event: CommentEvent):
        text   = (event.comment or "").lower().strip()
        sender = event.user.nickname or event.user.unique_id or "Ẩn danh"
        for key, val in GIFT_MAP.items():
            if key in text:
                print(f'[Chat] {sender}: "{event.comment}"  →  {val["giftName"]} Team {val["team"]}')
                broadcast({"type": "gift", "team": val["team"], "giftName": val["giftName"], "qty": 1, "sender": sender})
                break

    return c

# ── Main ─────────────────────────────────────────────────────────
async def main():
    global ws_loop
    ws_loop = asyncio.get_event_loop()

    # WebSocket server
    ws_server = await ws_serve(ws_handler, "localhost", WS_PORT)
    print(f"[WS]   ws://localhost:{WS_PORT}")

    # HTTP server (thread riêng)
    t = threading.Thread(target=run_http, daemon=True)
    t.start()

    # TikTok connect (retry loop, tạo client mới mỗi lần)
    print(f"[TikTok] Connecting to {TIKTOK_USER}...")
    while True:
        try:
            await make_client().start(fetch_live_check=False, process_connect_events=False)
            print("[TikTok] Disconnected, retrying in 10s...")
            await asyncio.sleep(10)
        except Exception as e:
            err = str(e)
            if 'RATE_LIMIT' in err:
                print(f"[TikTok] Rate limited, waiting 60s...")
                await asyncio.sleep(60)
            elif 'offline' in err.lower():
                print(f"[TikTok] Offline, retrying in 15s...")
                await asyncio.sleep(15)
            else:
                print(f"[TikTok] Cannot connect: {e}")
                print("[TikTok] Retrying in 10s...")
                await asyncio.sleep(10)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[Server] Stopped")

// ─────────────────────────────────────────────────────────────
//  TikTok Live → WebSocket Bridge  –  server.js
//  Usage: node server.js <@tiktok_username>
// ─────────────────────────────────────────────────────────────

import { createRequire } from 'module';
import { WebSocketServer } from 'ws';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require     = createRequire(import.meta.url);
const { WebcastPushConnection } = require('tiktok-live-connector');

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const TIKTOK_USER = process.argv[2] || '@your_username';
const HTTP_PORT   = 3000;
const WS_PORT     = 3001;

// ── Gift map: TikTok gift name → { team, giftName } ──────────
const GIFT_MAP = {
  // 20 xu – Thiên Thạch (Universe)
  // TODO: xác nhận tên thật gift 20 xu đội A và B sau khi test
  'nước hoa':      { team: 'A', giftName: 'Universe'  }, // chưa xác nhận tên thật
  'little kiss':   { team: 'B', giftName: 'Universe'  }, // chưa xác nhận tên thật

  // 10 xu – Sấm Sét (Lightning) / Tên Rồng (Dragon)
  // TODO: xác nhận tên thật sau khi test
  'mind blown':    { team: 'A', giftName: 'Lightning' }, // chưa xác nhận team
  'bff necklace':  { team: 'B', giftName: 'Lightning' }, // chưa xác nhận team
  'intimacy':      { team: 'B', giftName: 'Dragon'    }, // chưa xác nhận team

  // 5-6 xu – Mưa Tên (Cupid) / Tam Kiếm (TikTok) / Hồi Máu (Galavant)
  // TODO: xác nhận team/skill sau khi test
  'peach':          { team: 'A', giftName: 'Galavant'  }, // chưa xác nhận
  'divine fingers': { team: 'B', giftName: 'Cupid'     }, // chưa xác nhận
  'spinning soccer':{ team: 'A', giftName: 'Cupid'     }, // chưa xác nhận
  'bing chiling':   { team: 'A', giftName: 'TikTok'    }, // log: "Bing Chiling"
  'overreact':      { team: 'B', giftName: 'TikTok'    }, // log: confirmed ✅

  // 1 xu – Đánh Thường (Rose)
  'rose':           { team: 'A', giftName: 'Rose'      }, // log: confirmed ✅
  'tiktok':         { team: 'B', giftName: 'Rose'      }, // log: confirmed ✅
};

function mapGift(name) {
  return GIFT_MAP[(name || '').toLowerCase().trim()] || null;
}

// ── WebSocket server ──────────────────────────────────────────
const wss = new WebSocketServer({ port: WS_PORT });
const clients = new Set();

wss.on('connection', ws => {
  clients.add(ws);
  console.log(`[WS] Client connected (total: ${clients.size})`);
  ws.on('close', () => { clients.delete(ws); });
});

function broadcast(obj) {
  const msg = JSON.stringify(obj);
  clients.forEach(ws => { if (ws.readyState === 1) ws.send(msg); });
}

// ── Static HTTP server ────────────────────────────────────────
const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.png': 'image/png',  '.mp3': 'audio/mpeg',             '.gif': 'image/gif',
};

const httpServer = http.createServer((req, res) => {
  const url = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(__dirname, url);
  if (!filePath.startsWith(__dirname)) { res.writeHead(403); res.end(); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});
httpServer.listen(HTTP_PORT, () => console.log(`[HTTP] http://localhost:${HTTP_PORT}`));

// ── TikTok Live (v1 API) ──────────────────────────────────────
const tiktok = new WebcastPushConnection(TIKTOK_USER, {
  processInitialData: false,
  enableExtendedGiftInfo: true,
  enableWebsocketUpgrade: true,
  requestPollingIntervalMs: 2000,
});

tiktok.on('connected', data => {
  const viewers = data?.viewerCount || 0;
  console.log(`[TikTok] ✅ Connected to ${TIKTOK_USER}  viewers: ${viewers}`);
  broadcast({ type: 'connected', user: TIKTOK_USER, viewers });
});

tiktok.on('disconnected', () => {
  console.log('[TikTok] Disconnected');
  broadcast({ type: 'disconnected' });
});

tiktok.on('error', err => console.error('[TikTok] Error:', err?.message || err));

// ── Gift events ───────────────────────────────────────────────
tiktok.on('gift', data => {
  // Bỏ qua các frame giữa chừng của streak gift
  if (data.giftType === 1 && !data.repeatEnd) return;

  const name   = data.giftName || '';
  const repeat = data.repeatCount || 1;
  const sender = data.nickname || data.uniqueId || 'Ẩn danh';

  // Log RAW để biết tên gift thật từ TikTok
  console.log(`[Gift RAW] "${name}"  ×${repeat}  from: ${sender}  type:${data.giftType}`);

  const mapped = mapGift(name);
  if (!mapped) {
    console.log(`[Gift] ⚠️  UNKNOWN: "${name}" – cần thêm vào GIFT_MAP`);
    return;
  }

  const { team, giftName } = mapped;
  console.log(`[Gift] ✅ ${sender}  "${name}" ×${repeat}  →  Team ${team}  (${giftName})`);
  broadcast({ type: 'gift', team, giftName, qty: repeat, sender });
});

// ── Chat events (comment giftname #a/#b) ──────────────────────
tiktok.on('chat', data => {
  const text   = (data.comment || '').toLowerCase().trim();
  const sender = data.nickname || data.uniqueId || 'Ẩn danh';

  let found = null;
  for (const [key, val] of Object.entries(GIFT_MAP)) {
    if (text.includes(key)) { found = val; break; }
  }
  if (!found) return;

  console.log(`[Chat] ${sender}: "${data.comment}"  →  ${found.giftName} Team ${found.team}`);
  broadcast({ type: 'gift', team: found.team, giftName: found.giftName, qty: 1, sender });
});

// ── Connect ───────────────────────────────────────────────────
console.log(`[TikTok] Connecting to ${TIKTOK_USER}...`);
tiktok.connect().catch(err => {
  console.error('[TikTok] Cannot connect:', err?.message || err);
  console.log('[Server] Demo mode – WebSocket still active on port', WS_PORT);
});

// ─────────────────────────────────────────────────────────────
//  PIXEL BATTLE ARENA  –  game.js  (v4 – no class system)
// ─────────────────────────────────────────────────────────────

const canvas = document.getElementById('arena');
const ctx    = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;


// ── Base stats ────────────────────────────────────────────────
const BASE = {
  maxHp:   50000,
  atk:     10,
  def:     5,
  crit:    5,
  critDmg: 150,
};

// ── Gift definitions ──────────────────────────────────────────
const GIFTS = {
  'Rose':      { color:'#ff6688', label:'🌹 Rose',       tier:1,
                 atkPct: [120],
                 buffPct: { atk: 5 },
                 desc: '+5% ATK' },
  'TikTok':    { color:'#ffe066', label:'✨ TikTok',     tier:2,
                 atkPct: [80, 80, 80],
                 buff:    { crit: 3, critDmg: 10 },
                 desc: '+3 CRIT% +10 CDMG' },
  'Galavant':  { color:'#44ffcc', label:'🏇 Galavant',   tier:2,
                 atkPct: [150],
                 buffPct: { def: 8, maxHp: 1.5 },
                 healPct: 18,
                 desc: '+8% DEF +1.5% MaxHP +18% Heal' },
  'Universe':  { color:'#aa66ff', label:'🌌 Universe',   tier:3,
                 atkPct: [320],
                 stunChance: 22, stunDur: 3,
                 buffPct: { atk: 10 },
                 buff:    { crit: 5, critDmg: 20 },
                 desc: '+10% ATK +5 CRIT% +20 CDMG' },
  'Lightning': { color:'#88ddff', label:'⚡ Lightning',  tier:2,
                 atkPct: [135, 135, 135],
                 critBonus: 80,
                 stunChance: 30, stunDur: 3,
                 buffPct: { atk: 6 },
                 buff:    { crit: 2 },
                 desc: '+6% ATK +2 CRIT%' },
  'Cupid':     { color:'#ff99dd', label:'💘 Cupid',      tier:2,
                 atkPct: [84, 84, 84, 84],
                 buffPct: { atk: 4 },
                 buff:    { crit: 4 },
                 desc: '+4% ATK +4 CRIT%' },
  'Dragon':    { color:'#ff6600', label:'🐉 Dragon',     tier:3,
                 atkPct: [200, 200],
                 critBonus: 50,
                 stunChance: 15, stunDur: 2,
                 buffPct: { atk: 8, def: 5 },
                 desc: '+8% ATK +5% DEF' },
};
const DEFAULT_GIFT = { color:'#aaa', label:'🎁 Gift', tier:1, atkPct:[100], buffPct:{ atk: 3 }, desc:'+3% ATK' };

// ── Idle sprite images: CHAR_FRAMES[charIdx][frameIdx] ───────
// charIdx 0 = Team A (char1), charIdx 1 = Team B (char2)
const CHAR_FRAMES = [
  [new Image(), new Image()],
  [new Image(), new Image()],
];
CHAR_FRAMES[0][0].src = 'char/char1_idle1.png';
CHAR_FRAMES[0][1].src = 'char/char1_idle2.png';
CHAR_FRAMES[1][0].src = 'char/char2_idle1.png';
CHAR_FRAMES[1][1].src = 'char/char2_idle2.png';
let idleFrameTimer = 0;
let idleFrameIdx   = 0;

// ── Fighter factory ───────────────────────────────────────────
function makeFighter(id) {
  return {
    id,
    hp:      BASE.maxHp,
    maxHp:   BASE.maxHp,
    atk:     BASE.atk,
    def:     BASE.def,
    crit:    BASE.crit,
    critDmg: BASE.critDmg,
    x: id === 'A' ? 130 : 510,
    y: 210,
    breathe: 0, attackTimer: 0, isAttacking: false,
    hitFlash: 0, dead: false,
    stunned: false, stunTimer: 0,
    gifts: 0, totalDmg: 0, combo: 0, comboTimer: null,
    buffLog: [],
    equip: makeEquipment(),
    deathAlpha: 1,
    graveShown: false,
  };
}

// ── State ─────────────────────────────────────────────────────
let state = {
  fighters: { A: makeFighter('A'), B: makeFighter('B') },
  particles: [],
  stars: [],
  torchFlicker: 0,
  gameOver: false,
  tick: 0,
};

for (let i = 0; i < 60; i++) {
  state.stars.push({
    x: Math.random() * 640,
    y: Math.random() * 210,
    r: Math.random() < 0.15 ? 2 : 1,
    blink: Math.random() * Math.PI * 2,
    speed: 0.01 + Math.random() * 0.02,
  });
}

// ─────────────────────────────────────────────────────────────
//  PIXEL SPRITES  (16×20 grid, scale 4 = 64×80px)
//  0=transparent 1=outline 2=skin 3=armor 4=accent 5=hair 6=weapon 7=highlight
// ─────────────────────────────────────────────────────────────

const SP_IDLE = [
  [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,1,5,5,5,5,5,5,1,0,0,0,0],
  [0,0,0,1,5,5,7,5,5,7,5,5,1,0,0,0],
  [0,0,0,1,5,5,5,5,5,5,5,5,1,0,0,0],
  [0,0,0,0,1,1,2,2,2,2,1,1,0,0,0,0],
  [0,0,0,0,1,2,2,2,2,2,2,1,0,0,0,0],
  [0,0,0,0,1,2,7,2,2,7,2,1,0,0,0,0],
  [0,0,0,0,1,2,2,2,2,2,2,1,0,0,0,0],
  [0,0,0,1,3,3,3,3,3,3,3,3,1,0,0,0],
  [0,0,1,3,3,4,3,3,3,3,4,3,3,1,0,0],
  [0,0,1,3,3,3,3,3,3,3,3,3,3,1,0,0],
  [0,0,1,3,4,4,3,3,3,3,4,4,3,1,0,0],
  [0,0,1,3,3,3,3,3,3,3,3,3,3,1,0,0],
  [0,1,6,3,3,3,1,0,0,1,3,3,3,6,1,0],
  [0,1,6,6,1,1,0,0,0,0,1,1,6,6,1,0],
  [0,0,1,3,1,0,0,0,0,0,0,1,3,1,0,0],
  [0,0,1,3,1,0,0,0,0,0,0,1,3,1,0,0],
  [0,0,1,3,1,0,0,0,0,0,0,1,3,1,0,0],
  [0,0,1,3,3,1,0,0,0,0,1,3,3,1,0,0],
  [0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0],
];

const SP_ATK = [
  [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,1,5,5,5,5,5,5,1,0,0,0,0],
  [0,0,0,1,5,5,7,5,5,7,5,5,1,0,0,0],
  [0,0,0,1,5,5,5,5,5,5,5,5,1,0,0,0],
  [0,0,0,0,1,1,2,2,2,2,1,1,0,0,0,0],
  [0,0,0,0,1,2,2,2,2,2,2,1,1,1,0,0],
  [0,0,0,0,1,2,7,2,2,7,2,3,4,4,1,0],
  [0,0,0,0,1,2,2,2,2,2,2,3,4,7,1,0],
  [0,0,0,1,3,3,3,3,3,3,3,4,4,1,0,0],
  [0,1,6,6,3,4,3,3,3,3,4,3,3,1,0,0],
  [1,6,6,7,3,3,3,3,3,3,3,3,3,1,0,0],
  [0,1,6,3,4,4,3,3,3,3,4,4,3,1,0,0],
  [0,0,1,3,3,3,3,3,3,3,3,3,3,1,0,0],
  [0,0,1,3,3,3,1,0,0,0,0,1,3,1,0,0],
  [0,0,1,3,3,1,0,0,0,0,0,0,1,1,0,0],
  [0,0,1,3,1,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const SP_HURT = [
  [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,1,5,5,5,5,5,5,1,0,0,0,0],
  [0,0,0,1,5,5,7,5,5,7,5,5,1,0,0,0],
  [0,0,1,5,5,5,5,5,5,5,5,5,5,1,0,0],
  [0,0,0,0,1,1,2,2,2,2,1,1,0,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0],
  [0,0,0,1,2,2,7,2,2,7,2,2,1,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0],
  [0,0,1,3,3,3,3,3,3,3,3,3,3,1,0,0],
  [0,1,3,3,4,3,3,3,3,3,4,3,3,3,1,0],
  [0,1,3,3,3,3,3,3,3,3,3,3,3,3,1,0],
  [0,1,3,4,4,3,3,3,3,3,4,4,3,3,1,0],
  [0,1,3,3,3,3,3,3,3,3,3,3,3,3,1,0],
  [1,6,3,3,3,1,0,0,0,0,1,3,3,3,6,1],
  [1,6,6,1,0,0,0,0,0,0,0,0,1,6,6,1],
  [0,1,3,1,0,0,0,0,0,0,0,0,1,3,1,0],
  [0,1,3,1,0,0,0,0,0,0,0,0,1,3,1,0],
  [0,1,3,3,1,0,0,0,0,0,0,1,3,3,1,0],
  [0,0,1,3,3,1,0,0,0,0,1,3,3,1,0,0],
  [0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0],
];

const SP_DEAD = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,1,3,3,2,2,5,5,2,4,3,3,3,1,0],
  [0,1,3,3,5,5,2,2,3,3,3,4,3,3,3,1],
  [1,3,3,3,5,2,2,2,3,3,3,3,4,3,3,1],
  [0,1,3,3,3,3,3,3,3,3,3,3,3,3,1,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const TEAM_PAL = {
  A: { 1:'#1a0800', 2:'#f4c48a', 3:'#cc2200', 4:'#ff9933', 5:'#442200', 6:'#aaccee', 7:'#ffffff' },
  B: { 1:'#00081a', 2:'#f4c48a', 3:'#0033cc', 4:'#55aaff', 5:'#001133', 6:'#aaccee', 7:'#ffffff' },
};

function getSprite(f) {
  if (f.dead)             return SP_DEAD;
  if (f.hitFlash > 0.6)  return SP_HURT;
  if (f.isAttacking)     return SP_ATK;
  return SP_IDLE;
}

function drawSprite(sprite, px, py, scale, pal, flipX) {
  const rows = sprite.length;
  const cols = sprite[0].length;
  ctx.save();
  if (flipX) {
    ctx.translate(px + cols * scale, py);
    ctx.scale(-1, 1);
    ctx.translate(-px, -py);
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = sprite[r][c];
      if (!v) continue;
      ctx.fillStyle = pal[v] || '#ff00ff';
      ctx.fillRect(px + c * scale, py + r * scale, scale, scale);
    }
  }
  ctx.restore();
}

// ── Background ────────────────────────────────────────────────
function drawBG() {
  const bands = ['#06061e','#07072a','#09092e','#0a0a32','#0c0c36',
                 '#0d0d3a','#0f0f3c','#101040','#111142','#121244'];
  const bh = Math.ceil(210 / bands.length);
  bands.forEach((c, i) => {
    ctx.fillStyle = c; ctx.fillRect(0, i * bh, 640, bh);
  });

  // Stars
  state.stars.forEach(s => {
    s.blink += s.speed;
    const a = .3 + .7 * Math.abs(Math.sin(s.blink));
    ctx.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
    ctx.fillRect(~~s.x, ~~s.y, s.r, s.r);
  });

  // Moon with glow
  const mg = ctx.createRadialGradient(540, 42, 20, 540, 42, 55);
  mg.addColorStop(0, 'rgba(255,252,200,0.18)');
  mg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = mg; ctx.fillRect(485, -13, 110, 110);
  ctx.fillStyle = '#fffce0';
  ctx.beginPath(); ctx.arc(540, 42, 26, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#0c0c38';
  ctx.beginPath(); ctx.arc(533, 37, 23, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#eeebb0';
  ctx.fillRect(548, 30, 4, 4); ctx.fillRect(557, 44, 3, 3); ctx.fillRect(542, 50, 3, 3);

  // Distant mountains
  ctx.fillStyle = '#0c0820';
  ctx.beginPath(); ctx.moveTo(0, 210);
  const mpts = [0,195, 55,155, 110,175, 165,142, 220,168,
                280,138, 340,158, 395,146, 455,172, 515,150, 580,168, 640,182, 640,210];
  for (let i = 0; i < mpts.length; i += 2) ctx.lineTo(mpts[i], mpts[i+1]);
  ctx.closePath(); ctx.fill();

  // Ground
  ctx.fillStyle = '#180d00'; ctx.fillRect(0, 210, 640, 140);
  ctx.fillStyle = '#2a1800'; ctx.fillRect(0, 210, 640, 18);
  ctx.fillStyle = '#3a2200'; ctx.fillRect(0, 210, 640, 5);
  for (let x = 0; x < 640; x += 20) {
    ctx.fillStyle = x % 40 === 0 ? '#291400' : '#1a0c00';
    ctx.fillRect(x, 215, 20, 16);
    ctx.fillStyle = '#110800';
    ctx.fillRect(x + 9, 215, 1, 7);
  }

  // Pillars
  drawPillar(62, 90); drawPillar(578, 90);

  // Divider
  ctx.strokeStyle = '#ffffff1a'; ctx.lineWidth = 2;
  ctx.setLineDash([7,7]);
  ctx.beginPath(); ctx.moveTo(320, 24); ctx.lineTo(320, 210); ctx.stroke();
  ctx.setLineDash([]);

  drawTorch(80, 90); drawTorch(560, 90);
}

function drawPillar(x, h) {
  ctx.fillStyle = '#1e1830'; ctx.fillRect(x-18, 210-h, 36, h);
  ctx.fillStyle = '#2e2848'; ctx.fillRect(x-16, 213-h, 5, h-6);
  ctx.fillStyle = '#3e3858'; ctx.fillRect(x-14, 213-h, 2, h-6);
  ctx.fillStyle = '#140e28'; ctx.fillRect(x-20, 210-h, 40, 10);
  ctx.fillStyle = '#140e28'; ctx.fillRect(x-20, 204, 40, 8);
  ctx.fillStyle = '#0a0820';
  for (let i = 0; i < 3; i++) ctx.fillRect(x-16, 210-h+18+i*20, 32, 2);
}

function drawTorch(x, y) {
  state.torchFlicker = (state.torchFlicker + 0.07) % (Math.PI * 2);
  const fl = Math.sin(state.torchFlicker);
  ctx.fillStyle = '#3a2800'; ctx.fillRect(x-3, y, 6, 12);
  ctx.fillStyle = '#4a3800'; ctx.fillRect(x-5, y+10, 10, 4);
  const fx = x + fl * 2;
  ctx.fillStyle = '#cc2200'; ctx.fillRect(fx-6, y-10, 12, 10);
  ctx.fillStyle = '#ff5500'; ctx.fillRect(fx-4, y-15, 8, 8);
  ctx.fillStyle = '#ff9900'; ctx.fillRect(fx-3, y-19, 6, 6);
  ctx.fillStyle = '#ffcc00'; ctx.fillRect(fx-2, y-22, 4, 4);
  ctx.fillStyle = '#ffff88'; ctx.fillRect(fx-1, y-24, 2, 3);
  const g = ctx.createRadialGradient(fx, y-12, 1, fx, y-12, 44);
  g.addColorStop(0, 'rgba(255,120,0,.3)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(fx-44, y-56, 88, 88);
}

// ── Grave pixel art (16×18 grid, scale 4) ────────────────────
const SP_GRAVE = [
  [0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,1,8,8,8,1,0,0,0,0,0,0],
  [0,0,0,0,1,8,8,8,8,8,1,0,0,0,0,0],
  [0,0,0,1,8,8,9,8,8,9,8,8,1,0,0,0],
  [0,0,1,8,8,8,8,8,8,8,8,8,8,8,1,0],
  [0,0,1,8,8,8,9,8,8,9,8,8,8,8,1,0],
  [0,0,1,8,8,8,8,8,8,8,8,8,8,8,1,0],
  [0,0,0,1,8,8,8,8,8,8,8,8,8,1,0,0],
  [0,0,0,1,8,8,1,1,1,1,8,8,8,1,0,0],
  [0,0,0,0,1,8,8,8,8,8,8,8,1,0,0,0],
  [0,0,0,0,0,1,3,3,3,3,3,1,0,0,0,0],
  [0,0,0,0,0,1,3,3,3,3,3,1,0,0,0,0],
  [0,0,0,0,0,1,3,3,3,3,3,1,0,0,0,0],
  [0,0,0,0,0,1,3,3,3,3,3,1,0,0,0,0],
  [0,0,0,0,0,1,3,3,3,3,3,1,0,0,0,0],
  [0,0,0,0,0,1,3,3,3,3,3,1,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0],
];
const GRAVE_PAL = {
  1: '#222222',
  3: '#5a3a1a',
  8: '#888888',
  9: '#aaaaaa',
};

// ── Offscreen canvas dùng để glow theo hình sprite thật ───────
const _offCvs = document.createElement('canvas');
const _offCtx = _offCvs.getContext('2d');

// Vẽ sprite lên offscreen rồi blit với shadowBlur → glow bám theo alpha
function drawSpriteWithGlow(img, px, py, sw, sh, flipX, cx, glowColor, glowSize, alpha) {
  const pad = glowSize + 4;
  const ow = sw + pad * 2;
  const oh = sh + pad * 2;
  if (_offCvs.width !== ow || _offCvs.height !== oh) {
    _offCvs.width = ow; _offCvs.height = oh;
  }
  _offCtx.clearRect(0, 0, ow, oh);

  // Vẽ sprite vào offscreen (có flip nếu cần)
  _offCtx.save();
  if (flipX) {
    _offCtx.translate(ow, 0);
    _offCtx.scale(-1, 1);
    _offCtx.drawImage(img, ow - pad - sw, pad, sw, sh);
  } else {
    _offCtx.drawImage(img, pad, pad, sw, sh);
  }
  _offCtx.restore();

  // Blit offscreen lên canvas chính với shadowBlur → glow theo hình sprite
  ctx.save();
  ctx.globalAlpha = alpha;
  if (glowColor && glowSize > 0) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur  = glowSize;
  }
  ctx.drawImage(_offCvs, px - pad, py - pad);
  ctx.shadowBlur = 0;
  ctx.restore();
}

// Hit flash: tint sprite thành trắng bằng cách overlay 'source-atop'
function drawSpriteFlash(img, px, py, sw, sh, flipX, flashAlpha) {
  const ow = sw, oh = sh;
  if (_offCvs.width !== ow || _offCvs.height !== oh) {
    _offCvs.width = ow; _offCvs.height = oh;
  }
  _offCtx.clearRect(0, 0, ow, oh);
  _offCtx.save();
  if (flipX) {
    _offCtx.translate(ow, 0); _offCtx.scale(-1, 1);
  }
  _offCtx.drawImage(img, 0, 0, sw, sh);
  _offCtx.restore();
  // Overlay trắng chỉ trên vùng pixel có nội dung
  _offCtx.save();
  _offCtx.globalCompositeOperation = 'source-atop';
  _offCtx.globalAlpha = flashAlpha;
  _offCtx.fillStyle = '#ffffff';
  _offCtx.fillRect(0, 0, ow, oh);
  _offCtx.restore();

  ctx.save();
  ctx.drawImage(_offCvs, px, py);
  ctx.restore();
}

// ── Draw Fighter ──────────────────────────────────────────────
function drawFighter(id) {
  const f   = state.fighters[id];
  const isA = id === 'A';
  const charIdx = isA ? 0 : 1;
  const img = CHAR_FRAMES[charIdx][idleFrameIdx];
  const iw  = img.naturalWidth  || (isA ? 65 : 38);
  const ih  = img.naturalHeight || 56;
  const sc  = 1.4;
  const sw  = iw * sc;
  const sh  = ih * sc;

  // Grave: draw after death fade finishes
  if (f.dead && f.graveShown) {
    const gsc = 4;
    const gw  = SP_GRAVE[0].length * gsc;
    const gh  = SP_GRAVE.length    * gsc;
    const gpx = f.x - gw / 2;
    const gpy = f.y - gh;
    drawSprite(SP_GRAVE, gpx, gpy, gsc, GRAVE_PAL, false);
    return;
  }

  const bobY = f.dead ? 0 : Math.sin(f.breathe) * 2.5;
  const px   = f.x - sw / 2;
  const py   = f.y - sh + bobY;

  // Ground shadow
  const shadowW = f.dead ? 20 : 22 + Math.sin(f.breathe) * 2;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(f.x, f.y + 3, shadowW, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  if (!img.complete || img.naturalWidth === 0) return;

  const flipX = isA; // A quay sang phải (flip)
  const deadAlpha = f.dead ? Math.max(0, f.deathAlpha) : 1;

  if (f.hitFlash > 0) {
    // Flash trắng bám theo hình sprite
    drawSpriteFlash(img, px, py, sw, sh, flipX, f.hitFlash * 0.7);
  } else if (!f.dead && f.hp / f.maxHp < 0.3) {
    // Low HP: glow đỏ/xanh bám theo hình sprite
    const pulse     = 8 + 6 * Math.sin(state.tick * 0.12);
    const glowColor = isA ? '#ff2200' : '#2266ff';
    drawSpriteWithGlow(img, px, py, sw, sh, flipX, f.x, glowColor, pulse, deadAlpha);
  } else {
    // Bình thường: glow team nhẹ bám hình sprite
    const auraA     = 0.06 + 0.04 * Math.sin(f.breathe * 1.3);
    const glowColor = isA ? `rgba(255,80,40,${auraA * 6})` : `rgba(40,100,255,${auraA * 6})`;
    drawSpriteWithGlow(img, px, py, sw, sh, flipX, f.x, glowColor, 10, deadAlpha);
  }

  // Name tag
  if (!f.dead) {
    const nc = isA ? '#ff6655' : '#5599ff';
    ctx.font = '7px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillStyle = nc;
    ctx.shadowColor = nc;
    ctx.shadowBlur = 8;
    ctx.fillText(isA ? 'ĐỘI ĐỎ' : 'ĐỘI XANH', f.x, py - 6);
    ctx.shadowBlur = 0;
  }
}

// ── Particles ─────────────────────────────────────────────────
function spawnParticles(x, y, color, count, power) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd   = (1 + Math.random() * 3.5) * power;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd - 1.5,
      life: 1,
      decay: .022 + Math.random() * .035,
      color,
      size: 2 + ~~(Math.random() * 4),
    });
  }
}

function updateParticles() {
  state.particles = state.particles.filter(p => p.life > 0);
  state.particles.forEach(p => {
    p.x += p.vx; p.y += p.vy; p.vy += 0.15;
    p.life -= p.decay;
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.fillRect(~~p.x, ~~p.y, p.size, p.size);
  });
  ctx.globalAlpha = 1;
}

// ── Main loop ─────────────────────────────────────────────────
let lastTime = 0;
function loop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  state.tick++;

  ctx.clearRect(0, 0, 640, 220);
  drawBG();

  // Idle animation: toggle frame every 0.4s
  idleFrameTimer += dt;
  if (idleFrameTimer >= 0.4) {
    idleFrameTimer = 0;
    idleFrameIdx   = 1 - idleFrameIdx;
  }

  ['A','B'].forEach(id => {
    const f = state.fighters[id];
    if (f.dead) {
      // Fade out then show grave
      if (!f.graveShown) {
        f.deathAlpha -= dt * 1.2;
        if (f.deathAlpha <= 0) {
          f.deathAlpha  = 0;
          f.graveShown  = true;
        }
      }
      return;
    }
    if (f.stunned) {
      f.stunTimer -= dt;
      if (f.stunTimer <= 0) { f.stunned = false; f.stunTimer = 0; updateAll(); }
    }
    if (!f.stunned) {
      f.breathe += dt * 2.8;
      f.y = 210 + Math.sin(f.breathe) * 2;
    }
    if (f.isAttacking) { f.attackTimer -= dt; if (f.attackTimer <= 0) f.isAttacking = false; }
    if (f.hitFlash > 0) f.hitFlash = Math.max(0, f.hitFlash - dt * 4);
  });

  drawFighter('A');
  drawFighter('B');
  updateParticles();
  SkillFX.update(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ── Damage formula ────────────────────────────────────────────
function calcHits(attacker, defender, giftInfo, qty) {
  const defReduction = Math.min(defender.def / (defender.def + 100), 0.75);
  const hits = [];
  for (let q = 0; q < qty; q++) {
    giftInfo.atkPct.forEach(pct => {
      const raw    = attacker.atk * (pct / 100);
      const isCrit = Math.random() * 100 < attacker.crit;
      const mult   = isCrit ? attacker.critDmg / 100 : 1;
      const final  = Math.max(1, Math.round(raw * mult * (1 - defReduction)));
      hits.push({ dmg: final, isCrit, isBonus: false });
      if (isCrit && giftInfo.critBonus) {
        const bonusFinal = Math.max(1, Math.round(attacker.atk * (giftInfo.critBonus / 100) * (1 - defReduction)));
        hits.push({ dmg: bonusFinal, isCrit: false, isBonus: true });
      }
    });
  }
  return hits;
}

// ── UI updates ────────────────────────────────────────────────
function updateAll() { ['A','B'].forEach(id => updateStatPanel(id)); }

function updateStatPanel(id) {
  const f  = state.fighters[id];
  const lo = id.toLowerCase();
  const pct = Math.max(0, f.hp / f.maxHp * 100);
  document.getElementById(`hp-bar-${lo}`).style.width = pct + '%';
  const stunSuffix = f.stunned ? `  ⚡CHOÁNG ${f.stunTimer.toFixed(1)}s` : '';
  document.getElementById(`hp-text-${lo}`).textContent = `${Math.max(0,f.hp)} / ${f.maxHp}${stunSuffix}`;
  setStatVal(`s-hp-${lo}`,      `${Math.max(0,f.hp)}/${f.maxHp}`);
  setStatVal(`s-hpbar-${lo}`,   null, pct);
  setStatVal(`s-atk-${lo}`,     f.atk);
  setStatVal(`s-def-${lo}`,     f.def);
  setStatVal(`s-crit-${lo}`,    `${f.crit}%`);
  setStatVal(`s-critdmg-${lo}`, `${f.critDmg}%`);
  setStatVal(`s-gift-${lo}`,    f.gifts);
  setStatVal(`s-totdmg-${lo}`,  f.totalDmg);
}

function setStatVal(elId, text, barPct) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (barPct !== undefined && barPct !== null) { el.style.width = barPct + '%'; return; }
  if (el.textContent !== String(text)) {
    el.textContent = text;
    el.classList.remove('stat-bump'); void el.offsetWidth; el.classList.add('stat-bump');
  }
}

function spawnDmgText(x, y, text, cls) {
  const el = document.createElement('div');
  el.className = `dmg-text ${cls}`;
  el.textContent = text;
  el.style.left = (x / 640 * 100) + '%';
  el.style.top  = (y / 220 * 100) + '%';
  document.getElementById('damage-layer').appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

let _notifyTimer = null;
function showGiftNotify(html) {
  const wrap = document.getElementById('gift-notify');
  wrap.innerHTML = '';
  const el = document.createElement('div');
  el.className = 'gift-popup';
  el.innerHTML = html;
  wrap.appendChild(el);
  clearTimeout(_notifyTimer);
  _notifyTimer = setTimeout(() => { wrap.innerHTML = ''; }, 2300);
}

function addBuffTag(id, text, cls) {
  const area = document.getElementById(`buff-${id.toLowerCase()}`);
  const tag  = document.createElement('div');
  tag.className = `buff-tag ${cls}`;
  tag.textContent = text;
  area.appendChild(tag);
  while (area.children.length > 6) area.removeChild(area.firstChild);
}

function handleCombo(id, count) {
  if (count < 3) return;
  const banner = document.getElementById('combo-banner');
  banner.textContent = `${id === 'A' ? '🔴' : '🔵'} ${count}× COMBO!!`;
  clearTimeout(state._bannerTimer);
  state._bannerTimer = setTimeout(() => { banner.textContent = ''; }, 1600);
}

function shakeArena(big = false) {
  const el = document.getElementById('arena-wrap');
  const cls = big ? 'shaking-big' : 'shaking';
  el.classList.remove('shaking','shaking-big');
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), big ? 520 : 380);
}

function critFlash() {
  let el = document.getElementById('crit-flash');
  if (!el) {
    el = document.createElement('div');
    el.id = 'crit-flash';
    document.getElementById('arena-wrap').appendChild(el);
  }
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 80);
}

// ── Skill routing ─────────────────────────────────────────────
// ── Skill GIF pre-effect ──────────────────────────────────────
// canvas là 640×400, arena-wrap có thể scale khác nhau trong DOM
// dùng % để tính toán vị trí tương đối
function playSkillGif(attacker, callback) {
  const el   = document.getElementById('skill-gif');
  const wrap = document.getElementById('arena-wrap');
  const ww   = wrap.offsetWidth;
  const wh   = wrap.offsetHeight;

  // Vị trí attacker trong canvas (640×400) → % trong wrap
  // Đội A (đỏ) nhích trái, đội B (xanh) nhích trái
  const nudge  = attacker.id === 'A' ? -4 : -2;
  const leftPct = (attacker.x / 640) * 100 + nudge;
  const yOffset = attacker.id === 'A' ? -30 : -30;
  const topPct  = ((attacker.y + yOffset) / 220) * 100;

  const size = Math.round(ww * 0.1125); // ~11.25% chiều rộng wrap (-10%)
  el.style.width   = size + 'px';
  el.style.height  = size + 'px';
  el.style.left    = leftPct + '%';
  el.style.top     = topPct  + '%';
  el.style.display = 'block';

  // Reset GIF bằng cách đổi src để rewind về frame 0
  const src = el.src;
  el.src = '';
  el.src = src;

  // GIF 18 frames — ước tính ~100ms/frame = ~1.8s, dùng 1.6s để không delay quá
  const GIF_DURATION = 1600;
  setTimeout(() => {
    el.style.display = 'none';
    if (callback) callback();
  }, GIF_DURATION);
}

// triggerSkillFX: chỉ dùng cho skill KHÔNG có cinematic
// Skill có cinematic (Universe/Lightning/Dragon) đi qua _runQueue → _triggerSkillFXNoCinematic
function triggerSkillFX(giftName, attacker, defender, hits, onHit) {
  switch (giftName) {
    case 'Rose':
      SkillFX.add(makeRoseBloomEffect(attacker));
      SkillFX.add(makeSlashEffect(defender, [0], onHit));
      break;
    case 'TikTok':
      SkillFX.add(makeCritSlashEffect(defender, onHit));
      break;
    case 'Galavant':
      SkillFX.add(makeArmorEffect(attacker));
      SkillFX.add(makeArrowEffect(attacker, defender, hits, onHit));
      break;
    case 'Cupid':
      SkillFX.add(makeArrowRainEffect(attacker, defender, hits, onHit));
      break;
    default:
      onHit(0);
  }
}

// ── Stun ──────────────────────────────────────────────────────
function tryStun(fighter, info) {
  if (!info.stunChance || fighter.stunned || fighter.dead) return;
  if (Math.random() * 100 >= info.stunChance) return;
  fighter.stunned = true;
  fighter.stunTimer = info.stunDur;
  addBuffTag(fighter.id, `⚡ CHOÁNG ${info.stunDur}s`, 'stun-buff');
  SkillFX.add(makeStunEffect(fighter));
  updateAll();
}

// ── Buff ──────────────────────────────────────────────────────
function applyBuff(fighter, giftInfo) {
  const pct = giftInfo.buffPct || {};
  // Scale dựa theo % HP còn lại: HP càng thấp thì buff càng mạnh (tối đa 3x khi gần chết)
  const hpRatio = fighter.hp / fighter.maxHp;
  const lowHpMult = 1 + (1 - hpRatio) * 2; // 1x ở full HP, 3x khi HP = 0
  if (pct.atk) {
    const gain = Math.max(1, Math.round(fighter.atk * pct.atk / 100));
    fighter.atk += gain;
    addBuffTag(fighter.id, `+${gain} ATK(${pct.atk}%)`, 'atk-buff');
  }
  if (pct.def) {
    const base = pct.def * (giftInfo.healPct ? lowHpMult : 1);
    const gain = Math.max(1, Math.round(fighter.def * base / 100));
    fighter.def += gain;
    addBuffTag(fighter.id, `+${gain} DEF`, 'def-buff');
  }
  if (pct.maxHp) {
    const base = pct.maxHp * (giftInfo.healPct ? lowHpMult : 1);
    const gain = Math.max(1, Math.round(fighter.maxHp * base / 100));
    fighter.maxHp += gain;
    fighter.hp = Math.min(fighter.hp + gain, fighter.maxHp);
    addBuffTag(fighter.id, `+${gain} MaxHP`, 'hp-buff');
  }
  if (giftInfo.healPct) {
    const base = giftInfo.healPct * lowHpMult;
    const heal = Math.max(1, Math.round(fighter.maxHp * base / 100));
    fighter.hp = Math.min(fighter.hp + heal, fighter.maxHp);
    addBuffTag(fighter.id, `+${heal} HEAL`, 'hp-buff');
  }
  const flat = giftInfo.buff || {};
  if (flat.crit)    { fighter.crit = Math.min(fighter.crit + flat.crit, 100);
                      addBuffTag(fighter.id, `+${flat.crit} CRIT`, 'crit-buff'); }
  if (flat.critDmg) { fighter.critDmg += flat.critDmg;
                      addBuffTag(fighter.id, `+${flat.critDmg} CDMG`, 'crit-buff'); }
}

// ─────────────────────────────────────────────────────────────
//  SKILL QUEUE  – mỗi team có queue riêng
//  Khi queue đang chạy, gift mới xếp vào hàng đợi.
//  Cinematic chỉ chạy 1 lần cho batch đầu tiên của mỗi gift có cutscene.
// ─────────────────────────────────────────────────────────────
const _skillQueue = { A: [], B: [] };
const _queueRunning = { A: false, B: false };

function _buildOnHit(att, def, defender, team, info, hits) {
  const defX = def.x + (defender === 'A' ? -10 : -18);
  return (i) => {
    if (state.gameOver && def.hp <= 0) return;
    const hit = hits[i];
    def.hp = Math.max(0, def.hp - hit.dmg);
    att.totalDmg += hit.dmg;
    def.hitFlash = 1;

    spawnParticles(defX, def.y - 60, info.color, hit.isCrit ? 20 : 12, info.tier);
    if (hit.isCrit) spawnParticles(defX, def.y - 70, '#ffee00', 12, 2.5);

    const dmgY = def.y - 85 - i * 24 - Math.random() * 12;
    if (hit.isCrit) {
      spawnDmgText(defX + (Math.random()-0.5)*20, dmgY, `💥 -${hit.dmg}`, 'dmg-crit');
      critFlash(); shakeArena(info.tier >= 2);
    } else if (info.tier === 3) {
      spawnDmgText(defX, dmgY, `🌌 -${hit.dmg}`, 'dmg-gold');
      shakeArena(true);
    } else {
      spawnDmgText(defX + (Math.random()-0.5)*16, dmgY, `-${hit.dmg}`,
        defender === 'A' ? 'dmg-red' : 'dmg-blue');
      if (info.tier >= 2) shakeArena(false);
    }

    updateAll();

    if (!hit.isBonus && i === hits.findLastIndex(h => !h.isBonus)) {
      tryStun(def, info);
    }

    if (def.hp <= 0 && !def.dead) {
      def.dead = true;
      setTimeout(() => Game.showWin(team), 600);
    }
  };
}

// Skill có cinematic cutscene
const CINEMATIC_SKILLS = new Set(['Universe', 'Lightning']);

function _runQueue(team) {
  const queue = _skillQueue[team];
  if (queue.length === 0) { _queueRunning[team] = false; return; }
  _queueRunning[team] = true;

  const { giftName, att, def, hits, onHit } = queue[0];
  const hasCinematic = CINEMATIC_SKILLS.has(giftName);

  if (hasCinematic) {
    // Lấy entry đầu, phần còn lại sẽ được gom sau khi cinematic xong
    const batch = [queue.shift()];

    const cutsceneType = giftName === 'Universe' ? 'meteor'
                       : giftName === 'Lightning' ? 'lightning_storm'
                       : 'dragon';

    playSkillGif(att, () => {
      Cutscene.play(cutsceneType, () => {
        // Gom tất cả entry cùng loại đã push vào queue trong lúc cinematic chạy
        while (queue.length > 0 && queue[0].giftName === giftName) {
          batch.push(queue.shift());
        }

        // Chạy tuần tự từng skill trong batch
        let delay = 0;
        batch.forEach((e, idx) => {
          setTimeout(() => {
            e.att.isAttacking = true;
            e.att.attackTimer = 0.5;
            _triggerSkillFXNoCinematic(e.giftName, e.att, e.def, e.hits, e.onHit);
            if (idx === batch.length - 1) {
              setTimeout(() => _runQueue(team), 400);
            }
          }, delay);
          delay += 300;
        });
      });
    });

  } else {
    // Skill thường: lưu ref trước khi shift
    const entry = queue.shift();
    entry.att.isAttacking = true;
    entry.att.attackTimer = 0.5;
    playSkillGif(entry.att, () => {
      triggerSkillFX(entry.giftName, entry.att, entry.def, entry.hits, entry.onHit);
      setTimeout(() => _runQueue(team), 200);
    });
  }
}

// triggerSkillFX không có cinematic (dùng sau khi cutscene đã chạy)
function _triggerSkillFXNoCinematic(giftName, attacker, defender, hits, onHit) {
  switch (giftName) {
    case 'Universe':
      SkillFX.add(makeMeteorEffect(attacker, defender, () => onHit(0)));
      break;
    case 'Lightning':
      SkillFX.add(makeLightningEffect(defender, hits, onHit));
      break;
    case 'Dragon':
      SkillFX.add(makeDragonArrowEffect(attacker, defender, hits, onHit));
      break;
    default:
      triggerSkillFX(giftName, attacker, defender, hits, onHit);
  }
}

// ─────────────────────────────────────────────────────────────
//  CORE: receive gift
// ─────────────────────────────────────────────────────────────
const Game = {
  receiveGift(team, giftName, qty = 1, sender = 'Ẩn danh') {
    if (state.gameOver) return;
    const info     = GIFTS[giftName] || DEFAULT_GIFT;
    const defender = team === 'A' ? 'B' : 'A';
    const att      = state.fighters[team];
    const def      = state.fighters[defender];

    if (att.stunned) {
      showGiftNotify(
        `${team === 'A' ? '🔴 ĐỎ' : '🔵 XANH'} đang bị <span style="color:#ffee44">⚡CHOÁNG</span>!<br>` +
        `<span style="color:#aaa;font-size:5px">Còn ${att.stunTimer.toFixed(1)}s</span>`
      );
      return;
    }

    att.gifts += qty;
    for (let i = 0; i < qty; i++) applyBuff(att, info);

    const hits     = calcHits(att, def, info, qty);
    const totalDmg = hits.reduce((s, h) => s + h.dmg, 0);
    const anyCrit  = hits.some(h => h.isCrit);

    const attLo = team.toLowerCase();
    ['s-atk-', 's-crit-', 's-def-'].forEach(p => {
      const e = document.getElementById(p + attLo);
      if (e) { e.classList.remove('stat-bump'); void e.offsetWidth; e.classList.add('stat-bump'); }
    });
    att.combo++;
    clearTimeout(att.comboTimer);
    att.comboTimer = setTimeout(() => { att.combo = 0; }, 2200);
    handleCombo(team, att.combo);

    const critNote  = anyCrit ? ' <span style="color:#ff9900">⚡CRIT!</span>' : '';
    const teamLabel = team === 'A' ? '🔴 ĐỘI ĐỎ' : '🔵 ĐỘI XANH';
    showGiftNotify(
      `${info.label} ×${qty} → <b style="color:#fff">${teamLabel}</b>${critNote}<br>` +
      `<span style="color:#aaa;font-size:5px">by ${sender} | ${hits.length} hits | -${totalDmg} HP | ${info.desc}</span>`
    );

    const onHit = _buildOnHit(att, def, defender, team, info, hits);

    // Nếu skill không có cinematic và queue đang trống → chạy ngay
    if (!CINEMATIC_SKILLS.has(giftName) && !_queueRunning[team] && _skillQueue[team].length === 0) {
      att.isAttacking = true;
      att.attackTimer = 0.5;
      playSkillGif(att, () => triggerSkillFX(giftName, att, def, hits, onHit));
      return;
    }

    // Xếp vào queue
    _skillQueue[team].push({ giftName, att, def, hits, onHit });
    if (!_queueRunning[team]) _runQueue(team);
  },

  showWin(team) {
    state.gameOver = true;
    const winner   = state.fighters[team];
    const teamName = team === 'A' ? '🔴 TEAM ĐỎ' : '🔵 TEAM XANH';
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        spawnParticles(winner.x, winner.y - 60, '#ffe066', 20, 2.5);
        spawnParticles(winner.x, winner.y - 50, '#ff4400', 12, 2);
        spawnParticles(winner.x, winner.y - 70, '#ffffff', 10, 3);
      }, i * 150);
    }
    const banner = document.getElementById('combo-banner');
    banner.innerHTML = `🏆 ${teamName} CHIẾN THẮNG! 🏆`;
    banner.style.cssText = 'font-size:13px;color:#ffe066;text-shadow:2px 2px 0 #8a6000,0 0 30px #ffe066;';
    document.getElementById('controls').innerHTML = `
      <div class="ctrl-label" style="color:#ffe066;font-size:7px">🏆 ${teamName} CHIẾN THẮNG!</div>
      <div style="display:flex;gap:20px;font-size:6px;color:#aaa;margin:6px 0">
        <div>🔴 ATK:${state.fighters.A.atk} DEF:${state.fighters.A.def} CRIT:${state.fighters.A.crit}% Gifts:${state.fighters.A.gifts} Dmg:${state.fighters.A.totalDmg}</div>
        <div>🔵 ATK:${state.fighters.B.atk} DEF:${state.fighters.B.def} CRIT:${state.fighters.B.crit}% Gifts:${state.fighters.B.gifts} Dmg:${state.fighters.B.totalDmg}</div>
      </div>
      <button onclick="Game.resetGame()" style="background:#ffe066;color:#000;border-color:#b8860b;font-size:8px;padding:10px 20px;">🔄 CHƠI LẠI</button>
    `;
  },

  resetGame() {
    state.fighters.A = makeFighter('A');
    state.fighters.B = makeFighter('B');
    state.particles  = [];
    state.gameOver   = false;
    _skillQueue.A.length = 0;
    _skillQueue.B.length = 0;
    _queueRunning.A = false;
    _queueRunning.B = false;
    Cutscene.stop();
    document.getElementById('skill-gif').style.display = 'none';
    SkillFX.clear();
    document.getElementById('buff-a').innerHTML = '';
    document.getElementById('buff-b').innerHTML = '';
    document.getElementById('combo-banner').innerHTML = '';
    document.getElementById('combo-banner').style.cssText = '';
    renderEquipPanel('A');
    renderEquipPanel('B');
    updateAll();
    document.getElementById('controls').innerHTML = `
      <div class="ctrl-label">⚔️ Giả lập Gift – buff stat + chiến đấu:</div>
      <div class="ctrl-row">
        <button onclick="Game.receiveGift('A','Rose',1,'Nguyen A')">🌹 Rose → 🔴</button>
        <button onclick="Game.receiveGift('B','Rose',1,'Tran B')">🌹 Rose → 🔵</button>
        <button onclick="Game.receiveGift('A','TikTok',1,'Le C')">✨ TikTok → 🔴</button>
        <button onclick="Game.receiveGift('B','TikTok',1,'Pham D')">✨ TikTok → 🔵</button>
        <button onclick="Game.receiveGift('A','Universe',1,'VIP A')">🌌 Universe → 🔴</button>
        <button onclick="Game.receiveGift('B','Universe',1,'VIP B')">🌌 Universe → 🔵</button>
        <button onclick="Game.receiveGift('A','Lightning',1,'VIP A')">⚡ Lightning → 🔴</button>
        <button onclick="Game.receiveGift('B','Lightning',1,'VIP B')">⚡ Lightning → 🔵</button>
        <button onclick="Game.receiveGift('A','Galavant',1,'Hoang E')">🏇 Galavant → 🔴</button>
        <button onclick="Game.receiveGift('B','Galavant',1,'Nguyen F')">🏇 Galavant → 🔵</button>
        <button onclick="Game.receiveGift('A','Cupid',1,'VIP A')">💘 Cupid → 🔴</button>
        <button onclick="Game.receiveGift('B','Cupid',1,'VIP B')">💘 Cupid → 🔵</button>
        <button onclick="Game.receiveGift('A','Dragon',1,'VIP A')">🐉 Dragon → 🔴</button>
        <button onclick="Game.receiveGift('B','Dragon',1,'VIP B')">🐉 Dragon → 🔵</button>
        <button onclick="Game.resetGame()" class="btn-reset">🔄 Reset</button>
      </div>
    `;
  },
};

updateAll();

// ─────────────────────────────────────────────────────────────
//  AUTO SKILL
// ─────────────────────────────────────────────────────────────
// Skill pool bình thường (không có Dragon vì đã bỏ cinematic rồng)
const AUTO_SKILLS = ['Rose', 'TikTok', 'Galavant', 'Cupid', 'Lightning', 'Universe'];
// Pool khi HP < 50%: Galavant có weight cao hơn
const AUTO_SKILLS_LOW = ['Galavant', 'Galavant', 'Galavant', 'Rose', 'TikTok', 'Cupid', 'Lightning', 'Universe'];

let _autoEnabled = false;
const _autoSkillTimer = { A: 0, B: 0 };
const _autoGachaTimer = { A: 0, B: 0 };

function _autoTick(team, dt) {
  if (!_autoEnabled || state.gameOver) return;
  const f = state.fighters[team];
  if (f.dead) return;

  // Skill timer
  _autoSkillTimer[team] -= dt;
  if (_autoSkillTimer[team] <= 0) {
    _autoSkillTimer[team] = 8 + Math.random() * 4;
    const pool = (f.hp / f.maxHp < 0.5) ? AUTO_SKILLS_LOW : AUTO_SKILLS;
    const skill = pool[Math.floor(Math.random() * pool.length)];
    Game.receiveGift(team, skill, 1, 'Auto');
  }

  // Gacha timer: mỗi 15-25s
  _autoGachaTimer[team] -= dt;
  if (_autoGachaTimer[team] <= 0) {
    _autoGachaTimer[team] = 35 + Math.random() * 25;
    Gacha.roll(team, 1, 'Auto');
  }
}

Game.setAutoSkill = function(enabled) {
  _autoEnabled = enabled;
  if (enabled) {
    _autoSkillTimer.A = 8 + Math.random() * 4;
    _autoSkillTimer.B = 8 + Math.random() * 4;
    _autoGachaTimer.A = 35 + Math.random() * 25;
    _autoGachaTimer.B = 35 + Math.random() * 25;
  }
};

(function() {
  const __raf = requestAnimationFrame;
  let _lastTs = performance.now();
  const _loop = (ts) => {
    const dt = Math.min((ts - _lastTs) / 1000, 0.05);
    _lastTs = ts;
    _autoTick('A', dt);
    _autoTick('B', dt);
    __raf(_loop);
  };
  __raf(_loop);
})();

// ─────────────────────────────────────────────────────────────
//  WebSocket client – nhận lệnh từ server.js
// ─────────────────────────────────────────────────────────────
(function connectWS() {
  const WS_URL = 'ws://localhost:3001';
  let ws, reconnectTimer;

  function connect() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('[WS] Connected to game server');
      showLiveStatus(true);
      clearTimeout(reconnectTimer);
    };

    ws.onmessage = e => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }

      if (msg.type === 'gift') {
        const { team, giftName, qty, sender } = msg;
        if (giftName === 'Gacha') {
          Gacha.roll(team, 1, sender || 'TikTok');
        } else if (team && giftName) {
          Game.receiveGift(team, giftName, qty || 1, sender || 'TikTok');
        }

      } else if (msg.type === 'connected') {
        showLiveStatus(true, msg.viewers);

      } else if (msg.type === 'disconnected') {
        showLiveStatus(false);
      }
    };

    ws.onclose = () => {
      showLiveStatus(false);
      reconnectTimer = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }

  function showLiveStatus(live, viewers) {
    let el = document.getElementById('live-status');
    if (!el) {
      el = document.createElement('div');
      el.id = 'live-status';
      el.style.cssText = 'position:fixed;top:8px;right:12px;font-family:"Press Start 2P",monospace;font-size:7px;padding:4px 8px;border-radius:3px;z-index:9999;transition:background .4s';
      document.body.appendChild(el);
    }
    if (live) {
      el.textContent = viewers ? `🔴 LIVE  👁 ${viewers}` : '🔴 LIVE';
      el.style.background = '#cc0000';
      el.style.color = '#fff';
    } else {
      el.textContent = '⚫ offline';
      el.style.background = '#333';
      el.style.color = '#888';
    }
  }

  connect();
})();

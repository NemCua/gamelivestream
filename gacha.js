// ─────────────────────────────────────────────────────────────
//  GACHA SYSTEM  –  gacha.js
// ─────────────────────────────────────────────────────────────

// ── Rarity config ─────────────────────────────────────────────
const RARITY = {
  N:   { id:'N',   name:'Normal',            color:'#aaaaaa', glow:'#888',    weight:25, stars:1 },
  R:   { id:'R',   name:'Rare',              color:'#44aaff', glow:'#2288ff', weight:30, stars:2 },
  SR:  { id:'SR',  name:'Super Rare',        color:'#aa44ff', glow:'#8822ff', weight:22, stars:3 },
  SSR: { id:'SSR', name:'Super Super Rare',  color:'#ffaa00', glow:'#ff7700', weight:15, stars:4 },
  UR:  { id:'UR',  name:'Ultra Rare',        color:'#ff2255', glow:'#ff0033', weight:8,  stars:5 },
};
const RARITY_ORDER = ['N','R','SR','SSR','UR'];

// ── Item database: 5 slots × 5 rarities ──────────────────────
// statPct: % của BASE stat (atk/def/maxHp nhân BASE, crit/critDmg cộng thẳng điểm)
const ITEM_DB = {
  weapon: [
    { slot:'weapon', rarity:'N',   icon:'🗡️',  img:'vukhi/sword_N.png',   name:'Kiếm Gỗ',         statPct:{ atk:30  } },
    { slot:'weapon', rarity:'R',   icon:'⚔️',  img:'vukhi/sword_R.png',   name:'Kiếm Sắt',        statPct:{ atk:80  } },
    { slot:'weapon', rarity:'SR',  icon:'🔱',  img:'vukhi/sword_SR.png',  name:'Kiếm Bạch Kim',   statPct:{ atk:180, crit:3 } },
    { slot:'weapon', rarity:'SSR', icon:'⚡',  img:'vukhi/sword_SSR.png', name:'Kiếm Sấm Sét',    statPct:{ atk:350, crit:6, critDmg:25 } },
    { slot:'weapon', rarity:'UR',  icon:'🌌',  img:'vukhi/sword_UR.png',  name:'Kiếm Vũ Trụ',     statPct:{ atk:600, crit:10, critDmg:50 } },
  ],
  armor: [
    { slot:'armor',  rarity:'N',   icon:'👕',  img:'vukhi/shield_N.png',   name:'Khiên Gỗ',        statPct:{ def:60  } },
    { slot:'armor',  rarity:'R',   icon:'🛡️',  img:'vukhi/shield_R.png',   name:'Khiên Sắt',       statPct:{ def:160, maxHp:1 } },
    { slot:'armor',  rarity:'SR',  icon:'🔰',  img:'vukhi/shield_SR.png',  name:'Khiên Mithril',   statPct:{ def:360, maxHp:2 } },
    { slot:'armor',  rarity:'SSR', icon:'💠',  img:'vukhi/shield_SSR.png', name:'Khiên Rồng',      statPct:{ def:700, maxHp:4 } },
    { slot:'armor',  rarity:'UR',  icon:'🌟',  img:'vukhi/shield_UR.png',  name:'Khiên Thiên Thần',statPct:{ def:1200, maxHp:8 } },
  ],
  gloves: [
    { slot:'gloves', rarity:'N',   icon:'🧤',  img:'vukhi/glove_N.png',   name:'Găng Vải',        statPct:{ atk:20, crit:1 } },
    { slot:'gloves', rarity:'R',   icon:'🥊',  img:'vukhi/glove_R.png',   name:'Găng Da',         statPct:{ atk:50, crit:3 } },
    { slot:'gloves', rarity:'SR',  icon:'⚙️',  img:'vukhi/glove_SR.png',  name:'Găng Thép',       statPct:{ atk:100, crit:6 } },
    { slot:'gloves', rarity:'SSR', icon:'🔥',  img:'vukhi/glove_SSR.png', name:'Găng Lửa',        statPct:{ atk:180, crit:10, critDmg:20 } },
    { slot:'gloves', rarity:'UR',  icon:'💫',  img:'vukhi/glove_UR.png',  name:'Găng Thánh',      statPct:{ atk:300, crit:15, critDmg:40 } },
  ],
  boots: [
    { slot:'boots',  rarity:'N',   icon:'👟',  img:'vukhi/shoe_N.png',   name:'Giày Vải',        statPct:{ def:40, maxHp:0.5 } },
    { slot:'boots',  rarity:'R',   icon:'👢',  img:'vukhi/shoe_R.png',   name:'Giày Da',         statPct:{ def:100, maxHp:1 } },
    { slot:'boots',  rarity:'SR',  icon:'⛸️',  img:'vukhi/shoe_SR.png',  name:'Giày Gió',        statPct:{ def:200, maxHp:2, crit:2 } },
    { slot:'boots',  rarity:'SSR', icon:'🌪️',  img:'vukhi/shoe_SSR.png', name:'Giày Lốc Xoáy',  statPct:{ def:400, maxHp:4, crit:5 } },
    { slot:'boots',  rarity:'UR',  icon:'🌈',  img:'vukhi/shoe_UR.png',  name:'Giày Cầu Vồng',   statPct:{ def:700, maxHp:7, crit:8 } },
  ],
  hat: [
    { slot:'hat',    rarity:'N',   icon:'🪖',  img:'vukhi/hat_N.png',   name:'Mũ Vải',          statPct:{ atk:10, def:20 } },
    { slot:'hat',    rarity:'R',   icon:'⛑️',  img:'vukhi/hat_R.png',   name:'Mũ Sắt',          statPct:{ atk:40, def:80, critDmg:10 } },
    { slot:'hat',    rarity:'SR',  icon:'👑',  img:'vukhi/hat_SR.png',  name:'Mũ Ma Pháp',      statPct:{ atk:80, def:160, critDmg:25 } },
    { slot:'hat',    rarity:'SSR', icon:'✨',  img:'vukhi/hat_SSR.png', name:'Mũ Tinh Tú',      statPct:{ atk:150, def:300, crit:5, critDmg:40 } },
    { slot:'hat',    rarity:'UR',  icon:'🌠',  img:'vukhi/hat_UR.png',  name:'Mũ Thiên Hà',     statPct:{ atk:250, def:500, crit:10, critDmg:70 } },
  ],
};

const SLOTS = ['weapon','armor','gloves','boots','hat'];
const SLOT_LABELS = { weapon:'Vũ Khí', armor:'Khiên', gloves:'Găng', boots:'Giày', hat:'Mũ' };
const SLOT_ICONS  = { weapon:'⚔️', armor:'🛡️', gloves:'🧤', boots:'👟', hat:'🪖' };

// ── Roll table build ──────────────────────────────────────────
const ROLL_TABLE = [];
Object.values(RARITY).forEach(r => {
  for (let i = 0; i < r.weight; i++) ROLL_TABLE.push(r.id);
});

function rollRarity(giftTier) {
  // tier 3 (Universe): guaranteed min SR
  // tier 2 (TikTok/Galavant): guaranteed min R
  // tier 1: full random
  let pool = [...ROLL_TABLE];
  if (giftTier >= 3) pool = pool.filter(r => ['SR','SSR','UR'].includes(r));
  else if (giftTier >= 2) pool = pool.filter(r => ['R','SR','SSR','UR'].includes(r));
  return pool[Math.floor(Math.random() * pool.length)];
}

function rollItem(slot, giftTier) {
  const rarityId = rollRarity(giftTier);
  return ITEM_DB[slot].find(i => i.rarity === rarityId);
}

// ── Fighter equipment state ───────────────────────────────────
function makeEquipment() {
  return { weapon:null, armor:null, gloves:null, boots:null, hat:null };
}

// ── Resolve statPct → flat bonus values ───────────────────────
function resolveItemStats(item) {
  const result = {};
  Object.entries(item.statPct).forEach(([k, pct]) => {
    if (k === 'crit' || k === 'critDmg') {
      result[k] = pct;
    } else {
      result[k] = Math.round(BASE[k] * pct / 100);
    }
  });
  return result;
}

// ── Stat diff when equipping a new item ──────────────────────
function equipItem(fighter, newItem) {
  const slot    = newItem.slot;
  const oldItem = fighter.equip[slot];

  if (oldItem) {
    const old = resolveItemStats(oldItem);
    Object.entries(old).forEach(([k, v]) => {
      if (k === 'maxHp') { fighter.maxHp = Math.max(BASE.maxHp, fighter.maxHp - v); }
      else fighter[k] = Math.max(0, fighter[k] - v);
    });
  }

  const bonus = resolveItemStats(newItem);
  Object.entries(bonus).forEach(([k, v]) => {
    if (k === 'maxHp') { fighter.maxHp += v; fighter.hp = Math.min(fighter.hp + v, fighter.maxHp); }
    else fighter[k] += v;
  });

  fighter.equip[slot] = newItem;
  return oldItem;
}

// ── Is new item better? ───────────────────────────────────────
function isUpgrade(oldItem, newItem) {
  if (!oldItem) return true;
  return RARITY_ORDER.indexOf(newItem.rarity) > RARITY_ORDER.indexOf(oldItem.rarity);
}

// ─────────────────────────────────────────────────────────────
//  GACHA MODAL
// ─────────────────────────────────────────────────────────────
const GachaModal = {
  _queue: [],   // pending modals to show sequentially
  _showing: false,

  show(team, item, isUpg, oldItem, sender) {
    this._queue.push({ team, item, isUpg, oldItem, sender });
    if (!this._showing) this._next();
  },

  _next() {
    if (!this._queue.length) { this._showing = false; return; }
    this._showing = true;
    const data = this._queue.shift();
    this._render(data, () => this._next());
  },

  _render({ team, item, isUpg, oldItem, sender }, onClose) {
    const rar     = RARITY[item.rarity];
    const overlay = document.createElement('div');
    overlay.id    = 'gacha-overlay';

    // ── Phase colors ──
    const rarBg = {
      N:   'linear-gradient(160deg,#1a1a1a,#2a2a2a)',
      R:   'linear-gradient(160deg,#0a1a3a,#0d2255)',
      SR:  'linear-gradient(160deg,#1a0a3a,#2d0d66)',
      SSR: 'linear-gradient(160deg,#2a1a00,#553300)',
      UR:  'linear-gradient(160deg,#2a0010,#660022)',
    }[item.rarity];

    const teamColor = team === 'A' ? '#ff5555' : '#55aaff';
    const teamName  = team === 'A' ? '🔴 ĐỘI ĐỎ' : '🔵 ĐỘI XANH';
    const starHTML  = '⭐'.repeat(rar.stars);
    const statLines = Object.entries(resolveItemStats(item))
      .map(([k,v]) => `<span class="gs-stat">${statKey(k)} +${v}</span>`)
      .join('');

    const upgradeHTML = isUpg
      ? `<div class="gs-upgrade">
           ${oldItem ? `<span class="gs-old">${oldItem.icon} ${oldItem.name}</span> → ` : ''}
           <span class="gs-new" style="color:${rar.color}">✨ TRANG BỊ MỚI!</span>
         </div>`
      : `<div class="gs-no-upgrade">Đã có đồ tốt hơn – giữ nguyên</div>`;

    overlay.innerHTML = `
      <div class="gacha-backdrop"></div>
      <div class="gacha-box" id="gacha-box" style="background:${rarBg}; border-color:${rar.color};">

        <!-- Particles canvas -->
        <canvas id="gacha-canvas" width="520" height="360"></canvas>

        <!-- Beam rays -->
        <div class="gacha-rays" id="gacha-rays"></div>

        <!-- Content -->
        <div class="gacha-content" id="gacha-content">
          <div class="gs-sender" style="color:${teamColor}">${teamName} – ${sender}</div>

          <div class="gs-card" id="gacha-card" style="border-color:${rar.color}; box-shadow: 0 0 40px ${rar.glow}88;">
            <div class="gs-card-inner">
              <div class="gs-rarity" style="color:${rar.color}; text-shadow:0 0 16px ${rar.glow}">
                ${rar.name.toUpperCase()}
              </div>
              <div class="gs-icon">${item.img ? `<img src="${item.img}" class="gs-item-img">` : item.icon}</div>
              <div class="gs-name" style="color:${rar.color}">${item.name}</div>
              <div class="gs-stars">${starHTML}</div>
              <div class="gs-slot">${SLOT_LABELS[item.slot]}</div>
              <div class="gs-stats">${statLines}</div>
            </div>
          </div>

          ${upgradeHTML}

          <div class="gs-countdown-bar-wrap"><div class="gs-countdown-bar" id="gacha-countdown-bar"></div></div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
      const box = document.getElementById('gacha-box');
      box.classList.add('gacha-box-in');
      this._runParticles(item.rarity, rar.color);
      this._runRays(rar.color);

      // Card flip in after short delay
      setTimeout(() => {
        const card = document.getElementById('gacha-card');
        if (card) card.classList.add('card-revealed');
      }, 300);

      // Auto-close after rarity-based delay
      const DISPLAY_MS = { N: 500, R: 650, SR: 900, SSR: 1200, UR: 1600 };
      const displayMs = DISPLAY_MS[item.rarity] || 2000;
      const bar = document.getElementById('gacha-countdown-bar');
      if (bar) {
        bar.style.transition = `width ${displayMs}ms linear`;
        requestAnimationFrame(() => { bar.style.width = '0%'; });
      }
      this._autoCloseTimer = setTimeout(() => { this._close(); }, displayMs);
    });

    this._closeCallback = () => {
      clearTimeout(this._autoCloseTimer);
      overlay.classList.add('gacha-fadeout');
      setTimeout(() => {
        overlay.remove();
        onClose();
      }, 350);
    };
  },

  _close() {
    if (this._closeCallback) {
      this._closeCallback();
      this._closeCallback = null;
    }
  },

  // Particle burst inside gacha modal canvas
  _runParticles(rarityId, color) {
    const cvs = document.getElementById('gacha-canvas');
    if (!cvs) return;
    const c   = cvs.getContext('2d');
    const W   = cvs.width, H = cvs.height;
    const cx  = W / 2, cy = H / 2;
    const pts = [];
    const count = { N:20, R:35, SR:55, SSR:80, UR:120 }[rarityId];
    const colors = [color, '#ffffff', '#ffe066',
      rarityId === 'UR' ? '#ff88aa' : color];

    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1.5 + Math.random() * 4;
      pts.push({
        x: cx, y: cy,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1,
        life: 1, decay: 0.012 + Math.random() * 0.02,
        color: colors[~~(Math.random() * colors.length)],
        size: 2 + ~~(Math.random() * 5),
      });
    }

    // Extra star-burst for SSR/UR
    if (rarityId === 'SSR' || rarityId === 'UR') {
      for (let i = 0; i < 30; i++) {
        const a = (i / 30) * Math.PI * 2;
        pts.push({
          x: cx, y: cy,
          vx: Math.cos(a) * (3 + Math.random() * 3),
          vy: Math.sin(a) * (3 + Math.random() * 3),
          life: 1, decay: 0.008,
          color: rarityId === 'UR' ? '#ff2255' : '#ffaa00',
          size: 3,
        });
      }
    }

    let running = true;
    setTimeout(() => { running = false; }, 3000);

    const tick = () => {
      if (!document.getElementById('gacha-canvas')) return;
      c.clearRect(0, 0, W, H);
      pts.forEach(p => {
        if (p.life <= 0) return;
        p.x += p.vx; p.y += p.vy; p.vy += 0.1;
        p.life -= p.decay;
        c.globalAlpha = Math.max(0, p.life);
        c.fillStyle   = p.color;
        c.fillRect(~~p.x, ~~p.y, p.size, p.size);
      });
      c.globalAlpha = 1;
      if (running) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },

  _runRays(color) {
    const el = document.getElementById('gacha-rays');
    if (!el) return;
    const count = 12;
    for (let i = 0; i < count; i++) {
      const ray = document.createElement('div');
      ray.className = 'gacha-ray';
      ray.style.cssText = `
        transform: rotate(${(i / count) * 360}deg);
        background: linear-gradient(to bottom, ${color}88, transparent);
        animation-delay: ${i * 0.05}s;
      `;
      el.appendChild(ray);
    }
  },
};

function statKey(k) {
  return { atk:'ATK', def:'DEF', crit:'CRIT%', critDmg:'CRIT DMG', maxHp:'Max HP' }[k] || k;
}

// ── Equipment UI panel ────────────────────────────────────────
function renderEquipPanel(teamId) {
  const lo  = teamId.toLowerCase();
  const el  = document.getElementById(`equip-panel-${lo}`);
  if (!el) return;
  const f   = state.fighters[teamId];
  el.innerHTML = '';

  SLOTS.forEach(slot => {
    const item = f.equip[slot];
    const rar  = item ? RARITY[item.rarity] : null;
    const div  = document.createElement('div');
    div.className = 'equip-slot' + (item ? ' has-item' : '');
    div.style.borderColor = rar ? rar.color : '#333';
    if (rar) div.style.boxShadow = `0 0 6px ${rar.glow}66`;

    const iconHTML = item
      ? (item.img ? `<img src="${item.img}" class="eq-item-img">` : item.icon)
      : `<span style="opacity:.25;font-size:14px">${SLOT_ICONS[slot]}</span>`;
    div.innerHTML = item
      ? `<div class="eq-icon">${iconHTML}</div>
         <div class="eq-rarity" style="color:${rar.color}">${item.rarity}</div>
         <div class="eq-name">${item.name.length > 10 ? item.name.slice(0,9)+'…' : item.name}</div>`
      : `<div class="eq-icon">${iconHTML}</div>
         <div class="eq-empty">${SLOT_LABELS[slot]}</div>`;

    div.title = item
      ? `${item.name} [${RARITY[item.rarity].name}]\n${Object.entries(resolveItemStats(item)).map(([k,v])=>`${statKey(k)}: +${v}`).join('\n')}`
      : SLOT_LABELS[slot];

    el.appendChild(div);
  });
}

// ── Main gacha trigger ────────────────────────────────────────
const Gacha = {
  roll(team, giftTier, sender) {
    const slot = SLOTS[~~(Math.random() * SLOTS.length)];
    const item = rollItem(slot, giftTier);
    return this._apply(team, item, sender);
  },

  // Force roll a specific rarity (for testing)
  rollForced(team, rarityId, sender) {
    const slot = SLOTS[~~(Math.random() * SLOTS.length)];
    const item = ITEM_DB[slot].find(i => i.rarity === rarityId);
    return this._apply(team, item, sender);
  },

  _apply(team, item, sender) {
    const fighter = state.fighters[team];
    const oldItem = fighter.equip[item.slot];
    const upg     = isUpgrade(oldItem, item);

    if (upg) equipItem(fighter, item);

    GachaModal.show(team, item, upg, oldItem, sender);
    renderEquipPanel(team);
    updateAll();

    return { item, isUpgrade: upg };
  },
};

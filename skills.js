// ─────────────────────────────────────────────────────────────
//  SKILL EFFECTS  –  skills.js  (v4 – cinematic)
//  Mỗi skill là 1 mini-cinematic với nhiều phase
// ─────────────────────────────────────────────────────────────

const SkillFX = {
  _effects: [],
  add(e)     { this._effects.push(e); },
  update(dt) {
    this._effects = this._effects.filter(e => !e.done);
    this._effects.forEach(e => e.update(dt));
  },
  clear()    { this._effects = []; },
  removeStun(fighterId) {
    this._effects = this._effects.filter(e => !(e._isStun && e.fighter.id === fighterId));
  },
};

// ── Easing helpers ────────────────────────────────────────────
const ease = {
  outCubic:  t => 1 - Math.pow(1 - t, 3),
  inCubic:   t => t * t * t,
  outElastic: t => t === 0 ? 0 : t === 1 ? 1 :
    Math.pow(2, -10*t) * Math.sin((t*10 - 0.75) * (2*Math.PI)/3) + 1,
  inOutQuad: t => t < 0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2,
};

// ─────────────────────────────────────────────────────────────
//  SIMPLE SLASH  (Rose – 1 hit with wind-up)
// ─────────────────────────────────────────────────────────────
function makeSlashEffect(fighter, hitIndices, onHit) {
  const fired = new Set();
  return {
    done: false, t: 0, duration: 0.65, fighter,
    update(dt) {
      this.t += dt;
      if (this.t >= this.duration) { this.done = true; return; }

      const cx = fighter.x, cy = fighter.y - 38;

      ctx.save();

      // Wind-up glow before slash
      if (this.t < 0.18) {
        const p = this.t / 0.18;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 50 * p);
        g.addColorStop(0, `rgba(255,220,100,${0.5 * p})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(cx - 55, cy - 55, 110, 110);
      }

      // Slash at t=0.18
      if (this.t >= 0.18) {
        const p  = Math.min((this.t - 0.18) / 0.12, 1);
        const fp = Math.max(0, 1 - (this.t - 0.30) / 0.25);
        const sx = cx - 44, sy = cy - 28;
        const ex = cx + 38 * p, ey = cy + 32 * p;

        // Glow
        ctx.globalAlpha = fp * 0.4;
        ctx.strokeStyle = '#ffe080'; ctx.lineWidth = 18;
        ctx.shadowColor = '#ff9900'; ctx.shadowBlur = 30;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
        // Core
        ctx.globalAlpha = fp;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
        ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
        // Pixel dots
        ctx.shadowBlur = 0;
        for (let j = 0; j <= 10; j++) {
          const tt = j / 10;
          ctx.fillStyle = j % 2 === 0 ? '#ffffff' : '#ffcc44';
          ctx.globalAlpha = fp * 0.9;
          ctx.fillRect(~~(sx + (ex-sx)*tt) - 2, ~~(sy + (ey-sy)*tt) - 2, 4, 4);
        }

        if (p >= 1 && !fired.has(0)) {
          fired.add(0);
          spawnParticles(ex, ey, '#ffcc44', 12, 2.5);
          spawnParticles(ex, ey, '#ffffff', 6, 2);
          if (onHit) onHit(0);
        }
      }

      ctx.shadowBlur = 0;
      ctx.restore();
    },
  };
}

// ─────────────────────────────────────────────────────────────
//  CRIT SLASH  (TikTok – 3 slashes with cinematic impact)
// ─────────────────────────────────────────────────────────────
function makeCritSlashEffect(fighter, onHit) {
  const SLASHES = [
    { startT: 0.10, angle: -35, color: '#ffffff', glow: '#ff9900', w: 5, len: 85 },
    { startT: 0.28, angle: -55, color: '#ffee00', glow: '#ff6600', w: 4, len: 90 },
    { startT: 0.46, angle: -75, color: '#ff8800', glow: '#ff2200', w: 4, len: 95 },
  ];
  const DRAW = 0.13, FADE = 0.35;
  const fired = [false, false, false];

  // Wind-up phase: enemy glows before slashes land
  return {
    done: false, t: 0,
    duration: SLASHES[2].startT + DRAW + FADE + 0.1,
    fighter,
    update(dt) {
      this.t += dt;
      if (this.t >= this.duration) { this.done = true; return; }

      const cx = fighter.x, cy = fighter.y - 32;

      ctx.save();

      // Pre-impact darkening / charge on enemy
      if (this.t < 0.10) {
        const p = this.t / 0.10;
        ctx.globalAlpha = p * 0.35;
        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        ctx.arc(cx, cy, 60 * p, 0, Math.PI * 2);
        ctx.fill();
      }

      SLASHES.forEach((s, i) => {
        const lt = this.t - s.startT;
        if (lt <= 0) return;
        const ep    = Math.min(lt / DRAW, 1);
        let alpha   = lt <= DRAW ? ep : Math.max(0, 1 - (lt - DRAW) / FADE);

        const a = s.angle * Math.PI / 180;
        const sx = cx + Math.cos(a + Math.PI) * s.len * 0.55;
        const sy = cy + Math.sin(a + Math.PI) * s.len * 0.55;
        const ex = sx + Math.cos(a) * s.len * ep;
        const ey = sy + Math.sin(a) * s.len * ep;

        // Outer glow
        ctx.globalAlpha = alpha * 0.3;
        ctx.strokeStyle = s.glow; ctx.lineWidth = s.w + 14;
        ctx.shadowColor = s.glow; ctx.shadowBlur = 28;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
        // Mid glow
        ctx.globalAlpha = alpha * 0.6;
        ctx.strokeStyle = s.color; ctx.lineWidth = s.w + 5;
        ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
        // Core
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = s.w - 1;
        ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();

        // Pixel stars along slash
        if (ep > 0.3) {
          ctx.shadowBlur = 0;
          for (let j = 0; j <= 8; j++) {
            const tt = j / 8;
            const px = sx + (ex - sx) * tt;
            const py = sy + (ey - sy) * tt;
            ctx.fillStyle = j % 2 === 0 ? '#ffffff' : s.color;
            ctx.globalAlpha = alpha * 0.85;
            ctx.fillRect(~~px - 2, ~~py - 2, 4, 4);
          }
        }

        // Shockwave at impact point when done drawing
        if (ep >= 1 && lt - DRAW < 0.12) {
          const rp = (lt - DRAW) / 0.12;
          ctx.globalAlpha = (1 - rp) * 0.7;
          ctx.strokeStyle = s.color; ctx.lineWidth = 2;
          ctx.shadowColor = s.color; ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(ex, ey, rp * 22, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (ep >= 1 && !fired[i]) {
          fired[i] = true;
          spawnParticles(ex, ey, s.color, 8, 2.5);
          spawnParticles(ex, ey, '#ffffff', 4, 2);
          if (onHit) onHit(i);
        }
      });

      // Central burst ring when all slashes fire
      if (this.t > 0.46 + DRAW && this.t < 0.46 + DRAW + 0.4) {
        const p = (this.t - 0.46 - DRAW) / 0.4;
        ctx.globalAlpha = (1 - p) * 0.5;
        ctx.strokeStyle = '#ffee00'; ctx.lineWidth = 3;
        ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(cx, cy, p * 55, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      ctx.restore();
    },
  };
}

// ─────────────────────────────────────────────────────────────
//  ARMOR SHIELD  (Galavant – DEF buff)
// ─────────────────────────────────────────────────────────────
const ARMOR_SPRITE = [
  [0,0,1,1,1,1,1,1,0,0],
  [0,1,5,5,5,5,5,5,1,0],
  [0,1,5,6,6,6,6,5,1,0],
  [0,1,5,6,7,7,6,5,1,0],
  [0,1,5,5,6,6,5,5,1,0],
  [0,1,5,5,5,5,5,5,1,0],
  [1,5,5,5,5,5,5,5,5,1],
  [1,5,6,5,5,5,5,6,5,1],
  [0,1,5,5,5,5,5,5,1,0],
  [0,1,5,1,0,0,1,5,1,0],
  [0,1,1,1,0,0,1,1,1,0],
];

function makeArmorEffect(fighter) {
  const sc = 7;
  const sw = ARMOR_SPRITE[0].length * sc;
  const sh = ARMOR_SPRITE.length * sc;
  return {
    done: false, t: 0, duration: 2.0, fighter,
    update(dt) {
      this.t += dt;
      if (this.t >= this.duration) { this.done = true; return; }
      const prog = this.t / this.duration;
      let alpha, scale, offY;
      if (prog < 0.12) {
        alpha = ease.outElastic(prog / 0.12); scale = 0.3 + 0.7 * (prog / 0.12); offY = 0;
      } else if (prog < 0.72) {
        alpha = 1; scale = 1 + 0.05 * Math.sin(this.t * 18); offY = 0;
      } else {
        const f = (prog - 0.72) / 0.28;
        alpha = 1 - f; scale = 1; offY = -f * 50;
      }

      const cx = fighter.x, cy = fighter.y - sh * 0.5;
      ctx.save();
      ctx.globalAlpha = alpha;

      // Outer shield glow
      if (prog < 0.72) {
        const gr = 70 + 20 * Math.sin(this.t * 6);
        const g = ctx.createRadialGradient(cx, cy + offY, 5, cx, cy + offY, gr);
        g.addColorStop(0, 'rgba(68,200,255,0.4)');
        g.addColorStop(0.5, 'rgba(0,100,255,0.15)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(cx - gr, cy - gr + offY, gr * 2, gr * 2);
      }

      ctx.translate(cx, cy + offY);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -(cy + offY));

      const px = cx - sw / 2, py = cy - sh / 2;
      for (let r = 0; r < ARMOR_SPRITE.length; r++) {
        for (let c = 0; c < ARMOR_SPRITE[0].length; c++) {
          const v = ARMOR_SPRITE[r][c];
          if (!v) continue;
          if (v === 1) ctx.fillStyle = '#001a33';
          if (v === 5) ctx.fillStyle = '#22aaff';
          if (v === 6) ctx.fillStyle = '#66ccff';
          if (v === 7) ctx.fillStyle = '#ccf0ff';
          ctx.fillRect(px + c * sc, py + r * sc, sc, sc);
        }
      }

      // Shine sweep
      if (prog > 0.12 && prog < 0.72) {
        const scanP = (prog - 0.12) / 0.60;
        const scanY = py + scanP * sh * scale;
        ctx.fillStyle = 'rgba(200,240,255,0.55)';
        ctx.fillRect(px, scanY, sw * scale, 3);
      }

      // Sparkle ring
      if (prog < 0.72 && Math.random() < 0.5) {
        const rr = 40 + Math.random() * 20;
        const aa = Math.random() * Math.PI * 2;
        spawnParticles(cx + Math.cos(aa) * rr, cy + offY + Math.sin(aa) * rr,
          Math.random() < 0.5 ? '#44ccff' : '#aaddff', 1, 1.2);
      }

      ctx.restore();
    },
  };
}

// ─────────────────────────────────────────────────────────────
//  ARROW  (Galavant – single arrow flies with arc)
// ─────────────────────────────────────────────────────────────
function makeArrowEffect(attFighter, defFighter, hits, onHit) {
  const isA  = attFighter.id === 'A';
  const sx   = attFighter.x + (isA ? 32 : -32);
  const sy   = attFighter.y - 55;
  const ex   = defFighter.x + (isA ? -20 : 20);
  const ey   = defFighter.y - 48;
  const FLY  = 0.40;
  const fired = { done: false };

  // Trail history
  const trail = [];

  return {
    done: false, t: 0, duration: FLY + 0.4,
    update(dt) {
      this.t += dt;
      if (this.t >= this.duration) { this.done = true; return; }

      const prog = Math.min(this.t / FLY, 1);
      const ep   = ease.inOutQuad(prog);
      const ax   = sx + (ex - sx) * ep;
      const ay   = sy + (ey - sy) * ep - Math.sin(prog * Math.PI) * 55;
      const angle = prog < 1
        ? Math.atan2((ey - sy) - Math.cos(prog * Math.PI) * 55 * Math.PI / FLY,
                     (ex - sx) / FLY)
        : Math.atan2(ey - (sy - 55 * Math.sin((prog-0.02)*Math.PI)), ex - sx);

      ctx.save();

      // Trail
      if (prog < 1) {
        trail.push({ x: ax, y: ay, life: 1 });
        if (trail.length > 14) trail.shift();
        trail.forEach((pt, i) => {
          ctx.globalAlpha = (i / trail.length) * 0.4;
          ctx.fillStyle = '#88eecc';
          const sz = 3 - (1 - i / trail.length) * 2;
          ctx.fillRect(~~pt.x - sz/2, ~~pt.y - sz/2, sz, sz);
        });
      }

      if (prog < 1) {
        ctx.globalAlpha = 1;
        ctx.translate(ax, ay);
        ctx.rotate(angle);

        // Arrow glow
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#44ffcc';
        ctx.fillRect(-20, -5, 30, 10);

        ctx.globalAlpha = 1;
        // Shaft
        ctx.fillStyle = '#7a5200'; ctx.fillRect(-18, -2, 24, 4);
        // Head — metallic
        ctx.fillStyle = '#ddddff';
        ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-2, -5); ctx.lineTo(-2, 5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#8899cc';
        ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-2, -3); ctx.lineTo(-2, 3); ctx.closePath(); ctx.fill();
        // Fletching
        ctx.fillStyle = '#cc3322';
        ctx.fillRect(-20, -4, 5, 3); ctx.fillRect(-20, 1, 5, 3);
        ctx.fillStyle = '#ff6644';
        ctx.fillRect(-18, -3, 3, 2); ctx.fillRect(-18, 1, 3, 2);
      }

      if (prog >= 1 && !fired.done) {
        fired.done = true;
        // Big impact burst
        for (let k = 0; k < 3; k++) {
          spawnParticles(ex, ey, '#44ffcc', 8, 2.5 + k);
          spawnParticles(ex, ey, '#ffffff', 4, 2 + k);
        }
        spawnParticles(ex, ey, '#88ddff', 6, 1.5);
        onHit(0);
      }

      // Impact ring fade
      if (prog >= 1) {
        const rp = Math.min((this.t - FLY) / 0.3, 1);
        ctx.globalAlpha = 1;
        ctx.globalAlpha = (1 - rp) * 0.8;
        ctx.strokeStyle = '#44ffcc'; ctx.lineWidth = 2;
        ctx.shadowColor = '#44ffcc'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(ex, ey, rp * 35, 0, Math.PI * 2); ctx.stroke();
      }

      ctx.shadowBlur = 0;
      ctx.restore();
    },
  };
}

// ─────────────────────────────────────────────────────────────
//  METEOR  (Universe – giant meteor drop, earth-shattering)
// ─────────────────────────────────────────────────────────────
const METEOR_PX = [
  [0,0,0,1,1,1,1,0,0],
  [0,0,1,2,3,3,2,1,0],
  [0,1,2,3,3,3,3,2,1],
  [1,2,3,3,2,2,3,3,1],
  [1,2,3,2,2,2,2,2,1],
  [1,2,2,2,2,2,2,1,0],
  [0,1,2,2,2,1,1,0,0],
  [0,0,1,1,1,0,0,0,0],
];

function makeMeteorEffect(attFighter, defFighter, onImpact) {
  const isA  = defFighter.id === 'A';
  const stX  = isA ? 560 : 80, stY = -50;
  const enX  = defFighter.x,   enY = defFighter.y - 28;
  let impFired = false;

  return {
    done: false, t: 0, duration: 3.2,
    phase: 'charge', phaseT: 0,
    update(dt) {
      this.t += dt; this.phaseT += dt;
      if (this.t >= this.duration) { this.done = true; return; }
      if (this.phase === 'charge')  this._charge(dt);
      else if (this.phase === 'fly') this._fly(dt);
      else if (this.phase === 'impact') this._impact(dt);
      else if (this.phase === 'crater') this._crater(dt);
    },

    // Phase 0: sky glows red, ominous warning 0.6s
    _charge(dt) {
      const p = Math.min(this.phaseT / 0.6, 1);
      // Red sky tinge
      ctx.save();
      ctx.globalAlpha = p * 0.22;
      const sg = ctx.createRadialGradient(stX, 0, 0, stX, 0, 300);
      sg.addColorStop(0, '#ff3300');
      sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, 640, 260);
      ctx.restore();

      // Gathering sparks at spawn point
      if (Math.random() < 0.6) {
        spawnParticles(stX + (Math.random()-0.5)*40, stY + Math.random()*40,
          Math.random() < 0.5 ? '#ff4400' : '#ffaa00', 2, 1.5);
      }

      if (p >= 1) { this.phase = 'fly'; this.phaseT = 0; }
    },

    // Phase 1: meteor flies 0.85s
    _fly(dt) {
      const flyDur = 0.85;
      const prog   = Math.min(this.phaseT / flyDur, 1);
      const ep     = prog * prog; // accelerate
      const mx = stX + (enX - stX) * ep;
      const my = stY + (enY - stY) * ep;
      const angle  = Math.atan2(enY - stY, enX - stX);
      const sc = 9;
      const pw = METEOR_PX[0].length * sc;
      const ph = METEOR_PX.length * sc;

      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(angle + Math.PI * 0.25);

      // Wide fire tail
      const tailLen = 35 + ep * 80;
      const tail1 = ctx.createLinearGradient(-tailLen, 0, 0, 0);
      tail1.addColorStop(0, 'rgba(255,30,0,0)');
      tail1.addColorStop(0.6, 'rgba(255,140,0,0.5)');
      tail1.addColorStop(1, 'rgba(255,255,100,0.9)');
      ctx.fillStyle = tail1;
      ctx.fillRect(-tailLen, -8, tailLen, 16);

      const tail2 = ctx.createLinearGradient(-tailLen*0.8, 0, 0, 0);
      tail2.addColorStop(0, 'rgba(200,0,0,0)');
      tail2.addColorStop(1, 'rgba(255,100,0,0.35)');
      ctx.fillStyle = tail2;
      ctx.fillRect(-tailLen*0.8, -18, tailLen*0.8, 36);

      // Meteor pixels
      for (let r = 0; r < METEOR_PX.length; r++) {
        for (let c = 0; c < METEOR_PX[0].length; c++) {
          const v = METEOR_PX[r][c];
          if (!v) continue;
          if (v === 1) ctx.fillStyle = '#220800';
          if (v === 2) ctx.fillStyle = '#994422';
          if (v === 3) ctx.fillStyle = '#ffaa44';
          ctx.fillRect(-pw/2 + c*sc, -ph/2 + r*sc, sc, sc);
        }
      }

      // Core glow
      const glow = ctx.createRadialGradient(0,0,2,0,0,35);
      glow.addColorStop(0, 'rgba(255,200,0,0.7)');
      glow.addColorStop(0.5, 'rgba(255,80,0,0.3)');
      glow.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(0,0,35,0,Math.PI*2); ctx.fill();

      ctx.restore();

      // Sparks along trail
      if (Math.random() < 0.75) {
        spawnParticles(mx, my, Math.random()<0.5 ? '#ff6600' : '#ffcc00', 3, 2.5);
      }

      if (prog >= 1) {
        this.phase = 'impact'; this.phaseT = 0;
        if (!impFired) { impFired = true; if (onImpact) onImpact(); }
      }
    },

    // Phase 2: massive explosion 0.7s
    _impact(dt) {
      const dur  = 0.70;
      const prog = Math.min(this.phaseT / dur, 1);

      // Full white flash at t=0
      if (prog < 0.18) {
        const fp = (0.18 - prog) / 0.18;
        ctx.save();
        ctx.globalAlpha = fp * 0.95;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 640, 400);
        ctx.restore();
      }

      // Orange-red explosion circle expanding
      const expR = ease.outCubic(prog) * 140;
      ctx.save();
      ctx.globalAlpha = (1 - prog) * 0.65;
      const eg = ctx.createRadialGradient(enX, enY, 0, enX, enY, expR);
      eg.addColorStop(0, '#ffffff');
      eg.addColorStop(0.25, '#ff8800');
      eg.addColorStop(0.6, '#ff2200');
      eg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = eg;
      ctx.fillRect(enX - expR, enY - expR, expR*2, expR*2);
      ctx.restore();

      // 3 shockwave rings
      [0, 0.12, 0.24].forEach(offset => {
        const rp = Math.min((prog - offset) / 0.65, 1);
        if (rp <= 0) return;
        const r = rp * 110;
        const a = (1 - rp) * 0.8;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.strokeStyle = '#ff8800'; ctx.lineWidth = 5;
        ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.ellipse(enX, enY + 14, r, r * 0.28, 0, 0, Math.PI*2);
        ctx.stroke();
        ctx.strokeStyle = '#ffff88'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(enX, enY + 14, r * 0.85, r * 0.24, 0, 0, Math.PI*2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      });

      // Mass particle burst at t≈0
      if (this.phaseT < dt + 0.02) {
        for (let k = 0; k < 60; k++) {
          const col = ['#ff4400','#ff8800','#ffcc00','#ffffff','#ff2200'][~~(Math.random()*5)];
          spawnParticles(enX, enY, col, 1, 4 + Math.random()*3);
        }
        for (let k = 0; k < 20; k++) spawnParticles(enX, enY, '#884422', 1, 2.5+Math.random()*3);
      }
      if (Math.random() < 0.55) {
        spawnParticles(enX + (Math.random()-0.5)*80, enY + (Math.random()-0.5)*30,
          '#ff6600', 2, 1.8);
      }

      if (prog >= 1) { this.phase = 'crater'; this.phaseT = 0; }
    },

    // Phase 3: crater + heat haze fade 1.1s
    _crater(dt) {
      const dur  = 1.1;
      const prog = Math.min(this.phaseT / dur, 1);
      const a    = 1 - prog;
      const cr   = 55 * (1 - ease.outCubic(prog) * 0.3);

      ctx.save();
      ctx.globalAlpha = a * 0.9;
      // Crater oval
      const cg = ctx.createRadialGradient(enX, enY+18, 5, enX, enY+18, cr);
      cg.addColorStop(0, '#110600');
      cg.addColorStop(0.5, '#331500');
      cg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.ellipse(enX, enY+18, cr, cr*0.35, 0, 0, Math.PI*2);
      ctx.fill();

      // Heat flicker
      if (prog < 0.55 && Math.random() < 0.45) {
        ctx.fillStyle = `rgba(255,150,0,${(1-prog*2)*0.5})`;
        ctx.fillRect(enX + (Math.random()-0.5)*50, enY + (Math.random()-0.5)*20, 4, 4);
      }
      ctx.restore();
    },
  };
}

// ─────────────────────────────────────────────────────────────
//  LIGHTNING  (2 strikes, crit bonus, cinematic storm)
// ─────────────────────────────────────────────────────────────
function makeLightningEffect(fighter, hits, onHit) {
  // Group hits: [main, ?bonus] per strike
  const groups = [];
  let i = 0;
  while (i < hits.length) {
    const main  = { hit: hits[i], idx: i++ };
    const bonus = (i < hits.length && hits[i].isBonus) ? { hit: hits[i], idx: i++ } : null;
    groups.push({ main, bonus });
  }

  const WARN  = 0.20;  // warning glow before first bolt
  const BOLT  = 0.14;  // bolt draws down
  const FLASH = 0.22;  // flash + fade
  const GAP   = 0.50;  // between strikes
  const BDELAY = 0.18; // bonus bolt delay
  const fired  = new Set();
  const totalDur = WARN + (groups.length - 1) * GAP + BOLT + FLASH + BDELAY + FLASH + 0.1;

  function drawBolt(x, topY, botY, prog, color, w, jitter) {
    const curBot = topY + (botY - topY) * prog;
    const segs   = 12;
    const segH   = (curBot - topY) / segs;
    ctx.strokeStyle = color; ctx.lineWidth = w;
    ctx.shadowColor = color; ctx.shadowBlur = 22;
    ctx.beginPath(); let cy = topY; ctx.moveTo(x, cy);
    for (let s = 0; s < segs; s++) {
      const nx = x + (Math.random()-0.5) * jitter;
      const ny = cy + segH;
      if (ny > curBot) break;
      ctx.lineTo(nx, ny); cy = ny;
    }
    ctx.lineTo(x, curBot); ctx.stroke();
    ctx.shadowBlur = 0;
  }

  return {
    done: false, t: 0, duration: totalDur, fighter,
    update(dt) {
      this.t += dt;
      if (this.t >= this.duration) { this.done = true; return; }

      const cx   = fighter.x;
      const botY = fighter.y - 8;
      const topY = -30;

      ctx.save();

      // Storm cloud at top
      if (this.t < WARN + 0.3) {
        const p = Math.min(this.t / (WARN + 0.3), 1);
        ctx.globalAlpha = p * 0.4;
        const cg = ctx.createRadialGradient(cx, 0, 5, cx, 0, 90);
        cg.addColorStop(0, '#8899ff');
        cg.addColorStop(0.5, '#334499');
        cg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = cg;
        ctx.fillRect(cx - 90, -10, 180, 40);
      }

      // Warning — column glow before first bolt
      if (this.t < WARN) {
        const p = this.t / WARN;
        ctx.globalAlpha = p * 0.18;
        ctx.fillStyle = '#aaddff';
        ctx.fillRect(cx - 8, topY, 16, botY - topY);
        // Sparks gathering at top
        if (Math.random() < 0.5) {
          spawnParticles(cx + (Math.random()-0.5)*20, topY + Math.random()*20, '#aaddff', 1, 0.8);
        }
      }

      groups.forEach((g, gi) => {
        const gStart = WARN + gi * GAP;

        // ── Main bolt ──
        const mt = this.t - gStart;
        if (mt > 0) {
          const bp  = Math.min(mt / BOLT, 1);
          const imp = mt >= BOLT;
          const fp  = imp ? Math.min((mt - BOLT) / FLASH, 1) : 0;
          const a   = imp ? Math.max(0, 1 - fp) : 1;

          ctx.globalAlpha = a;

          // Pre-bolt glow column
          if (!imp && bp > 0.25) {
            ctx.globalAlpha = (bp - 0.25) * 0.2 * a;
            ctx.fillStyle = '#aaddff';
            ctx.fillRect(cx - 8, topY, 16, botY - topY);
          }
          ctx.globalAlpha = a;

          // Outer bolt
          drawBolt(cx, topY, botY, bp, '#ffffff', 7, 18);
          // Inner bolt
          drawBolt(cx, topY, botY, bp, '#aaddff', 3, 10);
          // Extra thin bright core
          drawBolt(cx, topY, botY, bp, '#eeffff', 1, 6);

          // Impact flash circle
          if (imp && fp < 0.5) {
            const ia = (0.5 - fp) / 0.5;
            ctx.globalAlpha = ia * 0.9;
            const ig = ctx.createRadialGradient(cx, botY, 0, cx, botY, 70);
            ig.addColorStop(0, '#ffffff');
            ig.addColorStop(0.3, '#aaddff');
            ig.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = ig;
            ctx.fillRect(cx - 70, botY - 35, 140, 70);
          }

          // Particles on impact
          if (imp && mt - BOLT < dt + 0.01) {
            spawnParticles(cx, botY, '#aaddff', 16, 3);
            spawnParticles(cx, botY, '#ffffff', 10, 4);
            spawnParticles(cx, botY, '#88aaff', 8, 2);
          }
          // Particles along bolt
          if (!imp && Math.random() < 0.5) {
            spawnParticles(cx + (Math.random()-0.5)*14,
              topY + (botY-topY)*Math.random()*bp, '#aaeeff', 2, 1.2);
          }

          const mk = `m${gi}`;
          if (imp && !fired.has(mk)) { fired.add(mk); onHit(g.main.idx); }
        }

        // ── Bonus bolt (crit) ──
        if (g.bonus) {
          const bStart = gStart + BOLT + BDELAY;
          const bt = this.t - bStart;
          if (bt > 0) {
            const bp  = Math.min(bt / BOLT, 1);
            const imp = bt >= BOLT;
            const fp  = imp ? Math.min((bt - BOLT) / FLASH, 1) : 0;
            const a   = imp ? Math.max(0, 1 - fp) : 0.8;

            ctx.globalAlpha = a;
            drawBolt(cx + 22, topY + 35, botY, bp, '#ffcc00', 5, 12);
            drawBolt(cx + 22, topY + 35, botY, bp, '#ffffff', 2, 7);

            if (imp && bt - BOLT < dt + 0.01) {
              spawnParticles(cx + 22, botY, '#ffcc00', 10, 2.5);
              spawnParticles(cx + 22, botY, '#ffffff', 5, 3);
            }

            const bk = `b${gi}`;
            if (imp && !fired.has(bk)) { fired.add(bk); onHit(g.bonus.idx); }
          }
        }
      });

      ctx.globalAlpha = 1;
      ctx.restore();
    },
  };
}

// ─────────────────────────────────────────────────────────────
//  ROSE BLOOM  (Rose – attacker blooms, healing/buff feel)
// ─────────────────────────────────────────────────────────────
const PETAL = [[0,1,1,0],[1,2,2,1],[1,2,2,1],[0,1,1,0]];

function makeRoseBloomEffect(fighter) {
  const petals = Array.from({length: 8}, (_, i) => ({
    angle: (i / 8) * Math.PI * 2,
    dist: 0,
    rot: Math.random() * Math.PI * 2,
    rotSpd: (Math.random()-0.5) * 5,
    scale: 0.6 + Math.random() * 0.8,
  }));

  return {
    done: false, t: 0, duration: 1.6, fighter, petals,
    update(dt) {
      this.t += dt;
      if (this.t >= this.duration) { this.done = true; return; }
      const prog  = this.t / this.duration;
      const alpha = prog < 0.15 ? prog / 0.15 : 1 - (prog - 0.15) / 0.85;
      const cx = fighter.x, cy = fighter.y - 75;
      const sc = 4;
      const pw = PETAL[0].length * sc, ph = PETAL.length * sc;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Glow bloom
      const gr = 18 + prog * 55;
      const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, gr);
      g.addColorStop(0, 'rgba(255,80,120,0.5)');
      g.addColorStop(0.5, 'rgba(200,20,60,0.2)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - gr - 10, cy - gr - 10, (gr+10)*2, (gr+10)*2);

      // Petals
      this.petals.forEach(p => {
        p.dist += dt * 65 * p.scale;
        p.rot  += p.rotSpd * dt;
        const px = cx + Math.cos(p.angle) * p.dist - pw/2;
        const py = cy + Math.sin(p.angle) * p.dist - ph/2;
        ctx.save();
        ctx.translate(px + pw/2, py + ph/2);
        ctx.rotate(p.rot);
        ctx.scale(p.scale, p.scale);
        ctx.translate(-pw/2, -ph/2);
        for (let r = 0; r < PETAL.length; r++) {
          for (let c = 0; c < PETAL[0].length; c++) {
            const v = PETAL[r][c];
            if (!v) continue;
            ctx.fillStyle = v === 1 ? '#aa0033' : '#ff4488';
            ctx.fillRect(c*sc, r*sc, sc, sc);
          }
        }
        ctx.restore();
      });

      // Center blossom
      const cr = (1 - Math.abs(prog - 0.3) / 0.7) * 14;
      if (cr > 0) {
        ctx.fillStyle = '#ff2255';
        ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ffaacc';
        ctx.beginPath(); ctx.arc(cx - cr*0.3, cy - cr*0.3, cr*0.4, 0, Math.PI*2); ctx.fill();
      }

      // Sparkles
      if (Math.random() < 0.4) {
        spawnParticles(cx + (Math.random()-0.5)*60, cy + (Math.random()-0.5)*40, '#ff4488', 1, 1.5);
      }

      ctx.restore();
    },
  };
}

// ─────────────────────────────────────────────────────────────
//  ARROW RAIN  (Cupid – 4 arrows from sky, staggered)
// ─────────────────────────────────────────────────────────────
function makeArrowRainEffect(attFighter, defFighter, hits, onHit) {
  const cx    = defFighter.x;
  const botY  = defFighter.y - 22;
  const count = Math.min(hits.length, 4);
  const GAP   = 0.24, FLY = 0.32;
  const fired = new Array(count).fill(false);
  const totalDur = count * GAP + FLY + 0.4;
  const offsets  = [-32, -10, 12, 34];
  const trails   = Array.from({length: count}, () => []);

  return {
    done: false, t: 0, duration: totalDur, defFighter,
    update(dt) {
      this.t += dt;
      if (this.t >= this.duration) { this.done = true; return; }

      ctx.save();

      // Sky glow overhead
      if (this.t < 0.4) {
        ctx.globalAlpha = (this.t / 0.4) * 0.3;
        const sg = ctx.createRadialGradient(cx, 0, 5, cx, 60, 100);
        sg.addColorStop(0, '#ff88dd');
        sg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sg;
        ctx.fillRect(cx - 100, -10, 200, 70);
      }

      for (let i = 0; i < count; i++) {
        const sT   = i * GAP;
        const lt   = this.t - sT;
        if (lt <= 0) continue;

        const prog = Math.min(lt / FLY, 1);
        const ax   = cx + offsets[i % offsets.length];
        const stY  = -40;
        const ay   = stY + (botY - stY) * (prog * prog * (3 - 2*prog)); // smoothstep

        // Trail
        if (prog < 1) {
          trails[i].push({ x: ax, y: ay });
          if (trails[i].length > 10) trails[i].shift();
          trails[i].forEach((pt, ti) => {
            ctx.globalAlpha = (ti / trails[i].length) * 0.35;
            ctx.fillStyle = '#ff99dd';
            const sz = 2 + (ti / trails[i].length) * 2;
            ctx.fillRect(pt.x - sz/2, pt.y - sz/2, sz, sz);
          });
        }

        const alpha = prog >= 1 ? Math.max(0, 1 - (lt - FLY) / 0.25) : 1;
        ctx.globalAlpha = alpha;

        // Arrow pointing straight down — drawn in canvas coords (no rotate needed)
        ctx.save();
        ctx.globalAlpha = alpha;

        // Glow column
        ctx.globalAlpha = alpha * 0.28;
        ctx.fillStyle = '#ff88dd';
        ctx.fillRect(ax - 5, ay - 24, 10, 34);

        ctx.globalAlpha = alpha;
        // Shaft (vertical, center ax)
        ctx.fillStyle = '#7a5200';
        ctx.fillRect(ax - 2, ay - 22, 4, 26);
        // Arrowhead pointing DOWN (triangle below shaft)
        ctx.fillStyle = '#ddddff';
        ctx.beginPath();
        ctx.moveTo(ax,     ay + 10);   // tip (bottom point)
        ctx.lineTo(ax - 6, ay);
        ctx.lineTo(ax + 6, ay);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#8899cc';
        ctx.beginPath();
        ctx.moveTo(ax,     ay + 8);
        ctx.lineTo(ax - 4, ay + 1);
        ctx.lineTo(ax + 4, ay + 1);
        ctx.closePath(); ctx.fill();
        // Fletching at top
        ctx.fillStyle = '#cc3322';
        ctx.fillRect(ax - 6, ay - 24, 5, 3);   // left wing
        ctx.fillRect(ax + 1,  ay - 24, 5, 3);  // right wing
        ctx.fillStyle = '#ff5544';
        ctx.fillRect(ax - 5, ay - 22, 3, 2);
        ctx.fillRect(ax + 2,  ay - 22, 3, 2);

        ctx.restore();

        if (prog >= 1 && !fired[i]) {
          fired[i] = true;
          spawnParticles(ax, botY, '#ff99dd', 10, 2.5);
          spawnParticles(ax, botY, '#ffffff', 5, 2);
          spawnParticles(ax, botY, '#ffaaee', 6, 1.5);
          const hi = i < hits.length ? i : hits.length - 1;
          onHit(hi);
        }

        // Impact ring
        if (prog >= 1 && lt - FLY < 0.25) {
          const rp = (lt - FLY) / 0.25;
          ctx.globalAlpha = (1 - rp) * 0.7;
          ctx.strokeStyle = '#ff99dd'; ctx.lineWidth = 2;
          ctx.shadowColor = '#ff66cc'; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.arc(ax, botY, rp * 28, 0, Math.PI*2); ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    },
  };
}

// ─────────────────────────────────────────────────────────────
//  DRAGON ARROW  (Dragon – 2 fire arrows, explosive impact)
// ─────────────────────────────────────────────────────────────
function makeDragonArrowEffect(attFighter, defFighter, hits, onHit) {
  const isA  = attFighter.id === 'A';
  const bx   = attFighter.x + (isA ? 38 : -38);
  const ex   = defFighter.x + (isA ? -22 : 22);

  const groups = [];
  let idx = 0;
  while (idx < hits.length) {
    const main  = { hit: hits[idx], idx };  idx++;
    const bonus = (idx < hits.length && hits[idx].isBonus) ? { hit: hits[idx], idx: idx++ } : null;
    groups.push({ main, bonus });
  }

  const GAP = 0.55, FLY = 0.45, EXPLODE = 0.65;
  const fired = new Set();
  const totalDur = (groups.length - 1) * GAP + FLY + EXPLODE + 0.3;
  const trails = groups.map(() => []);

  return {
    done: false, t: 0, duration: totalDur,
    update(dt) {
      this.t += dt;
      if (this.t >= this.duration) { this.done = true; return; }

      ctx.save();

      groups.forEach((g, gi) => {
        const gStart = gi * GAP;
        const lt     = this.t - gStart;
        if (lt <= 0) return;

        const syArr = attFighter.y - 52 - gi * 14;
        const eyArr = defFighter.y - 50;
        const prog  = Math.min(lt / FLY, 1);
        const ep    = ease.inOutQuad(prog);
        const ax    = bx + (ex - bx) * ep;
        const ay    = syArr + (eyArr - syArr) * ep - Math.sin(prog * Math.PI) * 38;
        const angle = Math.atan2(eyArr - syArr, ex - bx);

        // Trail
        if (prog < 1) {
          trails[gi].push({ x: ax, y: ay });
          if (trails[gi].length > 16) trails[gi].shift();
          trails[gi].forEach((pt, ti) => {
            const ta = (ti / trails[gi].length);
            ctx.globalAlpha = ta * 0.45;
            ctx.fillStyle = ti % 2 === 0 ? '#ff6600' : '#ffcc00';
            const sz = 2 + ta * 3;
            ctx.fillRect(pt.x - sz/2, pt.y - sz/2, sz, sz);
          });

          ctx.save();
          ctx.globalAlpha = 1;
          ctx.translate(ax, ay);
          ctx.rotate(angle);

          // Fire trail
          const tl = 14 + prog * 22;
          const fg = ctx.createLinearGradient(-tl, 0, 0, 0);
          fg.addColorStop(0, 'rgba(255,40,0,0)');
          fg.addColorStop(0.6, 'rgba(255,130,0,0.6)');
          fg.addColorStop(1, 'rgba(255,220,60,0.9)');
          ctx.fillStyle = fg; ctx.fillRect(-tl, -7, tl, 14);
          const fg2 = ctx.createLinearGradient(-tl*0.7, 0, 0, 0);
          fg2.addColorStop(0, 'rgba(180,0,0,0)');
          fg2.addColorStop(1, 'rgba(255,80,0,0.3)');
          ctx.fillStyle = fg2; ctx.fillRect(-tl*0.7, -14, tl*0.7, 28);

          // Arrow body
          ctx.fillStyle = '#5a2800'; ctx.fillRect(-22, -3, 30, 6);
          // Golden tip
          ctx.fillStyle = '#ffdd44';
          ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(0, -6); ctx.lineTo(0, 6); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#ffaa00';
          ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(0, -4); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill();
          // Fletching
          ctx.fillStyle = '#880000'; ctx.fillRect(-24, -5, 5, 4); ctx.fillRect(-24, 1, 5, 4);
          ctx.fillStyle = '#cc2200'; ctx.fillRect(-22, -4, 3, 3); ctx.fillRect(-22, 1, 3, 3);

          ctx.restore();

          // Fire sparks
          if (Math.random() < 0.7) {
            spawnParticles(ax, ay, Math.random() < 0.5 ? '#ff6600' : '#ffcc00', 2, 1.8);
          }
        }

        // EXPLOSION
        const explT = lt - FLY;
        if (explT > 0) {
          const ep2 = Math.min(explT / EXPLODE, 1);

          // White flash
          if (ep2 < 0.2) {
            const fp = (0.2 - ep2) / 0.2;
            ctx.save(); ctx.globalAlpha = fp * 0.88;
            const fl = ctx.createRadialGradient(ex, eyArr, 0, ex, eyArr, 65 * (1-fp+0.3));
            fl.addColorStop(0, '#ffffff');
            fl.addColorStop(0.5, '#ff8800');
            fl.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = fl; ctx.fillRect(ex-65, eyArr-65, 130, 130);
            ctx.restore();
          }

          // Expanding fire ball
          const fbR = ease.outCubic(ep2) * 55;
          ctx.save(); ctx.globalAlpha = (1 - ep2) * 0.7;
          const fbG = ctx.createRadialGradient(ex, eyArr, 0, ex, eyArr, fbR);
          fbG.addColorStop(0, '#ffffff');
          fbG.addColorStop(0.3, '#ff8800');
          fbG.addColorStop(0.7, '#ff2200');
          fbG.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = fbG; ctx.fillRect(ex-fbR, eyArr-fbR, fbR*2, fbR*2);
          ctx.restore();

          // 2 shockwave rings
          [0, 0.15].forEach(off => {
            const rp = Math.min((ep2 - off) / 0.7, 1);
            if (rp <= 0) return;
            const r = rp * 75;
            ctx.save();
            ctx.globalAlpha = (1 - rp) * 0.75;
            ctx.strokeStyle = '#ff6600'; ctx.lineWidth = 4;
            ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 18;
            ctx.beginPath(); ctx.ellipse(ex, eyArr + 10, r, r * 0.3, 0, 0, Math.PI*2); ctx.stroke();
            ctx.shadowBlur = 0; ctx.restore();
          });

          // Particle burst once
          const ek = `e${gi}`;
          if (explT < dt + 0.02 && !fired.has(ek)) {
            fired.add(ek);
            for (let k = 0; k < 40; k++) {
              const c = ['#ff4400','#ff8800','#ffcc00','#ffffff','#ff2200'][~~(Math.random()*5)];
              spawnParticles(ex, eyArr, c, 1, 3.5 + Math.random()*3);
            }
            for (let k = 0; k < 12; k++) spawnParticles(ex, eyArr, '#884422', 1, 2+Math.random()*2.5);
          }

          const mk = `m${gi}`;
          if (explT > 0 && !fired.has(mk)) { fired.add(mk); onHit(g.main.idx); }

          if (g.bonus) {
            const bk = `b${gi}`;
            if (explT > 0.14 && !fired.has(bk)) {
              fired.add(bk);
              spawnParticles(ex + (Math.random()-0.5)*24, eyArr, '#ffcc00', 8, 2.5);
              onHit(g.bonus.idx);
            }
          }
        }
      });

      ctx.globalAlpha = 1;
      ctx.restore();
    },
  };
}

// ─────────────────────────────────────────────────────────────
//  STUN EFFECT  – animated stars + lightning + timer
// ─────────────────────────────────────────────────────────────
function makeStunEffect(fighter) {
  return {
    done: false, _isStun: true, fighter, t: 0,
    update(dt) {
      if (!fighter.stunned && this.t > 0.1) { this.done = true; return; }
      this.t += dt;

      const cx = fighter.x, cy = fighter.y - 100;
      const orbitR = 24;
      ctx.save();

      // Flickering mini-bolt
      if (Math.floor(this.t / 0.065) % 2 === 0) {
        const zx = cx + (Math.random()-0.5) * 42;
        const zy = fighter.y - 62 - Math.random() * 50;
        ctx.strokeStyle = '#ffee44'; ctx.lineWidth = 1.5;
        ctx.shadowColor = '#ffee44'; ctx.shadowBlur = 8;
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.moveTo(zx, zy);
        ctx.lineTo(zx + (Math.random()-0.5)*12, zy + 9);
        ctx.lineTo(zx + (Math.random()-0.5)*10, zy + 18);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Orbiting stars (4 of them)
      for (let i = 0; i < 4; i++) {
        const angle  = (i / 4) * Math.PI * 2 + this.t * 3.2;
        const sx     = cx + Math.cos(angle) * orbitR;
        const sy     = cy + Math.sin(angle) * orbitR * 0.4;
        const pulse  = 0.7 + 0.3 * Math.sin(this.t * 9 + i);

        ctx.globalAlpha = pulse;
        ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 8;
        // Star cross shape
        ctx.fillStyle = '#ffee44';
        ctx.fillRect(sx - 4, sy - 1, 9, 3);
        ctx.fillRect(sx - 1, sy - 4, 3, 9);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx - 1, sy - 1, 3, 3);
        ctx.shadowBlur = 0;
      }

      // CHOÁNG text pulse
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(this.t * 7);
      ctx.fillStyle = '#ffee44';
      ctx.font = '6px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 10;
      ctx.fillText('CHOANG', cx, cy - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '5px "Press Start 2P"';
      ctx.shadowBlur = 4;
      ctx.fillText(Math.max(0, fighter.stunTimer).toFixed(1) + 's', cx, cy - 8);

      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      ctx.restore();
    },
  };
}

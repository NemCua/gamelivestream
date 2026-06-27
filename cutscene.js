// ─────────────────────────────────────────────────────────────
//  CUTSCENE ENGINE  –  cutscene.js
//  Overlay canvas đè lên arena (640×400 logic coords)
// ─────────────────────────────────────────────────────────────

const Cutscene = (() => {
  const cvs = document.getElementById('cutscene-canvas');
  const c   = cvs.getContext('2d');
  c.imageSmoothingEnabled = false;
  const W = 640, H = 220;

  let _raf = null, _active = false;

  function rand(min, max) { return min + Math.random() * (max - min); }
  function easeIn3(t)  { return t * t * t; }
  function easeOut3(t) { return 1 - Math.pow(1 - t, 3); }

  // ── Letterbox bars ─────────────────────────────────────────
  function drawBars(alpha) {
    const bh = 40;
    c.save(); c.globalAlpha = alpha; c.fillStyle = '#000';
    c.fillRect(0, 0, W, bh);
    c.fillRect(0, H - bh, W, bh);
    c.restore();
  }

  // ── Star field ─────────────────────────────────────────────
  function makeStars(n) {
    return Array.from({ length: n }, () => ({
      x: rand(0, W), y: rand(0, H * 0.85),
      r: rand(0.5, 2),
      blink: rand(0, Math.PI * 2), spd: rand(0.03, 0.08),
    }));
  }
  function drawStars(stars, alpha) {
    c.save();
    stars.forEach(s => {
      s.blink += s.spd;
      c.globalAlpha = alpha * (0.3 + 0.7 * Math.abs(Math.sin(s.blink)));
      c.fillStyle = '#fff';
      c.fillRect(~~s.x, ~~s.y, Math.ceil(s.r), Math.ceil(s.r));
    });
    c.restore();
  }

  // ── Space background ───────────────────────────────────────
  function drawSpace(alpha) {
    c.save(); c.globalAlpha = alpha;
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#000008'); bg.addColorStop(0.5, '#04000f'); bg.addColorStop(1, '#100208');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    [
      { x:150, y:100, r:120, col:'rgba(70,0,160,0.18)' },
      { x:490, y: 80, r:100, col:'rgba(160,0,60,0.14)' },
      { x:320, y:240, r:150, col:'rgba(0,40,160,0.12)' },
    ].forEach(n => {
      const g = c.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      g.addColorStop(0, n.col); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(n.x-n.r, n.y-n.r, n.r*2, n.r*2);
    });
    c.restore();
  }

  // ── Pixel art meteor (same as METEOR_PX in skills.js) ──────
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
  const METEOR_COL = { 1:'#220800', 2:'#994422', 3:'#ffaa44' };

  function drawMeteorPixels(scale) {
    const pw = METEOR_PX[0].length * scale;
    const ph = METEOR_PX.length * scale;
    for (let r = 0; r < METEOR_PX.length; r++) {
      for (let cc = 0; cc < METEOR_PX[0].length; cc++) {
        const v = METEOR_PX[r][cc];
        if (!v) continue;
        c.fillStyle = METEOR_COL[v];
        c.fillRect(-pw/2 + cc*scale, -ph/2 + r*scale, scale, scale);
      }
    }
  }

  // ─────────────────────────────────────────────────────────
  //  METEOR CUTSCENE  (total 1.8s)
  //
  //  0.00–0.15  fade in + space bg
  //  0.15–1.40  meteor bay từ góc trên-phải qua màn hình, to dần
  //  1.40–1.80  fade out
  // ─────────────────────────────────────────────────────────
  function playMeteor(onComplete) {
    const stars = makeStars(160);
    const TOTAL = 1.8;

    // Bay từ ngoài góc trên-phải → xuyên qua màn hình xuống góc dưới-trái
    const startX = W * 0.90, startY = -60;
    const endX   = W * 0.05, endY   = H * 1.10; // ra ngoài màn phía dưới-trái
    const travelAngle = Math.atan2(endY - startY, endX - startX);
    const tailAngle   = travelAngle + Math.PI;

    const sparks = [];
    let t = 0, lastTs = null;

    function tick(ts) {
      if (!lastTs) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts; t += dt;
      c.clearRect(0, 0, W, H);

      const fadeIn  = Math.min(t / 0.15, 1);
      const fadeOut = t > 1.40 ? easeOut3((t - 1.40) / 0.40) : 0;
      const sceneA  = fadeIn * (1 - fadeOut);

      drawSpace(sceneA);
      drawStars(stars, Math.min(t / 0.25, 1) * sceneA);

      // ── Meteor bay (0.15 → 1.40) ──
      if (t >= 0.10) {
        const ft = Math.min((t - 0.10) / 1.20, 1);
        const ep = ft * ft; // accelerate
        const mx = startX + (endX - startX) * ft; // linear position
        const my = startY + (endY - startY) * ft;
        const sc = 3 + ep * 14; // scale 3→17, to rất nhanh
        const pw = METEOR_PX[0].length * sc;

        // Ambient glow
        const glowR = pw * 0.9;
        c.save(); c.globalAlpha = Math.min(ft*2, 1) * 0.55 * sceneA;
        const gg = c.createRadialGradient(mx, my, 0, mx, my, glowR * 2);
        gg.addColorStop(0, 'rgba(255,180,0,0.7)');
        gg.addColorStop(0.4, 'rgba(255,60,0,0.3)');
        gg.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = gg; c.fillRect(mx-glowR*2, my-glowR*2, glowR*4, glowR*4);
        c.restore();

        c.save();
        c.translate(mx, my);

        // Đuôi lửa (ngược chiều bay)
        c.save();
        c.rotate(tailAngle);
        const tailLen = 20 + ep * 140;
        const hw1 = sc * 1.0 + 2, hw2 = sc * 2.0 + 5;
        const tg = c.createLinearGradient(0, 0, tailLen, 0);
        tg.addColorStop(0,   `rgba(255,255,120,${Math.min(ft*3,1)*0.95*sceneA})`);
        tg.addColorStop(0.2, `rgba(255,160,0,${Math.min(ft*3,1)*0.75*sceneA})`);
        tg.addColorStop(0.6, `rgba(255,50,0,${Math.min(ft*3,1)*0.40*sceneA})`);
        tg.addColorStop(1,   'rgba(255,0,0,0)');
        c.fillStyle = tg; c.fillRect(0, -hw1, tailLen, hw1*2);
        const tg2 = c.createLinearGradient(0, 0, tailLen*0.7, 0);
        tg2.addColorStop(0, `rgba(255,80,0,${Math.min(ft*3,1)*0.32*sceneA})`);
        tg2.addColorStop(1, 'rgba(255,0,0,0)');
        c.fillStyle = tg2; c.fillRect(0, -hw2, tailLen*0.7, hw2*2);
        c.restore();

        // Pixel art meteor
        c.rotate(travelAngle + 0.4); // sudut tetap, tidak spin berlebihan
        drawMeteorPixels(sc);

        // Core glow
        c.save(); c.globalAlpha = Math.min(ft*2,1) * 0.60 * sceneA;
        const cg2 = c.createRadialGradient(0,0,2,0,0,pw*0.5);
        cg2.addColorStop(0, 'rgba(255,200,80,0.8)');
        cg2.addColorStop(0.5, 'rgba(255,100,0,0.3)');
        cg2.addColorStop(1, 'rgba(255,0,0,0)');
        c.fillStyle = cg2; c.beginPath(); c.arc(0,0,pw*0.5,0,Math.PI*2); c.fill();
        c.restore();
        c.restore();

        // Sparks dọc đuôi
        if (ft > 0.05 && Math.random() < 0.65) {
          const sa = tailAngle + rand(-0.45, 0.45);
          sparks.push({
            x: mx + Math.cos(tailAngle)*rand(5,30),
            y: my + Math.sin(tailAngle)*rand(5,30),
            vx: Math.cos(sa)*rand(1,4), vy: Math.sin(sa)*rand(1,4),
            life: 1, decay: rand(0.05,0.12),
            size: rand(2, Math.max(3, sc*0.5)),
            color: Math.random()<0.55?'#ff7700':'#ffcc22',
          });
        }
      }

      // Draw sparks
      c.save();
      sparks.forEach(s => {
        s.life -= s.decay; s.x += s.vx; s.y += s.vy; s.vy += 0.05;
        if (s.life <= 0) return;
        c.globalAlpha = s.life * sceneA;
        c.fillStyle = s.color; c.fillRect(~~s.x, ~~s.y, Math.ceil(s.size), Math.ceil(s.size));
      });
      c.restore();

      // Bars & title
      drawBars(Math.min(t/0.12, 1) * (1 - fadeOut*0.9));
      if (t > 0.15 && t < 1.40) {
        const ta = Math.min((t-0.15)/0.18, 1) * Math.max(0, 1-(t-1.10)/0.30);
        c.save(); c.globalAlpha = ta * sceneA; c.textAlign = 'center';
        c.font = '9px "Press Start 2P"'; c.fillStyle = '#ff9900'; c.shadowColor = '#ff4400'; c.shadowBlur = 12;
        c.fillText('✦ UNIVERSE STRIKE ✦', W/2, H-14);
        c.font = '5px "Press Start 2P"'; c.fillStyle = '#ffcc88'; c.shadowBlur = 5;
        c.fillText('THIÊN THẠCH VŨ TRỤ', W/2, H-4);
        c.shadowBlur = 0; c.restore();
      }

      // Fade out
      if (t >= TOTAL) { stop(); if (onComplete) onComplete(); return; }
      _raf = requestAnimationFrame(tick);
    }
    _raf = requestAnimationFrame(tick);
  }

  // ─────────────────────────────────────────────────────────
  //  LIGHTNING STORM CUTSCENE  (total 1.8s)
  // ─────────────────────────────────────────────────────────
  function playLightningStorm(onComplete) {
    const stars    = makeStars(70);
    const TOTAL    = 1.8;
    const boltDefs = [
      { t:0.25, x:W*0.28 }, { t:0.45, x:W*0.65 }, { t:0.65, x:W*0.42 },
      { t:0.85, x:W*0.22 }, { t:1.05, x:W*0.56 },
    ];
    const rain = Array.from({length:70}, () => ({
      x:rand(0,W), y:rand(-H,H), len:rand(10,22), speed:rand(8,16), alpha:rand(0.12,0.4),
    }));
    const liveBolts = [];
    let flashAlpha = 0, t = 0, lastTs = null;

    function makeBolt(x) {
      const segs = []; let cx = x, cy = 40;
      for (let i = 0; i < 11; i++) {
        const ny = cy + rand(18,28), nx = cx + rand(-32,32);
        segs.push({ x1:cx, y1:cy, x2:nx, y2:ny });
        cx = nx; cy = ny; if (cy > H*0.8) break;
      }
      return segs;
    }

    function tick(ts) {
      if (!lastTs) lastTs = ts;
      const dt = Math.min((ts-lastTs)/1000, 0.05);
      lastTs = ts; t += dt;
      c.clearRect(0, 0, W, H);

      const fadeIn  = Math.min(t/0.22, 1);
      const fadeOut = t > 1.25 ? easeOut3((t-1.25)/0.55) : 0;
      const sceneA  = fadeIn * (1 - fadeOut);

      c.save(); c.globalAlpha = sceneA;
      const bg = c.createLinearGradient(0,0,0,H);
      bg.addColorStop(0,'#040412'); bg.addColorStop(0.5,'#080620'); bg.addColorStop(1,'#14030e');
      c.fillStyle = bg; c.fillRect(0,0,W,H);
      c.restore();

      drawStars(stars, sceneA * 0.12);

      // Storm clouds
      c.save(); c.globalAlpha = sceneA * 0.85;
      [{x:100,y:50,rx:175,ry:52},{x:370,y:35,rx:215,ry:60},{x:555,y:58,rx:155,ry:46},{x:250,y:78,rx:195,ry:52}].forEach(cl => {
        const cg = c.createRadialGradient(cl.x,cl.y,0,cl.x,cl.y,Math.max(cl.rx,cl.ry));
        cg.addColorStop(0,'#1a1630ff'); cg.addColorStop(1,'rgba(26,22,48,0)');
        c.fillStyle = cg; c.beginPath(); c.ellipse(cl.x,cl.y,cl.rx,cl.ry,0,0,Math.PI*2); c.fill();
      });
      c.restore();

      c.save(); c.globalAlpha = sceneA*(0.05+0.04*Math.sin(t*9));
      const eg = c.createRadialGradient(W/2,55,0,W/2,55,280);
      eg.addColorStop(0,'#7788ff'); eg.addColorStop(1,'rgba(0,0,0,0)');
      c.fillStyle = eg; c.fillRect(0,0,W,H);
      c.restore();

      boltDefs.forEach(b => {
        if (t >= b.t && t < b.t+0.018) {
          liveBolts.push({ segs: makeBolt(b.x), age: 0 });
          flashAlpha = 0.65;
        }
      });
      if (flashAlpha > 0) {
        flashAlpha -= dt * 5;
        c.save(); c.globalAlpha = Math.max(0,flashAlpha)*sceneA;
        c.fillStyle = '#ddeeff'; c.fillRect(0,0,W,H); c.restore();
      }

      liveBolts.forEach(b => {
        b.age += dt;
        const ba = Math.max(0, 1-b.age/0.28);
        if (ba <= 0) return;
        c.save(); c.globalAlpha = ba*sceneA;
        c.strokeStyle='#ffffff'; c.lineWidth=5; c.shadowColor='#88aaff'; c.shadowBlur=26;
        c.beginPath(); b.segs.forEach((s,i)=>{i===0?c.moveTo(s.x1,s.y1):null;c.lineTo(s.x2,s.y2);}); c.stroke();
        c.strokeStyle='#ccddff'; c.lineWidth=2; c.shadowBlur=8;
        c.beginPath(); b.segs.forEach((s,i)=>{i===0?c.moveTo(s.x1,s.y1):null;c.lineTo(s.x2,s.y2);}); c.stroke();
        c.shadowBlur=0;
        if (b.age<0.06 && b.segs.length>4) {
          const s=b.segs[3]; c.globalAlpha=ba*0.45*sceneA;
          c.strokeStyle='#aabbff'; c.lineWidth=1.5;
          c.beginPath(); c.moveTo(s.x2,s.y2); c.lineTo(s.x2+rand(-55,55),s.y2+rand(28,80)); c.stroke();
        }
        c.restore();
      });

      c.save();
      rain.forEach(r => {
        r.y+=r.speed; r.x+=1; if(r.y>H){r.y=rand(-H*0.2,0);r.x=rand(0,W);}
        c.globalAlpha=r.alpha*Math.min(t/0.5,1)*sceneA;
        c.strokeStyle='#7788bb'; c.lineWidth=1;
        c.beginPath(); c.moveTo(r.x,r.y); c.lineTo(r.x+2,r.y+r.len); c.stroke();
      });
      c.restore();

      drawBars(Math.min(t/0.15,1)*(1-fadeOut*0.9));
      if (t>0.22 && t<1.4) {
        const ta=Math.min((t-0.22)/0.18,1)*Math.max(0,1-(t-1.1)/0.3);
        c.save(); c.globalAlpha=ta*sceneA; c.textAlign='center';
        c.font='9px "Press Start 2P"'; c.fillStyle='#aaddff'; c.shadowColor='#4466ff'; c.shadowBlur=14;
        c.fillText('⚡ THUNDER STORM ⚡', W/2, H-14);
        c.font='5px "Press Start 2P"'; c.fillStyle='#88bbff'; c.shadowBlur=5;
        c.fillText('SẤM SÉT KINH THIÊN', W/2, H-4);
        c.shadowBlur=0; c.restore();
      }
      if (t>=TOTAL) { stop(); if (onComplete) onComplete(); return; }
      _raf = requestAnimationFrame(tick);
    }
    _raf = requestAnimationFrame(tick);
  }

  // ─────────────────────────────────────────────────────────
  //  DRAGON FIRE CUTSCENE  (total 2.0s)
  // ─────────────────────────────────────────────────────────
  function playDragonFire(onComplete) {
    const stars  = makeStars(110);
    const TOTAL  = 2.0;
    const embers = Array.from({length:40}, () => ({
      x:rand(0,W), y:rand(H*0.4,H),
      vx:rand(-0.4,0.4), vy:rand(-1.5,-0.3),
      life:rand(0.3,1), decay:rand(0.007,0.02), size:rand(1.5,4),
      color:Math.random()<0.6?'#ff6600':'#ffcc00',
    }));
    const fireBlobs = [];

    function getDragon(el, seg) {
      const speed = (W + 300) / 1.4;
      const bx = -100 + el * speed - seg * 24;
      return { x: bx, y: H*0.40 + Math.sin(el*4 - seg*0.5)*(42 + Math.sin(el*2.2)*10) };
    }

    let t = 0, lastTs = null;
    function tick(ts) {
      if (!lastTs) lastTs = ts;
      const dt = Math.min((ts-lastTs)/1000, 0.05);
      lastTs = ts; t += dt;
      c.clearRect(0, 0, W, H);

      const fadeIn  = Math.min(t/0.25, 1);
      const fadeOut = t > 1.45 ? easeOut3((t-1.45)/0.55) : 0;
      const sceneA  = fadeIn * (1 - fadeOut);

      c.save(); c.globalAlpha = sceneA;
      const bg = c.createLinearGradient(0,0,0,H);
      bg.addColorStop(0,'#040406'); bg.addColorStop(0.6,'#0c040e'); bg.addColorStop(1,'#1c0408');
      c.fillStyle = bg; c.fillRect(0,0,W,H);
      c.restore();

      drawStars(stars, sceneA*0.60);

      c.save(); c.globalAlpha = sceneA*0.42;
      const hg = c.createLinearGradient(0,H*0.72,0,H);
      hg.addColorStop(0,'rgba(220,55,0,0.5)'); hg.addColorStop(1,'rgba(0,0,0,0)');
      c.fillStyle=hg; c.fillRect(0,H*0.72,W,H*0.28);
      c.restore();

      if (t>0.25 && t<1.90) {
        const el  = t - 0.25;
        const vis = Math.min(el/0.2,1)*sceneA;
        c.save(); c.globalAlpha=vis;
        const SEGS=12;
        for (let s=SEGS;s>=0;s--) {
          const pos=getDragon(el,s);
          const sz=s===0?36:Math.max(4,18-s*1.0);
          if (pos.x<-55||pos.x>W+55) continue;
          if (s===0) {
            const hgl=c.createRadialGradient(pos.x,pos.y,0,pos.x,pos.y,60);
            hgl.addColorStop(0,'rgba(255,100,0,0.42)'); hgl.addColorStop(1,'rgba(0,0,0,0)');
            c.globalAlpha=vis*0.55; c.fillStyle=hgl; c.fillRect(pos.x-60,pos.y-60,120,120);
            c.globalAlpha=vis;
          }
          const bt=s/SEGS;
          c.fillStyle=`rgb(${~~(175-bt*110)},${~~(18+bt*8)},0)`;
          c.beginPath(); c.arc(pos.x,pos.y,sz*0.5,0,Math.PI*2); c.fill();
          if (s>0&&s%2===0) {
            c.fillStyle='rgba(255,70,0,0.38)';
            c.beginPath(); c.arc(pos.x,pos.y,sz*0.28,0,Math.PI*2); c.fill();
          }
        }
        const h0=getDragon(el,0),h1=getDragon(el,-0.4);
        const ha=Math.atan2(h1.y-h0.y,h1.x-h0.x);
        if (h0.x>-35 && h0.x<W+35) {
          c.save(); c.translate(h0.x,h0.y); c.rotate(ha);
          c.fillStyle='#bb2d00'; c.beginPath(); c.ellipse(14,7,18,8,0.15,0,Math.PI*2); c.fill();
          c.fillStyle='#ffee00'; c.shadowColor='#ffcc00'; c.shadowBlur=10;
          c.beginPath(); c.arc(8,-7,4.5,0,Math.PI*2); c.fill();
          c.fillStyle='#ff3300'; c.beginPath(); c.arc(8,-7,2.2,0,Math.PI*2); c.fill();
          c.shadowBlur=0;
          if (el>0.25&&el<1.30&&Math.random()<0.40) {
            const fa=ha+rand(-0.28,0.28);
            fireBlobs.push({
              x:h0.x+Math.cos(ha)*36, y:h0.y+Math.sin(ha)*24,
              vx:Math.cos(fa)*rand(7,13), vy:Math.sin(fa)*rand(3,7),
              life:1, decay:rand(0.030,0.060), size:rand(6,18),
              color:Math.random()<0.5?'#ff5500':'#ffaa00',
            });
          }
          c.restore();
        }
        c.restore();
      }

      c.save();
      fireBlobs.forEach(f=>{
        f.life-=f.decay*30*dt; f.x+=f.vx; f.y+=f.vy; f.vy+=0.2; f.size*=0.97;
        if (f.life<=0||f.size<2) return;
        c.globalAlpha=f.life*sceneA;
        c.fillStyle=f.color; c.shadowColor=f.color; c.shadowBlur=f.size;
        c.beginPath(); c.arc(f.x,f.y,f.size*0.5,0,Math.PI*2); c.fill();
        c.shadowBlur=0;
      });
      c.restore();

      c.save();
      embers.forEach(e=>{
        e.life-=e.decay; e.x+=e.vx; e.y+=e.vy;
        if (e.life<=0){e.life=rand(0.5,1);e.x=rand(0,W);e.y=H;}
        c.globalAlpha=e.life*sceneA*0.60;
        c.fillStyle=e.color; c.fillRect(~~e.x,~~e.y,~~e.size,~~e.size);
      });
      c.restore();

      drawBars(Math.min(t/0.15,1)*(1-fadeOut*0.9));
      if (t>0.28&&t<1.6) {
        const ta=Math.min((t-0.28)/0.2,1)*Math.max(0,1-(t-1.25)/0.35);
        c.save(); c.globalAlpha=ta*sceneA; c.textAlign='center';
        c.font='9px "Press Start 2P"'; c.fillStyle='#ff8800'; c.shadowColor='#ff3300'; c.shadowBlur=16;
        c.fillText('🐉 DRAGON ARROW 🐉', W/2, H-14);
        c.font='5px "Press Start 2P"'; c.fillStyle='#ffaa44'; c.shadowBlur=5;
        c.fillText('RỒNG LỬA TẤN CÔNG', W/2, H-4);
        c.shadowBlur=0; c.restore();
      }
      if (t>=TOTAL) { stop(); if (onComplete) onComplete(); return; }
      _raf = requestAnimationFrame(tick);
    }
    _raf = requestAnimationFrame(tick);
  }

  // ── Public API ─────────────────────────────────────────────
  function stop() {
    if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
    cvs.classList.remove('active');
    c.clearRect(0, 0, W, H);
    _active = false;
  }

  function play(type, onComplete) {
    if (_active) { if (onComplete) onComplete(); return; }
    _active = true;
    cvs.classList.add('active');
    switch (type) {
      case 'meteor':          playMeteor(onComplete);         break;
      case 'lightning_storm': playLightningStorm(onComplete); break;
      case 'dragon':          playDragonFire(onComplete);     break;
      default: stop(); if (onComplete) onComplete();
    }
  }

  function isActive() { return _active; }
  return { play, stop, isActive };
})();

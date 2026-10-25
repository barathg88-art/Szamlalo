// Tűzijáték: rakéták, robbanások, szikrák (canvas) + hangeffektek (Web Audio API).
// Nincs szükség külön hangfájlra, minden hangot a böngésző generál.

(function () {
  'use strict';

  // ---------------------------------------------------------------- Hang

  const Hang = {
    ctx: null,
    fo: null,
    zajBuffer: null,
    be: false,

    // Csak felhasználói kattintás után hívható (böngésző szabály).
    inditas() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        this.ctx = new AC();

        // Kompresszor, hogy a sok egyszerre szóló robbanás ne torzuljon.
        const komp = this.ctx.createDynamicsCompressor();
        komp.threshold.value = -14;
        komp.ratio.value = 6;
        this.fo = this.ctx.createGain();
        this.fo.gain.value = 0.9;
        this.fo.connect(komp).connect(this.ctx.destination);

        // 2 mp fehér zaj, ebből készül minden robbanás és sistergés.
        const hossz = this.ctx.sampleRate * 2;
        this.zajBuffer = this.ctx.createBuffer(1, hossz, this.ctx.sampleRate);
        const d = this.zajBuffer.getChannelData(0);
        for (let i = 0; i < hossz; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.be = true;
      return true;
    },

    kikapcs() { this.be = false; },

    zaj(kezdet, hossz) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.zajBuffer;
      src.start(kezdet, Math.random() * 1.5, hossz);
      return src;
    },

    // Térhatás: a képernyő bal/jobb oldalán lévő robbanás balról/jobbról szól.
    panner(x) {
      const p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      if (p) p.pan.value = Math.max(-1, Math.min(1, x * 2 - 1)) * 0.7;
      return p;
    },

    kimenet(node, x) {
      const p = this.panner(x);
      if (p) { node.connect(p); p.connect(this.fo); } else node.connect(this.fo);
    },

    // Kilövés: süvítő hang + halk "puff".
    kiloves(x) {
      if (!this.be) return;
      const t = this.ctx.currentTime;

      const puff = this.zaj(t, 0.25);
      const pf = this.ctx.createBiquadFilter();
      pf.type = 'lowpass';
      pf.frequency.value = 600;
      const pg = this.ctx.createGain();
      pg.gain.setValueAtTime(0.35, t);
      pg.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      puff.connect(pf).connect(pg);
      this.kimenet(pg, x);

      if (Math.random() < 0.55) {
        // Fütyülő rakéta
        const hossz = 1.0 + Math.random() * 0.5;
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        const f0 = 900 + Math.random() * 500;
        osc.frequency.setValueAtTime(f0, t);
        osc.frequency.exponentialRampToValueAtTime(f0 * 2.6, t + hossz);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.05, t + 0.1);
        g.gain.exponentialRampToValueAtTime(0.0001, t + hossz);
        osc.connect(g);
        this.kimenet(g, x);
        osc.start(t);
        osc.stop(t + hossz);
      } else {
        // Sziszegő rakéta
        const hossz = 1.1;
        const sz = this.zaj(t, hossz);
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 1.2;
        bp.frequency.setValueAtTime(1500, t);
        bp.frequency.exponentialRampToValueAtTime(5000, t + hossz);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.12, t + 0.15);
        g.gain.exponentialRampToValueAtTime(0.0001, t + hossz);
        sz.connect(bp).connect(g);
        this.kimenet(g, x);
      }
    },

    // Robbanás: mély dörrenés + zajos csattanás. A meret 0..1.
    robbanas(x, meret, kesleltetes) {
      if (!this.be) return;
      const t = this.ctx.currentTime + (kesleltetes || 0);
      const hangero = 0.6 + meret * 0.6;

      // Csattanás (szélessávú zaj)
      const cs = this.zaj(t, 1.8);
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(3500 + meret * 2500, t);
      lp.frequency.exponentialRampToValueAtTime(250, t + 1.2);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(hangero, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6 + meret * 0.4);
      cs.connect(lp).connect(g);
      this.kimenet(g, x);

      // Mély dübbenés
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(90 + Math.random() * 30, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.6);
      const og = this.ctx.createGain();
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(0.9 * hangero, t + 0.01);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      osc.connect(og);
      this.kimenet(og, x);
      osc.start(t);
      osc.stop(t + 0.9);

      // Visszhang a "házfalakról"
      const vissz = this.zaj(t + 0.25, 1.2);
      const vf = this.ctx.createBiquadFilter();
      vf.type = 'lowpass';
      vf.frequency.value = 700;
      const vg = this.ctx.createGain();
      vg.gain.setValueAtTime(0.0001, t + 0.25);
      vg.gain.exponentialRampToValueAtTime(hangero * 0.18, t + 0.3);
      vg.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      vissz.connect(vf).connect(vg);
      this.kimenet(vg, 1 - x);
    },

    // Ropogás: sok apró pattanás (csillagszóró-szerű robbanásokhoz).
    ropogas(x, darab, kesleltetes) {
      if (!this.be) return;
      const t0 = this.ctx.currentTime + (kesleltetes || 0);
      for (let i = 0; i < darab; i++) {
        const t = t0 + Math.random() * 1.3;
        const p = this.zaj(t, 0.03);
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 2000 + Math.random() * 3000;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.15 + Math.random() * 0.2, t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
        p.connect(hp).connect(g);
        this.kimenet(g, x);
      }
    }
  };

  // ---------------------------------------------------------------- Kép

  const vaszon = document.getElementById('egbolt');
  const c = vaszon.getContext('2d');
  let W = 0, H = 0, DPR = 1;

  function meretezes() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    vaszon.width = W * DPR;
    vaszon.height = H * DPR;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.fillStyle = '#02030a';
    c.fillRect(0, 0, W, H);
  }
  window.addEventListener('resize', meretezes);
  meretezes();

  // Háttércsillagok
  const csillagok = Array.from({ length: 160 }, () => ({
    x: Math.random(), y: Math.random() * 0.85,
    r: Math.random() * 1.1 + 0.2, f: Math.random() * Math.PI * 2
  }));

  const SZINEK = [
    [255, 70, 70], [255, 170, 50], [255, 230, 120], [120, 255, 120],
    [80, 200, 255], [140, 120, 255], [255, 110, 220], [255, 255, 255]
  ];
  const vel = (a, b) => a + Math.random() * (b - a);
  const valaszt = (t) => t[(Math.random() * t.length) | 0];

  const GRAVITACIO = 60;  // px/s²
  let raketak = [];
  let szikrak = [];
  let villanasok = [];

  // Egy szikra (a robbanás egy darabja)
  function ujSzikra(x, y, vx, vy, szin, opciok) {
    szikrak.push({
      x, y, px: x, py: y, vx, vy, szin,
      elet: 0,
      max: opciok.elet || vel(1.2, 2.2),
      kozeg: opciok.kozeg || 0.9,       // légellenállás
      grav: opciok.grav == null ? 1 : opciok.grav,
      vastag: opciok.vastag || vel(1.2, 2.2),
      pislog: !!opciok.pislog,
      csoves: !!opciok.csoves,           // fűzfa: hosszú, aranyló csóva
      szinvaltas: opciok.szinvaltas || null,
      oszlik: opciok.oszlik || null      // keresztező robbanás: kettéválik
    });
  }

  // Robbanás típusok
  const TIPUSOK = ['bazsarozsa', 'bazsarozsa', 'krizantem', 'fuzfa', 'gyuru', 'pislogo', 'keresztezo', 'palma', 'ketszinu'];

  function robban(x, y, tipus, szin) {
    const meret = Math.min(W, H) / 900;
    const ero = vel(220, 320) * Math.max(0.6, meret * 1.3);
    szin = szin || valaszt(SZINEK);
    const masik = valaszt(SZINEK);
    villanasok.push({ x, y, elet: 0, szin });

    let n = 0;
    const kor = (db, f) => {
      for (let i = 0; i < db; i++) {
        // Gömbszerű eloszlás: egyenletesen a gömb felületén, 2D-be vetítve
        const u = Math.random() * 2 - 1;
        const th = Math.random() * Math.PI * 2;
        const r = Math.sqrt(1 - u * u);
        const s = ero * vel(0.92, 1.05);
        f(Math.cos(th) * r * s, Math.sin(th) * r * s, i);
        n++;
      }
    };

    switch (tipus) {
      case 'krizantem':
        kor(140, (vx, vy) => ujSzikra(x, y, vx, vy, szin, { csoves: true, elet: vel(1.4, 2), vastag: 1.4 }));
        break;
      case 'fuzfa':
        kor(110, (vx, vy) => ujSzikra(x, y, vx * 0.75, vy * 0.75, [255, 190, 90],
          { csoves: true, elet: vel(3, 4.2), kozeg: 0.6, grav: 1.6, vastag: 1.6 }));
        break;
      case 'gyuru': {
        const db = 70, dol = vel(0, Math.PI), lap = vel(0.3, 0.9);
        for (let i = 0; i < db; i++) {
          const a = (i / db) * Math.PI * 2;
          let vx = Math.cos(a) * ero, vy = Math.sin(a) * ero * lap;
          const rx = vx * Math.cos(dol) - vy * Math.sin(dol);
          const ry = vx * Math.sin(dol) + vy * Math.cos(dol);
          ujSzikra(x, y, rx, ry, szin, { elet: vel(1.4, 1.8), vastag: 2 });
        }
        kor(30, (vx, vy) => ujSzikra(x, y, vx * 0.3, vy * 0.3, masik, { elet: 1.2 }));
        break;
      }
      case 'pislogo':
        kor(120, (vx, vy) => ujSzikra(x, y, vx, vy, [255, 255, 235], { pislog: true, elet: vel(1.8, 2.8) }));
        break;
      case 'keresztezo':
        kor(26, (vx, vy) => ujSzikra(x, y, vx * 0.8, vy * 0.8, szin,
          { csoves: true, elet: vel(0.8, 1.0), vastag: 2.4, oszlik: true }));
        break;
      case 'palma':
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2 + vel(-0.1, 0.1);
          for (let k = 0; k < 6; k++) {
            ujSzikra(x, y, Math.cos(a) * ero * vel(0.8, 1.05), Math.sin(a) * ero * vel(0.8, 1.05) - 40,
              [255, 200, 110], { csoves: true, elet: vel(2.2, 3), kozeg: 0.7, grav: 1.4, vastag: 2.6 });
          }
        }
        break;
      case 'ketszinu':
        kor(130, (vx, vy, i) => ujSzikra(x, y, vx, vy, i % 2 ? szin : masik, { elet: vel(1.4, 2.2) }));
        break;
      default: // bazsarozsa: klasszikus gömb, a végén színt vált
        kor(130, (vx, vy) => ujSzikra(x, y, vx, vy, szin,
          { elet: vel(1.4, 2.2), szinvaltas: Math.random() < 0.4 ? masik : null }));
    }

    // Hang: a fény gyorsabb, mint a hang, ezért egy kis késés
    const hx = x / W;
    const kes = 0.05 + (1 - y / H) * 0.15;
    Hang.robbanas(hx, Math.min(1, n / 140), kes);
    if (tipus === 'pislogo' || tipus === 'keresztezo' || Math.random() < 0.25) {
      Hang.ropogas(hx, 25, kes + 0.5);
    }
  }

  // Rakéta kilövése
  function kiloves(opciok) {
    opciok = opciok || {};
    const x = opciok.x != null ? opciok.x : vel(W * 0.12, W * 0.88);
    const celY = opciok.y != null ? opciok.y : vel(H * 0.12, H * 0.42);
    const magassag = H - celY;
    // v² = 2 g h  → pont a cél magasságban áll meg
    const vy = -Math.sqrt(2 * GRAVITACIO * 1.0 * magassag) * 1.05;
    raketak.push({
      x, y: H + 5, px: x, py: H + 5,
      vx: vel(-30, 30), vy,
      celY,
      tipus: opciok.tipus || valaszt(TIPUSOK),
      szin: opciok.szin || valaszt(SZINEK)
    });
    Hang.kiloves(x / W);
  }

  // --------------------------------------------------------- Animáció

  let elozo = performance.now();
  let fut = false;      // folyamatos műsor
  let kovetkezo = 0;    // következő kilövésig hátralévő idő
  let finaleIdo = 0;    // a műsor eleje: sűrűbb lövések

  function lepes(dt) {
    // Rakéták
    for (let i = raketak.length - 1; i >= 0; i--) {
      const r = raketak[i];
      r.px = r.x; r.py = r.y;
      r.vy += GRAVITACIO * dt;
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      // Szikracsóva a rakéta mögött
      if (Math.random() < 0.9) {
        szikrak.push({
          x: r.x, y: r.y, px: r.x, py: r.y,
          vx: vel(-20, 20), vy: vel(10, 50), szin: [255, 190, 110],
          elet: 0, max: vel(0.3, 0.6), kozeg: 0.5, grav: 0.5, vastag: 1.1
        });
      }
      if (r.vy >= -20 || r.y <= r.celY) {
        raketak.splice(i, 1);
        robban(r.x, r.y, r.tipus, r.szin);
      }
    }

    // Szikrák
    for (let i = szikrak.length - 1; i >= 0; i--) {
      const s = szikrak[i];
      s.px = s.x; s.py = s.y;
      const k = Math.pow(s.kozeg, dt * 3);
      s.vx *= k; s.vy *= k;
      s.vy += GRAVITACIO * s.grav * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.elet += dt;

      if (s.csoves && Math.random() < 0.35) {
        szikrak.push({
          x: s.x, y: s.y, px: s.x, py: s.y, vx: s.vx * 0.05, vy: s.vy * 0.05,
          szin: s.szin, elet: 0, max: vel(0.3, 0.7), kozeg: 0.4, grav: 0.4, vastag: s.vastag * 0.6
        });
      }

      if (s.elet >= s.max) {
        if (s.oszlik) {
          const sz = valaszt(SZINEK);
          for (let j = 0; j < 4; j++) {
            const a = j * Math.PI / 2 + Math.random() * 0.5;
            ujSzikra(s.x, s.y, Math.cos(a) * 90, Math.sin(a) * 90, sz, { elet: vel(0.6, 0.9), vastag: 1.5 });
          }
        }
        szikrak.splice(i, 1);
      }
    }

    for (let i = villanasok.length - 1; i >= 0; i--) {
      villanasok[i].elet += dt;
      if (villanasok[i].elet > 0.35) villanasok.splice(i, 1);
    }

    // Folyamatos műsor ütemezése
    if (fut) {
      finaleIdo += dt;
      kovetkezo -= dt;
      if (kovetkezo <= 0) {
        // Az első ~8 másodpercben nagy sortűz, utána nyugodtabb tempó
        const sortuz = finaleIdo < 8;
        const db = sortuz ? 2 + ((Math.random() * 3) | 0) : (Math.random() < 0.3 ? 2 : 1);
        for (let j = 0; j < db; j++) setTimeout(() => kiloves(), j * vel(60, 250));
        kovetkezo = sortuz ? vel(0.25, 0.6) : vel(0.6, 1.6);
      }
    }
  }

  function rajz(most) {
    // A régi képkocka halványítása → fénycsíkok (hosszú expozíció hatás)
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = 'rgba(2, 3, 10, 0.22)';
    c.fillRect(0, 0, W, H);

    // Csillagok
    for (const cs of csillagok) {
      const a = 0.35 + 0.35 * Math.sin(most / 900 + cs.f);
      c.fillStyle = `rgba(255,255,255,${a})`;
      c.fillRect(cs.x * W, cs.y * H, cs.r, cs.r);
    }

    c.globalCompositeOperation = 'lighter';

    // Égbolt felvillanása robbanáskor
    for (const v of villanasok) {
      const a = (1 - v.elet / 0.35) * 0.35;
      const g = c.createRadialGradient(v.x, v.y, 0, v.x, v.y, Math.max(W, H) * 0.45);
      g.addColorStop(0, `rgba(${v.szin[0]},${v.szin[1]},${v.szin[2]},${a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
    }

    c.lineCap = 'round';
    for (const r of raketak) {
      c.strokeStyle = 'rgba(255,220,170,0.9)';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(r.px, r.py);
      c.lineTo(r.x, r.y);
      c.stroke();
    }

    for (const s of szikrak) {
      const t = s.elet / s.max;
      let a = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      if (s.pislog && t > 0.3) a *= Math.random() < 0.5 ? 1 : 0.05;
      let col = s.szin;
      if (s.szinvaltas && t > 0.55) col = s.szinvaltas;
      // Forró, fehéres kezdet, aztán a saját szín
      const feher = Math.max(0, 1 - t * 4);
      const rr = col[0] + (255 - col[0]) * feher;
      const gg = col[1] + (255 - col[1]) * feher;
      const bb = col[2] + (255 - col[2]) * feher;
      c.strokeStyle = `rgba(${rr | 0},${gg | 0},${bb | 0},${a})`;
      c.lineWidth = s.vastag * (1 - t * 0.5);
      c.beginPath();
      c.moveTo(s.px, s.py);
      c.lineTo(s.x + 0.1, s.y + 0.1);
      c.stroke();
    }
  }

  function ciklus(most) {
    const dt = Math.min(0.05, (most - elozo) / 1000);
    elozo = most;
    lepes(dt);
    rajz(most);
    requestAnimationFrame(ciklus);
  }
  requestAnimationFrame(ciklus);

  // Nyilvános felület az app.js számára
  window.Tuzijatek = {
    Hang,
    kiloves,
    indit() { fut = true; finaleIdo = 0; kovetkezo = 0; },
    leallit() { fut = false; },
    get fut() { return fut; }
  };
})();

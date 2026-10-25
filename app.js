// Visszaszámláló logika: a következő január 1. 00:00-ig (helyi idő szerint).

(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const el = {
    cim: $('cim'), nap: $('nap'), ora: $('ora'), perc: $('perc'), mp: $('mp'),
    nagyszam: $('nagyszam'), ujev: $('ujev'),
    nullaz: $('nullaz'), teszt10: $('teszt10'), vissza: $('vissza'), hang: $('hang')
  };

  const UNNEP_HOSSZ = 3 * 60 * 1000; // ennyi ideig tart a tűzijáték éjfélkor (3 perc)

  function kovetkezoSzilveszter(most) {
    return new Date(most.getFullYear() + 1, 0, 1, 0, 0, 0, 0);
  }

  // Ha éppen az újév első perceiben vagyunk, még az ünneplés megy.
  function valodiCel() {
    const most = new Date();
    const evKezdet = new Date(most.getFullYear(), 0, 1);
    if (most - evKezdet < UNNEP_HOSSZ) return evKezdet;
    return kovetkezoSzilveszter(most);
  }

  let cel = valodiCel();
  let tesztMod = false;
  let unnepel = false;
  let unnepVege = 0;

  const ketjegy = (n) => String(n).padStart(2, '0');

  function frissit() {
    const most = Date.now();
    const hatra = cel.getTime() - most;

    if (hatra <= 0) {
      if (!unnepel) unnepStart();
      if (!tesztMod && most > unnepVege) {
        // Vége az ünneplésnek, jöhet a következő év visszaszámlálása
        unnepStop();
        cel = kovetkezoSzilveszter(new Date());
      }
      return;
    }

    const mp = Math.ceil(hatra / 1000);
    el.nap.textContent = Math.floor(mp / 86400);
    el.ora.textContent = ketjegy(Math.floor(mp / 3600) % 24);
    el.perc.textContent = ketjegy(Math.floor(mp / 60) % 60);
    el.mp.textContent = ketjegy(mp % 60);
    const ev = tesztMod ? kovetkezoSzilveszter(new Date()).getFullYear() : cel.getFullYear();
    el.cim.textContent = `Visszaszámlálás ${ev} újévig`;

    // Az utolsó 10 másodpercben nagy számok
    if (mp <= 10) {
      el.nagyszam.hidden = false;
      el.nagyszam.textContent = mp;
    } else {
      el.nagyszam.hidden = true;
    }
  }

  function unnepStart() {
    unnepel = true;
    unnepVege = cel.getTime() + UNNEP_HOSSZ;
    el.nap.textContent = '0';
    el.ora.textContent = el.perc.textContent = el.mp.textContent = '00';
    el.nagyszam.hidden = true;
    // Tesztnél is a következő valódi év száma jelenjen meg
    const ev = tesztMod ? kovetkezoSzilveszter(new Date()).getFullYear() : cel.getFullYear();
    el.ujev.textContent = `Boldog új évet! ${ev}`;
    el.ujev.hidden = false;
    document.body.classList.add('unnep');
    el.vissza.hidden = false;
    Tuzijatek.indit();
  }

  function unnepStop() {
    unnepel = false;
    el.ujev.hidden = true;
    document.body.classList.remove('unnep');
    Tuzijatek.leallit();
  }

  function tesztre(mpMulva) {
    // Az első kattintás egyben bekapcsolja a hangot is
    if (!Tuzijatek.Hang.be) hangBe();
    unnepStop();
    tesztMod = true;
    el.vissza.hidden = false;
    cel = new Date(Date.now() + mpMulva * 1000);
    frissit();
  }

  function hangBe() {
    if (Tuzijatek.Hang.inditas()) {
      el.hang.textContent = '🔊 Hang kikapcsolása';
      el.hang.setAttribute('aria-pressed', 'true');
    }
  }

  function hangKi() {
    Tuzijatek.Hang.kikapcs();
    el.hang.textContent = '🔇 Hang bekapcsolása';
    el.hang.setAttribute('aria-pressed', 'false');
  }

  el.nullaz.addEventListener('click', () => tesztre(0));
  el.teszt10.addEventListener('click', () => tesztre(10));
  el.vissza.addEventListener('click', () => {
    unnepStop();
    tesztMod = false;
    el.vissza.hidden = true;
    cel = valodiCel();
    frissit();
  });
  el.hang.addEventListener('click', () => (Tuzijatek.Hang.be ? hangKi() : hangBe()));

  // Kattintás az égre: kilő egy rakétát oda (szórakozásnak)
  document.getElementById('egbolt').addEventListener('click', (e) => {
    if (!Tuzijatek.Hang.be) hangBe();
    Tuzijatek.kiloves({ x: e.clientX, y: e.clientY });
  });

  frissit();
  setInterval(frissit, 200);
})();

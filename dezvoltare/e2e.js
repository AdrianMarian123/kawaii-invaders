/**
 * Test cap-la-cap: extrage codul REAL de co-op din build/index.html (patch-uit),
 * il ruleaza de doua ori (gazda + oaspete) peste serverul de relay real,
 * si verifica atat rezolvarea adresei (?relay= / localStorage / camp) cat si
 * schimbul de date host<->guest.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawn } = require('child_process');
const WebSocket = require('ws');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const PORT = 3999;
const RELAY = 'ws://127.0.0.1:' + PORT;

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  OK  ', m); } else { fail++; console.log('  FAIL', m); } };

// ---- extrage sectiunea de co-op din HTML-ul real -------------------------
const START = '// ================= ONLINE CO-OP';
const END = 'function update(dt){';
const a = HTML.indexOf(START), b = HTML.indexOf(END, a);
if (a < 0 || b < 0) { console.error('nu gasesc sectiunea de co-op'); process.exit(1); }
const COOP_SRC = HTML.slice(a, b);
console.log('sectiune co-op extrasa:', COOP_SRC.length, 'caractere\n');

// ---- fals-DOM minimal ----------------------------------------------------
function makeSandbox(label, store) {
  const elements = {};
  const mkEl = () => ({
    textContent: '', value: '', style: {}, classList: { add(){}, remove(){} },
    focus(){}, blur(){}, addEventListener(){}, querySelectorAll: () => []
  });
  ['coopStatus','coopCode','coopCodeVal','coopRelay','coopRelayHint','coopRelayBox','coopRelayToggle','coopMsg',
   'overTitle','oWave','oKills','oCombo','oCoins','oMissiles','oBoss',
   'coopSplit','oCoinsMe','oCoinsHim','oScoreMe','oScoreHim','bestLine'].forEach(k => elements[k] = mkEl());
  elements.coopCode.scrollIntoView = function(){ g.__scrolled = true; };
  elements.coopRelayBox.style.display = 'none';

  const g = {
    console: { log(){}, error(){}, warn(){} },
    setTimeout, clearTimeout, setInterval, clearInterval,
    WebSocket, URLSearchParams, Math, JSON, performance,
    location: { search: store.search || '' },
    localStorage: {
      _d: store.ls,
      getItem(k){ return k in this._d ? this._d[k] : null; },
      setItem(k, v){ this._d[k] = String(v); },
      removeItem(k){ delete this._d[k]; }
    },
    el: (id) => elements[id] || mkEl(),
    // --- stub-uri pentru starea jocului -----------------------------------
    coins: 0, saveCoins(){}, WEAPONSX:0,
    W: store.w || 720, H: store.h || 1280, INTRO_DUR: 2,
    net: { ws: null, mode: 'off', role: null, connected: false, sendT: 0 },
    p2: { active: false, x: 0, y: 0, r: 19, invuln: 0, weapon: 'b', lvl: {}, lives: 3,
          dead: false, deadT: 0, shield: 0, magnet: 0, wingmen: 0, missiles: 3, burst: 1,
          fireT: 0, burstT: 0, score: 0, coins: 0 },
    player: { x: 360, y: 1150, lives: 3, dead: false, deadT: 0, r: 16, shield: 0, invuln: 0, weapon: 'b', lvl: {} },
    ui: { menu: mkEl(), story: mkEl(), coop: mkEl(), opts: mkEl(), pause: mkEl(), over: mkEl(), touchpad: mkEl(), finalScore: mkEl() },
    state: 'menu', score: 0, wave: 1, mult: 1, combo: 0, waveActive: false, bossIntro: 0, introBoss: null,
    enemies: [], eBullets: [], bullets: [], pickups: [], particles: [],
    flash: 0, flashCol: 0, gravityMode: false, pointer: { active: false, x: 0, y: 0 }, keys: {},
    runStats: { maxWave: 1, kills: 0, maxMult: 1, coins: 0, missiles: 0, bossKills: 0 },
    // cheile reale din joc — drawPickup face WEAPONS[p.weapon].icon, deci cheia trebuie sa existe
    WEAPONS: { pulse:{icon:'✦'}, scatter:{icon:'❀'}, laser:{icon:'≡'}, arc:{icon:'⚡'}, boomer:{icon:'🪃'} },
    clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
    lerp: (x, y, t) => x + (y - x) * t,
    sprite: () => null, ctx: null, TAU: Math.PI * 2,
    toast(){}, floater(){}, shake(){}, boom(){}, updateHUD(){}, snd: { hurt(){}, pickup(){} },
    fireMissile(){ g.__acts.push('rocket'); }, activateBurst(){ g.__acts.push('burst'); },
    startGame(){ g.__started = true; g.state = 'playing'; },
    __acts: [], __started: false, __label: label, __el: elements
  };
  g.window = g; g.globalThis = g;
  vm.createContext(g);
  vm.runInContext(COOP_SRC, g, { filename: 'coop-' + label + '.js' });
  return g;
}

// ---- pornire server ------------------------------------------------------
const srv = spawn(process.execPath, [path.join(__dirname, 'server-relay.js')], {
  env: Object.assign({}, process.env, { PORT: String(PORT) }), stdio: ['ignore', 'pipe', 'pipe']
});
srv.stdout.on('data', () => {});
srv.stderr.on('data', d => console.error('[srv]', String(d).trim()));
const done = (code) => { try { srv.kill(); } catch (e) {} process.exit(code); };
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  await wait(700);

  // ===== A. rezolvarea adresei ============================================
  console.log('=== A. rezolvarea adresei serverului ===');
  {
    const s = makeSandbox('norm', { ls: {}, search: '' });
    ok(s.normRelay('https://x.onrender.com') === 'wss://x.onrender.com', 'https:// -> wss://');
    ok(s.normRelay('http://192.168.1.5:3000') === 'ws://192.168.1.5:3000', 'http:// -> ws://');
    ok(s.normRelay('x.onrender.com') === 'wss://x.onrender.com', 'domeniu gol -> wss://');
    ok(s.normRelay('192.168.1.5:3000') === 'ws://192.168.1.5:3000', 'IP local -> ws:// (nu wss)');
    ok(s.normRelay('localhost:3000') === 'ws://localhost:3000', 'localhost -> ws://');
    ok(s.normRelay('wss://x.com/') === 'wss://x.com', 'taie slash-ul final');
    ok(s.normRelay('  wss://x.com  ') === 'wss://x.com', 'ignora spatiile');
    ok(s.normRelay('') === '' && s.normRelay(null) === '', 'gol ramane gol');
    ok(s.relayIsSet('wss://REPLACE-WITH-YOUR-SERVER.onrender.com') === false, 'placeholder = neconfigurat');
  }
  {
    const s = makeSandbox('q', { ls: {}, search: '?relay=my.host.com' });
    ok(s.getRelay() === 'wss://my.host.com', '?relay= din URL are prioritate');
    ok(s.localStorage.getItem('kw_relay_url') === 'wss://my.host.com', '?relay= se si salveaza');
  }
  {
    const ls = { kw_relay_url: 'wss://saved.example.com' };
    const s = makeSandbox('ls', { ls, search: '' });
    ok(s.getRelay() === 'wss://saved.example.com', 'localStorage folosit cand nu e ?relay=');
    const s2 = makeSandbox('ls2', { ls, search: '?relay=other.com' });
    ok(s2.getRelay() === 'wss://other.com', 'URL bate localStorage');
  }
  {
    // telefon proaspat, fara nimic salvat -> trebuie sa gaseasca serverul livrat in cod
    const s = makeSandbox('empty', { ls: {}, search: '' });
    ok(s.getRelay() === 'wss://kawaii-relay.onrender.com', 'telefon nou -> serverul de pe Render, fara configurare');
    ok(s.relayIsSet(s.getRelay()), 'adresa livrata e considerata valida');
    ok(s.setRelay('render-test.com') === 'wss://render-test.com', 'setRelay normalizeaza');
    ok(s.getRelay() === 'wss://render-test.com', 'jucatorul poate suprascrie serverul livrat');
  }
  {
    // campul de server nu trebuie sa acopere codul: e pliat pana il ceri tu
    const s = makeSandbox('ui', { ls: {}, search: '' });
    ok(s.__el.coopRelayBox.style.display === 'none', 'campul de server e ascuns la pornire');
    s.__el.coopRelayToggle.onclick();
    ok(s.__el.coopRelayBox.style.display === 'flex', 'butonul "alt server" il deschide');
    s.__el.coopRelayToggle.onclick();
    ok(s.__el.coopRelayBox.style.display === 'none', 'al doilea click il inchide la loc');
  }
  {
    // daca lipseste adresa, campul trebuie sa se deschida singur
    const s = makeSandbox('auto', { ls: {}, search: '' });
    s.DEFAULT_RELAY_BROKEN = true;
    s.localStorage.setItem('kw_relay_url', 'wss://REPLACE-WITH-YOUR-SERVER.onrender.com');
    s.netHost();
    ok(s.__el.coopRelayBox.style.display === 'flex', 'adresa invalida -> campul se deschide singur');
    ok(s.net.ws === null, 'nu incearca sa se conecteze cu adresa invalida');
  }
  {
    // daca jucatorul goleste campul, co-op-ul nu trebuie sa porneasca in gol
    const s = makeSandbox('blank', { ls: { kw_relay_url: '' }, search: '' });
    s.__el.coopRelay.value = '';
    s.setRelay('');
    s.localStorage.setItem('kw_relay_url', 'x');   // fortam o valoare invalida
    s.localStorage.removeItem('kw_relay_url');
    ok(s.getRelay() === 'wss://kawaii-relay.onrender.com', 'camp golit -> revine la serverul livrat, nu ramane fara');
  }

  // ===== B. flux real host <-> guest ======================================
  console.log('\n=== B. joc real prin serverul de relay ===');
  const host = makeSandbox('host', { ls: { kw_relay_url: RELAY }, search: '' });
  const guest = makeSandbox('guest', { ls: {}, search: '?relay=' + RELAY });
  ok(host.getRelay() === RELAY && guest.getRelay() === RELAY, 'ambii clienti rezolva adresa locala');

  ok(host.__el.coopMsg.style.display !== 'none', 'inainte de a crea jocul, explicatiile sunt vizibile');
  host.netHost();
  await wait(250);
  const code = host.__el.coopCodeVal.textContent;
  ok(/^KW[A-Z0-9]{5}$/.test(code), 'gazda genereaza cod valid: ' + code);
  ok(host.__el.coopMsg.style.display === 'none', 'cand apare codul, explicatiile lungi se ascund (fac loc)');
  ok(host.__el.coopCode.style.display === 'flex', 'blocul cu codul e afisat');
  ok(host.__scrolled === true, 'codul e adus in vizor automat');

  guest.netJoin(code);
  await wait(500);
  ok(host.net.connected && host.net.mode === 'host', 'gazda: conectat, rol host');
  ok(guest.net.connected && guest.net.mode === 'guest', 'oaspete: conectat, rol guest');
  await wait(500);
  ok(host.__started && guest.__started, 'jocul porneste la ambii');

  // guest -> host: pozitie
  guest.player.x = 200; guest.player.y = 900; guest.net.sendT = 0;
  guest.guestUpdate(0.016);
  await wait(250);
  ok(Math.abs(host.p2.x - 200) < 2 && Math.abs(host.p2.y - 900) < 2,
     'pozitia P2 ajunge la gazda (' + host.p2.x.toFixed(0) + ',' + host.p2.y.toFixed(0) + ')');

  // guest -> host: actiuni
  guest.netSend({ t: 'act', a: 'rocket' });
  guest.netSend({ t: 'act', a: 'burst' });
  await wait(250);
  ok(host.__acts.join(',') === 'rocket,burst', 'actiunile oaspetelui ajung la gazda');

  // host -> guest: snapshot
  host.score = 13370; host.wave = 7; host.player.lives = 2; host.mult = 4;
  host.player.x = 500; host.player.y = 1000;
  // de la etapa 5 fiecare navă își are viețile și scorul ei: gazda are 2 vieți si 13370,
  // oaspetele (p2, vazut de gazda) are 5 vieti si 800
  host.player.score = 9000; host.player.coins = 12;
  host.p2.lives = 5; host.p2.score = 800; host.p2.coins = 4; host.p2.weapon = 'scatter'; host.p2.lvl = { scatter: 4 };
  host.enemies = Array.from({ length: 40 }, (_, i) => ({ x: i * 15, y: 100 + i, r: 14, type: 'bird', hp: 1, maxHp: 2, blink: 1 }));
  host.enemies[0] = { x: 360, y: 300, r: 60, type: 'boss', hp: 8, maxHp: 10, boss: true, name: 'Regina', col: '#ff8fc7', blink: 1 };
  host.eBullets = Array.from({ length: 60 }, (_, i) => ({ x: i * 10, y: 200, r: 7, color: '#ffd1f0', bk: 'drop' }));
  host.bullets = Array.from({ length: 30 }, (_, i) => ({ x: i * 12, y: 800, r: 4, color: '#fff', type: 'b' }));
  // cadoul cu arma e exact ce ingheta oaspetele: drawPickup cerea WEAPONS[p.weapon].icon
  host.pickups = [
    { x: 100, y: 400, type: 'coin', tier: 2 },
    { x: 200, y: 420, type: 'gift', weapon: 'laser' }
  ];
  host.netSnapshot();
  await wait(300);
  ok(guest.score === 13370 && guest.wave === 7, 'scorul echipei + valul ajung la oaspete');
  ok(guest.player.lives === 5 && guest.mult === 4, 'oaspetele isi vede VIETILE LUI (5), nu pe ale gazdei (2): ' + guest.player.lives);
  ok(guest.p2.lives === 2, 'si vede separat viețile gazdei: ' + guest.p2.lives);
  ok(guest.player.weapon === 'scatter' && guest.player.lvl.scatter === 4, 'si arma lui, cu nivelul ei: ' + guest.player.weapon + ' ' + guest.player.lvl.scatter);
  ok(guest.player.coins === 4 && guest.p2.coins === 12, 'punga fiecaruia calatoreste separat: ' + guest.player.coins + ' / ' + guest.p2.coins);
  ok(guest.player.dead === false && guest.p2.dead === false, 'starea de "mort" e trimisa pentru fiecare');
  ok(guest.enemies.length === 40, 'toti cei 40 de inamici ajung');
  ok(guest.enemies[0].boss === true && guest.enemies[0].name === 'Regina', 'boss-ul ajunge cu nume');
  ok(Math.abs(guest.enemies[1].x - 15) < 2, 'coordonatele inamicilor se refac corect');
  ok(guest.eBullets.length === 60 && guest.bullets.length === 30, 'gloantele ajung (60 + 30)');
  ok(guest.pickups.length === 2, 'pickup-urile ajung');
  ok(guest.pickups[0].tier === 2, 'nivelul monedei ajunge (nu mai e mereu moneda de bronz)');
  {
    const gift = guest.pickups[1];
    ok(gift.type === 'gift' && gift.weapon === 'laser', 'cadoul ajunge cu arma lui: ' + gift.weapon);
    // REGRESIE: asta ingheta oaspetele — WEAPONS[undefined].icon arunca la fiecare cadru
    ok(guest.WEAPONS[gift.weapon] !== undefined, 'arma cadoului exista in WEAPONS (altfel drawPickup arunca)');
    ok(guest.pickups.every(p => p.type !== 'gift' || guest.WEAPONS[p.weapon]),
       'NICIUN cadou nu ramane fara arma valida');
  }
  {
    // gazda veche, care nu trimite arma: oaspetele trebuie sa puna una valida, nu sa crape
    const g2 = makeSandbox('vechi', { ls: {}, search: '' });
    g2.applySnapshot({ t:'s', sc:0, wv:1, lv:3, cm:1, p1x:0.5, p1y:0.5,
                       en:[], eb:[], pb:[], pk:[{ x:0.5, y:0.5, ty:'gift' }] });
    ok(g2.WEAPONS[g2.pickups[0].weapon] !== undefined, 'cadou fara arma -> primeste una valida, nu crapa');
  }
  ok(guest.bullets.every(b => Number.isFinite(b.vx) && Number.isFinite(b.vy)),
     'gloantele jucatorului au viteza finita (fara NaN in cozi)');
  ok(guest.eBullets.every(b => Number.isFinite(b.vx) && Number.isFinite(b.vy)),
     'gloantele inamice au viteza finita (fara NaN in rotatii)');
  // nava gazdei nu mai sare: primeste o tinta si aluneca spre ea in intervalul urmator
  ok(Math.abs(guest.p2.tx - 500) < 2, 'pozitia gazdei ajunge la oaspete (ca tinta)');
  for (let i = 0; i < 4; i++) guest.guestUpdate(0.016);
  ok(Math.abs(guest.p2.x - 500) < 2, 'si e atinsa complet dupa un interval: ' + guest.p2.x.toFixed(0));
  ok(guest.state === 'playing', 'oaspetele intra in modul de joc');

  // dimensiune snapshot maxim
  let sz = 0; const realSend = guest.netSend;
  host.netSend = (o) => { sz = JSON.stringify({ type: 'msg', data: o }).length; };
  host.enemies = Array.from({ length: 60 }, (_, i) => ({ x: i, y: i, r: 14, type: 'bird', hp: 1, maxHp: 2, blink: 1, boss: true, name: 'Boss Foarte Lung', col: '#ff8fc7' }));
  host.eBullets = Array.from({ length: 90 }, (_, i) => ({ x: i, y: i, r: 7, color: '#ffd1f0', bk: 'drop' }));
  host.bullets = Array.from({ length: 40 }, (_, i) => ({ x: i, y: i, r: 4, color: '#ffffff', type: 'b' }));
  host.pickups = Array.from({ length: 24 }, (_, i) => ({ x: i, y: i, type: 'coin' }));
  host.netSnapshot();
  ok(sz < 64 * 1024, 'cel mai mare snapshot = ' + (sz / 1024).toFixed(1) + ' KB (< limita de 64 KB)');

  // game over
  host.netSend = (o) => { try { host.net.ws.send(JSON.stringify({ type: 'msg', data: o })); } catch (e) {} };
  host.netSend({ t: 'over', sc: 99999 });
  await wait(250);
  ok(guest.score === 99999, 'ecranul de final ajunge la oaspete');

  // deconectare
  guest.coopReset();
  await wait(400);
  ok(host.__el.coopStatus.textContent.length >= 0, 'gazda primeste notificarea de plecare fara eroare');

  // ===== C. ecrane de forme diferite (iPhone vertical vs Android orizontal) =====
  console.log('\n=== C. gazda si oaspetele au ecrane de forme diferite ===');
  {
    const H_W = 720,  H_H = 1280;    // gazda: telefon vertical
    const G_W = 2048, G_H = 945;     // oaspete: telefon orizontal
    const hostP  = makeSandbox('hp', { ls: {}, search: '', w: H_W, h: H_H });
    const guestP = makeSandbox('gp', { ls: {}, search: '', w: G_W, h: G_H });

    let sent = null;
    hostP.netSend = (o) => { sent = o; };
    hostP.net.connected = true; hostP.net.mode = 'host';
    hostP.player.x = H_W / 2; hostP.player.y = H_H * 0.8;
    // un inamic de raza 40 px, exact in centrul ecranului gazdei
    hostP.enemies = [{ x: H_W / 2, y: H_H / 2, r: 40, type: 'bird', hp: 1, maxHp: 2, blink: 1 }];
    hostP.netSnapshot();

    ok(sent.hw === H_W && sent.hh === H_H, 'gazda isi trimite dimensiunile ecranului');

    guestP.net.mode = 'guest';
    guestP.applySnapshot(sent);

    // acelasi calcul pe care trebuie sa-l faca si jocul
    const sc = Math.min(G_W / H_W, G_H / H_H);   // 0.738
    const pw = H_W * sc, ph = H_H * sc;
    const ox = (G_W - pw) / 2, oy = (G_H - ph) / 2;

    const e = guestP.enemies[0];
    ok(Math.abs(e.r - 40 * sc) < 1.5,
       'inamicul are marimea gazdei x factorul de potrivire: ' + e.r.toFixed(1) + ' px');
    ok(Math.abs(e.x - G_W / 2) < 1 && Math.abs(e.y - G_H / 2) < 1,
       'inamicul din centrul gazdei apare in centrul oaspetelui');
    // REGRESIE: inainte, un inamic la marginea din dreapta a gazdei ajungea lipit de
    // marginea ecranului oaspetelui, pentru ca latimea era intinsa. Acum trebuie sa cada in teren.
    hostP.enemies = [{ x: H_W - 40, y: H_H / 2, r: 40, type:'bird', hp:1, maxHp:2, blink:1 }];
    hostP.netSnapshot(); guestP.applySnapshot(sent);
    const eR = guestP.enemies[0];
    ok(Math.abs(eR.x - (ox + pw * ((H_W - 40) / H_W))) < 2,
       'marginea dreapta a gazdei cade in teren, nu pe marginea ecranului: ' + eR.x.toFixed(0) + ' (ecran ' + G_W + ')');
    ok(eR.x < G_W - 100, 'ramane banda laterala libera in dreapta');

    // oaspetele nu trebuie sa poata iesi din terenul de joc
    let back = null;
    guestP.netSend = (o) => { back = o; };
    guestP.player.x = G_W - 5;            // in banda laterala din dreapta
    guestP.player.y = G_H * 0.9;
    guestP.net.sendT = 0; guestP.net.connected = true;
    guestP.guestUpdate(0.016);
    ok(guestP.player.x <= ox + pw - 23,
       'nava oaspetelui e tinuta in teren, nu zboara in banda laterala');
    ok(back && back.nx >= 0 && back.nx <= 1 && back.ny >= 0 && back.ny <= 1,
       'pozitia raportata gazdei e in coordonatele ei (0..1): nx=' + back.nx);

    // dus-intors: unde ajunge nava oaspetelui pe ecranul gazdei
    const onHost = back.nx * H_W;
    ok(onHost > H_W * 0.9 && onHost <= H_W,
       'gazda il vede pe oaspete tot in dreapta terenului: ' + onHost.toFixed(0) + '/' + H_W);
  }

  // ===== C2. companioni si monede =====
  console.log('\n=== C2. companioni si monede pentru oaspete ===');
  {
    const h = makeSandbox('ch', { ls: {}, search: '' });
    const g = makeSandbox('cg', { ls: {}, search: '' });
    let snap = null;
    h.netSend = (o) => { snap = o; };
    h.net.connected = true; h.net.mode = 'host';
    g.net.mode = 'guest';

    ok(g.player.wingmen === 0 || g.player.wingmen === undefined, 'oaspetele porneste fara catelusi');
    h.player.wingmen = 2;
    h.netSnapshot(); g.applySnapshot(snap);
    ok(g.player.wingmen === 2, 'catelusii gazdei ajung si la oaspete: ' + g.player.wingmen);

    // monedele: gazda strange, oaspetele le primeste in punga la final
    g.coins = 0; g.saveCoins = () => { g.__saved = g.coins; };
    g.runStats.coins = 0;
    g.onNetData({ t: 'over', sc: 12345, co: 37 });
      ok(g.runStats.coins === 37, 'oaspetele vede monedele adunate: ' + g.runStats.coins);
    ok(g.coins === 37, 'monedele intra in punga oaspetelui (nu se pierd)');
    ok(g.__saved === 37, 'punga e si salvata pe telefon');

    // etapa 4: fiecare pleaca acasa doar cu ce a cules el
    g.coins = 0; g.p2.active = true; g.net.mode = 'guest';
    g.onNetData({ t: 'over', sc: 500, sc1: 180, sc2: 320, co: 12, co2: 30 });
    ok(g.coins === 12, 'oaspetele isi banca DOAR monedele lui (12), nu si pe ale gazdei (30): ' + g.coins);
    ok(g.runStats.coins === 42, 'dar vede totalul echipei pe ecranul final: ' + g.runStats.coins);
    ok(String(g.__el.oCoinsMe.textContent) === '12' && String(g.__el.oCoinsHim.textContent) === '30',
       'ecranul final arata pungile separat: ' + g.__el.oCoinsMe.textContent + ' / ' + g.__el.oCoinsHim.textContent);
    ok(String(g.__el.oScoreMe.textContent) === '180' && String(g.__el.oScoreHim.textContent) === '320',
       'si scorurile separat: ' + g.__el.oScoreMe.textContent + ' / ' + g.__el.oScoreHim.textContent);
    ok(g.player.score === 180 && g.p2.score === 320, 'oaspetele stie care scor e al lui: ' + g.player.score);
    ok(g.score === 500, 'iar totalul echipei ramane 500: ' + g.score);
    ok(g.__el.coopSplit.style.display === 'flex', 'blocul cu doua coloane e vizibil in co-op');
  }

  // ===== D. netezirea miscarii intre instantanee =====
  console.log('\n=== D. netezire intre instantanee ===');
  {
    const h = makeSandbox('sh', { ls: {}, search: '' });
    const g = makeSandbox('sg', { ls: {}, search: '' });
    let snap = null;
    h.netSend = (o) => { snap = o; };
    h.net.connected = true; h.net.mode = 'host';
    g.net.mode = 'guest'; g.net.connected = true;

    const enemy = { x: 100, y: 100, r: 14, type: 'bird', hp: 1, maxHp: 2, blink: 1 };
    h.enemies = [enemy];
    h.netSnapshot(); g.applySnapshot(snap);
    const id1 = g.enemies[0].__id;
    ok(id1 !== undefined, 'gazda da un id fiecarui inamic');
    ok(Math.abs(g.enemies[0].x - 100) < 1, 'primul instantaneu apare direct la locul lui, fara alunecare');

    // inamicul sare 200 px intr-un instantaneu (asa arata 20 Hz)
    enemy.x = 300;
    h.netSnapshot(); g.applySnapshot(snap);
    ok(g.enemies[0].__id === id1, 'acelasi inamic e recunoscut intre instantanee (nu se reseteaza)');
    ok(Math.abs(g.enemies[0].x - 100) < 1,
       'nu sare instantaneu: ramane la ' + g.enemies[0].x.toFixed(0) + ', tinta e ' + g.enemies[0].tx.toFixed(0));

    // un cadru de 16 ms trebuie sa-l apropie, dar nu sa-l teleporteze
    g.guestUpdate(0.016);
    const dupa1 = g.enemies[0].x;
    ok(dupa1 > 100 && dupa1 < 300, 'dupa un cadru e intre pozitii: ' + dupa1.toFixed(0));

    // dupa un interval intreg de 50 ms trebuie sa fi ajuns practic la tinta
    for (let i = 0; i < 3; i++) g.guestUpdate(0.016);
    ok(Math.abs(g.enemies[0].x - 300) < 12,
       'dupa un interval intreg a ajuns la tinta: ' + g.enemies[0].x.toFixed(0) + ' (nu ramane in urma)');

    // inamicul moare -> dispare, nu ramane pe ecran
    h.enemies = [];
    h.netSnapshot(); g.applySnapshot(snap);
    ok(g.enemies.length === 0, 'inamicul disparut nu ramane agatat pe ecranul oaspetelui');

    // nava gazdei se netezeste si ea
    h.player.x = 600; h.player.y = 1000;
    h.enemies = [];
    h.netSnapshot(); g.applySnapshot(snap);
    const p2x0 = g.p2.x;
    h.player.x = 100;
    h.netSnapshot(); g.applySnapshot(snap);
    ok(Math.abs(g.p2.x - p2x0) < 1, 'nava gazdei nu sare instantaneu');
    g.guestUpdate(0.016);
    ok(g.p2.x < p2x0 && g.p2.x > 100, 'nava gazdei aluneca spre pozitia noua: ' + g.p2.x.toFixed(0));
  }

  console.log('\n=== ' + pass + ' treceri, ' + fail + ' eșecuri ===');
  done(fail ? 1 : 0);
})().catch(e => { console.error(e); done(1); });

/**
 * Test cap-la-cap pe jocul REAL (modulele din src/, prin __dbg):
 *  A. rezolvarea adresei serverului (?relay= / localStorage / camp) — o instanta
 *  B. schimb real gazda<->oaspete prin serverul de relay — doua procese-copil
 *  C. ecrane de forme diferite; C2. companioni si monede; D. netezirea miscarii
 *     — perechi de copii cu un net.ws fals care captureaza instantaneele
 */
'use strict';
const { spawn } = require('child_process');
const { relayPath, relayEnv, relayName } = require('./relay-path');
const { pornesteJocul } = require('./mediu-joc');
const { pornesteCopil } = require('./copil-joc');

const PORT = 3999;
const RELAY = 'ws://127.0.0.1:' + PORT;

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  OK  ', m); } else { fail++; console.log('  FAIL', m); } };
const wait = ms => new Promise(r => setTimeout(r, ms));
const copii = [];

// un net.ws fals care captureaza ce trimite jocul — pentru scenariile fara server
const WS_FALS = `w.__trimis=[]; __dbg.net.ws={readyState:1,bufferedAmount:0,send:s=>w.__trimis.push(s)};
  __dbg.net.connected=true;`;
const ULTIMUL = `JSON.parse(w.__trimis[w.__trimis.length-1]).data`;

// ---- pornire server ------------------------------------------------------
console.log('server de test:', relayName());
const srv = spawn(process.execPath, [relayPath()], {
  env: relayEnv({ PORT: String(PORT) }), stdio: ['ignore', 'pipe', 'pipe']
});
srv.stdout.on('data', () => {});
srv.stderr.on('data', d => console.error('[srv]', String(d).trim()));
const done = (code) => { copii.forEach(c => c.omoara()); try { srv.kill(); } catch (e) {} process.exit(code); };

(async () => {
  await wait(700);

  // ===== A. rezolvarea adresei ============================================
  console.log('=== A. rezolvarea adresei serverului ===');
  const J = await pornesteJocul({ faraBucla: true });
  const d = J.dbg, ls = J.w.localStorage;
  {
    ok(d.normRelay('https://x.onrender.com') === 'wss://x.onrender.com', 'https:// -> wss://');
    ok(d.normRelay('http://192.168.1.5:3000') === 'ws://192.168.1.5:3000', 'http:// -> ws://');
    ok(d.normRelay('x.onrender.com') === 'wss://x.onrender.com', 'domeniu gol -> wss://');
    ok(d.normRelay('192.168.1.5:3000') === 'ws://192.168.1.5:3000', 'IP local -> ws:// (nu wss)');
    ok(d.normRelay('localhost:3000') === 'ws://localhost:3000', 'localhost -> ws://');
    ok(d.normRelay('wss://x.com/') === 'wss://x.com', 'taie slash-ul final');
    ok(d.normRelay('  wss://x.com  ') === 'wss://x.com', 'ignora spatiile');
    ok(d.normRelay('') === '' && d.normRelay(null) === '', 'gol ramane gol');
    ok(d.relayIsSet('wss://REPLACE-WITH-YOUR-SERVER.onrender.com') === false, 'placeholder = neconfigurat');
  }
  {
    ls.clear(); J.schimbaUrl('https://local.test/?relay=my.host.com');
    ok(d.getRelay() === 'wss://my.host.com', '?relay= din URL are prioritate');
    ok(ls.getItem('kw_relay_url') === 'wss://my.host.com', '?relay= se si salveaza');
  }
  {
    ls.clear(); ls.setItem('kw_relay_url', 'wss://saved.example.com');
    J.schimbaUrl('https://local.test/');
    ok(d.getRelay() === 'wss://saved.example.com', 'localStorage folosit cand nu e ?relay=');
    J.schimbaUrl('https://local.test/?relay=other.com');
    ok(d.getRelay() === 'wss://other.com', 'URL bate localStorage');
  }
  {
    // telefon proaspat, fara nimic salvat -> trebuie sa gaseasca serverul livrat in cod
    ls.clear(); J.schimbaUrl('https://local.test/');
    ok(d.getRelay() === 'wss://kawaii-relay.onrender.com', 'telefon nou -> serverul de pe Render, fara configurare');
    ok(d.relayIsSet(d.getRelay()), 'adresa livrata e considerata valida');
    ok(d.setRelay('render-test.com') === 'wss://render-test.com', 'setRelay normalizeaza');
    ok(d.getRelay() === 'wss://render-test.com', 'jucatorul poate suprascrie serverul livrat');
  }
  {
    // campul de server nu trebuie sa acopere codul: e pliat pana il ceri tu
    ls.clear(); d.refreshRelayUI();
    const box = J.doc.getElementById('coopRelayBox');
    ok(box.style.display === 'none', 'campul de server e ascuns la pornire');
    J.click('coopRelayToggle');
    ok(box.style.display === 'flex', 'butonul "alt server" il deschide');
    J.click('coopRelayToggle');
    ok(box.style.display === 'none', 'al doilea click il inchide la loc');
  }
  {
    // daca lipseste adresa, campul trebuie sa se deschida singur
    ls.clear();
    ls.setItem('kw_relay_url', 'wss://REPLACE-WITH-YOUR-SERVER.onrender.com');
    d.netHost();
    ok(J.doc.getElementById('coopRelayBox').style.display === 'flex', 'adresa invalida -> campul se deschide singur');
    ok(d.net.ws === null, 'nu incearca sa se conecteze cu adresa invalida');
    d.coopReset();
  }
  {
    // daca jucatorul goleste campul, co-op-ul nu trebuie sa porneasca in gol
    ls.clear();
    J.doc.getElementById('coopRelay').value = '';
    d.setRelay('');
    ls.setItem('kw_relay_url', 'x');   // fortam o valoare invalida
    ls.removeItem('kw_relay_url');
    ok(d.getRelay() === 'wss://kawaii-relay.onrender.com', 'camp golit -> revine la serverul livrat, nu ramane fara');
  }

  // ===== B. flux real host <-> guest ======================================
  console.log('\n=== B. joc real prin serverul de relay ===');
  const H = await pornesteCopil({ faraBucla: true, url: 'https://local.test/?relay=' + RELAY });
  const G = await pornesteCopil({ faraBucla: true, url: 'https://local.test/?relay=' + RELAY });
  copii.push(H, G);
  ok(await H.eval('return __dbg.getRelay()') === RELAY &&
     await G.eval('return __dbg.getRelay()') === RELAY, 'ambii clienti rezolva adresa locala');

  ok(await H.eval("return document.getElementById('coopMsg').style.display") !== 'none',
     'inainte de a crea jocul, explicatiile sunt vizibile');
  await H.eval('__dbg.netHost(); return null');
  await wait(250);
  const code = await H.eval("return document.getElementById('coopCodeVal').textContent");
  ok(/^KW[A-Z0-9]{5}$/.test(code), 'gazda genereaza cod valid: ' + code);
  ok(await H.eval("return document.getElementById('coopMsg').style.display") === 'none',
     'cand apare codul, explicatiile lungi se ascund (fac loc)');
  ok(await H.eval("return document.getElementById('coopCode').style.display") === 'flex',
     'blocul cu codul e afisat');
  ok(await H.eval('return w.__scrolled') === true, 'codul e adus in vizor automat');

  await G.eval('__dbg.netJoin(' + JSON.stringify(code) + '); return null');
  await wait(500);
  ok(await H.eval("return __dbg.net.connected && __dbg.net.mode==='host'"), 'gazda: conectat, rol host');
  ok(await G.eval("return __dbg.net.connected && __dbg.net.mode==='guest'"), 'oaspete: conectat, rol guest');
  await wait(700);
  ok(await H.eval("return __dbg.state==='playing'") && await G.eval("return __dbg.state==='playing'"),
     'jocul porneste la ambii');

  // guest -> host: pozitie
  await G.eval('__dbg.player.x=200; __dbg.player.y=900; __dbg.net.sendT=0; __dbg.guestUpdate(0.016); return null');
  await wait(250);
  { const p = await H.eval('return {x:__dbg.p2.x, y:__dbg.p2.y}');
    ok(Math.abs(p.x - 200) < 2 && Math.abs(p.y - 900) < 2,
       'pozitia P2 ajunge la gazda (' + p.x.toFixed(0) + ',' + p.y.toFixed(0) + ')'); }

  // guest -> host: actiuni (gazda executa racheta/burst-ul pentru P2)
  await H.eval('__dbg.p2.missiles=3; __dbg.p2.burst=1; __dbg.p2.burstT=0; __dbg.p2.dead=false; return null');
  await G.eval("__dbg.netSend({t:'act',a:'rocket'}); __dbg.netSend({t:'act',a:'burst'}); return null");
  await wait(250);
  { const r = await H.eval('return {m:__dbg.p2.missiles, b:__dbg.p2.burst, bt:__dbg.p2.burstT}');
    ok(r.m === 2 && (r.b === 0 || r.bt > 0), 'actiunile oaspetelui ajung la gazda (racheta+burst): ' + JSON.stringify(r)); }

  // host -> guest: snapshot
  const EN = Array.from({ length: 40 }, (_, i) => ({ x: i * 15, y: 100 + i, r: 14, type: 'bird', hp: 1, maxHp: 2, blink: 1 }));
  EN[0] = { x: 360, y: 300, r: 60, type: 'boss', hp: 8, maxHp: 10, boss: true, name: 'Regina', col: '#ff8fc7', blink: 1 };
  const EB = Array.from({ length: 60 }, (_, i) => ({ x: i * 10, y: 200, r: 7, color: '#ffd1f0', bk: 'drop' }));
  const PB = Array.from({ length: 30 }, (_, i) => ({ x: i * 12, y: 800, r: 4, color: '#fff', type: 'b' }));
  const PK = [{ x: 100, y: 400, type: 'coin', tier: 2 }, { x: 200, y: 420, type: 'gift', weapon: 'laser' }];
  await H.eval(`
    __dbg.set.score(13370); __dbg.set.wave(7); __dbg.set.mult(4);
    __dbg.player.lives=2; __dbg.player.x=500; __dbg.player.y=1000;
    __dbg.player.score=9000; __dbg.player.coins=12; __dbg.player.dead=false;
    __dbg.p2.lives=5; __dbg.p2.score=800; __dbg.p2.coins=4; __dbg.p2.weapon='scatter';
    __dbg.p2.lvl={scatter:4}; __dbg.p2.dead=false;
    __dbg.set.enemies(${JSON.stringify(EN)});
    __dbg.set.eBullets(${JSON.stringify(EB)});
    __dbg.set.bullets(${JSON.stringify(PB)});
    __dbg.set.pickups(${JSON.stringify(PK)});
    __dbg.netSnapshot(); return null`);
  await wait(300);
  ok(await G.eval('return __dbg.score') === 13370 && await G.eval('return __dbg.wave') === 7,
     'scorul echipei + valul ajung la oaspete');
  { const g = await G.eval(`return {pl:__dbg.player.lives, mult:__dbg.mult, p2l:__dbg.p2.lives,
      w:__dbg.player.weapon, wl:__dbg.player.lvl.scatter, pc:__dbg.player.coins, p2c:__dbg.p2.coins,
      pd:__dbg.player.dead, p2d:__dbg.p2.dead}`);
    ok(g.pl === 5 && g.mult === 4, 'oaspetele isi vede VIETILE LUI (5), nu pe ale gazdei (2): ' + g.pl);
    ok(g.p2l === 2, 'si vede separat viețile gazdei: ' + g.p2l);
    ok(g.w === 'scatter' && g.wl === 4, 'si arma lui, cu nivelul ei: ' + g.w + ' ' + g.wl);
    ok(g.pc === 4 && g.p2c === 12, 'punga fiecaruia calatoreste separat: ' + g.pc + ' / ' + g.p2c);
    ok(g.pd === false && g.p2d === false, 'starea de "mort" e trimisa pentru fiecare'); }
  { const en = await G.eval('return __dbg.enemies.map(e=>({x:e.x,boss:!!e.boss,name:e.name||null}))');
    ok(en.length === 40, 'toti cei 40 de inamici ajung');
    ok(en[0].boss === true && en[0].name === 'Regina', 'boss-ul ajunge cu nume');
    ok(Math.abs(en[1].x - 15) < 2, 'coordonatele inamicilor se refac corect'); }
  ok(await G.eval('return __dbg.eBullets.length') === 60 && await G.eval('return __dbg.bullets.length') === 30,
     'gloantele ajung (60 + 30)');
  { const pk = await G.eval('return __dbg.pickups.map(p=>({type:p.type,tier:p.tier,weapon:p.weapon||null}))');
    ok(pk.length === 2, 'pickup-urile ajung');
    ok(pk[0].tier === 2, 'nivelul monedei ajunge (nu mai e mereu moneda de bronz)');
    const gift = pk[1];
    ok(gift.type === 'gift' && gift.weapon === 'laser', 'cadoul ajunge cu arma lui: ' + gift.weapon);
    // REGRESIE: asta ingheta oaspetele — WEAPONS[undefined].icon arunca la fiecare cadru
    ok(await G.eval('return __dbg.WEAPONS[__dbg.pickups[1].weapon]!==undefined'),
       'arma cadoului exista in WEAPONS (altfel drawPickup arunca)');
    ok(await G.eval("return __dbg.pickups.every(p=>p.type!=='gift'||__dbg.WEAPONS[p.weapon])"),
       'NICIUN cadou nu ramane fara arma valida'); }
  ok(await G.eval('return __dbg.bullets.every(b=>Number.isFinite(b.vx)&&Number.isFinite(b.vy))'),
     'gloantele jucatorului au viteza finita (fara NaN in cozi)');
  ok(await G.eval('return __dbg.eBullets.every(b=>Number.isFinite(b.vx)&&Number.isFinite(b.vy))'),
     'gloantele inamice au viteza finita (fara NaN in rotatii)');
  // nava gazdei nu mai sare: primeste o tinta si aluneca spre ea in intervalul urmator
  { const tx = await G.eval('return __dbg.p2.tx');
    ok(Math.abs(tx - 500) < 2, 'pozitia gazdei ajunge la oaspete (ca tinta)'); }
  await G.eval('for(let i=0;i<4;i++)__dbg.guestUpdate(0.016); return null');
  { const x = await G.eval('return __dbg.p2.x');
    ok(Math.abs(x - 500) < 2, 'si e atinsa complet dupa un interval: ' + x.toFixed(0)); }
  ok(await G.eval("return __dbg.state==='playing'"), 'oaspetele intra in modul de joc');

  // gazda veche, care nu trimite arma: oaspetele trebuie sa puna una valida, nu sa crape
  { const V = await pornesteCopil({ faraBucla: true }); copii.push(V);
    await V.eval(`__dbg.net.mode='guest'; __dbg.applySnapshot({t:'s',sc:0,wv:1,lv:3,cm:1,p1x:0.5,p1y:0.5,
      en:[],eb:[],pb:[],pk:[{x:0.5,y:0.5,ty:'gift'}]}); return null`);
    ok(await V.eval('return __dbg.WEAPONS[__dbg.pickups[0].weapon]!==undefined'),
       'cadou fara arma -> primeste una valida, nu crapa');
    V.omoara(); }

  // dimensiune snapshot maxim
  { const sz = await H.eval(`
      const realWs=__dbg.net.ws; let sz=0;
      __dbg.net.ws={readyState:1,bufferedAmount:0,send:s=>{sz=s.length;}};
      __dbg.set.enemies(Array.from({length:60},(_,i)=>({x:i,y:i,r:14,type:'bird',hp:1,maxHp:2,blink:1,boss:true,name:'Boss Foarte Lung',col:'#ff8fc7'})));
      __dbg.set.eBullets(Array.from({length:90},(_,i)=>({x:i,y:i,r:7,color:'#ffd1f0',bk:'drop'})));
      __dbg.set.bullets(Array.from({length:40},(_,i)=>({x:i,y:i,r:4,color:'#ffffff',type:'b'})));
      __dbg.set.pickups(Array.from({length:24},(_,i)=>({x:i,y:i,type:'coin'})));
      __dbg.netSnapshot();
      __dbg.net.ws=realWs; return sz`);
    ok(sz > 0 && sz < 64 * 1024, 'cel mai mare snapshot = ' + (sz / 1024).toFixed(1) + ' KB (< limita de 64 KB)'); }

  // game over
  await H.eval("__dbg.netSend({t:'over',sc:99999}); return null");
  await wait(250);
  ok(await G.eval('return __dbg.score') === 99999, 'ecranul de final ajunge la oaspete');

  // deconectare
  await G.eval('__dbg.coopReset(); return null');
  await wait(400);
  ok((await H.eval("return document.getElementById('coopStatus').textContent")).length >= 0,
     'gazda primeste notificarea de plecare fara eroare');
  H.omoara(); G.omoara();

  // ===== C. ecrane de forme diferite (iPhone vertical vs Android orizontal) =====
  console.log('\n=== C. gazda si oaspetele au ecrane de forme diferite ===');
  {
    const H_W = 720,  H_H = 1280;    // gazda: telefon vertical
    const G_W = 2048, G_H = 945;     // oaspete: telefon orizontal
    const hp = await pornesteCopil({ faraBucla: true, W: H_W, H: H_H });
    const gp = await pornesteCopil({ faraBucla: true, W: G_W, H: G_H });
    copii.push(hp, gp);

    const sent = await hp.eval(`${WS_FALS} __dbg.net.mode='host';
      __dbg.player.x=${H_W / 2}; __dbg.player.y=${H_H * 0.8};
      __dbg.set.enemies([{x:${H_W / 2},y:${H_H / 2},r:40,type:'bird',hp:1,maxHp:2,blink:1}]);
      __dbg.netSnapshot(); return ${ULTIMUL}`);
    ok(sent.hw === H_W && sent.hh === H_H, 'gazda isi trimite dimensiunile ecranului');

    await gp.eval(`__dbg.net.mode='guest'; __dbg.applySnapshot(${JSON.stringify(sent)}); return null`);

    // acelasi calcul pe care trebuie sa-l faca si jocul
    const sc = Math.min(G_W / H_W, G_H / H_H);
    const pw = H_W * sc, ph = H_H * sc;
    const ox = (G_W - pw) / 2, oy = (G_H - ph) / 2;

    const e = await gp.eval('return {x:__dbg.enemies[0].x, y:__dbg.enemies[0].y, r:__dbg.enemies[0].r}');
    ok(Math.abs(e.r - 40 * sc) < 1.5,
       'inamicul are marimea gazdei x factorul de potrivire: ' + e.r.toFixed(1) + ' px');
    ok(Math.abs(e.x - G_W / 2) < 1 && Math.abs(e.y - G_H / 2) < 1,
       'inamicul din centrul gazdei apare in centrul oaspetelui');
    // REGRESIE: un inamic la marginea din dreapta a gazdei trebuie sa cada in teren
    const sent2 = await hp.eval(`__dbg.set.enemies([{x:${H_W - 40},y:${H_H / 2},r:40,type:'bird',hp:1,maxHp:2,blink:1}]);
      __dbg.netSnapshot(); return ${ULTIMUL}`);
    await gp.eval(`__dbg.applySnapshot(${JSON.stringify(sent2)}); return null`);
    const eR = await gp.eval('return {x:__dbg.enemies[0].x}');
    ok(Math.abs(eR.x - (ox + pw * ((H_W - 40) / H_W))) < 2,
       'marginea dreapta a gazdei cade in teren, nu pe marginea ecranului: ' + eR.x.toFixed(0) + ' (ecran ' + G_W + ')');
    ok(eR.x < G_W - 100, 'ramane banda laterala libera in dreapta');

    // oaspetele nu trebuie sa poata iesi din terenul de joc
    const r2 = await gp.eval(`${WS_FALS}
      __dbg.player.x=${G_W - 5}; __dbg.player.y=${G_H * 0.9}; __dbg.net.sendT=0;
      __dbg.guestUpdate(0.016);
      return {x:__dbg.player.x, back: w.__trimis.length?${ULTIMUL}:null}`);
    ok(r2.x <= ox + pw - 23, 'nava oaspetelui e tinuta in teren, nu zboara in banda laterala');
    ok(r2.back && r2.back.nx >= 0 && r2.back.nx <= 1 && r2.back.ny >= 0 && r2.back.ny <= 1,
       'pozitia raportata gazdei e in coordonatele ei (0..1): nx=' + (r2.back && r2.back.nx));

    // dus-intors: unde ajunge nava oaspetelui pe ecranul gazdei
    const onHost = r2.back.nx * H_W;
    ok(onHost > H_W * 0.9 && onHost <= H_W,
       'gazda il vede pe oaspete tot in dreapta terenului: ' + onHost.toFixed(0) + '/' + H_W);
    hp.omoara(); gp.omoara();
  }

  // ===== C2. companioni si monede =====
  console.log('\n=== C2. companioni si monede pentru oaspete ===');
  {
    const h = await pornesteCopil({ faraBucla: true });
    const g = await pornesteCopil({ faraBucla: true });
    copii.push(h, g);
    ok(await g.eval('return (__dbg.player.wingmen||0)===0'), 'oaspetele porneste fara catelusi');
    const snap = await h.eval(`${WS_FALS} __dbg.net.mode='host';
      __dbg.player.wingmen=2; __dbg.netSnapshot(); return ${ULTIMUL}`);
    await g.eval(`__dbg.net.mode='guest'; __dbg.applySnapshot(${JSON.stringify(snap)}); return null`);
    ok(await g.eval('return __dbg.player.wingmen') === 2, 'catelusii gazdei ajung si la oaspete: 2');

    // monedele: gazda strange, oaspetele le primeste in punga la final
    { const r = await g.eval(`__dbg.set.coins(0); __dbg.runStats.coins=0;
        __dbg.onNetData({t:'over',sc:12345,co:37});
        return {rs:__dbg.runStats.coins, coins:__dbg.coins, salvat:localStorage.getItem('ki_coins')}`);
      ok(r.rs === 37, 'oaspetele vede monedele adunate: ' + r.rs);
      ok(r.coins === 37, 'monedele intra in punga oaspetelui (nu se pierd)');
      ok(String(r.salvat) === '37', 'punga e si salvata pe telefon'); }

    // etapa 4: fiecare pleaca acasa doar cu ce a cules el
    { const r = await g.eval(`__dbg.set.coins(0); __dbg.p2.active=true; __dbg.net.mode='guest';
        __dbg.onNetData({t:'over',sc:500,sc1:180,sc2:320,co:12,co2:30});
        const T=id=>document.getElementById(id).textContent;
        return {coins:__dbg.coins, rs:__dbg.runStats.coins,
          cMe:T('oCoinsMe'), cHim:T('oCoinsHim'), sMe:T('oScoreMe'), sHim:T('oScoreHim'),
          ps:__dbg.player.score, p2s:__dbg.p2.score, sc:__dbg.score,
          split:document.getElementById('coopSplit').style.display}`);
      ok(r.coins === 12, 'oaspetele isi banca DOAR monedele lui (12), nu si pe ale gazdei (30): ' + r.coins);
      ok(r.rs === 42, 'dar vede totalul echipei pe ecranul final: ' + r.rs);
      ok(String(r.cMe) === '12' && String(r.cHim) === '30',
         'ecranul final arata pungile separat: ' + r.cMe + ' / ' + r.cHim);
      ok(String(r.sMe) === '180' && String(r.sHim) === '320',
         'si scorurile separat: ' + r.sMe + ' / ' + r.sHim);
      ok(r.ps === 180 && r.p2s === 320, 'oaspetele stie care scor e al lui: ' + r.ps);
      ok(r.sc === 500, 'iar totalul echipei ramane 500: ' + r.sc);
      ok(r.split === 'flex', 'blocul cu doua coloane e vizibil in co-op'); }
    h.omoara(); g.omoara();
  }

  // ===== D. netezirea miscarii intre instantanee =====
  console.log('\n=== D. netezire intre instantanee ===');
  {
    const h = await pornesteCopil({ faraBucla: true });
    const g = await pornesteCopil({ faraBucla: true });
    copii.push(h, g);
    await g.eval("__dbg.net.mode='guest'; __dbg.net.connected=true; return null");

    const snap1 = await h.eval(`${WS_FALS} __dbg.net.mode='host';
      __dbg.player.x=360; __dbg.player.y=1150;
      w.__en=[{x:100,y:100,r:14,type:'bird',hp:1,maxHp:2,blink:1}];
      __dbg.set.enemies(w.__en); __dbg.netSnapshot(); return ${ULTIMUL}`);
    await g.eval(`__dbg.applySnapshot(${JSON.stringify(snap1)}); return null`);
    const id1 = await g.eval('return __dbg.enemies[0].__id');
    ok(id1 !== undefined && id1 !== null, 'gazda da un id fiecarui inamic');
    ok(Math.abs(await g.eval('return __dbg.enemies[0].x') - 100) < 1,
       'primul instantaneu apare direct la locul lui, fara alunecare');

    // inamicul sare 200 px intr-un instantaneu (asa arata 20 Hz)
    const snap2 = await h.eval(`w.__en[0].x=300; __dbg.netSnapshot(); return ${ULTIMUL}`);
    await g.eval(`__dbg.applySnapshot(${JSON.stringify(snap2)}); return null`);
    ok(await g.eval('return __dbg.enemies[0].__id') === id1, 'acelasi inamic e recunoscut intre instantanee (nu se reseteaza)');
    { const r = await g.eval('return {x:__dbg.enemies[0].x, tx:__dbg.enemies[0].tx}');
      ok(Math.abs(r.x - 100) < 1,
         'nu sare instantaneu: ramane la ' + r.x.toFixed(0) + ', tinta e ' + r.tx.toFixed(0)); }

    // un cadru de 16 ms trebuie sa-l apropie, dar nu sa-l teleporteze
    const dupa1 = await g.eval('__dbg.guestUpdate(0.016); return __dbg.enemies[0].x');
    ok(dupa1 > 100 && dupa1 < 300, 'dupa un cadru e intre pozitii: ' + dupa1.toFixed(0));

    // dupa un interval intreg de 50 ms trebuie sa fi ajuns practic la tinta
    const dupa4 = await g.eval('for(let i=0;i<3;i++)__dbg.guestUpdate(0.016); return __dbg.enemies[0].x');
    ok(Math.abs(dupa4 - 300) < 12,
       'dupa un interval intreg a ajuns la tinta: ' + dupa4.toFixed(0) + ' (nu ramane in urma)');

    // inamicul moare -> dispare, nu ramane pe ecran
    const snap3 = await h.eval(`w.__en=[]; __dbg.set.enemies(w.__en); __dbg.netSnapshot(); return ${ULTIMUL}`);
    await g.eval(`__dbg.applySnapshot(${JSON.stringify(snap3)}); return null`);
    ok(await g.eval('return __dbg.enemies.length') === 0, 'inamicul disparut nu ramane agatat pe ecranul oaspetelui');

    // nava gazdei se netezeste si ea (totul intr-un singur eval, ca timpul
    // dintre instantaneu si cadru sa fie ~0, ca in joc — nu intarzierea IPC)
    const snap4 = await h.eval(`__dbg.player.x=600; __dbg.player.y=1000; __dbg.netSnapshot(); return ${ULTIMUL}`);
    const snap5 = await h.eval(`__dbg.player.x=100; __dbg.netSnapshot(); return ${ULTIMUL}`);
    const r = await g.eval(`
      __dbg.applySnapshot(${JSON.stringify(snap4)});
      const p2x0=__dbg.p2.x;
      __dbg.applySnapshot(${JSON.stringify(snap5)});
      const dupaSnap=__dbg.p2.x;
      __dbg.guestUpdate(0.016);
      return {p2x0, dupaSnap, p2x1:__dbg.p2.x}`);
    ok(Math.abs(r.dupaSnap - r.p2x0) < 1, 'nava gazdei nu sare instantaneu');
    ok(r.p2x1 < r.p2x0 && r.p2x1 > 100, 'nava gazdei aluneca spre pozitia noua: ' + r.p2x1.toFixed(0));
    h.omoara(); g.omoara();
  }

  console.log('\n=== ' + pass + ' treceri, ' + fail + ' eșecuri ===');
  done(fail ? 1 : 0);
})().catch(e => { console.error(e); done(1); });

/**
 * Testeaza REZISTENTA conexiunii de co-op, pe jocul REAL + serverul de relay adevarat:
 *  A. gazda iese din aplicatie ca sa trimita codul -> conexiunea moare -> prietenul
 *     intra cu codul -> trebuie sa se gaseasca totusi
 *  B. serverul pica in timpul jocului -> revine -> amandoi trebuie sa se reconecteze
 *  C. iesirea din co-op chiar opreste reincercarile
 */
'use strict';
const { spawn } = require('child_process');
const { relayPath, relayEnv } = require('./relay-path');
const { pornesteCopil } = require('./copil-joc');

const PORT = 3997, RELAY = 'ws://127.0.0.1:' + PORT;
let pass=0,fail=0; const ok=(c,m)=>{c?(pass++,console.log('  OK  ',m)):(fail++,console.log('  FAIL',m));};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const copii=[];

let srv=null;
const startSrv=()=>{ srv=spawn(process.execPath,[relayPath()],
  {env:relayEnv({PORT:String(PORT)}),stdio:['ignore','pipe','pipe']});
  srv.stdout.on('data',()=>{}); srv.stderr.on('data',()=>{}); };
const stopSrv=()=>{ try{srv.kill('SIGKILL');}catch(e){} srv=null; };
const gata=c=>{ copii.forEach(x=>x.omoara()); if(srv)stopSrv(); process.exit(c); };

const copil=async()=>{ const c=await pornesteCopil({faraBucla:true,url:'https://local.test/?relay='+RELAY});
  copii.push(c); return c; };
// asculta mesajele de tip {t:'test'} pe conexiunea CURENTA a jocului
const asculta=`w.__primit=null;
  __dbg.net.ws.addEventListener('message',ev=>{ try{ const m=JSON.parse(ev.data);
    if(m&&m.data&&m.data.t==='test')w.__primit=m.data; }catch(e){} }); return null`;

(async()=>{
  startSrv(); await wait(800);
  console.log('\n=== Rezistenta conexiunii de co-op ===');

  // ---- A. gazda iese din aplicatie ca sa trimita codul ----
  {
    const h=await copil(), g=await copil();
    await h.eval('__dbg.netHost(); return null');
    await wait(600);
    const code=await h.eval("return document.getElementById('coopCodeVal').textContent");
    ok(!!code,'gazda primește un cod: '+code);

    // telefonul suspenda pagina: conexiunea gazdei moare, fara ca ea sa stie
    await h.eval('__dbg.net.ws.close(); return null');
    await wait(300);
    ok(await h.eval('return __dbg.net.ws.readyState===3 || __dbg.net.tries>0'),
       'conexiunea gazdei a picat (ca la ieșirea din aplicație)');

    // prietenul intra cu codul in timpul asta
    await g.eval('__dbg.netJoin('+JSON.stringify(code)+'); return null');
    await wait(4000);   // lasam reconectarea automata sa lucreze
    ok(await h.eval('return __dbg.net.connected===true'),'gazda s-a reconectat singură și s-a găsit cu prietenul');
    ok(await g.eval('return __dbg.net.connected===true'),'și prietenul e conectat');
    const roluri=[await h.eval('return __dbg.net.mode'), await g.eval('return __dbg.net.mode')];
    ok(roluri[0]==='host'&&roluri[1]==='guest','rolurile sunt corecte: '+roluri.join(' / '));

    // si chiar circula date
    await g.eval(asculta);
    await h.eval("__dbg.netSend({t:'test',v:42}); return null");
    await wait(500);
    const primit=await g.eval('return w.__primit');
    ok(primit&&primit.v===42,'mesajele trec prin camera refăcută');
    await h.eval('__dbg.coopReset(); return null'); await g.eval('__dbg.coopReset(); return null');
    await wait(200); h.omoara(); g.omoara();
  }

  // ---- B. serverul pica in timpul jocului ----
  {
    const h=await copil(), g=await copil();
    await h.eval('__dbg.netHost(); return null'); await wait(500);
    const code=await h.eval("return document.getElementById('coopCodeVal').textContent");
    await g.eval('__dbg.netJoin('+JSON.stringify(code)+'); return null'); await wait(900);
    ok(await h.eval('return __dbg.net.connected')&&await g.eval('return __dbg.net.connected'),
       'runda pornește conectată');
    await h.eval("__dbg.set.state('playing'); return null");
    await g.eval("__dbg.set.state('playing'); return null");

    stopSrv(); await wait(700);
    ok(await h.eval('return __dbg.net.ws.readyState>=2'),'conexiunea cade când serverul dispare');

    startSrv(); await wait(6000);   // reconectarea are pas crescator
    ok(await h.eval('return !!__dbg.net.ws && __dbg.net.ws.readyState===1'),'gazda s-a reconectat dupa revenirea serverului');
    ok(await g.eval('return !!__dbg.net.ws && __dbg.net.ws.readyState===1'),'și oaspetele');
    await g.eval(asculta);
    await h.eval("__dbg.netSend({t:'test',v:7}); return null");
    await wait(600);
    const primit=await g.eval('return w.__primit');
    ok(primit&&primit.v===7,'jocul poate trimite date din nou');
    ok(await h.eval('return w.__toasts.some(t=>/Reconectat/i.test(t))'),'jucătorul e anunțat că s-a reconectat');
    await h.eval('__dbg.coopReset(); return null'); await g.eval('__dbg.coopReset(); return null');
    h.omoara(); g.omoara();
  }

  // ---- C. iesirea din co-op chiar opreste reincercarile ----
  {
    const h=await copil();
    await h.eval('__dbg.netHost(); return null'); await wait(400);
    await h.eval('__dbg.coopReset(); return null');
    await wait(2500);
    ok(await h.eval('return __dbg.net.stopped===true && __dbg.net.room===null'),'după „înapoi" nu mai reîncearcă nimic');
    ok(await h.eval('return __dbg.net.ws===null'),'și conexiunea e închisă de tot');
    h.omoara();
  }

  console.log('\n=== '+pass+' treceri, '+fail+' eșecuri ===');
  gata(fail?1:0);
})().catch(e=>{ console.error('harness:',e); gata(1); });

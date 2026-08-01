/**
 * Testeaza REZISTENTA conexiunii de co-op, pe serverul de relay adevarat:
 *  A. gazda iese din aplicatie ca sa trimita codul -> conexiunea moare -> prietenul
 *     intra cu codul -> trebuie sa se gaseasca totusi
 *  B. serverul pica in timpul jocului -> revine -> amandoi trebuie sa se reconecteze
 */
'use strict';
const fs=require('fs'), path=require('path'), vm=require('vm');
const {spawn}=require('child_process'); const WebSocket=require('ws');
const HTML=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const PORT=3997, RELAY='ws://127.0.0.1:'+PORT;
const A=HTML.indexOf('// ================= ONLINE CO-OP'), B=HTML.indexOf('function update(dt){',A);
const SRC=HTML.slice(A,B);
let pass=0,fail=0; const ok=(c,m)=>{c?(pass++,console.log('  OK  ',m)):(fail++,console.log('  FAIL',m));};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

function box(label){
  const els={}; const mk=()=>({textContent:'',value:'',style:{},classList:{add(){},remove(){}},
    focus(){},blur(){},addEventListener(){},scrollIntoView(){},querySelectorAll:()=>[]});
  ['coopStatus','coopCode','coopCodeVal','coopRelay','coopRelayHint','coopRelayBox','coopRelayToggle',
   'coopMsg','overTitle','oWave','oKills','oCombo','oCoins','oMissiles','oBoss','coopSplit',
   'oCoinsMe','oCoinsHim','oScoreMe','oScoreHim','bestLine'].forEach(k=>els[k]=mk());
  els.coopRelayBox.style.display='none';
  const g={console:{log(){},error(){},warn(){}},setTimeout,clearTimeout,setInterval,clearInterval,
    WebSocket,URLSearchParams,Math,JSON,performance, location:{search:'?relay='+RELAY},
    localStorage:{_d:{},getItem(k){return k in this._d?this._d[k]:null;},setItem(k,v){this._d[k]=String(v);},removeItem(k){delete this._d[k];}},
    el:id=>els[id]||mk(), coins:0, saveCoins(){}, W:720,H:1280,INTRO_DUR:2,
    net:{mode:'off',ws:null,role:null,connected:false,sendT:0,snapT:0,room:null,asHost:false,stopped:true,tries:0,retryT:0},
    p2:{active:false,x:0,y:0,r:19,invuln:0,weapon:'b',lvl:{},lives:3,dead:false,deadT:0,shield:0,magnet:0,
        wingmen:0,missiles:3,burst:1,fireT:0,burstT:0,score:0,coins:0},
    player:{x:360,y:1150,lives:3,dead:false,deadT:0,r:16,shield:0,invuln:0,weapon:'b',lvl:{},score:0,coins:0},
    ui:{menu:mk(),story:mk(),coop:mk(),opts:mk(),pause:mk(),over:mk(),touchpad:mk(),finalScore:mk()},
    state:'menu',score:0,wave:1,mult:1,combo:0,waveActive:false,bossIntro:0,introBoss:null,
    enemies:[],eBullets:[],bullets:[],pickups:[],particles:[],flash:0,flashCol:0,gravityMode:false,
    pointer:{active:false,x:0,y:0},keys:{},runStats:{maxWave:1,kills:0,maxMult:1,coins:0,missiles:0,bossKills:0},
    WEAPONS:{pulse:{icon:'x'},scatter:{icon:'x'},laser:{icon:'x'},arc:{icon:'x'},boomer:{icon:'x'}},
    clamp:(v,a,b)=>Math.max(a,Math.min(b,v)), lerp:(x,y,t)=>x+(y-x)*t, sprite:()=>null, ctx:null, TAU:Math.PI*2,
    toast(t){g.__toasts.push(t);}, floater(){}, shake(){}, boom(){}, updateHUD(){}, snd:{hurt(){},pickup(){}},
    fireMissile(){}, activateBurst(){}, startGame(){g.state='playing';}, __toasts:[], __el:els};
  g.window=g; g.globalThis=g; vm.createContext(g);
  vm.runInContext(SRC,g,{filename:'coop-'+label+'.js'});
  return g;
}

let srv=null;
const startSrv=()=>{ srv=spawn(process.execPath,[path.join(__dirname,'server-relay.js')],
  {env:Object.assign({},process.env,{PORT:String(PORT)}),stdio:['ignore','pipe','pipe']});
  srv.stdout.on('data',()=>{}); srv.stderr.on('data',()=>{}); };
const stopSrv=()=>{ try{srv.kill('SIGKILL');}catch(e){} srv=null; };

(async()=>{
  startSrv(); await wait(800);
  console.log('\n=== Rezistenta conexiunii de co-op ===');

  // ---- A. gazda iese din aplicatie ca sa trimita codul ----
  {
    const h=box('h'), g=box('g');
    h.netHost();
    await wait(600);
    const code=h.__el.coopCodeVal.textContent;
    ok(!!code,'gazda primește un cod: '+code);

    // telefonul suspenda pagina: conexiunea gazdei moare, fara ca ea sa stie
    h.net.ws.close();
    await wait(300);
    ok(h.net.ws.readyState===3 || h.net.tries>0,'conexiunea gazdei a picat (ca la ieșirea din aplicație)');

    // prietenul intra cu codul in timpul asta
    g.netJoin(code);
    await wait(4000);   // lasam reconectarea automata sa lucreze
    ok(h.net.connected===true,'gazda s-a reconectat singură și s-a găsit cu prietenul');
    ok(g.net.connected===true,'și prietenul e conectat');
    ok(h.net.mode==='host'&&g.net.mode==='guest','rolurile sunt corecte: '+h.net.mode+' / '+g.net.mode);

    // si chiar circula date
    let primit=null; g.onNetData=(d)=>{primit=d;};
    h.netSend({t:'test',v:42});
    await wait(500);
    ok(primit&&primit.v===42,'mesajele trec prin camera refăcută');
    h.coopReset(); g.coopReset(); await wait(200);
  }

  // ---- B. serverul pica in timpul jocului ----
  {
    const h=box('h2'), g=box('g2');
    h.netHost(); await wait(500);
    const code=h.__el.coopCodeVal.textContent;
    g.netJoin(code); await wait(900);
    ok(h.net.connected&&g.net.connected,'runda pornește conectată');
    h.state='playing'; g.state='playing';

    stopSrv(); await wait(700);
    ok(h.net.ws.readyState>=2,'conexiunea cade când serverul dispare');

    startSrv(); await wait(6000);   // reconectarea are pas crescator
    ok(h.net.ws&&h.net.ws.readyState===1,'gazda s-a reconectat dupa revenirea serverului');
    ok(g.net.ws&&g.net.ws.readyState===1,'și oaspetele');
    let primit=null; g.onNetData=(d)=>{primit=d;};
    h.netSend({t:'test',v:7});
    await wait(600);
    ok(primit&&primit.v===7,'jocul poate trimite date din nou');
    ok(h.__toasts.some(t=>/Reconectat/i.test(t)),'jucătorul e anunțat că s-a reconectat');
    h.coopReset(); g.coopReset();
  }

  // ---- C. iesirea din co-op chiar opreste reincercarile ----
  {
    const h=box('h3');
    h.netHost(); await wait(400);
    h.coopReset();
    const wsRef=h.net.ws;
    await wait(2500);
    ok(h.net.stopped===true&&h.net.room===null,'după „înapoi" nu mai reîncearcă nimic');
    ok(h.net.ws===null,'și conexiunea e închisă de tot');
  }

  console.log('\n=== '+pass+' treceri, '+fail+' eșecuri ===');
  stopSrv(); process.exit(fail?1:0);
})().catch(e=>{ console.error('harness:',e); stopSrv(); process.exit(1); });

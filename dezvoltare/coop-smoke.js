/**
 * Test de fum in CO-OP: doua copii ale jocului real (gazda + oaspete) vorbesc
 * printr-un server de relay adevarat. Verifica scenariile din etapele 1-3
 * pe jocul care chiar ruleaza, nu pe stub-uri.
 *
 * Injecteaza o punte __dbg spre interiorul IIFE-ului — doar in copia de test.
 */
'use strict';
const fs=require('fs'), path=require('path'), {JSDOM}=require('jsdom'), {spawn}=require('child_process');
const PORT=3998, RELAY='ws://127.0.0.1:'+PORT;
const raw=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const BRIDGE=`window.__dbg={hitTeam,collect,activeShips,fireAllShips,startGame,spawnPickup,
  get p2(){return p2}, get player(){return player}, get state(){return state},
  get score(){return score}, get net(){return net}, get enemies(){return enemies},
  get bullets(){return bullets}, get pickups(){return pickups}, get wave(){return wave}, mkEnemy, updateHUD,
  get runStats(){return runStats}, damageEnemy, addScore, get enemiesRef(){return enemies},
  setEnemies(a){enemies=a}, get combo(){return combo}};
`;
const i=raw.lastIndexOf('})();');
const HTML=raw.slice(0,i)+BRIDGE+raw.slice(i);

let pass=0,fail=0; const ok=(c,m)=>{c?(pass++,console.log('  OK  ',m)):(fail++,console.log('  FAIL',m));};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const PROPS=new Set(['fillStyle','strokeStyle','lineWidth','lineCap','lineJoin','miterLimit','lineDashOffset',
  'font','textAlign','textBaseline','direction','globalAlpha','globalCompositeOperation','shadowBlur',
  'shadowColor','shadowOffsetX','shadowOffsetY','imageSmoothingEnabled','imageSmoothingQuality','filter',
  'letterSpacing','wordSpacing','fontKerning']);
const noop=()=>{};

function boot(label){
  const errors=[];
  const ctx2d=new Proxy({},{get(t,k){
    if(k==='canvas')return {width:720,height:1280};
    if(k==='measureText')return ()=>({width:10});
    if(k==='createLinearGradient'||k==='createRadialGradient')return ()=>({addColorStop:noop});
    if(k==='createPattern')return ()=>null;
    if(k==='getImageData')return ()=>({data:new Uint8ClampedArray(4)});
    if(PROPS.has(k))return t[k];
    return noop; },set(t,k,v){t[k]=v;return true;}});
  const dom=new JSDOM(HTML,{runScripts:'dangerously',pretendToBeVisual:true,
    url:'https://local.test/?relay='+encodeURIComponent(RELAY),
    beforeParse(w){
      w.HTMLCanvasElement.prototype.getContext=()=>ctx2d;
      w.HTMLCanvasElement.prototype.toDataURL=()=>'data:,';
      const deep=()=>new Proxy(function(){},{get(t,k){
        if(k==='currentTime'||k==='value'||k==='sampleRate')return 0;
        if(k==='state')return 'running'; if(k==='then'||k===Symbol.toPrimitive)return undefined;
        return deep();},set(){return true;},apply(){return deep();},construct(){return deep();}});
      w.AudioContext=w.webkitAudioContext=function(){return deep();};
      w.HTMLMediaElement.prototype.play=()=>Promise.resolve();
      w.HTMLMediaElement.prototype.pause=noop; w.HTMLMediaElement.prototype.load=noop;
      w.matchMedia=()=>({matches:false,addListener:noop,removeListener:noop,addEventListener:noop});
      w.navigator.vibrate=noop;
      // jsdom nu face layout: dam terenului o marime reala, altfel W=H=0 si totul e cules imediat
      Object.defineProperty(w,'innerWidth',{value:720,configurable:true});
      Object.defineProperty(w,'innerHeight',{value:1280,configurable:true});
      w.Element.prototype.getBoundingClientRect=function(){
        return this.id==='wrap'?{x:0,y:0,left:0,top:0,right:720,bottom:1280,width:720,height:1280}
                               :{x:0,y:0,left:0,top:0,right:0,bottom:0,width:0,height:0}; };
      w.onerror=(msg,src,ln,col,err)=>errors.push(label+': '+((err&&err.stack)||msg));
    }});
  dom.window.console.error=(...a)=>errors.push(label+' console.error: '+a.join(' '));
  return {dom,w:dom.window,doc:dom.window.document,errors,
          click(id){ const e=dom.window.document.getElementById(id);
                     if(!e)throw new Error('lipseste #'+id);
                     e.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})); }};
}

(async()=>{
  const srv=spawn(process.execPath,[path.join(__dirname,'server-relay.js')],
    {env:Object.assign({},process.env,{PORT:String(PORT)}),stdio:['ignore','pipe','pipe']});
  srv.stdout.on('data',noop); srv.stderr.on('data',d=>console.error('[srv]',String(d).trim()));
  const bye=c=>{ try{srv.kill();}catch(e){} process.exit(c); };
  await wait(700);

  console.log('\n=== Test de fum în CO-OP (joc real + server real) ===');
  const H=boot('gazda'), G=boot('oaspete');
  await wait(1800);
  ok(H.errors.length===0&&G.errors.length===0,'ambele copii se încarcă curat'+
     (H.errors[0]||G.errors[0]?': '+(H.errors[0]||G.errors[0]).slice(0,180):''));

  // gazda creeaza camera
  H.click('coopBtn'); await wait(200); H.click('coopHost'); await wait(900);
  const code=H.doc.getElementById('coopCodeVal').textContent.trim();
  ok(!!code,'gazda primește un cod: '+code);

  // oaspetele intra
  G.click('coopBtn'); await wait(200);
  G.w.prompt=()=>code;                       // butonul "Intru" cere codul printr-un prompt
  G.click('coopJoin'); await wait(1500);

  const hd=H.w.__dbg, gd=G.w.__dbg;
  // jocul se opreste cand cere alegerea unui perk — testul o face in locul jucatorului
  const tick=async(n)=>{ for(let k=0;k<n;k++){ await wait(16);
    if(hd.state==='perk'){ const c=H.doc.querySelectorAll('#perkCards .perkcard')[0];
      if(c)c.dispatchEvent(new H.w.MouseEvent('click',{bubbles:true})); } } };
  ok(hd.net.mode==='host'&&gd.net.mode==='guest','rolurile sunt stabilite: '+hd.net.mode+' / '+gd.net.mode);
  ok(hd.state==='playing','runda a pornit la gazdă');
  ok(hd.p2.active,'gazda îl vede pe P2 activ');

  // lasam jocul sa curga
  await tick(80);
  const errs=()=>H.errors.length+G.errors.length;
  ok(errs()===0,'~1.5s de co-op fără erori'+(errs()?': '+(H.errors[0]||G.errors[0]).slice(0,220):''));
  ok(gd.enemies.length>0||hd.enemies.length>0,'inamicii ajung pe ecrane (gazdă '+hd.enemies.length+', oaspete '+gd.enemies.length+')');

  // ---- Etapa 2: fiecare cu arma lui ----
  hd.player.weapon='laser'; hd.player.lvl.laser=3;
  hd.p2.weapon='scatter'; hd.p2.lvl.scatter=4; hd.p2.fireT=0;
  hd.p2.x=200; hd.player.x=600;
  await tick(20);
  const sc=hd.bullets.filter(b=>b.wpn==='scatter');
  ok(sc.length>0,'P2 trage scatter în timp ce gazda are laser: '+sc.length+' proiectile');
  ok(sc.every(b=>Math.abs(b.x-hd.p2.x)<Math.abs(b.x-hd.player.x)),'și pleacă din dreptul lui P2 ('+Math.round(hd.p2.x)+'), nu al gazdei ('+Math.round(hd.player.x)+')');

  // ---- Etapa 3: cadoul merge la cine l-a atins ----
  hd.p2.weapon='pulse'; hd.player.weapon='pulse';
  hd.collect({x:hd.p2.x,y:hd.p2.y,type:'shield'},hd.p2);
  ok(hd.p2.shield===9&&hd.player.shield===0,'scutul cules de P2 rămâne la P2');
  const c0=hd.p2.coins;
  hd.collect({x:hd.p2.x,y:hd.p2.y,type:'coin',tier:0},hd.p2);
  ok(hd.p2.coins>c0,'moneda intră în punga lui P2: '+hd.p2.coins);

  // ---- ASPECTUL inamicilor: ce vede gazda trebuie sa vada si oaspetele ----
  // Bug-ul de la valul 8: asteroizii ajungeau la oaspete ca pui, fiindca steagul
  // `asteroid` nu calatorea in instantaneu. Testul compara RAMURA DE DESEN, nu campurile.
  {
    const look = e => e.boss ? 'boss'
      : e.asteroid ? 'roca'+(e.fire?'+coada':'')+(e.ice?'+gheata':'')
      : e.bauble ? 'globulet'
      : e.leaf ? 'frunza'
      : 'pui:'+e.type+(e.ufo?'+ozn':'')+(e.elite?'+auriu':'')+(e.baby?'+pui-mic':'')
        +((e.bub&&!e.bubBroken)?'+bula':'');

    const cazuri = [
      ['asteroid (valul 8)', {x:200,y:200,r:40,hp:9999,pattern:'rock',vy:100,spin:1,asteroid:true,rock:true,bonus:true,type:'star'}],
      ['cometa',             {x:250,y:200,r:26,hp:9999,pattern:'rock',vy:120,asteroid:true,rock:true,bonus:true,fire:true,ice:true,type:'star'}],
      ['inamic auriu',       {x:300,y:200,r:18,hp:9999,pattern:'fall',vy:8,driftX:0,elite:true,type:'bird'}],
      ['pui mic',            {x:350,y:200,r:18,hp:1,pattern:'fall',vy:8,driftX:0,baby:true,type:'bird'}],
      ['inamic obisnuit',    {x:400,y:200,r:18,hp:9999,pattern:'fall',vy:8,driftX:0,type:'bird'}],
      ['globulet de brad',   {x:450,y:200,r:18,hp:9999,pattern:'fall',vy:8,driftX:0,bauble:true,bcol:'#ff5a6a',bonus:true,type:'star'}],
      ['frunza de toamna',   {x:500,y:200,r:18,hp:9999,pattern:'fall',vy:8,driftX:0,leaf:true,type:'shroom'}],
      ['farfurie zburatoare',{x:550,y:200,r:20,hp:9999,pattern:'fall',vy:8,driftX:0,ufo:true,bonus:true,type:'panda'}]
    ];

    // taiem focul, altfel navele isi impusca propriile inamici de test inainte sa ajunga
    const w1=hd.player.weapon, w2=hd.p2.weapon;
    const l1=hd.player.lvl[w1], l2=hd.p2.lvl[w2];
    hd.player.lvl[w1]=0; hd.p2.lvl[w2]=0;
    hd.enemies.length=0; hd.bullets.length=0; await tick(6);
    hd.bullets.length=0;
    const asteptat=[];
    for(const [nume,cfg] of cazuri){ const e=hd.mkEnemy(cfg); asteptat.push([nume, look(e), e]); }
    await tick(14);

    // legatura e id-ul de retea, nu pozitia in lista: inamicii mor si lista se strange.
    // Mai asteptam cateva runde pentru cei care n-au ajuns inca — instantaneele vin la 50 ms.
    for(let r=0; r<4 && asteptat.some(([,,e])=>!gd.enemies.some(x=>x.__id===e.__nid)); r++) await tick(10);
    for(const [nume,vrut,e] of asteptat){
      const g=gd.enemies.find(x=>x.__id===e.__nid);
      const v=g?look(g):'(nu a ajuns)';
      ok(v===vrut, nume+': oaspetele vede „'+v+'", gazda „'+vrut+'"');
    }
    hd.player.lvl[w1]=l1; hd.p2.lvl[w2]=l2;
    const roca=gd.enemies.find(e=>e.asteroid);
    if(roca){ const s0=roca.spin||0; await tick(6);
      ok((roca.spin||0)!==s0,'roca se rotește și la oaspete (nu stă înțepenită)'); }
    hd.enemies.length=0; await tick(6);
  }

  // ---- INVARIANT: fiecare punct are un proprietar ----
  // Daca vreo cale de daune nu-si poarta nava, suma partilor nu mai da totalul si testul pica.
  {
    const inv=()=>Math.abs(hd.score-((hd.player.score|0)+(hd.p2.score|0)));
    ok(inv()===0,'la inceput scorurile se aduna la total (diferenta '+inv()+')');

    // toate felurile de arme, pe rand, la ambele nave — plus rachete, ciocniri si cadouri
    const arme=['pulse','scatter','vulcan','rifle','arc','boomer','plasma','storm','wave','laser'];
    for(const w of arme){
      for(const sh of [hd.player,hd.p2]){ sh.weapon=w; sh.lvl[w]=6; sh.fireT=0; sh.burstT=0; }
      await tick(14);
      ok(inv()===0,'arma '+w+': punctele au proprietar (diferenta '+inv()+')');
    }

    // racheta fiecaruia
    hd.player.missiles=3; hd.p2.missiles=3;
    hd.player.weapon='pulse'; hd.p2.weapon='pulse';
    await tick(40);
    const d1=inv(); ok(d1===0,'dupa un val intreg de trageri, tot 0 (diferenta '+d1+')');

    // cadouri culese de fiecare
    hd.collect({x:0,y:0,type:'coin',tier:3},hd.player);
    hd.collect({x:0,y:0,type:'coin',tier:3},hd.p2);
    hd.collect({x:0,y:0,type:'cream'},hd.p2);
    hd.collect({x:0,y:0,type:'burst'},hd.p2); hd.collect({x:0,y:0,type:'burst'},hd.p2);
    hd.collect({x:0,y:0,type:'burst'},hd.p2); hd.collect({x:0,y:0,type:'burst'},hd.p2);
    ok(inv()===0,'si dupa cadouri (diferenta '+inv()+')');

    // pragul de viata bonus: al fiecaruia, pe scorul lui
    const lives0=hd.p2.lives;
    hd.addScore(hd.p2, hd.p2.nextLife-(hd.p2.score|0)-10);    // fix sub prag, pe canalul normal
    await tick(4);
    ok(hd.p2.lives===lives0,'sub prag inca nu primeste nimic');
    hd.addScore(hd.p2,20);
    await tick(6);
    ok(hd.p2.lives===lives0+1,'P2 isi ia viata bonus pe scorul LUI: '+lives0+' -> '+hd.p2.lives);
    ok(hd.player.nextLife===100000,'pragul gazdei ramane neatins: '+hd.player.nextLife);
    ok(inv()===0,'invariantul tine si dupa bonus (diferenta '+inv()+')');
  }

  // ---- Etapa 5: HUD-ul arata doua randuri ----
  ok(H.doc.getElementById('p2Row').style.display==='block','la gazdă apare al doilea rând de inimioare');
  ok(G.doc.getElementById('p2Row').style.display==='block','și la oaspete');
  ok(H.doc.getElementById('livesLbl').textContent==='tu','primul rând se numește „tu" în co-op');
  const hearts=el=>el.innerHTML;
  ok(hearts(H.doc.getElementById('livesV')).includes('💗'),'rândul tău e cu inimi roz');
  ok(hearts(H.doc.getElementById('livesV2')).includes('💙'),'rândul prietenului e cu inimi albastre');

  // oaspetele isi vede viețile LUI, nu pe ale gazdei
  hd.player.lives=2; hd.p2.lives=5; hd.player.invuln=99; hd.p2.invuln=99;
  await wait(300);
  ok(gd.player.lives===5,'oaspetele își vede viețile lui (5), nu pe ale gazdei (2): '+gd.player.lives);
  ok(gd.p2.lives===2,'și separat pe ale gazdei: '+gd.p2.lives);
  hd.updateHUD(); gd.updateHUD(); await wait(50);
  { const hv=H.doc.getElementById('scoreV').textContent.replace(/[^0-9]/g,'');
    const gv=G.doc.getElementById('scoreV').textContent.replace(/[^0-9]/g,'');
    ok(hv===String(hd.player.score|0),'HUD-ul gazdei arată scorul EI: '+hv);
    ok(gv===String(hd.p2.score|0),'HUD-ul oaspetelui arată scorul LUI: '+gv);
    ok(hv!==gv,'și cele două nu mai sunt același număr'); }

  // ---- Etapa 1: P2 moare, gazda continua ----
  const scoreBefore=hd.score, waveBefore=hd.wave;
  hd.p2.shield=0;
  for(let n=0;n<8&&!hd.p2.dead;n++){ hd.p2.invuln=0; hd.hitTeam(hd.p2); }
  ok(hd.p2.dead,'P2 rămâne fără vieți și moare');
  ok(!hd.player.dead,'gazda e neatinsă');
  ok(hd.state==='playing','runda NU se termină — gazda joacă mai departe (stare: '+hd.state+')');
  ok(hd.activeShips().length===1,'lista de nave vii scade la una');
  await tick(120);
  ok(hd.state==='playing','și după încă ~2s tot joacă');
  ok(hd.score>=scoreBefore,'scorul curge mai departe: '+scoreBefore+' -> '+hd.score);
  ok(errs()===0,'niciun crash după moartea lui P2'+(errs()?': '+(H.errors[0]||G.errors[0]).slice(0,220):''));

  // ---- si acum moare si gazda: abia atunci se termina ----
  hd.player.shield=0; hd.player.lives=1; hd.player.invuln=0; hd.hitTeam(hd.player);
  ok(hd.player.dead,'gazda moare și ea');
  await tick(150);
  ok(hd.state==='over','runda se termină abia când au murit amândoi');
  // ---- Etapa 4: pungile, separat ----
  ok(H.doc.getElementById('coopSplit').style.display==='flex','ecranul final arată blocul cu două coloane');
  await wait(400);
  ok(G.doc.getElementById('coopSplit').style.display==='flex','și pe ecranul oaspetelui');
  ok(H.doc.getElementById('oCoinsMe').textContent===String(hd.player.coins|0),
     'coloana de monede a gazdei = ce a cules ea ('+H.doc.getElementById('oCoinsMe').textContent+')');
  const sMe=H.doc.getElementById('oScoreMe').textContent.replace(/[^0-9]/g,'');
  const sHim=H.doc.getElementById('oScoreHim').textContent.replace(/[^0-9]/g,'');
  ok(sMe===String(hd.player.score|0)&&sHim===String(hd.p2.score|0),
     'ecranul final arată scorurile separat: '+sMe+' / '+sHim);
  ok((+sMe)+(+sHim)===(hd.score|0),'iar cele două coloane se adună la totalul echipei: '+hd.score);
  await wait(500);
  const gMe=G.doc.getElementById('oScoreMe').textContent.replace(/[^0-9]/g,'');
  ok(gMe===String(hd.p2.score|0),'oaspetele își vede în coloana lui scorul LUI: '+gMe);
  ok(errs()===0,'ecranul final fără erori'+(errs()?': '+(H.errors[0]||G.errors[0]).slice(0,220):''));

  console.log('\n=== '+pass+' treceri, '+fail+' eșecuri ===');
  if(errs()){ console.log('\nerori:'); [...H.errors,...G.errors].slice(0,3).forEach(e=>console.log('  '+String(e).slice(0,400))); }
  H.dom.window.close(); G.dom.window.close();
  bye(fail?1:0);
})().catch(e=>{ console.error('harness:',e); process.exit(1); });

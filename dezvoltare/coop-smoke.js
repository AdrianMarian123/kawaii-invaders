/**
 * Test de fum in CO-OP: doua copii ale jocului real (gazda + oaspete) vorbesc
 * printr-un server de relay adevarat. Verifica scenariile din etapele 1-5
 * pe jocul care chiar ruleaza (bucla pornita), nu pe stub-uri.
 *
 * Fiecare copie traieste in propriul proces (copil-joc.js); parintele conduce
 * totul prin __dbg — puntea de test din src/game/sim.js.
 */
'use strict';
const { spawn } = require('child_process');
const { relayPath, relayEnv } = require('./relay-path');
const { pornesteCopil } = require('./copil-joc');

const PORT = 3998, RELAY = 'ws://127.0.0.1:' + PORT;
let pass=0,fail=0; const ok=(c,m)=>{c?(pass++,console.log('  OK  ',m)):(fail++,console.log('  FAIL',m));};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const copii=[];

(async()=>{
  const srv=spawn(process.execPath,[relayPath()],
    {env:relayEnv({PORT:String(PORT)}),stdio:['ignore','pipe','pipe']});
  srv.stdout.on('data',()=>{}); srv.stderr.on('data',d=>console.error('[srv]',String(d).trim()));
  const bye=c=>{ copii.forEach(x=>x.omoara()); try{srv.kill();}catch(e){} process.exit(c); };
  await wait(700);

  console.log('\n=== Test de fum în CO-OP (joc real + server real) ===');
  const H=await pornesteCopil({url:'https://local.test/?relay='+RELAY});
  const G=await pornesteCopil({url:'https://local.test/?relay='+RELAY});
  copii.push(H,G);
  await wait(1800);
  { const eH=await H.erori(), eG=await G.erori();
    ok(eH.length===0&&eG.length===0,'ambele copii se încarcă curat'+
       (eH[0]||eG[0]?': '+String(eH[0]||eG[0]).slice(0,180):'')); }

  // gazda creeaza camera
  await H.click('coopBtn'); await wait(200); await H.click('coopHost'); await wait(900);
  const code=(await H.eval("return document.getElementById('coopCodeVal').textContent")).trim();
  ok(!!code,'gazda primește un cod: '+code);

  // oaspetele intra
  await G.click('coopBtn'); await wait(200);
  await G.eval('w.prompt=()=>'+JSON.stringify(code)+'; return null');  // "Intru" cere codul printr-un prompt
  await G.click('coopJoin'); await wait(1500);

  // jocul se opreste cand cere alegerea unui perk — copilul gazdei o face in locul jucatorului
  const tick=n=>H.eval(`for(let k=0;k<${n};k++){ await new Promise(r=>setTimeout(r,16));
    if(__dbg.state==='perk'){ const c=document.querySelectorAll('#perkCards .perkcard')[0];
      if(c)c.dispatchEvent(new w.MouseEvent('click',{bubbles:true})); } } return null`);
  const hEval=c=>H.eval(c), gEval=c=>G.eval(c);
  const errs=async()=>(await H.erori()).length+(await G.erori()).length;
  const primaEroare=async()=>{ const a=await H.erori(), b=await G.erori(); return String(a[0]||b[0]||'').slice(0,220); };

  { const roluri=[await hEval('return __dbg.net.mode'), await gEval('return __dbg.net.mode')];
    ok(roluri[0]==='host'&&roluri[1]==='guest','rolurile sunt stabilite: '+roluri.join(' / ')); }
  ok(await hEval("return __dbg.state==='playing'"),'runda a pornit la gazdă');
  ok(await hEval('return __dbg.p2.active===true'),'gazda îl vede pe P2 activ');

  // lasam jocul sa curga
  await tick(80);
  ok(await errs()===0,'~1.5s de co-op fără erori'+((await errs())?': '+await primaEroare():''));
  { const ne=[await hEval('return __dbg.enemies.length'), await gEval('return __dbg.enemies.length')];
    ok(ne[0]>0||ne[1]>0,'inamicii ajung pe ecrane (gazdă '+ne[0]+', oaspete '+ne[1]+')'); }

  // ---- Etapa 2: fiecare cu arma lui ----
  await hEval(`__dbg.player.weapon='laser'; __dbg.player.lvl.laser=3;
    __dbg.p2.weapon='scatter'; __dbg.p2.lvl.scatter=4; __dbg.p2.fireT=0;
    __dbg.p2.x=200; __dbg.player.x=600; return null`);
  await tick(20);
  { const r=await hEval(`const sc=__dbg.bullets.filter(b=>b.wpn==='scatter');
      return {n:sc.length, aproape:sc.every(b=>Math.abs(b.x-__dbg.p2.x)<Math.abs(b.x-__dbg.player.x)),
              p2x:Math.round(__dbg.p2.x), px:Math.round(__dbg.player.x)}`);
    ok(r.n>0,'P2 trage scatter în timp ce gazda are laser: '+r.n+' proiectile');
    ok(r.aproape,'și pleacă din dreptul lui P2 ('+r.p2x+'), nu al gazdei ('+r.px+')'); }

  // ---- Etapa 3: cadoul merge la cine l-a atins ----
  await hEval(`__dbg.p2.weapon='pulse'; __dbg.player.weapon='pulse';
    __dbg.collect({x:__dbg.p2.x,y:__dbg.p2.y,type:'shield'},__dbg.p2); return null`);
  { const r=await hEval('return {s2:__dbg.p2.shield, s1:__dbg.player.shield}');
    ok(r.s2===9&&r.s1===0,'scutul cules de P2 rămâne la P2'); }
  { const r=await hEval(`const c0=__dbg.p2.coins;
      __dbg.collect({x:__dbg.p2.x,y:__dbg.p2.y,type:'coin',tier:0},__dbg.p2);
      return {c0, c1:__dbg.p2.coins}`);
    ok(r.c1>r.c0,'moneda intră în punga lui P2: '+r.c1); }

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
    await hEval(`w.__l1=__dbg.player.lvl[__dbg.player.weapon]; w.__l2=__dbg.p2.lvl[__dbg.p2.weapon];
      __dbg.player.lvl[__dbg.player.weapon]=0; __dbg.p2.lvl[__dbg.p2.weapon]=0;
      __dbg.enemies.length=0; __dbg.bullets.length=0; return null`);
    await tick(6);
    await hEval('__dbg.bullets.length=0; return null');
    // pastram REFERINTELE in copil: __nid e pus pe inamic abia la primul
    // instantaneu, deci il citim dupa ce instantaneele au circulat
    await hEval('w.__test=[]; return null');
    const asteptat=[];
    for(const [nume,cfg] of cazuri){
      const e=await hEval('const e=__dbg.mkEnemy('+JSON.stringify(cfg)+'); w.__test.push(e); return e');
      asteptat.push([nume, look(e)]);
    }
    await tick(14);
    let nids=await hEval('return w.__test.map(e=>e.__nid===undefined?null:e.__nid)');
    asteptat.forEach((a,i)=>a.push(nids[i]));

    // legatura e id-ul de retea, nu pozitia in lista: inamicii mor si lista se strange.
    // Mai asteptam cateva runde pentru cei care n-au ajuns inca — instantaneele vin la 50 ms.
    for(let r=0;r<4;r++){
      const ids=await gEval('return __dbg.enemies.map(x=>x.__id)');
      if(!asteptat.some(([,,nid])=>nid===null||!ids.includes(nid)))break;
      await tick(10);
      nids=await hEval('return w.__test.map(e=>e.__nid===undefined?null:e.__nid)');
      asteptat.forEach((a,i)=>{ a[2]=nids[i]; });
    }
    const laOaspete=await gEval('return __dbg.enemies.map(e=>({id:e.__id,e:{boss:!!e.boss,asteroid:!!e.asteroid,fire:!!e.fire,ice:!!e.ice,bauble:!!e.bauble,leaf:!!e.leaf,type:e.type,ufo:!!e.ufo,elite:!!e.elite,baby:!!e.baby,bub:!!e.bub,bubBroken:!!e.bubBroken}}))');
    for(const [nume,vrut,nid] of asteptat){
      const gasit=laOaspete.find(x=>x.id===nid);
      const v=gasit?look(gasit.e):'(nu a ajuns)';
      ok(v===vrut, nume+': oaspetele vede „'+v+'", gazda „'+vrut+'"');
    }
    await hEval('__dbg.player.lvl[__dbg.player.weapon]=w.__l1; __dbg.p2.lvl[__dbg.p2.weapon]=w.__l2; return null');
    { const s0=await gEval('const r=__dbg.enemies.find(e=>e.asteroid); return r?(r.spin||0):null');
      if(s0!==null){ await tick(6);
        const s1=await gEval('const r=__dbg.enemies.find(e=>e.asteroid); return r?(r.spin||0):null');
        ok(s1!==null&&s1!==s0,'roca se rotește și la oaspete (nu stă înțepenită)'); } }
    await hEval('__dbg.enemies.length=0; return null'); await tick(6);
  }

  // ---- INVARIANT: fiecare punct are un proprietar ----
  // Daca vreo cale de daune nu-si poarta nava, suma partilor nu mai da totalul si testul pica.
  {
    const inv=()=>hEval('return Math.abs(__dbg.score-((__dbg.player.score|0)+(__dbg.p2.score|0)))');
    ok(await inv()===0,'la inceput scorurile se aduna la total (diferenta '+await inv()+')');

    // toate felurile de arme, pe rand, la ambele nave — plus rachete, ciocniri si cadouri
    const arme=['pulse','scatter','vulcan','rifle','arc','boomer','plasma','storm','wave','laser'];
    for(const w of arme){
      await hEval(`for(const sh of [__dbg.player,__dbg.p2]){ sh.weapon='${w}'; sh.lvl['${w}']=6; sh.fireT=0; sh.burstT=0; } return null`);
      await tick(14);
      const d=await inv();
      ok(d===0,'arma '+w+': punctele au proprietar (diferenta '+d+')');
    }

    // racheta fiecaruia
    await hEval(`__dbg.player.missiles=3; __dbg.p2.missiles=3;
      __dbg.player.weapon='pulse'; __dbg.p2.weapon='pulse'; return null`);
    await tick(40);
    const d1=await inv(); ok(d1===0,'dupa un val intreg de trageri, tot 0 (diferenta '+d1+')');

    // cadouri culese de fiecare
    await hEval(`__dbg.collect({x:0,y:0,type:'coin',tier:3},__dbg.player);
      __dbg.collect({x:0,y:0,type:'coin',tier:3},__dbg.p2);
      __dbg.collect({x:0,y:0,type:'cream'},__dbg.p2);
      for(let i=0;i<4;i++)__dbg.collect({x:0,y:0,type:'burst'},__dbg.p2); return null`);
    ok(await inv()===0,'si dupa cadouri (diferenta '+await inv()+')');

    // pragul de viata bonus: al fiecaruia, pe scorul lui
    const lives0=await hEval('return __dbg.p2.lives');
    await hEval('__dbg.addScore(__dbg.p2, __dbg.p2.nextLife-(__dbg.p2.score|0)-10); return null');
    await tick(4);
    ok(await hEval('return __dbg.p2.lives')===lives0,'sub prag inca nu primeste nimic');
    await hEval('__dbg.addScore(__dbg.p2,20); return null');
    await tick(6);
    const lives1=await hEval('return __dbg.p2.lives');
    ok(lives1===lives0+1,'P2 isi ia viata bonus pe scorul LUI: '+lives0+' -> '+lives1);
    ok(await hEval('return __dbg.player.nextLife')===100000,'pragul gazdei ramane neatins: 100000');
    ok(await inv()===0,'invariantul tine si dupa bonus (diferenta '+await inv()+')');
  }

  // ---- Etapa 5: HUD-ul arata doua randuri ----
  ok(await hEval("return document.getElementById('p2Row').style.display==='block'"),'la gazdă apare al doilea rând de inimioare');
  ok(await gEval("return document.getElementById('p2Row').style.display==='block'"),'și la oaspete');
  ok(await hEval("return document.getElementById('livesLbl').textContent==='tu'"),'primul rând se numește „tu" în co-op');
  ok(await hEval("return document.getElementById('livesV').innerHTML.includes('💗')"),'rândul tău e cu inimi roz');
  ok(await hEval("return document.getElementById('livesV2').innerHTML.includes('💙')"),'rândul prietenului e cu inimi albastre');

  // oaspetele isi vede viețile LUI, nu pe ale gazdei
  await hEval('__dbg.player.lives=2; __dbg.p2.lives=5; __dbg.player.invuln=99; __dbg.p2.invuln=99; return null');
  await wait(300);
  ok(await gEval('return __dbg.player.lives')===5,'oaspetele își vede viețile lui (5), nu pe ale gazdei (2): '+await gEval('return __dbg.player.lives'));
  ok(await gEval('return __dbg.p2.lives')===2,'și separat pe ale gazdei: '+await gEval('return __dbg.p2.lives'));
  await hEval('__dbg.updateHUD(); return null'); await gEval('__dbg.updateHUD(); return null'); await wait(50);
  { const hv=await hEval("return document.getElementById('scoreV').textContent.replace(/[^0-9]/g,'')");
    const gv=await gEval("return document.getElementById('scoreV').textContent.replace(/[^0-9]/g,'')");
    const hs=await hEval('return String(__dbg.player.score|0)'), gs=await hEval('return String(__dbg.p2.score|0)');
    ok(hv===hs,'HUD-ul gazdei arată scorul EI: '+hv);
    ok(gv===gs,'HUD-ul oaspetelui arată scorul LUI: '+gv);
    ok(hv!==gv,'și cele două nu mai sunt același număr'); }

  // ---- Etapa 1: P2 moare, gazda continua ----
  const scoreBefore=await hEval('return __dbg.score');
  await hEval(`__dbg.p2.shield=0;
    for(let n=0;n<8&&!__dbg.p2.dead;n++){ __dbg.p2.invuln=0; __dbg.hitTeam(__dbg.p2); } return null`);
  ok(await hEval('return __dbg.p2.dead===true'),'P2 rămâne fără vieți și moare');
  ok(await hEval('return !__dbg.player.dead'),'gazda e neatinsă');
  ok(await hEval("return __dbg.state==='playing'"),'runda NU se termină — gazda joacă mai departe');
  ok(await hEval('return __dbg.activeShips().length===1'),'lista de nave vii scade la una');
  await tick(120);
  ok(await hEval("return __dbg.state==='playing'"),'și după încă ~2s tot joacă');
  { const s=await hEval('return __dbg.score');
    ok(s>=scoreBefore,'scorul curge mai departe: '+scoreBefore+' -> '+s); }
  ok(await errs()===0,'niciun crash după moartea lui P2'+((await errs())?': '+await primaEroare():''));

  // ---- si acum moare si gazda: abia atunci se termina ----
  await hEval('__dbg.player.shield=0; __dbg.player.lives=1; __dbg.player.invuln=0; __dbg.hitTeam(__dbg.player); return null');
  ok(await hEval('return __dbg.player.dead===true'),'gazda moare și ea');
  await tick(150);
  ok(await hEval("return __dbg.state==='over'"),'runda se termină abia când au murit amândoi');
  // ---- Etapa 4: pungile, separat ----
  ok(await hEval("return document.getElementById('coopSplit').style.display==='flex'"),'ecranul final arată blocul cu două coloane');
  await wait(400);
  ok(await gEval("return document.getElementById('coopSplit').style.display==='flex'"),'și pe ecranul oaspetelui');
  { const cMe=await hEval("return document.getElementById('oCoinsMe').textContent");
    ok(cMe===await hEval('return String(__dbg.player.coins|0)'),
       'coloana de monede a gazdei = ce a cules ea ('+cMe+')'); }
  const sMe=await hEval("return document.getElementById('oScoreMe').textContent.replace(/[^0-9]/g,'')");
  const sHim=await hEval("return document.getElementById('oScoreHim').textContent.replace(/[^0-9]/g,'')");
  { const ps=await hEval('return String(__dbg.player.score|0)'), p2s=await hEval('return String(__dbg.p2.score|0)');
    ok(sMe===ps&&sHim===p2s,'ecranul final arată scorurile separat: '+sMe+' / '+sHim); }
  { const total=await hEval('return __dbg.score|0');
    ok((+sMe)+(+sHim)===total,'iar cele două coloane se adună la totalul echipei: '+total); }
  await wait(500);
  { const gMe=await gEval("return document.getElementById('oScoreMe').textContent.replace(/[^0-9]/g,'')");
    ok(gMe===await hEval('return String(__dbg.p2.score|0)'),'oaspetele își vede în coloana lui scorul LUI: '+gMe); }
  ok(await errs()===0,'ecranul final fără erori'+((await errs())?': '+await primaEroare():''));

  console.log('\n=== '+pass+' treceri, '+fail+' eșecuri ===');
  if(await errs()){ console.log('\nerori:'); [...await H.erori(),...await G.erori()].slice(0,3).forEach(e=>console.log('  '+String(e).slice(0,400))); }
  bye(fail?1:0);
})().catch(e=>{ console.error('harness:',e); copii.forEach(x=>x.omoara()); process.exit(1); });

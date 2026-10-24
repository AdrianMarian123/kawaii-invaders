/**
 * Etapa 3: obiectele de pe jos merg la nava care le-a atins.
 * Ruleaza collect() din jocul REAL (prin __dbg), cu bucla oprita.
 */
'use strict';
const { pornesteJocul } = require('./mediu-joc');
let pass=0,fail=0; const ok=(c,m)=>{c?(pass++,console.log('  OK  ',m)):(fail++,console.log('  FAIL',m));};

const LVL0={pulse:0,scatter:0,laser:0,arc:0,boomer:0,plasma:0,storm:0,wave:0,vulcan:0,rifle:0};
const mkShip=o=>Object.assign({x:300,y:1000,r:19,weapon:'pulse',
  lvl:Object.assign({},LVL0,{pulse:1}),
  missiles:3,burst:1,burstT:0,wingmen:0,shield:0,magnet:0,lives:3,dead:false,score:0,coins:0},o);

(async()=>{
  const J=await pornesteJocul({faraBucla:true});
  const d=J.dbg, w=J.w;
  Math.random=()=>0.5;

  function caz(pl,p2){
    Object.assign(d.player, mkShip(pl||{}));
    Object.assign(d.p2, mkShip(p2||{}));
    d.net.mode='host'; d.p2.active=true;
    d.set.score(0); d.set.combo(0); d.set.mult(1); d.set.frenzyT(0);
    Object.assign(d.runStats,{coins:0,gems:0,maxMult:1});
    w.__toasts.length=0; J.doc.getElementById('toast').textContent='';
  }
  // toast() scrie sincron in #toast; citim direct elementul
  const ultimulToast=()=>String(J.doc.getElementById('toast').textContent||'');

  console.log('\n=== Etapa 3: cadourile merg la nava care le-a atins ===');

  // --- arma din cadou schimba doar nava care l-a cules ---
  {
    caz();
    d.collect({x:0,y:0,type:'gift',weapon:'scatter'}, d.p2);
    ok(d.p2.weapon==='scatter', 'P2 primește arma din cadou: '+d.p2.weapon);
    ok(d.player.weapon==='pulse', 'gazda rămâne cu arma ei: '+d.player.weapon);
    ok(ultimulToast().startsWith('P2 · '), 'anunțul spune a cui e cadoul: "'+ultimulToast()+'"');
  }
  // --- nivelul creste doar la nava respectiva ---
  {
    caz({weapon:'scatter',lvl:Object.assign({},LVL0,{scatter:4})},
        {weapon:'scatter',lvl:Object.assign({},LVL0,{scatter:4})});
    d.collect({x:0,y:0,type:'gift',weapon:'scatter'}, d.player);
    ok(d.player.lvl.scatter===5&&d.p2.lvl.scatter===4, 'nivelul urcă doar la gazdă: '+d.player.lvl.scatter+' / '+d.p2.lvl.scatter);
  }
  // --- scut, magnet, viata, rachete, coleg ---
  {
    caz();
    d.collect({x:0,y:0,type:'shield'}, d.p2);
    d.collect({x:0,y:0,type:'magnet'}, d.p2);
    d.collect({x:0,y:0,type:'life'}, d.p2);
    d.collect({x:0,y:0,type:'missile'}, d.p2);
    d.collect({x:0,y:0,type:'wing'}, d.p2);
    ok(d.p2.shield===9&&d.player.shield===0, 'scutul e al lui P2');
    ok(d.p2.magnet===9&&d.player.magnet===0, 'magnetul e al lui P2');
    ok(d.p2.lives===4&&d.player.lives===3, 'viața extra e a lui P2: '+d.p2.lives+' / '+d.player.lives);
    ok(d.p2.missiles===5&&d.player.missiles===3, 'rachetele sunt ale lui P2: '+d.p2.missiles+' / '+d.player.missiles);
    ok(d.p2.wingmen===1&&d.player.wingmen===0, 'colegul e al lui P2');
  }
  // --- monede: punga navei + totalul comun ---
  {
    caz();
    d.collect({x:0,y:0,type:'coin',tier:0}, d.player);
    d.collect({x:0,y:0,type:'coin',tier:2}, d.p2);
    ok(d.player.coins===1&&d.p2.coins===5, 'fiecare navă își strânge monedele: '+d.player.coins+' / '+d.p2.coins);
    ok(d.runStats.coins===6, 'totalul rundei le însumează: '+d.runStats.coins);
    ok(d.player.score>0&&d.p2.score>0&&d.player.score!==d.p2.score, 'scorurile cresc separat: '+d.player.score+' / '+d.p2.score);
    ok(d.score===d.player.score+d.p2.score, 'scorul comun e suma celor două: '+d.score);
  }
  // --- un singur jucator: collect(p) fara nava merge la player ---
  {
    caz();
    d.collect({x:0,y:0,type:'shield'});
    ok(d.player.shield===9&&d.p2.shield===0, 'apelul vechi collect(p) merge tot la jucător');
    ok(ultimulToast().length>0 && ultimulToast().indexOf('P2')<0, 'și nu pune eticheta P2 pe anunț');
  }
  console.log('\n=== '+pass+' treceri, '+fail+' eșecuri ===');
  process.exit(fail?1:0);
})().catch(e=>{ console.error('harness:',e); process.exit(1); });

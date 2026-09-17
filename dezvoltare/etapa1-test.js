/**
 * Etapa 1: P2 e navă adevărată — vieți, scut și moarte proprii.
 * Ruleaza pe jocul REAL (prin __dbg), cu bucla oprita ca sa fie determinist.
 */
'use strict';
const { pornesteJocul } = require('./mediu-joc');
let pass=0,fail=0; const ok=(c,m)=>{c?(pass++,console.log('  OK  ',m)):(fail++,console.log('  FAIL',m));};

(async()=>{
  const J=await pornesteJocul({faraBucla:true});
  const d=J.dbg, p2=d.p2, player=d.player;

  // aceeasi stare de pornire ca in vechile stub-uri
  Object.assign(d.net,{mode:'host',role:'host',connected:true,sendT:0});
  Object.assign(p2,{x:360,y:1150,r:19,active:true,weapon:'pulse',lvl:{pulse:1},fireT:0,missiles:3,burst:1,
      wingmen:0,shield:0,magnet:0,invuln:0,lives:3,dead:false,deadT:0,score:0,coins:0,tilt:0});
  Object.assign(player,{x:360,y:1150,r:19,lives:3,dead:false,deadT:0,shield:0,invuln:0,weapon:'pulse',lvl:{pulse:1}});
  d.set.state('playing'); d.set.score(0); d.set.combo(0); d.set.mult(1);

  console.log('\n=== Etapa 1: P2 e navă adevărată ===');
  d.hitTeam(p2);
  ok(p2.lives===2 && player.lives===3, 'lovitura scade viețile lui P2, nu ale gazdei ('+p2.lives+' vs '+player.lives+')');
  ok(p2.invuln>0, 'P2 primește invulnerabilitate proprie');
  p2.invuln=0; d.hitTeam(p2);
  p2.invuln=0; d.hitTeam(p2);
  ok(p2.lives<=0 && p2.dead===true, 'P2 rămâne fără vieți → p2.dead');
  ok(p2.deadT>0, 'P2 are propriul cronometru de moarte');
  ok(player.dead===false && player.lives===3, 'gazda e neatinsă și joacă mai departe');

  // scut propriu
  p2.dead=false; p2.deadT=0; p2.lives=3; p2.invuln=0; p2.shield=1; player.shield=0;
  d.hitTeam(p2);
  ok(p2.shield===0 && p2.lives===3 && player.shield===0, 'scutul consumat e al lui P2, nu al gazdei');

  // gazda lovită nu atinge P2
  p2.invuln=0; p2.lives=3; player.invuln=0; player.lives=3;
  d.hitTeam(player);
  ok(player.lives===2 && p2.lives===3, 'gazda lovită prin hitTeam nu scade viețile lui P2');

  // nava moartă nu mai e desenată
  p2.dead=true; p2.deadT=0.1;
  J.resetDesen(); d.drawP2();
  ok(J.apeluriDesen.length===0, 'nava moartă nu mai e desenată');

  // mesajele oaspetelui nu mai mișcă o navă moartă
  const x0=p2.x; d.onNetData({t:'in',nx:0.1,ny:0.9});
  ok(p2.x===x0, 'poziția unui P2 mort nu mai e actualizată');

  console.log('\n=== '+pass+' treceri, '+fail+' eșecuri ===');
  process.exit(fail?1:0);
})().catch(e=>{ console.error('harness:',e); process.exit(1); });

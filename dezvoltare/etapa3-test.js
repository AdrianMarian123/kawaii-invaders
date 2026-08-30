/**
 * Etapa 3: obiectele de pe jos merg la nava care le-a atins.
 * Extrage functia REALA collect() din index-ACTUAL-v66.html.
 */
'use strict';
const vm=require('vm');
const { loadGameHtml } = require('./load-game');
const HTML=loadGameHtml();
const START='// Cadoul îl ia nava care l-a atins';
const END='// COMBAT';
const a=HTML.indexOf(START), b=HTML.indexOf(END,a);
if(a<0||b<0){ console.error('nu gasesc collect()'); process.exit(1); }
const SRC=HTML.slice(a,b);
let pass=0,fail=0; const ok=(c,m)=>{c?(pass++,console.log('  OK  ',m)):(fail++,console.log('  FAIL',m));};

const mkShip=o=>Object.assign({x:300,y:1000,r:19,weapon:'pulse',
  lvl:{pulse:1,scatter:0,laser:0,arc:0,boomer:0,plasma:0,storm:0,wave:0,vulcan:0,rifle:0},
  missiles:3,burst:1,burstT:0,wingmen:0,shield:0,magnet:0,lives:3,dead:false,score:0,coins:0},o);

function ctx(player,p2){
  const g={Math,JSON,console:{log(){},error(){}},
    player,p2, particles:[], floaters:[], score:0, combo:0, comboT:0, mult:1, frenzyT:0,
    runStats:{coins:0,gems:0,maxMult:1},
    COIN_TIERS:[{cur:1,pts:[100,100],col:'#ffe46b'},{cur:2,pts:[200,200],col:'#ffe46b'},
                {cur:5,pts:[400,400],col:'#ffe46b'},{cur:20,pts:[900,900],col:'#9fe9ff',gem:1}],
    WEAPONS:{pulse:{name:'pulse',color:'#f0f'},scatter:{name:'scatter',color:'#ff0'},laser:{name:'laser',color:'#0ff'}},
    snd:{pickup(){},coin(){}}, rand:(a,b)=>(a+b)/2, TAU:Math.PI*2,
    part:(x,y)=>({x,y}), toast(t){ g._toasts.push(t); }, confetti(){}, boom(){},
    clamp:(v,a,b)=>Math.max(a,Math.min(b,v)), updateHUD(){}, scoreMul:1,
    _toasts:[], frenzy:0, flash:0, flashCol:'', shake(){}, floaters:[],
  };
  g.window=g; vm.createContext(g); new vm.Script(SRC).runInContext(g); return g;
}

console.log('\n=== Etapa 3: cadourile merg la nava care le-a atins ===');

// --- arma din cadou schimba doar nava care l-a cules ---
{
  const player=mkShip({}), p2=mkShip({});
  const g=ctx(player,p2);
  g.collect({x:0,y:0,type:'gift',weapon:'scatter'}, p2);
  ok(p2.weapon==='scatter', 'P2 primește arma din cadou: '+p2.weapon);
  ok(player.weapon==='pulse', 'gazda rămâne cu arma ei: '+player.weapon);
  ok(g._toasts[0].startsWith('P2 · '), 'anunțul spune a cui e cadoul: "'+g._toasts[0]+'"');
}
// --- nivelul creste doar la nava respectiva ---
{
  const player=mkShip({weapon:'scatter',lvl:Object.assign(mkShip({}).lvl,{scatter:4})});
  const p2=mkShip({weapon:'scatter',lvl:Object.assign(mkShip({}).lvl,{scatter:4})});
  const g=ctx(player,p2);
  g.collect({x:0,y:0,type:'gift',weapon:'scatter'}, player);
  ok(player.lvl.scatter===5&&p2.lvl.scatter===4, 'nivelul urcă doar la gazdă: '+player.lvl.scatter+' / '+p2.lvl.scatter);
}
// --- scut, magnet, viata, rachete, coleg ---
{
  const player=mkShip({}), p2=mkShip({});
  const g=ctx(player,p2);
  g.collect({x:0,y:0,type:'shield'}, p2);
  g.collect({x:0,y:0,type:'magnet'}, p2);
  g.collect({x:0,y:0,type:'life'}, p2);
  g.collect({x:0,y:0,type:'missile'}, p2);
  g.collect({x:0,y:0,type:'wing'}, p2);
  ok(p2.shield===9&&player.shield===0, 'scutul e al lui P2');
  ok(p2.magnet===9&&player.magnet===0, 'magnetul e al lui P2');
  ok(p2.lives===4&&player.lives===3, 'viața extra e a lui P2: '+p2.lives+' / '+player.lives);
  ok(p2.missiles===5&&player.missiles===3, 'rachetele sunt ale lui P2: '+p2.missiles+' / '+player.missiles);
  ok(p2.wingmen===1&&player.wingmen===0, 'colegul e al lui P2');
}
// --- monede: punga navei + totalul comun ---
{
  const player=mkShip({}), p2=mkShip({});
  const g=ctx(player,p2);
  g.collect({x:0,y:0,type:'coin',tier:0}, player);
  g.collect({x:0,y:0,type:'coin',tier:2}, p2);
  ok(player.coins===1&&p2.coins===5, 'fiecare navă își strânge monedele: '+player.coins+' / '+p2.coins);
  ok(g.runStats.coins===6, 'totalul rundei le însumează: '+g.runStats.coins);
  ok(player.score>0&&p2.score>0&&player.score!==p2.score, 'scorurile cresc separat: '+player.score+' / '+p2.score);
  ok(g.score===player.score+p2.score, 'scorul comun e suma celor două: '+g.score);
}
// --- un singur jucator: collect(p) fara nava merge la player ---
{
  const player=mkShip({}), p2=mkShip({});
  const g=ctx(player,p2);
  g.collect({x:0,y:0,type:'shield'});
  ok(player.shield===9&&p2.shield===0, 'apelul vechi collect(p) merge tot la jucător');
  ok(g._toasts[0].indexOf('P2')<0, 'și nu pune eticheta P2 pe anunț');
}
console.log('\n=== '+pass+' treceri, '+fail+' eșecuri ===');
process.exit(fail?1:0);

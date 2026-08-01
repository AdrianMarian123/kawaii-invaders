/**
 * Etapa 2: fiecare navă trage cu arma ei.
 * Extrage blocul REAL de tragere din index-ACTUAL-v66.html si il ruleaza pe stub-uri.
 */
'use strict';
const fs=require('fs'), path=require('path'), vm=require('vm');
const HTML=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const START='// ——— tragerea: o navă pe rând, fiecare cu arma ei ———';
const END='// PICKUPS';
const a=HTML.indexOf(START), b=HTML.indexOf(END,a);
if(a<0||b<0){ console.error('nu gasesc blocul de tragere'); process.exit(1); }
const SRC=HTML.slice(a,HTML.lastIndexOf('//====',b));
let pass=0,fail=0; const ok=(c,m)=>{c?(pass++,console.log('  OK  ',m)):(fail++,console.log('  FAIL',m));};

const mkShip=o=>Object.assign({x:300,y:1000,r:19,weapon:'pulse',
  lvl:{pulse:1,scatter:0,laser:0,arc:0,boomer:0,plasma:0,storm:0,wave:0,vulcan:0,rifle:0},
  fireT:0,burstT:0,wingmen:0,dead:false,fireMul:1,pierce:0,bulletR:0,aimRot:0,muzzle:0,wavePhase:0},o);

function ctx(over){
  const g={Math,JSON,console:{log(){},error(){}},
    bullets:[],enemies:[],zaps:[],particles:[],beams:[],
    frenzyT:0, bossIntro:0,
    net:{mode:'off'},
    WEAPONS:{pulse:{color:'#ff8fc7'},scatter:{color:'#ffe46b'},laser:{color:'#8fd3ff'},
             vulcan:{color:'#7dff9a'},rifle:{color:'#c07bff'},arc:{color:'#8fd3ff'},
             boomer:{color:'#ffce6a'},plasma:{color:'#b07bff'},storm:{color:'#8fd3ff'},wave:{color:'#9affc0'}},
    snd:{shoot(){},scatter(){},zap(){},bomb(){}},
    rand:(a,b)=>(a+b)/2, TAU:Math.PI*2,
    dist2:(x1,y1,x2,y2)=>(x1-x2)**2+(y1-y2)**2,
    damageEnemy(e,d){ e.taken=(e.taken||0)+d; },
    part:(x,y)=>({x,y}),
  };
  Object.assign(g,over); g.window=g; vm.createContext(g);
  new vm.Script(SRC).runInContext(g); return g;
}

console.log('\n=== Etapa 2: fiecare navă trage cu arma ei ===');

// --- 1. gazda cu laser + P2 cu scatter, simultan ---
{
  const player=mkShip({weapon:'laser',lvl:Object.assign(mkShip({}).lvl,{laser:3})});
  const p2=mkShip({x:500,weapon:'scatter',active:true,
    lvl:Object.assign(mkShip({}).lvl,{pulse:0,scatter:4})});
  const g=ctx({player,p2,net:{mode:'host'},enemies:[{x:300,y:400,r:20,dead:false}]});
  g.fireAllShips(0.5);
  const kinds=new Set(g.bullets.map(b=>b.wpn));
  ok(g.beams.length>0, 'gazda cu laser produce fascicule: '+g.beams.length);
  ok(kinds.has('scatter'), 'P2 cu scatter produce proiectile scatter: '+g.bullets.length);
  ok(!kinds.has('pulse'), 'niciun proiectil nu iese cu arma implicită a gazdei');
  ok(g.bullets.every(b=>Math.abs(b.x-500)<2), 'proiectilele lui P2 pleacă din poziția LUI (x=500)');
}

// --- 2. arme diferite, amandoua cu proiectile ---
{
  const player=mkShip({x:200,weapon:'pulse'});
  const p2=mkShip({x:600,weapon:'vulcan',active:true,
    lvl:Object.assign(mkShip({}).lvl,{pulse:0,vulcan:5})});
  const g=ctx({player,p2,net:{mode:'host'}});
  g.fireAllShips(0.5);
  const byW={}; g.bullets.forEach(b=>byW[b.wpn]=(byW[b.wpn]||0)+1);
  ok(byW.pulse>0&&byW.vulcan>0, 'ambele arme trag în același cadru: '+JSON.stringify(byW));
  ok(g.bullets.filter(b=>b.wpn==='pulse').every(b=>Math.abs(b.x-200)<2), 'pulse pleacă de la gazdă');
  ok(g.bullets.filter(b=>b.wpn==='vulcan').every(b=>Math.abs(b.x-600)<2), 'vulcan pleacă de la P2');
}

// --- 3. catelusii raman la nava lor ---
{
  const player=mkShip({x:200,wingmen:2});
  const p2=mkShip({x:600,active:true,wingmen:0});
  const g=ctx({player,p2,net:{mode:'host'}});
  g.fireAllShips(0.5);
  const xs=[...new Set(g.bullets.map(b=>Math.round(b.x)))].sort((a,b)=>a-b);
  ok(xs.includes(156)&&xs.includes(244), 'catelușii gazdei trag lângă gazdă (156/244): '+xs.join(','));
  ok(!xs.includes(556)&&!xs.includes(644), 'P2 fără cateluși nu capătă niciunul');
}

// --- 4. nivelul armei e al fiecaruia ---
{
  const player=mkShip({x:200,weapon:'scatter',lvl:Object.assign(mkShip({}).lvl,{pulse:0,scatter:1})});
  const p2=mkShip({x:600,active:true,weapon:'scatter',lvl:Object.assign(mkShip({}).lvl,{pulse:0,scatter:9})});
  const g=ctx({player,p2,net:{mode:'host'}});
  g.fireAllShips(0.5);
  const nH=g.bullets.filter(b=>b.x<400).length, nP=g.bullets.filter(b=>b.x>400).length;
  ok(nP>nH, 'P2 la nivel 9 trage mai multe gloanțe decât gazda la nivel 1: '+nP+' vs '+nH);
}

// --- 5. un singur jucator: nimic nu se schimba ---
{
  const player=mkShip({x:200,weapon:'pulse'});
  const p2=mkShip({x:600,active:false});
  const g=ctx({player,p2,net:{mode:'off'}});
  g.fireAllShips(0.5);
  ok(g.activeShips().length===1, 'la un jucător lista de nave are exact un element');
  ok(g.bullets.length>0&&g.bullets.every(b=>Math.abs(b.x-200)<2), 'toate proiectilele pleacă de la jucător');
}

// --- 6. nava moarta nu trage ---
{
  const player=mkShip({x:200,dead:true});
  const p2=mkShip({x:600,active:true,weapon:'scatter',lvl:Object.assign(mkShip({}).lvl,{pulse:0,scatter:3})});
  const g=ctx({player,p2,net:{mode:'host'}});
  g.fireAllShips(0.5);
  ok(g.bullets.length>0, 'P2 continuă să tragă după moartea gazdei');
  ok(g.bullets.every(b=>b.wpn==='scatter'), 'și trage cu arma LUI, nu cu a gazdei moarte');

  const g2=ctx({player:mkShip({x:200}),p2:mkShip({x:600,active:true,dead:true}),net:{mode:'host'}});
  g2.fireAllShips(0.5);
  ok(g2.bullets.every(b=>Math.abs(b.x-200)<2), 'un P2 mort nu mai scoate niciun proiectil');
}

// --- 7. perforarea / raza sunt ale navei care a tras ---
{
  const player=mkShip({x:200,pierce:0,bulletR:0});
  const p2=mkShip({x:600,active:true,pierce:3,bulletR:4});
  const g=ctx({player,p2,net:{mode:'host'}});
  g.fireAllShips(0.5);
  const h=g.bullets.find(b=>b.x<400), p=g.bullets.find(b=>b.x>400);
  ok(h.pierce===0&&p.pierce===3, 'perforarea vine de la nava care a tras: '+h.pierce+' / '+p.pierce);
  ok(p.r-h.r===4, 'raza bonus la fel: +'+(p.r-h.r));
}

// --- 8. cinematicul de boss opreste tot ---
{
  const g=ctx({player:mkShip({x:200}),p2:mkShip({x:600,active:true}),net:{mode:'host'},bossIntro:2});
  g.fireAllShips(0.5);
  ok(g.bullets.length===0&&g.beams.length===0, 'nimeni nu trage în cinematicul de boss');
}

console.log('\n=== '+pass+' treceri, '+fail+' eșecuri ===');
process.exit(fail?1:0);

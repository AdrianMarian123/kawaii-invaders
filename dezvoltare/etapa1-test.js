const fs=require('fs'),vm=require('vm');
const H=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const A=H.indexOf('// ================= ONLINE CO-OP'), B=H.indexOf('function update(dt){',A);
const SRC=H.slice(A,B);
let pass=0,fail=0; const ok=(c,m)=>{c?(pass++,console.log('  OK  ',m)):(fail++,console.log('  FAIL',m));};

const g={console:{log(){},error(){},warn(){}},Math,JSON,performance,setTimeout,clearTimeout,
  W:720,H:1280,TAU:Math.PI*2,INTRO_DUR:2,
  net:{mode:'host',ws:null,role:'host',connected:true,sendT:0},
  p2:{x:360,y:1150,r:19,active:true,weapon:'pulse',lvl:{pulse:1},fireT:0,missiles:3,burst:1,
      wingmen:0,shield:0,magnet:0,invuln:0,lives:3,dead:false,deadT:0,score:0,coins:0,tilt:0},
  player:{x:360,y:1150,r:19,lives:3,dead:false,deadT:0,shield:0,invuln:0,weapon:'pulse',lvl:{pulse:1}},
  score:0,combo:0,mult:1,state:'playing',wave:1,coins:0,
  snd:{hurt(){},pickup(){},shoot(){}}, floater(){}, shake(){}, boom(){}, toast(){}, updateHUD(){},
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)), el:()=>({textContent:'',value:'',style:{},classList:{add(){},remove(){}},addEventListener(){},focus(){},blur(){},scrollIntoView(){},querySelectorAll:()=>[]}),
  ui:new Proxy({},{get:()=>({classList:{add(){},remove(){}},style:{},textContent:''})}),
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}}, location:{search:''},
  runStats:{coins:0,maxWave:0,kills:0,maxMult:1,missiles:0,bossKills:0},
  WEAPONS:{pulse:{color:'#f0f'}}, sprite:()=>null, ctx:null, saveCoins(){}, coopView:{}, NET_STEP:0.1,
  bullets:[],enemies:[],eBullets:[],pickups:[],particles:[],beams:[],
};
g.window=g; vm.createContext(g); new vm.Script(SRC).runInContext(g);
const {p2,player}=g;

console.log('\n=== Etapa 1: P2 e navă adevărată ===');
g.hitTeam(p2);
ok(p2.lives===2 && player.lives===3, 'lovitura scade viețile lui P2, nu ale gazdei ('+p2.lives+' vs '+player.lives+')');
ok(p2.invuln>0, 'P2 primește invulnerabilitate proprie');
p2.invuln=0; g.hitTeam(p2);
p2.invuln=0; g.hitTeam(p2);
ok(p2.lives<=0 && p2.dead===true, 'P2 rămâne fără vieți → p2.dead');
ok(p2.deadT>0, 'P2 are propriul cronometru de moarte');
ok(player.dead===false && player.lives===3, 'gazda e neatinsă și joacă mai departe');

// scut propriu
p2.dead=false; p2.deadT=0; p2.lives=3; p2.invuln=0; p2.shield=1; player.shield=0;
g.hitTeam(p2);
ok(p2.shield===0 && p2.lives===3 && player.shield===0, 'scutul consumat e al lui P2, nu al gazdei');

// gazda lovită nu atinge P2
p2.invuln=0; p2.lives=3; player.invuln=0; player.lives=3;
g.hitTeam(player);
ok(player.lives===2 && p2.lives===3, 'gazda lovită prin hitTeam nu scade viețile lui P2');

// nava moartă nu mai e desenată
p2.dead=true; p2.deadT=0.1; let drawn=false;
g.sprite=()=>({}); g.ctx=new Proxy({},{get:()=>()=>{drawn=true;}});
g.drawP2(); ok(drawn===false, 'nava moartă nu mai e desenată');

// mesajele oaspetelui nu mai mișcă o navă moartă
const x0=p2.x; g.onNetData({t:'in',nx:0.1,ny:0.9});
ok(p2.x===x0, 'poziția unui P2 mort nu mai e actualizată');

console.log('\n=== '+pass+' treceri, '+fail+' eșecuri ===');
process.exit(fail?1:0);

// Averea persistenta a jucatorului: banca de monede/diamante, magazinul
// de cosmetice, recompensa zilnica cu serie, misiunile zilei si moderatorul
// zilnic. Tot ce supravietuieste intre runde, salvat in localStorage.
import { CRITCOL } from './config.js';
import { TAU, el, ui } from './utils.js';
import { audioInit, snd } from './audio.js';
import { ctx, setCtx, sprite } from './canvas.js';
import { runStats } from './achievements.js';
import { boltSpr, candySpr, drawCritter, hexA, shade, shipSkinCanvas } from '../render/draw.js';
import { player, toast } from './sim.js';

// ——— persistent meta: coin bank, cosmetics shop, daily streak & missions ———
let coins=0; try{coins=Number(localStorage.getItem('ki_coins')||0);}catch(e){}
let gems=0;  try{gems=Number(localStorage.getItem('ki_gems')||0);}catch(e){}
const COSMETICS={
  power:[ {id:'w_vulcan', n:'Vulcan',        ic:'🌿', price:900,  desc:'evantai verde, foc rapid — curăță valurile'},
          {id:'w_rifle',  n:'Plasmă+',       ic:'🔮', price:1200, desc:'gloanțe uriașe, foc lent — anti-boss'},
          {id:'i_luck',   n:'Talisman Noroc',ic:'🍀', price:800,  desc:'mai multe monede și diamante'} ],
  fleet:[ {id:'s_vortex',  n:'Vortex',     ic:'🛸', gem:12, desc:'foc foarte rapid + 3 coechipieri'},
          {id:'s_fortress',n:'Fortăreața', ic:'🛡️', gem:15, desc:'8 vieți, scut, gloanțe uriașe'},
          {id:'s_nova',    n:'Nova',       ic:'☄️', gem:18, desc:'daune ×2 și perforare 3'} ],
  aura:[ {id:'a_default',n:'Clasic',price:0,col:null},
         {id:'a_pink',n:'Roz Bomboană',price:60,col:'#ff8fc7'},
         {id:'a_gold',n:'Aur Regal',price:120,col:'#ffd24a'},
         {id:'a_cyan',n:'Val Oceanic',price:120,col:'#7fe1ff'},
         {id:'a_violet',n:'Ametist',price:180,col:'#b07bff'},
         {id:'a_emerald',n:'Smarald',price:180,col:'#7ef9d2'},
         {id:'a_rainbow',n:'Curcubeu ✨',price:500,col:'rainbow'} ],
  trail:[ {id:'t_default',n:'Standard',price:0,col:null},
          {id:'t_neon',n:'Neon Roz',price:80,col:'#ff5fbf'},
          {id:'t_sun',n:'Solar',price:120,col:'#ffd24a'},
          {id:'t_ice',n:'Gheață',price:120,col:'#9fe9ff'},
          {id:'t_toxic',n:'Toxic',price:180,col:'#9aff6a'},
          {id:'t_rainbow',n:'Curcubeu ✨',price:450,col:'rainbow'} ],
  theme:[ {id:'th_default',n:'Bomboană',price:0,col:'#ff8fc7'},
          {id:'th_gold',n:'Auriu',price:150,col:'#ffd24a'},
          {id:'th_mint',n:'Mentă',price:150,col:'#7ef9d2'},
          {id:'th_grape',n:'Strugure',price:150,col:'#b07bff'},
          {id:'th_sky',n:'Cer',price:150,col:'#7fbaff'} ],
  ship:[  {id:'s_default',n:'Clasic',price:0,col:null},
          {id:'s_rose',n:'Trandafir',price:150,col:'#ff8fc7'},
          {id:'s_cyan',n:'Cyber-Cyan',price:300,col:'#5fe1ff'},
          {id:'s_gold',n:'Aur Regal',price:300,col:'#ffd24a'},
          {id:'s_galaxy',n:'Galaxie',price:500,col:'#b07bff'},
          {id:'s_shadow',n:'Umbră',price:500,col:'#3a2b5e'},
          {id:'s_rainbow',n:'Curcubeu ✨',price:800,col:'rainbow'} ],
  wing:[  {id:'w_default',n:'Roz Clasic',price:0,col:'#ff9ec4'},
          {id:'w_blue',n:'Bleu',price:120,col:'#7fbaff'},
          {id:'w_mint',n:'Mentă',price:200,col:'#7ef9d2'},
          {id:'w_gold',n:'Aurii',price:250,col:'#ffd24a'},
          {id:'w_violet',n:'Mov',price:250,col:'#c89bff'},
          {id:'w_shadow',n:'Ninja',price:350,col:'#42406a'} ],
  enemy:[ {id:'e_default',n:'Clasic',price:0,col:null},
          {id:'e_rose',n:'Bomboană',price:300,col:'#ff8fc7'},
          {id:'e_ice',n:'Înghețați',price:300,col:'#9fe9ff'},
          {id:'e_neon',n:'Neon',price:400,col:'#9aff6a'},
          {id:'e_gold',n:'Aurii',price:450,col:'#ffd24a'},
          {id:'e_shadow',n:'Umbre',price:500,col:'#2a1a3a'} ],
  weapon:[{id:'wp_default',n:'Capsulă',price:0,shape:'caps',col:null},
          {id:'wp_orb',n:'Sferă',price:350,shape:'orb',col:null},
          {id:'wp_star',n:'Stelar',price:450,shape:'star',col:'#ffe46b'},
          {id:'wp_heart',n:'Inimioară',price:450,shape:'heart',col:'#ff6fae'},
          {id:'wp_petal',n:'Petală',price:550,shape:'petal',col:'#ffb7de'} ],
};
const COSM_DEFAULTS={aura:'a_default',trail:'t_default',theme:'th_default',ship:'s_default',wing:'w_default',enemy:'e_default',weapon:'wp_default'};
let shop={owned:{a_default:1,t_default:1,th_default:1,s_default:1,w_default:1,e_default:1,wp_default:1},equip:Object.assign({},COSM_DEFAULTS)};
try{const sv=JSON.parse(localStorage.getItem('ki_shop')||'null'); if(sv&&sv.owned&&sv.equip){shop=sv; for(const k in COSM_DEFAULTS){ shop.owned[COSM_DEFAULTS[k]]=1; if(!shop.equip[k])shop.equip[k]=COSM_DEFAULTS[k]; } }}catch(e){}
let dailyMeta={last:'',streak:0,best:0}; try{const d=JSON.parse(localStorage.getItem('ki_daily')||'null'); if(d)dailyMeta=d;}catch(e){}
let missionMeta={day:'',ids:[],done:[]}; try{const m=JSON.parse(localStorage.getItem('ki_missions')||'null'); if(m)missionMeta=m;}catch(e){}
function saveCoins(){ try{localStorage.setItem('ki_coins',coins);}catch(e){} }
function saveGems(){ try{localStorage.setItem('ki_gems',gems);}catch(e){} }
function addGems(n){ gems=Math.max(0,gems+n); saveGems(); updateCoinUI(); }
function hasLuck(){ return !!shop.owned.i_luck; }
function saveShop(){ try{localStorage.setItem('ki_shop',JSON.stringify(shop));}catch(e){} }
function saveDaily(){ try{localStorage.setItem('ki_daily',JSON.stringify(dailyMeta));}catch(e){} }
function saveMissions(){ try{localStorage.setItem('ki_missions',JSON.stringify(missionMeta));}catch(e){} }
function addCoins(n){ coins=Math.max(0,coins+n); saveCoins(); updateCoinUI(); }
function cosmItem(cat,id){ return (COSMETICS[cat]||[]).find(x=>x.id===id)||null; }
function equippedAura(){ const it=cosmItem('aura',shop.equip.aura); return it?it.col:null; }
function equippedTrail(){ const it=cosmItem('trail',shop.equip.trail); return it?it.col:null; }
function equippedShip(){ return cosmItem('ship',shop.equip.ship); }
function equippedWing(){ const it=cosmItem('wing',shop.equip.wing); return it&&it.col?it.col:'#ff9ec4'; }
function equippedEnemy(){ const it=cosmItem('enemy',shop.equip.enemy); return it&&it.col?it.col:null; }
function equippedWeapon(){ return cosmItem('weapon',shop.equip.weapon)||{shape:'caps',col:null}; }
function _h2r(h){ h=h.replace('#',''); if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2]; return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; }
function mixCol(a,b,t){ const x=_h2r(a),y=_h2r(b); const c=i=>Math.round(x[i]+(y[i]-x[i])*t).toString(16).padStart(2,'0'); return '#'+c(0)+c(1)+c(2); }
function critCol(type){ const base=CRITCOL[type]||'#e8a0c0'; const sk=equippedEnemy(); if(!sk)return base;
  const id=shop.equip.enemy;
  if(id==='e_shadow')return mixCol(base,'#241833',0.62);
  if(id==='e_gold')return mixCol(base,'#ffd24a',0.66);
  if(id==='e_ice')return mixCol(base,'#bfeaff',0.6);
  if(id==='e_rose')return mixCol(base,'#ff8fc7',0.58);
  if(id==='e_neon')return mixCol(base,'#9aff6a',0.5);
  return base; }
function todayKey(){ const d=new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
function rainbowCol(t){ return 'hsl('+Math.floor((t*90)%360)+',90%,68%)'; }
function updateCoinUI(){ document.querySelectorAll('.coinAmt').forEach(e=>e.textContent=coins.toLocaleString());
  document.querySelectorAll('.gemAmt').forEach(e=>e.textContent=gems.toLocaleString()); }

// ——— daily modifiers (applied to the seeded daily challenge; same for everyone that day) ———
const DAILY_MODS=[
  {id:'none',  n:'Standard',      d:'runda clasică, fără modificări',                     apply:()=>{}},
  {id:'glass', n:'Navă de Sticlă',d:'o singură viață, dar daune ×1.6',                    apply:()=>{player.lives=1;player.dmgMul=(player.dmgMul||1)*1.6;}},
  {id:'rich',  n:'Ploaie de Aur', d:'monede ×2 din toată runda',                          apply:()=>{}},
  {id:'haste', n:'Turbo',         d:'mișcare & tragere mai rapide',                       apply:()=>{player.spdMul=(player.spdMul||1)*1.18;player.fireMul=(player.fireMul||1)*0.82;}},
  {id:'sniper',n:'Ochitor',       d:'perforare +1 și daune ×1.35, dar foc mai lent',      apply:()=>{player.pierce=(player.pierce||0)+1;player.dmgMul=(player.dmgMul||1)*1.35;player.fireMul=(player.fireMul||1)*1.25;}},
];
function dayNum(){ const d=new Date(); return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate(); }
function todaysMod(){ return DAILY_MODS[dayNum()%DAILY_MODS.length]; }

// ——— daily missions (evaluated against this run's stats at game over) ———
const MISSIONS=[
  {id:'wave10', n:'Ajunge la valul 10',        r:50, test:s=>Math.max(s.maxWave,0)>=10},
  {id:'wave15', n:'Ajunge la valul 15',        r:80, test:s=>Math.max(s.maxWave,0)>=15},
  {id:'boss1',  n:'Învinge un boss',           r:60, test:s=>(s.bossKills||0)>=1},
  {id:'kills60',n:'Doboară 60 de inamici',     r:50, test:s=>(s.kills||0)>=60},
  {id:'coins50',n:'Adună 50 de monede într-o rundă', r:40, test:s=>(s.coins||0)>=50},
  {id:'graze30',n:'Razant de 30 de ori ⚡',     r:60, test:s=>(s.graze||0)>=30},
  {id:'combo15',n:'Atinge combo ×15',          r:50, test:s=>(s.maxMult||1)>=15},
  {id:'clean3', n:'Treci 3 valuri fără lovitură', r:70, test:s=>(s.noHitWaves||0)>=3},
];
function pickDailyMissions(){
  let s=(dayNum()||1)>>>0; const rnd=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
  const pool=MISSIONS.slice(); const out=[];
  for(let i=0;i<3&&pool.length;i++){ out.push(pool.splice(Math.floor(rnd()*pool.length),1)[0].id); }
  return out;
}
function ensureDailyMissions(){ const tk=todayKey();
  if(missionMeta.day!==tk){ missionMeta={day:tk, ids:pickDailyMissions(), done:[]}; saveMissions(); } }
function evalMissions(){ ensureDailyMissions(); let earned=0, names=[];
  for(const id of missionMeta.ids){ if(missionMeta.done.indexOf(id)>=0)continue;
    const m=MISSIONS.find(x=>x.id===id); if(m&&m.test(runStats)){ missionMeta.done.push(id); earned+=m.r; names.push(m.n); } }
  if(earned>0){ addCoins(earned); saveMissions();
    setTimeout(()=>toast('🎯 misiune gata! +'+earned+' 🪙',' #ffd24a'),900); }
  renderDaily();
}

// ——— daily login reward + streak ———
function checkDailyLogin(){ ensureDailyMissions(); const tk=todayKey();
  if(dailyMeta.last!==tk){
    // streak: consecutive if last login was yesterday
    const y=new Date(); y.setDate(y.getDate()-1); const yk=y.getFullYear()+'-'+(y.getMonth()+1)+'-'+y.getDate();
    dailyMeta.streak=(dailyMeta.last===yk)?(dailyMeta.streak||0)+1:1;
    dailyMeta.last=tk; saveDaily();
    const reward=Math.min(25+(dailyMeta.streak-1)*10,120);   // grows with streak, capped at 120/day
    addCoins(reward);
    showDailyReward(reward,dailyMeta.streak);
  }
  renderDaily();
}
function showDailyReward(amount,streak){ const box=el('dailyReward'); if(!box){ toast('🎁 bonus zilnic +'+amount+' 🪙','#ffd24a'); return; }
  el('drAmount').textContent='+'+amount+' 🪙';
  el('drStreak').textContent='🔥 serie de '+streak+' '+(streak===1?'zi':'zile');
  box.classList.remove('hide'); if(snd&&snd.pickup)snd.pickup(); }

// ——— render the daily panel (missions + modifier) on the menu ———
function renderDaily(){ const mo=todaysMod();
  const me=el('dailyModName'); if(me){ me.textContent=mo.n; el('dailyModDesc').textContent=mo.d; }
  const ml=el('missionList'); if(ml){ ensureDailyMissions(); ml.innerHTML='';
    for(const id of missionMeta.ids){ const m=MISSIONS.find(x=>x.id===id); if(!m)continue;
      const done=missionMeta.done.indexOf(id)>=0;
      const row=document.createElement('div'); row.className='mrow'+(done?' done':'');
      row.innerHTML='<span class="mck">'+(done?'✅':'⬜')+'</span><span class="mtx">'+m.n+'</span><span class="mrw">+'+m.r+' 🪙</span>';
      ml.appendChild(row); }
  }
  const st=el('streakLine'); if(st)st.textContent='🔥 serie: '+(dailyMeta.streak||0)+' · 📅 record zilnic: '+(dailyMeta.best||0).toLocaleString();
  ensureDailyMissions();
  const dm=el('dsMod'); if(dm)dm.textContent=mo.n;
  const dp=el('dsProg'); if(dp)dp.textContent=(missionMeta.done.length)+'/'+missionMeta.ids.length;
  const ds=el('dsStreak'); if(ds)ds.textContent=(dailyMeta.streak||0);
  updateCoinUI();
}

// ——— cosmetics shop ———
let shopTab='aura';
const SHOP_TABS=[['power','⚡ Arme & Boost'],['fleet','💎 Nave'],['ship','Aspect navă'],['weapon','Arme'],['enemy','Monștri'],['wing','Coechipieri'],['aura','Aure'],['trail','Dâre'],['theme','Teme']];
function openShop(){ audioInit&&audioInit(); ui.menu.classList.add('hide'); el('shop').classList.remove('hide'); renderShop(); }
function closeShop(){ el('shop').classList.add('hide'); ui.menu.classList.remove('hide'); }
const _pvCache=new Map();
function drawMiniCat(g,x,y,r,col){ g.fillStyle=col; g.beginPath(); g.arc(x,y,r,0,TAU); g.fill();
  g.beginPath(); g.moveTo(x-r*0.7,y-r*0.5); g.lineTo(x-r*0.35,y-r*1.25); g.lineTo(x-r*0.05,y-r*0.6);
  g.moveTo(x+r*0.7,y-r*0.5); g.lineTo(x+r*0.35,y-r*1.25); g.lineTo(x+r*0.05,y-r*0.6); g.fill();
  g.fillStyle='#241a2e'; g.beginPath(); g.arc(x-r*0.32,y-r*0.05,r*0.11,0,TAU); g.arc(x+r*0.32,y-r*0.05,r*0.11,0,TAU); g.fill();
  g.fillStyle='rgba(255,140,170,.8)'; g.beginPath(); g.arc(x-r*0.5,y+r*0.28,r*0.14,0,TAU); g.arc(x+r*0.5,y+r*0.28,r*0.14,0,TAU); g.fill(); }
function shopPreview(cat,it){ const key=cat+':'+it.id; if(_pvCache.has(key))return _pvCache.get(key);
  if(cat==='power'||cat==='fleet'){ const cvi=document.createElement('canvas'); cvi.width=cvi.height=76; const gi=cvi.getContext('2d');
    const gr=gi.createRadialGradient(38,30,4,38,38,40);
    gr.addColorStop(0,cat==='fleet'?'rgba(159,233,255,.55)':'rgba(255,214,107,.5)'); gr.addColorStop(1,'rgba(255,255,255,0)');
    gi.fillStyle=gr; gi.fillRect(0,0,76,76);
    gi.font='42px serif'; gi.textAlign='center'; gi.textBaseline='middle';
    try{ gi.fillText(it.ic||'❓',38,42); }catch(e){}
    _pvCache.set(key,cvi); return cvi; }
  const cvp=document.createElement('canvas'); cvp.width=cvp.height=76; const g=cvp.getContext('2d');
  let cacheable=true; const RB='rainbow';
  const rbBack=()=>{ const gr=g.createLinearGradient(0,0,76,76); ['#ff5fbf','#ffd24a','#7fe1ff','#9aff6a','#b07bff'].forEach((c,i)=>gr.addColorStop(i/4,c)); g.globalAlpha=.3; g.fillStyle=gr; g.fillRect(0,0,76,76); g.globalAlpha=1; };
  try{
    if(cat==='ship'){ const im=sprite('ship');
      if(it.col===RB)rbBack();
      if(im&&im.width){ const c=(it.col&&it.col!==RB)?it.col:null; const img=c?shipSkinCanvas(im,c):im; g.drawImage(img,10,10,56,56); }
      else{ cacheable=false; g.fillStyle=(it.col&&it.col!==RB)?it.col:'#ffd9ec'; g.beginPath(); g.moveTo(38,14); g.lineTo(58,60); g.lineTo(18,60); g.closePath(); g.fill(); }
    } else if(cat==='enemy'){ const keep=shop.equip.enemy; shop.equip.enemy=it.id; const old=ctx; setCtx(g);
      try{ drawCritter(38,42,24,'bird',0,false,false,null); }catch(e){ cacheable=false; } setCtx(old); shop.equip.enemy=keep;
    } else if(cat==='wing'){ let c=it.col; if(c===RB){ rbBack(); c='#fff'; } drawMiniCat(g,38,42,20,c||'#fff');
    } else if(cat==='weapon'){ const keep=shop.equip.weapon; shop.equip.weapon=it.id;
      try{ g.drawImage(boltSpr(it.col||'#ff8fc7'),16,4,44,68); }catch(e){ cacheable=false; } shop.equip.weapon=keep;
    } else if(cat==='aura'){ let c=it.col;
      if(c===RB){ for(let i=0;i<12;i++){ const a=i/12*TAU; g.fillStyle='hsl('+(i*30)+',90%,65%)'; g.beginPath(); g.arc(38+Math.cos(a)*27,38+Math.sin(a)*27,4,0,TAU); g.fill(); } c=null; }
      if(c){ const gr=g.createRadialGradient(38,38,4,38,38,30); gr.addColorStop(0,hexA(c,.75)); gr.addColorStop(1,hexA(c,0)); g.fillStyle=gr; g.beginPath(); g.arc(38,38,30,0,TAU); g.fill(); }
      const im=sprite('ship'); if(im&&im.width)g.drawImage(im,20,20,36,36); else cacheable=false;
    } else if(cat==='trail'){ let stroke=it.col||'#ffb9dd';
      if(it.col===RB){ const gr=g.createLinearGradient(10,62,58,18); ['#ff5fbf','#ffd24a','#7fe1ff','#b07bff'].forEach((cc,i)=>gr.addColorStop(i/3,cc)); stroke=gr; }
      g.lineCap='round'; g.lineWidth=9; g.globalAlpha=.85; g.strokeStyle=stroke; g.beginPath(); g.moveTo(14,62); g.lineTo(50,24); g.stroke(); g.globalAlpha=1;
      try{ g.drawImage(candySpr('#ff8fc7'),38,4,32,38); }catch(e){}
    } else { const base=it.col||'#ff8fc7'; const gr=g.createLinearGradient(0,0,76,76); gr.addColorStop(0,base); gr.addColorStop(1,shade(base));
      g.fillStyle=gr; g.beginPath(); g.arc(38,38,26,0,TAU); g.fill();
      g.fillStyle='rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(30,28,8,5,-0.6,0,TAU); g.fill(); }
  }catch(e){ cacheable=false; }
  if(cacheable)_pvCache.set(key,cvp); return cvp; }
function renderShop(){ updateCoinUI();
  const OWN_ONLY={power:1,fleet:1};
  const tb=el('shopTabs'); if(tb){ tb.innerHTML='';
    for(const [k,label] of SHOP_TABS){ const b=document.createElement('button'); b.className='shoptab'+(shopTab===k?' on':'');
      b.textContent=label; b.onclick=()=>{shopTab=k; renderShop();}; tb.appendChild(b); } }
  const grid=el('shopGrid'); if(!grid)return; grid.innerHTML='';
  for(const it of COSMETICS[shopTab]){
    const owned=!!shop.owned[it.id], equipped=!OWN_ONLY[shopTab] && shop.equip[shopTab]===it.id;
    const useGem=!!it.gem, cost=useGem?it.gem:it.price, have=useGem?gems:coins;
    const card=document.createElement('div'); card.className='shopcard'+(equipped?' eq':'')+(useGem?' gem':'');
    const swd=document.createElement('div'); swd.className='sw pv'; swd.appendChild(shopPreview(shopTab,it)); card.appendChild(swd);
    const nm=document.createElement('div'); nm.className='sname'; nm.textContent=it.n; card.appendChild(nm);
    if(it.desc){ const d=document.createElement('div'); d.className='sdesc'; d.textContent=it.desc; card.appendChild(d); }
    const b=document.createElement('button');
    if(equipped){ b.className='sbtn on'; b.textContent='echipat ✓'; b.disabled=true; }
    else if(owned&&OWN_ONLY[shopTab]){ b.className='sbtn on'; b.textContent='deținut ✓'; b.disabled=true; }
    else if(owned){ b.className='sbtn eqbtn'; b.textContent='echipează'; }
    else { b.className='sbtn buy'+(have<cost?' cant':''); b.textContent=cost+(useGem?' 💎':' 🪙'); }
    if(!b.disabled) b.onclick=()=>{
      if(owned){ shop.equip[shopTab]=it.id; saveShop(); if(shopTab==='theme')applyTheme(); if(snd&&snd.pickup)snd.pickup(); renderShop(); }
      else if(have>=cost){
        if(useGem){ gems-=cost; saveGems(); } else { coins-=cost; saveCoins(); }
        shop.owned[it.id]=1;
        if(!OWN_ONLY[shopTab]) shop.equip[shopTab]=it.id;
        saveShop(); if(shopTab==='theme')applyTheme(); if(snd&&snd.coin)snd.coin();
        toast((OWN_ONLY[shopTab]?'✨ ':'🛍️ ')+it.n+' deblocat!','#ffd24a'); renderShop();
      }
      else toast(useGem?'💎 nu ai destule diamante':'🪙 nu ai destule monede','#ff8fc7');
    };
    card.appendChild(b); grid.appendChild(card);
  }
}
function applyTheme(){ const it=cosmItem('theme',shop.equip.theme); if(!it||!it.col)return;
  try{ document.documentElement.style.setProperty('--pink',it.col); }catch(e){} }

export { addCoins, addGems, applyTheme, checkDailyLogin, closeShop, coins, critCol, dailyMeta, equippedAura, equippedShip, equippedTrail, equippedWeapon, equippedWing, evalMissions, hasLuck, openShop, rainbowCol, renderDaily, saveDaily, shop, todaysMod, updateCoinUI };

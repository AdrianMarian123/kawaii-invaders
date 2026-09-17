// Nucleul jocului. Provine din vechiul <script> din index.html; se sparge
// treptat in module (vezi src/game/, src/render/, src/net/).
//==================================================================
// CANVAS / SETUP
//==================================================================
import { keys, pointer } from './ui-screens.js';

import { myScore, updateHUD } from './hud.js';

import { boltSpr, candySpr, draw, drawCritter, drawP2, hexA, lightenHex, rr, shade, shatterBubble, shipSkinCanvas, ufoBreak } from '../render/draw.js';

import { getRelay, normRelay, refreshRelayUI, relayHint, relayIsSet, saveRelayFromField, setRelay, showCoopIntro, showRelayBox } from '../net/relay-config.js';

import { applyMenuTheme, menuTheme, setMenuTheme } from './menu-theme.js';

import { ACHV, achv, checkAchv, runStats } from './achievements.js';

import { addCoins, addGems, applyTheme, checkDailyLogin, closeShop, coins, critCol, dailyMeta, equippedAura, equippedShip, equippedTrail, equippedWeapon, equippedWing, evalMissions, hasLuck, openShop, rainbowCol, renderDaily, saveDaily, shop, todaysMod, updateCoinUI } from './meta.js';

import { audioInit, musApply, musNextTrack, musTogglePlay, snd, toggleMute, tone } from './audio.js';

import { GS, H, SPRITES, W, applyAspect, bgImg, ctx, cv, gctx, gcv, setCtx, updateGfxUI } from './canvas.js';

import { TAU, clamp, dist2, el, hooks, lerp, rand, randi, ui } from './utils.js';

import { BEAST, BOSS_NAME, CRITCOL, CRITTERS, EVENT_NAME, LCOLS, SECTORS, STORY, WEAK, WEAPONS, XCOLS } from './config.js';



//==================================================================
// AUDIO (procedural)
//==================================================================
//==================================================================
// STATE
//==================================================================
let state='menu';
let score=0, best=0; try{best=Number(localStorage.getItem('ki_best')||0);}catch(e){}
let bestHc=0; try{bestHc=Number(localStorage.getItem('ki_best_hc')||0);}catch(e){}
let hardcore=false, scoreMul=1, fireFreqMul=1;
let daily=false, dailySeed=0; const _origRandom=Math.random;
let dailyMod=null;
let wave=0, waveActive=false, betweenT=0, spawnQ=[], spawnIx=0, formBag=[];
let combo=0, comboT=0, mult=1;
let frenzy=0, frenzyT=0;  // FRENEZIE: fills with kills, then a short overdrive burst
let shakeT=0, shakeMag=0, flash=0, flashCol='#fff', hitstop=0;

let runAchvNew=[];
let bgScroll=0, bonusMode=false, gravityMode=false, raidMode=false, bonusT=0, bonusSpawned=0, bonusType='ufo';
let bossIntro=0, introBoss=null; const INTRO_DUR=3.4; const TRAVEL_DUR=3.0;

const player={x:0,y:0,r:19,weapon:'pulse',lvl:{pulse:1,scatter:0,laser:0,arc:0,boomer:0,plasma:0,storm:0,wave:0,vulcan:0,rifle:0},
  fireT:0,missiles:3,burst:1,burstT:0,wingmen:0,shield:0,magnet:0,invuln:0,lives:3,dead:false,deadT:0,
  fireMul:1,dmgMul:1,spdMul:1,pierce:0,guard:0,bulletR:0,perks:[],
  vx:0,tilt:0,prevx:0,aimRot:0};
// P2 e o navă adevărată, cu aceeași formă ca `player` — vieți, armă și nivel proprii.
let p2={x:0,y:0,r:19,active:false,weapon:'pulse',lvl:{pulse:1,scatter:0,laser:0,arc:0,boomer:0,plasma:0,storm:0,wave:0,vulcan:0,rifle:0},
  fireT:0,missiles:3,burst:1,burstT:0,wingmen:0,shield:0,magnet:0,invuln:0,lives:3,dead:false,deadT:0,
  fireMul:1,dmgMul:1,spdMul:1,pierce:0,guard:0,bulletR:0,muzzle:0,aimRot:0,wavePhase:0,perks:[],
  score:0,coins:0,tilt:0,nextLife:100000,nextBurst:150000,hitThisWave:false};
function resetP2(){ Object.assign(p2,{x:W/2,y:H-130,r:19,weapon:'pulse',
  lvl:{pulse:1,scatter:0,laser:0,arc:0,boomer:0,plasma:0,storm:0,wave:0,vulcan:0,rifle:0},
  fireT:0,missiles:3,burst:1,burstT:0,wingmen:0,shield:0,magnet:0,invuln:2.5,lives:3,dead:false,deadT:0,
  fireMul:1,dmgMul:1,spdMul:1,pierce:0,guard:0,bulletR:0,muzzle:0,aimRot:0,wavePhase:0,perks:[],
  score:0,coins:0,tilt:0,nextLife:100000,nextBurst:150000,hitThisWave:false}); }   // `active` rămâne neatins: îl pune conectarea, nu runda
const net={mode:'off',ws:null,role:null,connected:false,sendT:0,snapT:0,room:null,asHost:false,stopped:true,tries:0,retryT:0};

let bullets=[],enemies=[],eBullets=[],pickups=[],particles=[],floaters=[],zaps=[],beams=[],bonusShips=[];
let stars0=[],stars1=[],stars2=[],nebs=[],dust=[],clouds=[];
let warpT=0, warpStars=[], traveling=false, fgSparks=[], ambient=[], formT=0, formDrop=0, diveTimer=2.5, shootStars=[], stormDir=1, chainCfg=null, chainT=0;
let lowFx=false, _ftA=0, _ftN=0;
let camZoom=1, camZoomT=1;

//==================================================================
// INPUT
el('startBtn').onclick=()=>{hardcore=false;daily=false;audioInit();showShips();};
el('storyBtn').onclick=()=>{hardcore=false;daily=false;audioInit();startStory(false);};
{ const hb=el('hardBtn'); if(hb)hb.onclick=()=>{hardcore=true;daily=false;audioInit();showShips();}; }
{ const db=el('dailyBtn'); if(db)db.onclick=()=>{ daily=true;hardcore=false; const d=new Date(); dailySeed=d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate(); selectedShip=SHIPS[dailySeed%SHIPS.length]; audioInit(); startGame(); }; }

//==================================================================
// BACKGROUND
//==================================================================
function initBg(){
  stars0=[];stars1=[];stars2=[];nebs=[];dust=[];clouds=[];
  // continuously-scrolling soft nebula clouds (CI4-style rolling space) spread over 2 screen-heights so wrap is seamless
  for(let i=0;i<7;i++)clouds.push({x:rand(0,W),y:rand(-H,H),r:rand(200,380),v:rand(26,44),a:rand(.05,.11),hue:rand(-0.5,0.5),vi:randi(0,2)});
  for(let i=0;i<90;i++)stars0.push({x:rand(0,W),y:rand(0,H),s:rand(.3,.7),v:rand(3,7)}); // far, faint, slow — depth
  for(let i=0;i<70;i++)stars1.push({x:rand(0,W),y:rand(0,H),s:rand(.4,1.1),v:rand(8,18)});
  for(let i=0;i<46;i++)stars2.push({x:rand(0,W),y:rand(0,H),s:rand(1,2.6),v:rand(24,52),tw:rand(0,TAU),col:['#ffffff','#cfe0ff','#ffe0c8','#ffd1ec'][randi(0,3)]});
  for(let i=0;i<6;i++)nebs.push({x:rand(0,W),y:rand(0,H),r:rand(160,340),v:rand(6,16),a:rand(.06,.15)});
  for(let i=0;i<28;i++)dust.push({x:rand(0,W),y:rand(0,H),s:rand(1.5,4),v:rand(60,120),a:rand(.04,.12)});
  warpStars=[]; for(let i=0;i<95;i++)warpStars.push({x:rand(0,W),y:rand(0,H),v:rand(.5,1.7),w:rand(.6,2.0)});
  fgSparks=[]; const _sc=['#ff9ec4','#ffe46b','#a8f0d0','#cfe0ff']; for(let i=0;i<22;i++)fgSparks.push({x:rand(0,W),y:rand(0,H),s:rand(1.4,3.4),v:rand(10,28),tw:rand(0,TAU),col:_sc[i%4]});
  ambient=[]; for(let i=0;i<28;i++)ambient.push({x:rand(0,W),y:rand(0,H),v:rand(18,55),sw:rand(0,TAU),swA:rand(8,26),rot:rand(0,TAU),vr:rand(-2,2),s:rand(1.5,3.8)});
}
initBg(); hooks.initBg=initBg; addEventListener('resize',initBg);
function sector(){return SECTORS[Math.floor((Math.max(1,wave)-1)/10)%SECTORS.length];}
function nextSectorName(){ const w=wave+1; return SECTORS[Math.floor((Math.max(1,w)-1)/10)%SECTORS.length].name; }
function sectorIndex(){return Math.floor((Math.max(1,wave)-1)/10)%SECTORS.length;}

//==================================================================
// FLOW
//==================================================================
function startStory(autoStart){
  ui.menu.classList.add('hide'); ui.story.classList.remove('hide');
  ui.crawl.innerHTML=''; let i=0,buf='';
  const lines=STORY.slice();
  function typeLine(){
    if(i>=lines.length)return;
    let line=lines[i], j=0; const cls=i===lines.length-1?' class="by"':'';
    const span=document.createElement('div'); span.innerHTML='';
    ui.crawl.appendChild(span);
    const t=setInterval(()=>{ span.textContent=line.slice(0,j++);
      if(j>line.length){clearInterval(t); i++; setTimeout(typeLine,350);} },18);
  }
  typeLine();
}
function startGame(){
  audioInit();
  scoreMul=hardcore?3:1; fireFreqMul=hardcore?0.55:1;
  if(daily){let s=(dailySeed||1)>>>0;Math.random=function(){s=(s*1664525+1013904223)>>>0;return s/4294967296;};}else{Math.random=_origRandom;}
  score=0;wave=0;waveActive=false;betweenT=0;spawnQ=[];spawnIx=0;combo=0;comboT=0;mult=1;warpT=0;traveling=false;raidMode=false;travelMap=null;runAchvNew=[];formBag=[];
  runStats.kills=0;runStats.bossKills=0;runStats.coins=0;runStats.missiles=0;runStats.maxMult=1;runStats.maxWave=0;runStats.hitThisWave=false;runStats.noHitWaves=0;runStats.bearKilled=false;runStats.leafBoss=false;runStats._wasCombat=false;runStats.graze=0;
  shakeT=0;flash=0;hitstop=0;bonusMode=false;gravityMode=false;bossIntro=0;introBoss=null;frenzy=0;frenzyT=0;
  bullets=[];enemies=[];eBullets=[];pickups=[];particles=[];floaters=[];zaps=[];beams=[];bonusShips=[];bossBeams=[];
  Object.assign(player,{x:W/2,y:H-130,weapon:'pulse',lvl:{pulse:1,scatter:0,laser:0,arc:0,boomer:0,plasma:0,storm:0,wave:0,vulcan:0,rifle:0},
    fireT:0,missiles:3,burst:1,burstT:0,wingmen:0,shield:0,magnet:0,invuln:2.5,lives:3,dead:false,deadT:0,vx:0,tilt:0,prevx:W/2,aimRot:0,_aimSide:1,
    fireMul:1,dmgMul:1,spdMul:1,pierce:0,guard:0,bulletR:0,perks:[],
    score:0,coins:0,nextLife:100000,nextBurst:150000,hitThisWave:false});
  resetP2();
  if(selectedShip&&selectedShip.go)selectedShip.go(player);
  if(daily){ dailyMod=todaysMod(); if(dailyMod&&dailyMod.apply)dailyMod.apply(); } else dailyMod=null;
  ['menu','story','over','pause','coop','opts'].forEach(s=>ui[s].classList.add('hide'));
  { const pb=el('perkBox'); if(pb)pb.style.display='none'; }
  ui.touchpad.style.display='flex';
  state='playing'; nextWave(); updateHUD();
  if(!daily&&!hardcore){ setTimeout(()=>toast('👆 Ține apăsat oriunde ca să miști nava','#8fd3ff'),700); setTimeout(()=>toast('✨ Tragi automat — distruge inamicii!','#ffe46b'),3300); setTimeout(()=>toast('🚀🔥 Butoanele din dreapta = arme speciale','#ff8fc7'),5900); setTimeout(()=>toast('⭐ Adună stele și bomboane','#7ef9d2'),8500); }
  if(hardcore)setTimeout(()=>toast('💀 HARDCORE · scor ×3','#ff5a6a'),400);
  if(daily){ setTimeout(()=>toast('📅 PROVOCAREA ZILEI · '+selectedShip.n,'#8fd3ff'),400);
    if(dailyMod&&dailyMod.id!=='none')setTimeout(()=>toast('🎲 '+dailyMod.n+' — '+dailyMod.d,'#ffd24a'),1400); }
}
function toMenu(){ coopReset(); el('overTitle').textContent='GAME OVER'; state='menu'; ['story','over','pause','coop','opts','shop','dailyReward','help'].forEach(s=>{const e=el(s);if(e)e.classList.add('hide');});
  ui.menu.classList.remove('hide'); ui.touchpad.style.display='none'; if(el('coopCode'))el('coopCode').style.display='none'; renderDaily(); updateCoinUI(); }
function gameOver(){ state='over';
  ui.over.classList.remove('hide'); ui.touchpad.style.display='none';   // afișează imediat — fără freeze chiar dacă statisticile aruncă
  try{
  if(net.mode==='host')netSend({t:'over',sc:score,sc1:p2.score|0,sc2:player.score|0,co:p2.coins|0,co2:player.coins|0});
  ui.finalScore.textContent=score.toLocaleString();
  el('oWave').textContent=Math.max(runStats.maxWave,wave); el('oKills').textContent=runStats.kills;
  el('oCombo').textContent='x'+(runStats.maxMult||1); el('oCoins').textContent=runStats.coins;
  el('oMissiles').textContent=runStats.missiles; el('oBoss').textContent=runStats.bossKills;
  showCoopSplit(player.score|0, p2.score|0, player.coins|0, p2.coins|0);
  Math.random=_origRandom;
  // bank the coins collected this run (Ploaie de Aur doubles them) + evaluate daily missions
  // în co-op fiecare pleacă acasă doar cu ce a cules el
  const _mine=(net.mode!=='off'&&p2.active)?(player.coins|0):(runStats.coins|0);
  if(_mine>0){ let gain=_mine; if(daily&&dailyMod&&dailyMod.id==='rich')gain*=2; addCoins(gain); }
  if(runStats.gems>0){ addGems(runStats.gems); }
  evalMissions();
  if(daily){ dailyMeta.best=Math.max(dailyMeta.best||0,score); saveDaily(); }
  const _bk=hardcore?'ki_best_hc':'ki_best'; const _bv=hardcore?bestHc:best;
  const _my=myScore();                     // în co-op recordul e partea TA, ca să rămână comparabil cu solo
  if(daily){ ui.bestLine.textContent='📅 provocarea zilnică · '+score.toLocaleString(); }
  else if(_my>_bv){ if(hardcore)bestHc=_my; else best=_my; try{localStorage.setItem(_bk,_my);}catch(e){} ui.bestLine.textContent=(hardcore?'💀 record nou hardcore!':'✨ record nou!');}
  else ui.bestLine.textContent='cel mai bun'+(hardcore?' (hardcore)':'')+': '+_bv.toLocaleString();
  // newly earned achievements this run (so feedback shows regardless of ship/run)
  if(runAchvNew.length){ const names=runAchvNew.map(a=>a.i+' '+a.n).join(' · ');
    ui.bestLine.innerHTML += '<div style="margin-top:8px;font-size:12px;color:var(--yellow);line-height:1.4">🏅 realizări noi: '+names+'</div>'; }
  }catch(_goErr){ console.error('gameOver stats:',_goErr); }
}
function togglePause(){ if(state==='playing'){state='paused';
    el('pStatScore').textContent=score.toLocaleString(); el('pStatWave').textContent=wave; el('pStatCoins').textContent=runStats.coins;
    ui.pause.classList.remove('hide');}
  else if(state==='paused'){state='playing';ui.pause.classList.add('hide');} }

const PERKS=[
  {id:'fire',ic:'⚡',n:'Foc rapid',d:'+20% viteză de tragere',ok:()=>player.fireMul>0.45,go:()=>{player.fireMul*=0.82;}},
  {id:'dmg',ic:'💥',n:'Daune mărite',d:'+30% daune la tot',ok:()=>player.dmgMul<3.2,go:()=>{player.dmgMul*=1.3;}},
  {id:'wing',ic:'🐶',n:'Coleg nou',d:'încă o pisicuță ajutor',ok:()=>player.wingmen<2,go:()=>{player.wingmen=Math.min(2,player.wingmen+1);}},
  {id:'spd',ic:'🏃',n:'Viteză',d:'+20% viteză de mișcare',ok:()=>(player.spdMul||1)<1.8,go:()=>{player.spdMul*=1.2;}},
  {id:'life',ic:'❤️',n:'Viață în plus',d:'+1 viață (max 6)',ok:()=>player.lives<6,go:()=>{player.lives++;updateHUD();}},
  {id:'pierce',ic:'🎯',n:'Perforare',d:'gloanțele trec prin +1 inamic',ok:()=>player.pierce<3,go:()=>{player.pierce++;}},
  {id:'guard',ic:'😇',n:'Înger păzitor',d:'absoarbe o lovitură fără pierdere',ok:()=>(player.guard||0)<3,go:()=>{player.guard=(player.guard||0)+1;}},
  {id:'big',ic:'🔵',n:'Gloanțe mari',d:'gloanțe mai mari, lovești mai ușor',ok:()=>(player.bulletR||0)<6,go:()=>{player.bulletR=(player.bulletR||0)+2;}},
  {id:'ammo',ic:'🚀',n:'Muniție',d:'+2 rachete acum',ok:()=>true,go:()=>{player.missiles+=2;updateHUD();}},
  {id:'burstp',ic:'🔥',n:'Burst extra',d:'+1 încărcătură burst',ok:()=>player.burst<4,go:()=>{player.burst=Math.min(4,player.burst+1);updateHUD();}},
];
const SHIPS=[
  {id:'mochi',ic:'🐱',n:'Mochi-1',d:'echilibrată, bună pentru oricine',col:null,go:(p)=>{}},
  {id:'bolt',ic:'⚡',n:'Fulger',d:'foc & viteză mari, dar doar 2 vieți',col:'#ffe24a',go:(p)=>{p.fireMul=0.7;p.spdMul=1.3;p.lives=2;}},
  {id:'tank',ic:'🛡️',n:'Tanc',d:'5 vieți, gloanțe mari, mai lentă',col:'#57d99a',go:(p)=>{p.lives=5;p.spdMul=0.85;p.bulletR=2;}},
  {id:'sniper',ic:'🎯',n:'Lunetist',d:'perforare + daune mari, foc lent',col:'#b483ff',go:(p)=>{p.pierce=2;p.dmgMul=1.4;p.fireMul=1.25;}},
  {id:'pack',ic:'👯',n:'Haita',d:'începe cu 2 colegi pisicuțe',col:'#5fa8ff',go:(p)=>{p.wingmen=2;}},
  {id:'vortex',ic:'🛸',n:'Vortex',d:'foc foarte rapid + 3 coechipieri',col:'#5ffbf1',lock:'s_vortex',gem:12,go:(p)=>{p.fireMul=0.60;p.spdMul=1.18;p.wingmen=3;}},
  {id:'fortress',ic:'🛡',n:'Fortăreața',d:'8 vieți, scut din start, gloanțe uriașe',col:'#ffb15c',lock:'s_fortress',gem:15,go:(p)=>{p.lives=8;p.shield=1;p.bulletR=3;p.spdMul=0.9;}},
  {id:'nova',ic:'☄️',n:'Nova',d:'daune ×2 și perforare 3',col:'#ff5fbf',lock:'s_nova',gem:18,go:(p)=>{p.dmgMul=2.0;p.pierce=3;p.fireMul=1.08;}},
];
let selectedShip=SHIPS[0];
function showShips(){ const box=el('shipCards'); if(!box)return; box.innerHTML='';
  for(const sh of SHIPS){ const c=document.createElement('button'); c.className='perkcard'; c.style.borderColor=sh.col||'#dfe6ff'; c.style.borderWidth='3px';
    c.innerHTML='<div style="font-size:34px;line-height:1">'+sh.ic+'</div><div style="font-weight:800;font-size:15px;margin-top:6px">'+sh.n+'</div><div style="font-size:11px;opacity:.8;margin-top:4px;line-height:1.3">'+sh.d+'</div>';
    const locked=sh.lock && !shop.owned[sh.lock];
    if(locked){ c.style.opacity='.55'; c.style.filter='grayscale(.5)';
      c.innerHTML+='<div style="font-weight:800;font-size:12px;margin-top:4px;color:#9fe9ff">🔒 '+sh.gem+' 💎</div>';
      c.onclick=()=>toast('💎 cumpără nava din magazin','#9fe9ff'); }
    else c.onclick=()=>chooseShip(sh);
    box.appendChild(c); }
  el('shipBox').style.display='flex'; }
function chooseShip(sh){ selectedShip=sh; el('shipBox').style.display='none'; startGame(); }
function showPerks(){
  const pool=PERKS.filter(p=>p.ok()), pick=[];
  while(pick.length<3 && pool.length) pick.push(pool.splice(randi(0,pool.length-1),1)[0]);
  if(!pick.length) return;
  const box=el('perkCards'); if(!box) return; box.innerHTML='';
  for(const p of pick){ const c=document.createElement('button'); c.className='perkcard';
    c.innerHTML='<div style="font-size:36px;line-height:1">'+p.ic+'</div>'
      +'<div style="font-family:\'Baloo 2\';font-weight:800;font-size:16px;margin-top:6px">'+p.n+'</div>'
      +'<div style="font-size:12px;opacity:.8;margin-top:4px;line-height:1.3">'+p.d+'</div>';
    c.onclick=()=>choosePerk(p); box.appendChild(c); }
  el('perkBox').style.display='flex'; state='perk'; if(snd.pickup)snd.pickup();
}
function choosePerk(p){ p.go(); player.perks.push(p.id); el('perkBox').style.display='none'; state='playing'; toast(p.ic+' '+p.n,'#ffe46b'); }

function nextWave(){
  traveling=false; raidMode=false; travelMap=null;
  if(runStats._wasCombat && !runStats.hitThisWave) runStats.noHitWaves++;
  wave++; waveActive=true; spawnIx=0; bonusMode=false; gravityMode=false;
  formDrop=0; diveTimer=rand(2.5,4); chainT=0;   // reset slow-descent, swoop & convoy schedulers for the new wave
  if(wave>runStats.maxWave)runStats.maxWave=wave;
  runStats.hitThisWave=false; player.hitThisWave=false; p2.hitThisWave=false;
  const S=sector();
  const slot=wave%10;                 // position inside the 10-wave stage (0 = boss)
  const isBoss=slot===0;
  const isRaid=!isBoss && slot===6 && wave>=6;
  const isAsteroid=!isBoss && slot===8 && wave>=8;
  const isSnake=!isBoss && slot===5 && wave>=5;                    // CI5-style serpent convoy
  const isComet=!isBoss && slot===7 && wave>=7;                    // CI5-style comet storm
  const isBonus=!isBoss && !isRaid && !isAsteroid && slot===3 && wave>1;
  runStats._wasCombat=(!isBoss && !isBonus);
  if(isBoss){
    const a=S.animal, isLeaf=S.event==='leaves'; const bd={key:a, name:isLeaf?'REGELE FRUNZĂ':BOSS_NAME[a], col:isLeaf?'#e0742a':CRITCOL[a]};
    const si=sectorIndex(), bstyle=si===0?0:1+((si-1)%5);   // first boss keeps intro 0; others get distinct cinematics
    bossIntro=INTRO_DUR; introBoss={type:a, name:bd.name, col:bd.col, acc:isLeaf?null:bossAcc(a), leafBoss:isLeaf, style:bstyle};
    snd.bossIntro(); spawnBoss(bd);
  } else if(isRaid){
    raidMode=true; bannerSet('RAID LATERAL ⚔️','inamicii atacă din lateral!'); buildRaid();
  } else if(isAsteroid){
    bonusMode=true; bonusT=0; bonusSpawned=0; bonusType='asteroid';
    bannerSet('CÂMP DE ASTEROIZI ☄️','ferește-te de roci — dă\u2019 drumu\u2019 la foc!');
  } else if(isBonus){
    bonusMode=true; bonusT=0; bonusSpawned=0;
    const ev=eventOf();
    bonusType = ev==='christmas' ? 'christmas' : ev==='autumn' ? 'autumn' : (['ufo','meteor','gravity'][Math.floor(wave/3)%3]);
    gravityMode=(bonusType==='gravity'); if(gravityMode){player.gvx=0;player.gvy=0;}
    const bt={christmas:'globulețe de brad! 🎄',autumn:'frunze de toamnă! 🍂',meteor:'ploaie de dulciuri! 🍬',ufo:'nave cu animăluțe! ⭐',gravity:'doboară orbitele din jurul puțului! 🌀'}[bonusType];
    bannerSet('RUNDĂ BONUS', bt);
  } else if(isSnake){
    bannerSet('CONVOI ȘERPUIT 🐍','urmărește capul!');
    buildSnake();
  } else if(isComet){
    bonusMode=true; bonusT=0; bonusSpawned=0; bonusType='comet';
    bannerSet('FURTUNĂ DE COMETE 💫','ferește-te de gheață — foc continuu!');
  } else {
    bannerSet(S.name, EVENT_NAME[S.event||'normal']||'sector '+(sectorIndex()+1));
    buildWave();
  }
  updateHUD();
}
function eventOf(){ return (sector().event)||'normal'; }
function accPool(){
  const e=eventOf();
  if(e==='halloween') return ['witchhat','pumpkin','glasses','sunglasses',null,null];
  if(e==='winter')    return ['santa','scarf','glasses',null,null];
  if(e==='christmas') return ['santa','scarf','bow','halo',null];
  if(e==='romania'||e==='unire') return ['bow','glasses','halo',null,null];
  if(e==='military')  return ['helmet','helmet','sunglasses',null];
  if(e==='valentine') return ['hearts','bow','flower',null];
  if(e==='martisor')  return ['martisor','martisor','flower',null];
  if(e==='spring')    return ['flower','bow','glasses',null,null];
  if(e==='summer')    return ['sunglasses','flower','party',null,null];
  if(e==='autumn')    return ['tophat','monocle','bow',null,null];
  return ACCS;
}
function bannerSet(t,sub){
  ui.bannerTxt.innerHTML=t+'<div class="sub">'+sub+'</div>';
  ui.banner.style.transition='none'; ui.banner.style.opacity='1';
  setTimeout(()=>{ui.banner.style.transition='opacity .9s';ui.banner.style.opacity='0';},900);
}
function toast(txt,col){ ui.toast.textContent=txt; ui.toast.style.color=col||'#fff';
  ui.toast.style.transition='none'; ui.toast.style.opacity='1';
  setTimeout(()=>{ui.toast.style.transition='opacity .7s';ui.toast.style.opacity='0';},700); }

//==================================================================
// TRAVEL MAP (ship flies along a route between named places)
//==================================================================
let travelMap=null, travelScale=1;
const TRAVEL_FLAVOR=['Nebuloasa Pufuleț','Câmpurile de Bezea','Inelul de Acadele','Cotul Lăptișor','Poarta Zahărului','Răscrucea Stelară','Golful Vată-de-zahăr','Pasajul Fursec'];
function easeInOut(t){ return t<0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2; }
function pathPoint(pts,t){ // t in [0,1] along a polyline
  if(pts.length<2) return pts[0]||{x:W/2,y:H/2};
  const seg=(pts.length-1)*clamp(t,0,1); const i=Math.min(pts.length-2,Math.floor(seg)); const f=seg-i;
  const a=pts[i],b=pts[i+1]; return {x:a.x+(b.x-a.x)*f, y:a.y+(b.y-a.y)*f}; }
function startTravel(){
  // depart current spot, recede up into the distance, then swing back down to the new-planet start
  const sx=player.x, sy=player.y, side=Math.random()<0.5?-1:1;
  const pts=[
    {x:sx, y:sy},
    {x:clamp(sx+side*W*0.22, W*0.12, W*0.88), y:H*0.46},
    {x:clamp(W*0.5-side*W*0.18, W*0.12, W*0.88), y:H*0.18},  // farthest point (smallest)
    {x:clamp(W*0.5+side*W*0.16, W*0.12, W*0.88), y:H*0.42},
    {x:W*0.5, y:H*0.70},                                      // arrive at the new planet
  ];
  const fl=TRAVEL_FLAVOR.slice().sort(()=>Math.random()-0.5);
  const places=[
    {name:sector().name, t:0.03},
    {name:fl[0], t:0.34},
    {name:fl[1], t:0.62},
    {name:'→ '+nextSectorName(), t:0.97},
  ];
  travelMap={pts,places,
    fromSec: SECTORS[Math.floor(Math.max(0,wave-1)/10)%SECTORS.length],
    toSec:   SECTORS[Math.floor(wave/10)%SECTORS.length]};
  bannerSet('HIPERSPAȚIU 🚀','către '+nextSectorName());
}
function drawTravelMap(){
  if(!travelMap)return; const cp=clamp(1-betweenT/TRAVEL_DUR,0,1), e=easeInOut(cp);
  const pts=travelMap.pts;
  ctx.save();
  // dotted golden route
  ctx.setLineDash([2,16]); ctx.lineDashOffset=-performance.now()*0.03;
  ctx.strokeStyle='rgba(255,200,60,.85)'; ctx.lineWidth=5; ctx.lineCap='round'; ctx.shadowColor='#ffb02e'; ctx.shadowBlur=10;
  ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y); for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y); ctx.stroke();
  ctx.setLineDash([]); ctx.shadowBlur=0;
  // place labels: endpoints are real planets (CI-style), middle stops are little star nodes
  ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font='800 15px "Baloo 2",sans-serif';
  const last=travelMap.places.length-1;
  travelMap.places.forEach((pl,i)=>{ const p=pathPoint(pts,pl.t); const reached=e>=pl.t-0.02;
    if(i===0){ drawTravelPlanet(p.x,p.y,13,travelMap.fromSec,0.95); }
    else if(i===last){ const gr=clamp((e-0.4)/0.6,0,1); drawTravelPlanet(p.x,p.y,9+gr*13,travelMap.toSec,0.45+gr*0.55); }
    else { ctx.fillStyle=reached?'#ffe46b':'rgba(255,210,90,.45)'; ctx.beginPath(); ctx.arc(p.x,p.y,reached?6:4,0,TAU); ctx.fill(); }
    if(reached){ ctx.shadowColor='rgba(0,0,0,.7)'; ctx.shadowBlur=6; }
    ctx.fillStyle=reached?'#fff3cf':'rgba(255,235,180,.55)';
    ctx.fillText(pl.name, p.x, p.y-((i===0||i===last)?28:16)); ctx.shadowBlur=0; }
  );
  ctx.restore();
}
// a small stylised planet used as a node on the travel map
function drawTravelPlanet(x,y,r,sec,bright){
  const neb=sec?sec.neb:'#ffd24a', acc=sec?sec.accent:'#ffe46b';
  ctx.save();
  const g=ctx.createRadialGradient(x,y,r*0.4,x,y,r*2.3);
  g.addColorStop(0,hexA(neb,0.55*bright)); g.addColorStop(1,hexA(neb,0));
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r*2.3,0,TAU); ctx.fill();
  const bg=ctx.createRadialGradient(x-r*0.35,y-r*0.4,r*0.2,x,y,r);
  bg.addColorStop(0,lightenHex(acc,0.25)); bg.addColorStop(0.6,neb); bg.addColorStop(1,shade(neb));
  ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
  ctx.save(); ctx.translate(x,y); ctx.rotate(-0.5); ctx.scale(1,0.34);
  ctx.strokeStyle=hexA(acc,0.85*bright+0.1); ctx.lineWidth=Math.max(1.5,r*0.12);
  ctx.beginPath(); ctx.arc(0,0,r*1.5,0,TAU); ctx.stroke(); ctx.restore();
  ctx.strokeStyle='rgba(255,255,255,.4)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.stroke();
  ctx.restore();
}

//==================================================================
// WAVES
//==================================================================
function buildWave(){
  spawnQ=[];
  const baseHp=3+Math.floor(wave*0.95);
  const topY=Math.max(72,H*0.14), rowH=Math.min(60,H*0.12), cx=W/2, cyf=topY+rowH*1.7;
  const F=(delay,gx,gy,ph)=>spawnQ.push({t:0.3+delay,mk:()=>mkEnemy({x:gx,y:-48-Math.random()*24,hp:baseHp,pattern:'gridfloat',gx,gy,swing:ph})});
  const FE=(delay,o)=>spawnQ.push({t:0.3+delay,mk:()=>mkEnemy(Object.assign({hp:baseHp},o))});
  const spanX=n=>{ const m=W*0.82,x0=W*0.09,st=n>1?m/(n-1):0; return i=> n>1? x0+i*st : W/2; };
  const dens=Math.min(3,Math.floor(wave/6));
  // each combat wave pulls a fresh formation from a shuffled bag -> no two stages in a row feel the same
  if(!formBag.length){ formBag=['grid','checker','vform','arc','waverow','diamond','twin','columns','zigzag','cross','wall','spiral','orbit','serpent','swarm','galaxy','pincer'];
    for(let i=formBag.length-1;i>0;i--){ const j=randi(0,i); const tmp=formBag[i]; formBag[i]=formBag[j]; formBag[j]=tmp; } }
  let pat=formBag.pop(); window.__lastPat=pat;
  if(pat==='grid'){
    const cols=Math.min(8,5+Math.floor(wave/3)),rows=Math.min(4,2+Math.floor(wave/4)),X=spanX(cols);
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++) F(c*0.04+r*0.16, X(c), topY+r*rowH, c*0.4);
  } else if(pat==='checker'){
    const cols=Math.min(8,5+Math.floor(wave/3)),rows=Math.min(4,3+Math.floor(wave/5)),X=spanX(cols); let q=0;
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++) if((r+c)%2===0) F((q++)*0.05, X(c), topY+r*rowH, c*0.5);
  } else if(pat==='vform'){
    const per=Math.min(6,3+Math.floor(wave/3)); F(0, cx, topY, 0);
    for(let k=1;k<=per;k++){ const gy=topY+k*rowH*0.82, dx=k*Math.min(56,W*0.06);
      F(k*0.1, cx-dx, gy, k*0.4); F(k*0.1+0.04, cx+dx, gy, k*0.4); }
  } else if(pat==='arc'){
    const n=Math.min(11,7+Math.floor(wave/2)),X=spanX(n);
    for(let k=0;k<n;k++){ const fr=n>1?k/(n-1):0.5; F(k*0.07, X(k), topY+(1-Math.sin(fr*Math.PI))*rowH*1.7, k*0.3); }
  } else if(pat==='waverow'){
    const n=Math.min(12,8+Math.floor(wave/2)),X=spanX(n);
    for(let k=0;k<n;k++){ const fr=n>1?k/(n-1):0.5; F(k*0.06, X(k), topY+(0.5+0.5*Math.sin(fr*TAU*1.5))*rowH*2, k*0.3); }
  } else if(pat==='diamond'){
    const ring=Math.min(4,2+Math.floor(wave/3)); let q=0;
    for(let r=1;r<=ring;r++){ const cnt=r*2; for(let k=0;k<cnt;k++){ const a=k/cnt*TAU; F((q++)*0.05, cx+Math.cos(a)*r*48, cyf+Math.sin(a)*r*30, r*0.5); } }
    F(q*0.05, cx, cyf, 0);
  } else if(pat==='twin'){
    let q=0; for(const sgn of [-1,1]){ const ox=cx+sgn*W*0.22;
      for(let r=1;r<=2+dens;r++){ const cnt=r*2; for(let k=0;k<cnt;k++){ const a=k/cnt*TAU; F((q++)*0.04, ox+Math.cos(a)*r*30, cyf+Math.sin(a)*r*24, r*0.5); } }
      F((q++)*0.04, ox, cyf, 0); }
  } else if(pat==='columns'){
    const cols=Math.min(7,4+Math.floor(wave/3)),per=Math.min(4,2+Math.floor(wave/4)),X=spanX(cols);
    for(let c=0;c<cols;c++)for(let k=0;k<per;k++) F(c*0.12+k*0.1, X(c), topY+k*rowH, c*0.45);
  } else if(pat==='zigzag'){
    const n=Math.min(12,8+Math.floor(wave/2)),X=spanX(n);
    for(let k=0;k<n;k++) F(k*0.09, X(k), topY+(k%2?rowH*1.3:0), k*0.35);
  } else if(pat==='cross'){
    const arm=Math.min(4,2+Math.floor(wave/4)); let q=0;
    for(let k=-arm;k<=arm;k++){ F((q++)*0.05, cx, cyf+k*rowH*0.8, 0); if(k!==0)F((q++)*0.05, cx+k*Math.min(58,W*0.07), cyf, 0); }
  } else if(pat==='wall'){
    const cols=Math.min(10,7+Math.floor(wave/2)),X=spanX(cols);
    for(let r=0;r<2;r++)for(let c=0;c<cols;c++) F(c*0.03+r*0.12, X(c), topY+r*rowH*0.8, c*0.3);
  } else if(pat==='spiral'){
    const n=10+Math.floor(wave/2);
    for(let k=0;k<n;k++) FE(k*0.12,{x:cx,y:topY+rowH,pattern:'spiral',scx:cx,scy:topY+rowH,srad:18,sgrow:22,sang:k*0.7,t:0});
  } else if(pat==='orbit'){
    const n=Math.min(14,9+Math.floor(wave/2)), rad=Math.min(W*0.32,150);
    for(let k=0;k<n;k++){ const a=k/n*TAU; FE(k*0.08,{x:cx+Math.cos(a)*rad,y:cyf+Math.sin(a)*rad*0.66,pattern:'orbit',ocx:cx,ocy:cyf,orad:rad,oa:a,osp:0.6,ogrow:0}); }
  } else if(pat==='serpent'){
    const n=12+Math.floor(wave/2),fromL=Math.random()<0.5,amp=H*0.16,freq=1.7,baseY=H*0.26,vx=(fromL?1:-1)*rand(120,150),sx=fromL?-40:W+40;
    for(let k=0;k<n;k++) spawnQ.push({t:0.3+k*0.26,mk:()=>mkEnemy({x:sx,y:baseY,hp:baseHp,pattern:'sine',vx,amp,freq,phase:0,t:0})});
  } else if(pat==='swarm'){
    const n=Math.min(18,10+wave);
    for(let k=0;k<n;k++) F(Math.random()*1.6, W*0.12+Math.random()*W*0.76, topY+Math.random()*rowH*2.6, Math.random()*TAU);
  } else if(pat==='galaxy'){
    // two spiral arms that sweep in and settle into a rotating pinwheel around the centre
    const arms=2, per=Math.min(7,4+Math.floor(wave/3)), rad=Math.min(W*0.30,140);
    for(let a=0;a<arms;a++)for(let k=0;k<per;k++){ const ang=a/arms*TAU+k*0.6, rr=26+k/per*rad;
      FE(a*0.15+k*0.12,{x:cx+Math.cos(ang)*rr,y:cyf+Math.sin(ang)*rr*0.66,pattern:'orbit',ocx:cx,ocy:cyf,orad:rr,oa:ang,osp:0.5,ogrow:0}); }
  } else if(pat==='pincer'){
    // two vertical columns slide in from the left & right edges, closing like a trap
    const per=Math.min(5,3+Math.floor(wave/4));
    for(const sgn of [-1,1]){ const gx=cx+sgn*W*0.30;
      for(let k=0;k<per;k++) F((k+ (sgn<0?0:0.06))*0.14, gx, topY+k*rowH, k*0.5+ (sgn<0?0:1)); }
  }
  if(wave>=4 && Math.random()<0.3){ const nb=randi(3,5),gap=Math.min(66,W*0.09),x0=W/2-(nb-1)*gap/2,gy=topY+rowH*0.4;
    for(let k=0;k<nb;k++) spawnQ.push({t:1.2+k*0.12,mk:()=>mkEnemy({x:x0+k*gap,y:-40,hp:1,baby:true,pattern:'gridfloat',gx:x0+k*gap,gy,swing:k*0.5})}); }
  // occasional golden ELITE: a tougher, glittering critter worth a guaranteed weapon + big frenzy
  if(wave>=3 && Math.random()<0.4){ const ex=W*(0.3+Math.random()*0.4);
    spawnQ.push({t:0.9,mk:()=>mkEnemy({x:ex,y:-64,r:24,hp:baseHp*4+8,pattern:'gridfloat',gx:ex,gy:topY+rowH*0.7,swing:0.6,elite:true,acc:'tophat',type:CRITTERS[randi(0,CRITTERS.length-1)]})}); }
}
function buildRaid(){
  spawnQ=[];
  const baseHp=3+Math.floor(wave*0.75);
  const rows=Math.min(6,3+Math.floor(wave/12));
  const topY=Math.max(70,H*0.15), laneH=Math.min(70,H*0.11);
  const per=4+Math.floor(wave/8);
  let q=0;
  for(let r=0;r<rows;r++){
    const fromL=r%2===0, dir=fromL?1:-1, sx=fromL?-46:W+46, gy=topY+r*laneH;
    const vx=dir*rand(95,135), wob=rand(1.2,2.2), wobp=rand(0,TAU);
    for(let k=0;k<per;k++){
      const delay=0.3 + r*0.45 + k*0.42;
      spawnQ.push({t:delay, mk:()=>mkEnemy({x:sx,y:gy,r:16,hp:baseHp,pattern:'raid',vx,_b:gy,wob,wobp,fireSide:true})});
      q++;
    }
  }
  // a few fast diagonal flankers that swoop across
  const fl=2+Math.floor(wave/14);
  for(let i=0;i<fl;i++){ const fromL=Math.random()<0.5, dir=fromL?1:-1, sx=fromL?-46:W+46;
    spawnQ.push({t:1.0+i*0.6, mk:()=>mkEnemy({x:sx,y:rand(topY,topY+laneH*2),r:17,hp:baseHp+1,pattern:'raid',vx:dir*rand(150,200),_b:rand(topY,topY+laneH*2),wob:rand(2,3),wobp:rand(0,TAU),fireSide:true})}); }
}
// CI5-style serpent convoy: a long chain of one species that weaves down the screen; kill them all to clear
function buildSnake(){
  spawnQ=[];
  const baseHp=3+Math.floor(wave*0.7);
  const n=14+Math.min(10,Math.floor(wave/3));
  const sp=CRITTERS[randi(0,CRITTERS.length-1)];        // one species for the whole convoy
  for(let i=0;i<n;i++){ const head=i===0;
    spawnQ.push({t:0.2+i*0.05, mk:()=>mkEnemy({
      x:-70,y:-70, r:head?24:16, hp:head?baseHp*3+6:baseHp,
      pattern:'chain', chainIx:i, type:sp,
      elite:head, acc:head?'tophat':null })}); }
}
const ACCS=['glasses','bow','party','flower','halo','monocle','tophat',null,null,null];
const TYPE_MIGRATE={pip:'bird',glob:'dragon',fox:'hamster',stag:'shroom'};
function mkEnemy(o){
  const e=Object.assign({x:0,y:0,r:16,hp:1,maxHp:1,pattern:'gridfloat',t:rand(0,TAU),fireT:rand(1.4,4),hit:0,boss:false,blink:rand(2,5)},o);
  if(TYPE_MIGRATE[e.type])e.type=TYPE_MIGRATE[e.type];   // orice tip vechi rătăcit devine echivalentul nou
  if(!e.type)e.type=sector().animal;                 // whole sector = the boss's species
  if(eventOf()==='leaves' && !e.bonus && !e.boss && !e.bauble) e.leaf=true;
  if(e.leaf){ if(e.face===undefined)e.face=randi(0,4); if(e.lcol===undefined)e.lcol=LCOLS[randi(0,LCOLS.length-1)]; if(e.spin0===undefined)e.spin0=rand(0,TAU); }
  if(e.acc===undefined){ const p=accPool(); e.acc=e.bonus?null:p[randi(0,p.length-1)]; }
  if(o.maxHp===undefined)e.maxHp=e.hp;
  if(!e.baby && !e.bonus && !e.leaf){ e.bub=1; e.crackSeed=(randi(1,99999)); }   // bula Hamster Ball, se sparge ca în CI
  if(e.baby){ e.r=Math.round(e.r*0.6); e.hp=1; e.acc=null; }
  e.maxHp=e.hp; enemies.push(e); return e;
}
const BOSS_ACC={bird:'glasses',dragon:'monocle',star:'halo',nimbus:'sunglasses',panda:'bow',hamster:'tophat',penguin:'scarf',ghost:'witchhat',bear:'glasses',snowman:'santa',wolf:'sunglasses',lynx:'glasses',shroom:'glasses'};
function bossAcc(a){ const e=eventOf();
  if(e==='halloween')return 'witchhat'; if(e==='winter'||e==='christmas')return 'santa';
  if(e==='military')return 'helmet'; if(e==='valentine')return 'hearts'; if(e==='martisor')return 'martisor';
  return BOSS_ACC[a]||'glasses'; }
function spawnBoss(bd){
  const hp=180+wave*42;
  const isLeaf=eventOf()==='leaves';
  enemies.push({x:W/2,y:-150,r:isLeaf?76:70,hp,maxHp:hp,type:bd.key,name:isLeaf?'REGELE FRUNZĂ':bd.name,col:isLeaf?'#e0742a':bd.col,pattern:'boss',acc:isLeaf?null:bossAcc(bd.key),
    t:0,hit:0,boss:true,blink:3,targetY:140,leafBoss:isLeaf,
    phase:0,enrage:false,entering:true,cx:W/2,tp:0,
    aiT:1.6, atkIx:0, mouth:0, eyeShake:0, moveMode:0, moveT:0});
}
let bossBeams=[]; // telegraphed beams (declared here, reset in startGame)
function bossAI(e,dt){
  if(e.entering){ e.y+=90*dt;
    if(e.y>=e.targetY){ e.entering=false; e.y=e.targetY;
      // cinematic arrival: screen shake, twin shockwave rings and a scale-pop
      shake(16,.5); snd.alarm(); e.arrive=0.5;
      particles.push({x:e.x,y:e.y,vx:0,vy:0,life:.6,max:.6,r:e.r*0.8,grow:520,ring:true,color:'#fff'});
      particles.push({x:e.x,y:e.y,vx:0,vy:0,life:.85,max:.85,r:e.r,grow:360,ring:true,color:e.col});
    } return; }
  if(e.arrive>0)e.arrive-=dt;
  if(bossIntro>0){ e.x+=(W/2-e.x)*Math.min(1,dt*4); e.y=e.targetY+Math.sin(e.t*2)*6; return; }
  // phase from hp
  const f=e.hp/e.maxHp; const np=f<0.33?2:f<0.66?1:0;
  if(np!==e.phase){ e.phase=np; if(np===2){e.enrage=true; toast('ENRAGE!','#ff5a7a'); snd.alarm();}
    flash=0.3; flashCol=e.col;
    // dramatic phase-transition: the boss slams down and unleashes a defensive shockwave ring
    e.dive=0; e.moveMode=3; e.moveT=1.6; e.phaseSlam=0.4; shake(20,.5); snd.boom();
    particles.push({x:e.x,y:e.y,vx:0,vy:0,life:.7,max:.7,r:e.r,grow:640,ring:true,color:e.col});
    const rn=np===2?22:16; for(let i=0;i<rn;i++){ const a=i/rn*TAU; eBullets.push(eBullet(e.x,e.y,Math.cos(a)*(160+np*40),Math.sin(a)*(160+np*40),e.col,'orb')); }
  }
  if(e.phaseSlam>0)e.phaseSlam-=dt;
  // movement modes change over time
  e.moveT-=dt; if(e.moveT<=0){
    // enraged boss dives aggressively toward the player more often
    e.moveMode = (e.enrage&&Math.random()<0.45) ? 3 : randi(0,2);
    e.moveT=rand(3,5); if(e.moveMode===3){ e.dive=0; e.moveT=rand(2.2,3); e.diveX=player.x; }
  }
  if(e.tp>0)e.tp-=dt;
  e.cx=(e.cx??W/2); e.cx+=(W/2-e.cx)*Math.min(1,dt*0.3);   // teleports drift back to center
  const sp=e.enrage?1.5:1;
  if(e.moveMode===0) e.x=e.cx+Math.sin(e.t*0.7*sp)*(W*0.30);
  else if(e.moveMode===1){ e.x=e.cx+Math.sin(e.t*1.3*sp)*(W*0.30); }
  else if(e.moveMode===3){ // menacing dive: lunge down toward the player's column, then rise back up
    e.dive=(e.dive||0)+dt;
    const prog=clamp(e.dive/1.3,0,1), swoop=Math.sin(prog*Math.PI);   // 0->1->0 arc
    e.x+=((e.diveX||W/2)-e.x)*Math.min(1,dt*3.2);
    e.targetY=140+swoop*(H*0.34); e.y+=(e.targetY-e.y)*Math.min(1,dt*4.5);
    e.x=clamp(e.x,e.r,W-e.r); e.y=clamp(e.y,90,H*0.5); e.eyeShake=0.15;
    return;   // dive drives its own Y; skip the default hover below
  }
  else { // figure-8 weave
    e.x=e.cx+Math.sin(e.t*0.9*sp)*(W*0.24);
    e.targetY=150+Math.sin(e.t*1.8*sp)*(H*0.14)+(0.5+0.5*Math.sin(e.t*0.4))*(H*0.16);
  }
  if(e.moveMode!==4)e.targetY=140+(0.5+0.5*Math.sin(e.t*0.32))*(H*0.30);
  e.y+=(e.targetY-e.y)*Math.min(1,dt*1.3);
  e.x=clamp(e.x,e.r,W-e.r); e.y=clamp(e.y,90,H*0.4);
  if(e.eyeShake>0)e.eyeShake-=dt; if(e.mouth>0)e.mouth-=dt;
  // attacks
  e.aiT-=dt;
  if(e.aiT<=0){ const seq=e.leafBoss?LEAF_ATTACKS:(BOSS_ATTACKS[e.type]||BOSS_ATTACKS.pip); const atk=seq[e.atkIx%seq.length]; e.atkIx++;
    bossDo(e,atk); e.aiT=(atk.cd||1.6)*(e.enrage?0.6:1); e.mouth=0.5; }
}
const BOSS_ATTACKS={
  bird:   [{f:'radial',cd:1.7},{f:'aim3',cd:1.2},{f:'hbeam',cd:2.2},{f:'minions',cd:2.6},{f:'spiral',cd:2.2},{f:'hwall',cd:2.2},{f:'homing',cd:2.0},{f:'nova',cd:2.4}],
  dragon:  [{f:'lob',cd:1.6},{f:'wall',cd:2.4},{f:'aim3',cd:1.2},{f:'hwall',cd:2.2},{f:'pinwheel',cd:2.6},{f:'hbeam',cd:2.2},{f:'rain',cd:2.4}],
  star:  [{f:'spiral',cd:2.0},{f:'beam',cd:2.8},{f:'hsweep',cd:2.2},{f:'pinwheel',cd:2.4},{f:'homing',cd:2.0},{f:'hbeam',cd:2.2},{f:'nova',cd:2.4}],
  nimbus:[{f:'drizzle',cd:1.8},{f:'teleport',cd:2.2},{f:'aim3',cd:1.2},{f:'hwall',cd:2.2},{f:'homing',cd:2.0},{f:'cross',cd:2.2},{f:'hbeam',cd:2.2}],
  panda: [{f:'wall',cd:2.3},{f:'aim3',cd:1.2},{f:'hbeam',cd:2.2},{f:'pinwheel',cd:2.4},{f:'minions',cd:2.6},{f:'hwall',cd:2.2},{f:'cross',cd:2.2}],
  hamster:   [{f:'teleport',cd:2.0},{f:'aim3',cd:1.1},{f:'hsweep',cd:2.0},{f:'beam',cd:2.7},{f:'homing',cd:2.0},{f:'hwall',cd:2.0},{f:'snipe',cd:1.8}],
  penguin:[{f:'drizzle',cd:1.7},{f:'strike',cd:2.5},{f:'hwall',cd:2.2},{f:'wall',cd:2.3},{f:'pinwheel',cd:2.4},{f:'hbeam',cd:2.2},{f:'rain',cd:2.4}],
  ghost: [{f:'teleport',cd:1.9},{f:'spiral',cd:2.0},{f:'hbeam',cd:2.2},{f:'strike',cd:2.4},{f:'teleport',cd:1.9},{f:'hsweep',cd:2.0},{f:'nova',cd:2.4}],
  bear:  [{f:'spikeburst',cd:1.4},{f:'beam',cd:2.6},{f:'hwall',cd:2.2},{f:'orbrings',cd:2.2},{f:'pinwheel',cd:2.4},{f:'hbeam',cd:2.2},{f:'rain',cd:2.4}],
  snowman:[{f:'orbrings',cd:2.0},{f:'aim3',cd:1.1},{f:'hbeam',cd:2.2},{f:'wall',cd:2.3},{f:'pinwheel',cd:2.3},{f:'hwall',cd:2.2},{f:'cross',cd:2.2}],
  wolf:  [{f:'aim3',cd:1.0},{f:'spikeburst',cd:1.4},{f:'hsweep',cd:1.9},{f:'teleport',cd:2.0},{f:'homing',cd:1.9},{f:'hwall',cd:2.0},{f:'snipe',cd:1.7}],
  lynx:  [{f:'teleport',cd:1.7},{f:'spikeburst',cd:1.3},{f:'hsweep',cd:1.9},{f:'spiral',cd:2.0},{f:'teleport',cd:1.7},{f:'hbeam',cd:2.0},{f:'snipe',cd:1.7}],
  shroom:  [{f:'orbrings',cd:2.1},{f:'homing',cd:2.0},{f:'hbeam',cd:2.2},{f:'wall',cd:2.3},{f:'beam',cd:2.6},{f:'hwall',cd:2.2},{f:'nova',cd:2.4}],
};
const LEAF_ATTACKS=[{f:'leafstorm',cd:2.2},{f:'spiral',cd:2.0},{f:'hbeam',cd:2.2},{f:'radial',cd:1.6},{f:'leafstorm',cd:2.4},{f:'hwall',cd:2.2},{f:'nova',cd:2.2},{f:'wall',cd:2.3},{f:'teleport',cd:2.0}];
function bossDo(e,atk){
  const c=e.col;
  if(atk.f==='radial'){ const n=e.enrage?16:11; for(let i=0;i<n;i++){const a=i/n*TAU+e.t; eBullets.push(eBullet(e.x,e.y,Math.cos(a)*200,Math.sin(a)*200,c,'orb'));} snd.zap(); }
  else if(atk.f==='aim3'){ for(let k=-1;k<=1;k++){const a=Math.atan2(player.y-e.y,player.x-e.x)+k*0.18; eBullets.push(eBullet(e.x,e.y,Math.cos(a)*330,Math.sin(a)*330,c,'spike'));} e.eyeShake=0.3; snd.hit(); }
  else if(atk.f==='spiral'){ let base=e.t*3; const arms=e.enrage?3:2;
    for(let a=0;a<arms;a++)for(let i=0;i<8;i++){const ang=base+a/arms*TAU+i*0.25; setTimeout(()=>{ if(state==='playing')eBullets.push(eBullet(e.x,e.y,Math.cos(ang)*190,Math.sin(ang)*190,c,'star')); },i*40);} snd.zap(); }
  else if(atk.f==='minions'){ const n=e.enrage?4:3; for(let i=0;i<n;i++)mkEnemy({x:e.x+rand(-90,90),y:e.y+30,hp:3+wave*0.4,pattern:'descend',vy:rand(70,100),driftX:rand(-1,1)*10,holdY:rand(120,220),type:e.type}); toast('sclavi!','#fff'); }
  else if(atk.f==='leafstorm'){ const n=e.enrage?7:5; for(let i=0;i<n;i++){ const lc=LCOLS[randi(0,LCOLS.length-1)];
      mkEnemy({x:e.x+rand(-110,110),y:e.y+30,r:18,hp:2+wave*0.3,pattern:'descend',vy:rand(95,150),driftX:rand(-1.6,1.6),holdY:H+200,leaf:true,lcol:lc,spin0:rand(0,TAU),wobp:rand(0,TAU),type:'star'}); }
    e.mouth=1; toast('FRUNZE! 🍂','#ffb15c'); snd.hit(); }
  else if(atk.f==='lob'){ const n=e.enrage?3:2; for(let i=0;i<n;i++){const tx=player.x+rand(-120,120); const vx=(tx-e.x)*0.5; eBullets.push({x:e.x,y:e.y+e.r,vx,vy:-120,r:15,color:c,blob:true,grav:520,bk:'orb'});} snd.hit(); }
  else if(atk.f==='wall'){ const gap=randi(1,Math.max(2,Math.floor(W/120)-1)); const cols=Math.floor(W/90);
    for(let i=0;i<cols;i++){ if(i===gap||i===gap+1)continue; eBullets.push(eBullet(90*i+45,e.y+e.r,0,200,c,'orb')); } snd.zap(); }
  else if(atk.f==='beam'){ bossBeams.push({x:e.x,w:34,charge:1.0,active:0,life:1.6,src:e}); snd.alarm(); }
  else if(atk.f==='drizzle'){ for(let i=0;i<3;i++){const cx=rand(W*0.15,W*0.85); for(let k=0;k<5;k++)setTimeout(()=>{if(state==='playing')eBullets.push(eBullet(cx+rand(-30,30),e.y,rand(-20,20),rand(150,210),c,'drop'));},k*70);} snd.hit(); }
  else if(atk.f==='strike'){ const tx=player.x; bossBeams.push({x:tx,w:26,charge:0.8,active:0,life:1.2,bolt:true,col:c}); snd.alarm(); }
  else if(atk.f==='spikeburst'){ const n=e.enrage?13:9; const base=Math.atan2(player.y-e.y,player.x-e.x);
    for(let i=0;i<n;i++){const a=base+(i-(n-1)/2)*0.16; eBullets.push(eBullet(e.x,e.y,Math.cos(a)*380,Math.sin(a)*380,c,'spike'));} e.eyeShake=0.35; snd.hit(); }
  else if(atk.f==='orbrings'){ const rings=e.enrage?3:2;
    for(let r=0;r<rings;r++)setTimeout(()=>{ if(state!=='playing')return; const n=12,sp=150+r*40,off=r*0.26;
      for(let i=0;i<n;i++){const a=i/n*TAU+off; eBullets.push(eBullet(e.x,e.y,Math.cos(a)*sp,Math.sin(a)*sp,c,'orb'));} snd.zap(); },r*260); }
  else if(atk.f==='teleport'){ boom(e.x,e.y,12,c); shake(6,.2); snd.alarm();
    e.cx=clamp((player.x<W/2?1:-1)*rand(W*0.22,W*0.4)+W/2, e.r+12, W-e.r-12); e.x=e.cx; e.moveT=rand(2,3.2); e.tp=0.5;
    setTimeout(()=>{ if(state!=='playing'||e.dead)return; boom(e.x,e.y,14,c);
      const n=e.enrage?14:10; for(let i=0;i<n;i++){const a=i/n*TAU+e.t; eBullets.push(eBullet(e.x,e.y,Math.cos(a)*235,Math.sin(a)*235,c,'orb'));} snd.zap(); }, 230); }
  else if(atk.f==='homing'){ const n=e.enrage?5:3; for(let i=0;i<n;i++){const a=-Math.PI/2+(i-(n-1)/2)*0.42;
      const b=eBullet(e.x,e.y,Math.cos(a)*150,Math.sin(a)*150,c,'orb'); b.home=true; b.homeT=1.7; b.spd=150; eBullets.push(b);} e.eyeShake=0.3; snd.hit(); }
  else if(atk.f==='pinwheel'){ const shots=e.enrage?11:8;
    for(let s=0;s<shots;s++)setTimeout(()=>{ if(state!=='playing'||e.dead)return; const base=e.t*4+s*0.5, arms=4;
      for(let a=0;a<arms;a++){const ang=base+a/arms*TAU; eBullets.push(eBullet(e.x,e.y,Math.cos(ang)*215,Math.sin(ang)*215,c,'star'));} snd.zap(); }, s*85); }
  else if(atk.f==='rain'){ const n=e.enrage?14:10;
    for(let i=0;i<n;i++)setTimeout(()=>{ if(state!=='playing'||e.dead)return; eBullets.push(eBullet(rand(20,W-20),-20,rand(-30,30),rand(230,300),c,'drop')); snd.zap(); }, i*70); }
  else if(atk.f==='cross'){ const corners=[[0,0],[W,0],[0,H*0.5],[W,H*0.5]];
    for(const cn of corners){ const dx=player.x-cn[0],dy=player.y-cn[1],d=Math.hypot(dx,dy)||1,a0=Math.atan2(dy,dx);
      for(let k=-1;k<=1;k++){ const a=a0+k*0.13; eBullets.push(eBullet(cn[0],cn[1],Math.cos(a)*265,Math.sin(a)*265,c,'spike')); } } snd.zap(); }
  else if(atk.f==='nova'){ const n=e.enrage?22:16;
    for(let r=0;r<2;r++){ const sp=160+r*95, off=r*(Math.PI/n);
      for(let i=0;i<n;i++){ const a=i/n*TAU+off; eBullets.push(eBullet(e.x,e.y,Math.cos(a)*sp,Math.sin(a)*sp,c,'orb')); } }
    shake(7,.25); if(snd.boom)snd.boom(); particles.push({x:e.x,y:e.y,vx:0,vy:0,life:.5,max:.5,r:16,grow:230,ring:true,color:c}); }
  else if(atk.f==='snipe'){ const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1; e.eyeShake=0.4;
    setTimeout(()=>{ if(state!=='playing'||e.dead)return; const sp=560; eBullets.push(eBullet(e.x,e.y,dx/d*sp,dy/d*sp,'#ff5a6a','spike')); snd.alarm(); }, 350); }
  // ---- horizontal attacks (sweep across the screen sideways) ----
  else if(atk.f==='hbeam'){ // one or two full-width horizontal laser bands, telegraphed
    const lanes=e.enrage?2:1; for(let i=0;i<lanes;i++){ const ly=clamp(player.y+rand(-40,40)+i*70, H*0.4, H-50);
      bossBeams.push({horiz:true, y:ly, h:32, charge:1.1, active:0, life:1.8, col:c}); } snd.alarm(); }
  else if(atk.f==='hwall'){ // a vertical wall of orbs sweeping in from one side, with a gap
    const fromL=Math.random()<0.5, dir=fromL?1:-1, sx=fromL?-20:W+20; const sp=dir*rand(150,210);
    const rows=Math.floor(H/85), gap=randi(1,Math.max(1,rows-2));
    for(let r=0;r<rows;r++){ if(r===gap||r===gap+1)continue; eBullets.push(eBullet(sx, 70+r*85, sp, 0, c, 'orb')); } snd.zap(); }
  else if(atk.f==='hsweep'){ // a fan that sweeps horizontally over time
    const fromL=Math.random()<0.5; const shots=e.enrage?12:8;
    for(let s=0;s<shots;s++)setTimeout(()=>{ if(state!=='playing'||e.dead)return;
      const a=(fromL?0:Math.PI)+(fromL?1:-1)*(s/shots-0.5)*1.1;
      eBullets.push(eBullet(e.x,e.y,Math.cos(a)*300,Math.abs(Math.sin(a))*120+90,c,'spike')); snd.hit(); }, s*70); }
}
function updateBossBeams(dt){
  for(const bm of bossBeams){
    if(bm.charge>0){ bm.charge-=dt; if(bm.charge<=0){bm.active=0.45; snd.boom(); shake(10,.3);} }
    else if(bm.active>0){ bm.active-=dt;
      if(!player.dead&&player.invuln<=0){
        const hit = bm.horiz ? Math.abs(player.y-bm.y)<bm.h/2+player.r-4 : Math.abs(player.x-bm.x)<bm.w/2+player.r-4;
        if(hit) hitPlayer();
      }
    }
    bm.life-=dt;
  }
  bossBeams=bossBeams.filter(b=>b.life>0&&!(b.charge<=0&&b.active<=0));
}
function updateBonus(dt){
  bonusT+=dt;
  if(bonusType==='gravity'){
    const cx=W/2, cy=H*0.40, target=26+Math.floor(wave/3);
    const alive=enemies.reduce((n,e)=>n+(e.bonus?1:0),0);
    if(bonusSpawned<target && alive<=5){               // keep the arena stocked — a fresh ring warps in
      const rad=rand(66,170), cnt=Math.min(8,target-bonusSpawned), dir=Math.random()<.5?-1:1, sp=dir*rand(0.6,1.1);
      for(let k=0;k<cnt;k++){ const a=k/cnt*TAU;
        mkEnemy({x:cx+Math.cos(a)*rad,y:cy+Math.sin(a)*rad*0.66,r:15,hp:2+Math.floor(wave*0.25),pattern:'orbit',
          oa:a,orad:rad,osp:sp,ocx:cx,ocy:cy,ogrow:rand(-6,6),bonus:true,type:CRITTERS[randi(0,CRITTERS.length-1)],acc:Math.random()<.4?ACCS[randi(0,5)]:null});
        bonusSpawned++; }
    }
    if(bonusSpawned>=target && alive===0 && bonusT>2){ waveActive=false; betweenT=1.2; }
    return;
  }
  if(bonusType==='asteroid'){
    const target=16+Math.floor(wave/4);
    if(bonusT>0.3 && bonusSpawned<target && Math.random()<0.10){ bonusSpawned++;
      const big=Math.random()<0.4; const r=big?rand(34,46):rand(20,30);
      const fromTop=Math.random()<0.6;
      const x=fromTop?rand(30,W-30):(Math.random()<.5?-r:W+r);
      const vx=fromTop?rand(-60,60):(x<0?rand(120,200):-rand(120,200));
      mkEnemy({x,y:fromTop?-r:rand(40,H*0.4),r,hp:big?5+Math.floor(wave*0.5):2+Math.floor(wave*0.3),
        pattern:'rock',vx,vy:rand(150,250),spin:rand(0,TAU),vr:rand(-2,2),asteroid:true,rock:true,bonus:true,type:'star'});
    }
    if(bonusSpawned>=target && !enemies.some(e=>e.bonus) && bonusT>2){ waveActive=false; betweenT=1.2; }
    return;
  }
  if(bonusType==='comet'){
    const target=14+Math.floor(wave/4);
    if(bonusT>0.3 && bonusSpawned<target && Math.random()<0.12){ bonusSpawned++;
      const fromL=Math.random()<0.5, dir=fromL?1:-1, r=rand(18,30);
      mkEnemy({x:fromL?-r:W+r, y:rand(-40,H*0.25), r, hp:2+Math.floor(wave*0.3),
        pattern:'rock', vx:dir*rand(170,260), vy:rand(160,240),
        spin:rand(0,TAU), vr:rand(-2,2),
        asteroid:true, rock:true, bonus:true, fire:true, ice:true, type:'star'});
    }
    if(bonusSpawned>=target && !enemies.some(e=>e.bonus) && bonusT>2){ waveActive=false; betweenT=1.2; }
    return;
  }
  if(bonusType==='christmas'||bonusType==='autumn'){
    const isX=bonusType==='christmas';
    if(bonusT>0.3 && bonusSpawned<20 && Math.random()<0.13){ bonusSpawned++;
      const cfg={x:rand(40,W-40),y:-40,r:isX?16:18,hp:1,pattern:'fall',vy:rand(isX?150:80,isX?235:150),driftX:rand(isX?20:55,isX?60:130),wobp:rand(0,TAU),bonus:true,type:'bird'};
      if(isX){ cfg.bauble=true; cfg.bcol=XCOLS[randi(0,XCOLS.length-1)]; }
      else { cfg.leaf=true; cfg.lcol=LCOLS[randi(0,LCOLS.length-1)]; cfg.spin0=rand(0,TAU); }
      mkEnemy(cfg);
    }
    if(bonusSpawned>=20 && !enemies.some(e=>e.bonus) && bonusT>2){ waveActive=false; betweenT=1.2; }
    return;
  }
  if(bonusType==='meteor'){
    if(bonusT>0.3 && bonusSpawned<18 && Math.random()<0.12){ bonusSpawned++;
      mkEnemy({x:rand(40,W-40),y:-40,r:18,hp:1,pattern:'fall',vy:rand(150,240),driftX:rand(30,80),wobp:rand(0,TAU),bonus:true,type:CRITTERS[randi(0,CRITTERS.length-1)],acc:Math.random()<.3?ACCS[randi(0,5)]:null});
    }
    if(bonusSpawned>=18 && !enemies.some(e=>e.bonus) && bonusT>2){ waveActive=false; betweenT=1.2; }
    return;
  }
  if(bonusT>0.4 && bonusSpawned<12 && Math.random()<0.08){ bonusSpawned++;
    const dir=Math.random()<.5?1:-1, y=rand(70,H*0.40);
    mkEnemy({x:dir>0?-50:W+50,y,r:20,hp:1,pattern:'fly',vx:dir*rand(120,180),bonus:true,ufo:true,type:Math.random()<0.7?'bird':CRITTERS[randi(0,CRITTERS.length-1)],acc:Math.random()<.4?ACCS[randi(0,5)]:null});
  }
  const flyLeft=enemies.some(e=>e.bonus);
  if(bonusSpawned>=12 && !flyLeft && bonusT>2){ waveActive=false; betweenT=1.2; }
}

//==================================================================
// PLAYER ACTIONS
//==================================================================
function fireMissile(ship){ if(net.mode==='guest'){ netSend({t:'act',a:'rocket'}); return; }
  ship=ship||player;                                     // fiecare navă își cheltuie rachetele ei
  if(bossIntro>0) return;                                // locked during boss cinematic
  if(state!=='playing'||ship.dead||ship.missiles<=0)return;
  ship.missiles--; runStats.missiles++; snd.missile(); snd.bomb();
  // a rocket streaks up and detonates across the whole screen (bomb-level damage)
  shake(22,.55); flash=0.55; flashCol='#fff';
  for(const e of enemies)damageEnemy(e,e.boss?70:9999,e.x,e.y,null,ship);
  eBullets=[];
  for(let i=0;i<14;i++)particles.push({x:ship.x+rand(-4,4),y:ship.y-ship.r-i*22,vx:rand(-30,30),vy:rand(-120,-260),color:i%2?'#fff':'#8fd3ff',life:.4,max:.4,r:rand(3,6)});
  particles.push({x:ship.x,y:ship.y,vx:0,vy:0,life:.5,max:.5,r:24,grow:Math.max(W,H)*1.6,ring:true,color:'#8fd3ff'});
  for(let i=0;i<70;i++)particles.push(part(ship.x,ship.y,rand(0,TAU),rand(220,580),Math.random()<.5?'#fff':'#8fd3ff',rand(.3,.7),rand(2,5)));
  for(let i=0;i<6;i++)setTimeout(()=>{ if(state==='playing')boom(rand(W*0.15,W*0.85),rand(H*0.15,H*0.6),18,'#8fd3ff'); },i*60);
  updateHUD();
}
function activateBurst(ship){ if(net.mode==='guest'){ netSend({t:'act',a:'burst'}); return; }
  ship=ship||player;
  if(state!=='playing'||ship.dead)return;
  if(ship.burst<=0||ship.burstT>0)return;
  ship.burst--; ship.burstT=4.5; snd.pickup(); toast((ship===p2?'P2 · ':'')+'BURST FIRE! 🔥','#ff8a3b'); updateHUD();
}
// ——— tragerea: o navă pe rând, fiecare cu arma ei ———
// La un singur jucător lista e exact [player], deci codul face ce făcea înainte.
function activeShips(){ const s=[]; if(!player.dead)s.push(player);
  if(net.mode==='host'&&p2.active&&!p2.dead)s.push(p2); return s; }
function fireAllShips(dt){
  beams.length=0;
  if(bossIntro>0)return;                                   // fără trageri în cinematicul de boss
  for(const ship of activeShips()){
    if(ship.weapon==='laser'&&ship.lvl.laser>0)updateLaser(ship,dt);
    else fireFrom(ship,dt);
  }
}
function playerFire(dt){ fireAllShips(dt); }                // numele vechi, păstrat
function fireFrom(ship,dt){
  ship.fireT-=dt; const wl0=ship.lvl[ship.weapon]; if(wl0<=0)return;
  const bf=ship.burstT>0; const wl=Math.min(9,wl0+(bf?3:0));
  let rate=ship.weapon==='vulcan'?0.072:ship.weapon==='rifle'?0.62:
           ship.weapon==='scatter'?0.21:ship.weapon==='arc'?0.19:
           ship.weapon==='boomer'?0.42:ship.weapon==='plasma'?0.40:
           ship.weapon==='storm'?0.22:ship.weapon==='wave'?0.085:0.15;
  rate=Math.max(0.05,rate-wl*0.006); if(bf)rate*=0.5; if(frenzyT>0)rate*=0.55;
  if(ship.fireT>0)return; ship.fireT=rate*(ship.fireMul||1); ship.muzzle=0.07;
  const rot=ship.aimRot||0, cs=Math.cos(rot), sn=Math.sin(rot);
  const rvx=(vx,vy)=>vx*cs-vy*sn, rvy=(vx,vy)=>vx*sn+vy*cs;
  const mk=(x,y,vx,vy,dmg,color,r,wpn)=>mkBolt(x,y,vx,vy,dmg,color,r,wpn,ship);
  // gurile de tun ale ACESTEI nave: ea însăși + catelușii ei, nimic altceva
  const origins=[{x:ship.x+rvx(0,-ship.r),y:ship.y+rvy(0,-ship.r)}];
  for(let i=0;i<(ship.wingmen||0);i++)origins.push({x:ship.x+(i===0?-44:44),y:ship.y-2});
  for(const o of origins){
    if(ship.weapon==='pulse'){ const streams=Math.min(5,Math.ceil(wl/2));
      for(let i=0;i<streams;i++){const a=(i-(streams-1)/2)*0.13; const vx=Math.sin(a)*130,vy=-740;
        bullets.push(mk(o.x,o.y,rvx(vx,vy),rvy(vx,vy),2.2+wl*0.28,'#ff8fc7',5,'pulse'));} snd.shoot();
    } else if(ship.weapon==='scatter'){ const n=3+Math.min(8,wl);
      for(let i=0;i<n;i++){const a=-Math.PI/2+(i-(n-1)/2)*(0.95/n); const vx=Math.cos(a)*640,vy=Math.sin(a)*640;
        bullets.push(mk(o.x,o.y,rvx(vx,vy),rvy(vx,vy),1.6+wl*0.13,'#ffe46b',4,'scatter'));} snd.scatter();
    } else if(ship.weapon==='vulcan'){ const n=5+Math.min(7,wl);            // evantai verde larg, foc foarte rapid
      for(let i=0;i<n;i++){ const a=-Math.PI/2+(i-(n-1)/2)*(1.45/n);
        const vx=Math.cos(a)*(690+wl*12), vy=Math.sin(a)*(690+wl*12);
        bullets.push(mk(o.x,o.y,rvx(vx,vy),rvy(vx,vy),1.5+wl*0.12,'#7dff9a',3.4,'vulcan')); } snd.scatter();
    } else if(ship.weapon==='rifle'){ const b=mk(o.x,o.y,rvx(0,-540),rvy(0,-540),18+wl*3.6,'#c07bff',19+wl*0.8,'rifle');
      b.pierce=2+Math.floor(wl/2); b.splash=70+wl*10; bullets.push(b); snd.shoot(); if(snd.bomb)snd.bomb();
    } else if(ship.weapon==='arc'){ doArc(o.x,o.y,wl,ship); snd.zap(); }
    else if(ship.weapon==='boomer'){ const n=wl>=5?2:1, S=600+wl*14, A=950+wl*30;
      for(let i=0;i<n;i++){ const a=-Math.PI/2+(n>1?(i?0.24:-0.24):0); const vx=Math.cos(a)*S,vy=Math.sin(a)*S;
        const rx=rvx(vx,vy), ry=rvy(vx,vy); const sp=Math.hypot(rx,ry)||1;
        const b=mk(o.x,o.y,rx,ry,4.5+wl*0.7,'#ffce6a',9,'boomer');
        b.boomer=true; b.ax=-rx/sp*A; b.ay=-ry/sp*A; b.spin=rand(0,TAU); b.pierce=3+wl; b.life=1.5; bullets.push(b); } snd.shoot();
    } else if(ship.weapon==='plasma'){ const n=wl>=6?2:1;
      // aim plasma at the nearest enemy so it tracks a moving boss instead of flying straight up
      let tgt=null,bd=1e18; for(const en of enemies){ if(en.dead||en.y<=0)continue; const d=dist2(o.x,o.y,en.x,en.y); if(d<bd){bd=d;tgt=en;} }
      const ang=tgt?Math.atan2(tgt.y-o.y,tgt.x-o.x):-Math.PI/2, spd=470+wl*14;
      for(let i=0;i<n;i++){ const a=ang+(n>1?(i?0.10:-0.10):0);
        const p=mk(o.x,o.y,Math.cos(a)*spd,Math.sin(a)*spd,11+wl*2.1,'#b07bff',12+wl*0.6,'plasma');
        p.type='plasma'; p.splash=80+wl*9; p.orb=true; p.phome=true; bullets.push(p); } snd.shoot();
    } else if(ship.weapon==='storm'){ doStorm(o.x,o.y,wl,ship); snd.zap();
    } else if(ship.weapon==='wave'){ const ph=(ship.wavePhase=(ship.wavePhase||0)+0.6);
      const cols=['#9affc0','#7fe1ff','#ffd1f0','#ffe46b']; const n=2+Math.min(2,Math.floor(wl/4));
      for(let i=0;i<n;i++){ const off=Math.sin(ph+i*2.1)*(30+wl*3); const vx=Math.sin(ph+i*2.1)*95,vy=-760;
        bullets.push(mk(o.x+rvx(off,0),o.y+rvy(off,0),rvx(vx,vy),rvy(vx,vy),2.6+wl*0.45,cols[(Math.floor(ph)+i)%cols.length],5,'wave')); } snd.shoot();
    }
  }
  muzzle(origins[0].x,origins[0].y,WEAPONS[ship.weapon].color);
}
function doArc(ox,oy,wl,ship){
  const tg=enemies.filter(e=>e.y>0).sort((a,b)=>dist2(ox,oy,a.x,a.y)-dist2(ox,oy,b.x,b.y));
  const n=Math.min(tg.length,1+Math.floor(wl/2)); let px=ox,py=oy;
  const focus=(tg.length<=1)?2.2:1;     // concentrate on a lone target (e.g. a boss)
  for(let i=0;i<n;i++){const e=tg[i]; zaps.push({x1:px,y1:py,x2:e.x,y2:e.y,life:.12,max:.12});
    damageEnemy(e,(1.6+wl*0.4)*focus,e.x,e.y,'arc',ship); px=e.x;py=e.y;}
}
function mkBolt(x,y,vx,vy,dmg,color,r,wpn,ship){const s=ship||(typeof player!=='undefined'?player:null);
  return {x,y,vx,vy,dmg,r:(r||4)+((s&&s.bulletR)||0),color,type:'b',wpn,pierce:(s&&s.pierce)||0,own:s};}
function doStorm(ox,oy,wl,ship){
  const tg=enemies.filter(e=>e.y>0&&!e.dead).sort((a,b)=>dist2(ox,oy,a.x,a.y)-dist2(ox,oy,b.x,b.y));
  if(!tg.length)return;
  const forks=2+Math.floor(wl/2); const dmg=3+wl*0.7;
  const n=Math.min(tg.length,forks);
  const focus=(tg.length<=1)?3:1;           // concentrate on a lone target (e.g. a boss)
  for(let i=0;i<n;i++){ const e=tg[i];
    zaps.push({x1:ox,y1:oy,x2:e.x,y2:e.y,life:.13,max:.13});
    damageEnemy(e,dmg*focus,e.x,e.y,'storm',ship);
    for(const e2 of enemies){ if(e2===e||e2.dead)continue; if(dist2(e.x,e.y,e2.x,e2.y)<70*70){ damageEnemy(e2,dmg*0.5,e2.x,e2.y,'storm',ship); break; } }
  }
}
function muzzle(x,y,col){for(let i=0;i<4;i++)particles.push(part(x,y,-Math.PI/2+rand(-.5,.5),rand(60,160),col,rand(.1,.2),rand(1.5,3)));}

// Laserul e tot pe navă. `beams` se golește o dată pe cadru, în fireAllShips,
// ca să încapă fasciculele amândurora dacă au amândoi laser.
function updateLaser(ship,dt){
  if(!ship||ship.lvl===undefined){ dt=arguments[0]; ship=player; }   // apel vechi updateLaser(dt)
  const wl=Math.min(9,ship.lvl.laser+(ship.burstT>0?3:0)), dps=(24+wl*8)*(ship.burstT>0?1.7:1);
  const bw=7+wl*1.7, sp=14+wl*1.2;              // fasciculul se îngroașă cu nivelul
  let xs=[ship.x];
  if(wl>=3)xs=[ship.x-sp,ship.x+sp];
  if(wl>=6)xs=[ship.x-sp*1.4,ship.x,ship.x+sp*1.4];
  if(wl>=8)xs=[ship.x-sp*2,ship.x-sp*0.7,ship.x+sp*0.7,ship.x+sp*2];
  for(let i=0;i<(ship.wingmen||0);i++)xs.push(ship.x+(i===0?-44:44));
  for(const bx of xs){ beams.push({x:bx,y:ship.y-ship.r,dps,w:bw});
    for(const e of enemies){ if(!e.dead&&Math.abs(e.x-bx)<e.r+bw*0.6&&e.y<ship.y) damageEnemy(e,dps*dt,e.x,e.y-e.r,'laser',ship); } }
  if(Math.random()<0.4)snd.zap();
}

//==================================================================
// PICKUPS
//==================================================================
const COIN_TIERS=[{n:'bronz',col:'#d68b4f',edge:'#8a5320',pts:[20,45],cur:1},{n:'argint',col:'#d9e0e8',edge:'#8b97a6',pts:[70,130],cur:2},{n:'aur',col:'#ffd24a',edge:'#c98a12',pts:[180,300],cur:5},{n:'diamant',col:'#9fe9ff',edge:'#46b6d8',pts:[600,950],cur:10,gem:1}];
function coinTier(){ const r=Math.random();
  if(hasLuck()) return r<0.44?0:r<0.76?1:r<0.962?2:3;    // talisman: monede mai bune, diamant ~3.8%
  return r<0.62?0:r<0.88?1:r<0.985?2:3; }   // diamant ~1.5% (rar & special)
function dropLoot(x,y,boss){
  if(boss){ spawnPickup(x-44,y,'gift',pickW()); spawnPickup(x+44,y,Math.random()<.5?'missile':'wing');
    if(Math.random()<0.5)spawnPickup(x,y-10,'life');
    for(let i=0;i<7;i++)spawnPickup(x+rand(-70,70),y+rand(-20,30),'coin'); return; }
  if(hasLuck()&&Math.random()<0.34)spawnPickup(x+rand(-22,22),y+rand(-8,8),'coin');   // 🍀 talisman
  const r=Math.random();
  if(r<0.015)spawnPickup(x,y,'life');
  else if(r<0.05)spawnPickup(x,y,'gift',pickW());        // ammo/weapon box rate cut (~7% -> ~3.5%) for higher difficulty
  else if(r<0.08)spawnPickup(x,y,'missile');
  else if(r<0.10)spawnPickup(x,y,'shield');
  else if(r<0.12)spawnPickup(x,y,'magnet');
  else if(r<0.135)spawnPickup(x,y,'wing');
  else if(r<0.27)spawnPickup(x,y,'cream');
  else spawnPickup(x,y,'coin');
}
function pickW(){ const base=['pulse','scatter','laser','arc'];
  const bought=[]; if(shop.owned.w_vulcan)bought.push('vulcan'); if(shop.owned.w_rifle)bought.push('rifle');
  if(bought.length && Math.random()<0.24) return bought[randi(0,bought.length-1)];
  // new weapons start appearing from wave 4, a bit rarer than the classics
  if(wave>=4 && Math.random()<0.45) return ['boomer','plasma','storm','wave'][randi(0,3)];
  return base[randi(0,3)]; }
function spawnPickup(x,y,type,weapon){const p={x,y,vx:rand(-30,30),vy:rand(55,95),type,weapon,t:rand(0,TAU),r:15};if(type==='coin')p.tier=coinTier();pickups.push(p);}
// Cadoul îl ia nava care l-a atins: arma, scutul, viața — toate merg la `ship`.
// Punctele intră și în punga navei (ship.score / ship.coins), pe lângă totalul comun.
function collect(p,ship){
  ship=ship||player;
  const who=(ship===p2)?'P2 · ':'';                       // ca gazda să știe a cui e vestea
  const pts_=(n)=>addScore(ship,n);
  const pc=p.type==='gift'?(WEAPONS[p.weapon]?WEAPONS[p.weapon].color:'#ffe46b'):'#ffe46b';
  particles.push({x:p.x,y:p.y,vx:0,vy:0,life:.32,max:.32,r:8,grow:64,ring:true,color:pc});
  for(let i=0;i<7;i++)particles.push(part(p.x,p.y,rand(0,TAU),rand(80,200),Math.random()<.5?'#fff':pc,rand(.2,.4),rand(2,3.5)));
  if(p.type==='gift'){ const w=p.weapon;
    if(ship.weapon===w)ship.lvl[w]=Math.min(9,ship.lvl[w]+1);
    else{ if(ship.lvl[w]===0)ship.lvl[w]=Math.max(1,Math.min(ship.lvl[ship.weapon]||1,3)); ship.weapon=w; }
    floater(p.x,p.y,WEAPONS[w].name+' '+ship.lvl[w],WEAPONS[w].color); toast(who+WEAPONS[w].name.toUpperCase()+' lvl '+ship.lvl[w],WEAPONS[w].color); snd.pickup();
  } else if(p.type==='missile'){ship.missiles+=2;floater(p.x,p.y,'+2 🚀','#8fd3ff');snd.pickup();}
  else if(p.type==='burst'){ if(ship.burst<3){ship.burst++;floater(p.x,p.y,'+1 🔥','#ff8a3b');} else{pts_(500);floater(p.x,p.y,'+500','#ffe46b');} snd.pickup(); }
  else if(p.type==='shield'){ship.shield=9;floater(p.x,p.y,'scut!','#7ef9d2');toast(who+'SCUT ACTIV','#7ef9d2');snd.pickup();}
  else if(p.type==='magnet'){ship.magnet=9;floater(p.x,p.y,'magnet!','#ff8fc7');toast(who+'MAGNET ACTIV 🧲','#ff8fc7');snd.pickup();}
  else if(p.type==='wing'){ if(ship.wingmen<2){ship.wingmen++;floater(p.x,p.y,'coleg!','#ffe46b');toast(who+'COLEG NOU 👯','#ffe46b');} else{pts_(600);floater(p.x,p.y,'+600','#ffe46b');} snd.pickup();}
  else if(p.type==='life'){ if(ship.lives<6){ship.lives++;floater(p.x,p.y,'+1 💗','#ff8fc7');toast(who+'VIAȚĂ EXTRA 💗','#ff8fc7');} else{pts_(1500);floater(p.x,p.y,'+1500','#ffe46b');} snd.pickup(); }
  else if(p.type==='coin'){ addCombo(); const T=COIN_TIERS[p.tier||0]; runStats.coins+=(T.cur||1); ship.coins=(ship.coins||0)+(T.cur||1);
    const pts=Math.round(rand(T.pts[0],T.pts[1])*scoreNow()); pts_(pts);
    if(T.gem){ runStats.gems=(runStats.gems||0)+T.gem; }
    if((p.tier||0)===3){ floater(p.x,p.y-6,'💎 +'+T.cur+' 🪙',T.col); confetti(p.x,p.y); boom(p.x,p.y,16,T.col); toast(who+'💎 DIAMANT! +'+T.cur+' monede','#9fe9ff'); }
    else floater(p.x,p.y,'+'+pts,T.col);
    snd.coin(); }
  else if(p.type==='cream'){ addCombo(); const pts=Math.round(rand(120,220)*scoreNow()); pts_(pts); floater(p.x,p.y,'+'+pts,'#ff9ec4'); snd.coin(); }
  updateHUD();
}
// Punctele intră și în totalul echipei, și în partea navei care le-a câștigat.
// Invariantul pe care se sprijină testele: player.score + p2.score === score.
function addScore(ship,n){ n=n|0; score+=n; const s=ship||player; s.score=(s.score||0)+n; }
function addCombo(){ combo++; comboT=2.4; mult=clamp(1+Math.floor(combo/6),1,9); if(mult>runStats.maxMult)runStats.maxMult=mult; }
function scoreNow(){ return mult*scoreMul*(frenzyT>0?1.5:1); }
function addFrenzy(a){ if(frenzyT>0)return; frenzy=clamp(frenzy+a,0,1);
  if(frenzy>=1){ frenzyT=6; frenzy=1; flash=0.4; flashCol='#ffd1ec'; shake(11,.32); toast('FRENEZIE! 🌟','#ff8fc7'); if(snd.power)snd.power(); else if(snd.coin)snd.coin(); } }
function floater(x,y,txt,col){floaters.push({x,y,txt,color:col,life:1.1,max:1.1});}

//==================================================================
// COMBAT
//==================================================================
function damageEnemy(e,dmg,hx,hy,wpn,owner){
  if(e.dead)return; const col=e.col||CRITCOL[e.type]||'#fff';
  const who=owner||player;          // cine a tras — primește punctele și își aplică bonusurile lui
  if(wpn&&WEAK[e.type]===wpn){ dmg*=1.6; particles.push(part(hx,hy,rand(0,TAU),rand(160,260),'#fff7c0',rand(.18,.3),rand(2,3.5))); particles.push(part(hx,hy,rand(0,TAU),rand(160,260),'#fff7c0',rand(.18,.3),rand(2,3.5))); }
  dmg*=(who.dmgMul||1);
  e.hp-=dmg; e.hit=0.1; e.ouch=0.26;
  if(e.bub && !e.bubBroken && e.maxHp && e.hp>0 && (e.hp/e.maxHp)<=0.5) shatterBubble(e);
  for(let i=0;i<3;i++)particles.push(part(hx,hy,rand(0,TAU),rand(60,170),col,rand(.2,.4),rand(2,4)));
  snd.hit();
  if(e.hp<=0){ e.dead=true; addCombo(); runStats.kills++;
    addFrenzy(e.boss?0.5:e.elite?0.4:e.bonus?0.03:e.baby?0.02:0.05);
    if(e.elite){ const pts=Math.round((900+wave*40)*scoreNow()); addScore(who,pts); floater(e.x,e.y,'AURIU +'+pts,'#ffd24a');
      toast('AURIU! 💛','#ffd24a'); snd.coin(); confetti(e.x,e.y); boom(e.x,e.y,20,'#ffd24a');
      particles.push({x:e.x,y:e.y,vx:0,vy:0,life:.6,max:.6,r:20,grow:380,ring:true,color:'#ffe46b'});
      spawnPickup(e.x,e.y,'gift',pickW()); spawnPickup(e.x+rand(-18,18),e.y,'coin'); dropLoot(e.x,e.y,false); updateHUD(); return; }
    if(e.bonus){ const pts=Math.round(120*scoreNow()); addScore(who,pts); floater(e.x,e.y,'+'+pts,'#ffe46b');
      snd.coin(); if(e.ufo)ufoBreak(e); else boom(e.x,e.y,14,col); spawnPickup(e.x,e.y,Math.random()<.20?'gift':'coin',pickW()); updateHUD(); return; }
    const pts=Math.round((e.boss?6000:Math.round((50+wave*5)*(e.baby?0.45:1)))*scoreNow()); addScore(who,pts); floater(e.x,e.y,'+'+pts,'#fff');
    if(e.boss){ runStats.bossKills++; if(e.type==='bear')runStats.bearKilled=true; if(e.leafBoss)runStats.leafBoss=true;
      snd.boom(); shake(26,.8); hitstop=0.12; confetti(e.x,e.y);
      particles.push({x:e.x,y:e.y,vx:0,vy:0,life:.55,max:.55,r:24,grow:460,ring:true,color:'#fff'});
      particles.push({x:e.x,y:e.y,vx:0,vy:0,life:.9,max:.9,r:30,grow:330,ring:true,color:col});
      for(let i=0;i<14;i++)setTimeout(()=>boom(e.x+rand(-70,70),e.y+rand(-50,50),16,col),i*60);
      flash=0.4; flashCol=col;
    } else { snd.explode(); boom(e.x,e.y,16,col);
      // CI4-style pop: bright secondary ring + tumbling fluff/feather debris
      particles.push({x:e.x,y:e.y,vx:0,vy:0,life:.32,max:.32,r:e.r*0.8,grow:e.r*7,ring:true,color:col});
      const fn=e.baby?3:6; for(let i=0;i<fn;i++){ const a=rand(0,TAU);
        particles.push({x:e.x,y:e.y,vx:Math.cos(a)*rand(60,180),vy:Math.sin(a)*rand(60,180)-40,life:rand(.5,.9),max:.9,r:rand(2.5,4.5),frag:true,ang0:rand(0,TAU),spin:rand(-8,8),color:i%2?col:'#fff'}); }
    }
    dropLoot(e.x,e.y,e.boss); updateHUD();
  }
}
function boom(x,y,n,col){ for(let i=0;i<n;i++)particles.push(part(x,y,rand(0,TAU),rand(90,340),Math.random()<.5?'#fff':col,rand(.3,.65),rand(2,5)));
  particles.push({x,y,vx:0,vy:0,life:.25,max:.25,r:8,grow:90,ring:true,color:col});
  particles.push({x,y,vx:0,vy:0,life:.12,max:.12,r:n*0.9,color:'#fff'}); // bright core flash
  for(let i=0;i<Math.ceil(n/3);i++)particles.push({x:x+rand(-6,6),y:y+rand(-6,6),vx:rand(-30,30),vy:rand(-40,-10),life:rand(.6,1.1),max:1.1,r:rand(5,9),smoke:true,color:'rgba(60,40,70,.5)'}); }
function confetti(x,y){ const cols=['#ff8fc7','#ffe46b','#8fd3ff','#c89bff','#7ef9d2'];
  for(let i=0;i<60;i++)particles.push(part(x,y,rand(0,TAU),rand(120,420),cols[randi(0,4)],rand(.6,1.3),rand(2,5))); }
function part(x,y,a,sp,color,life,r){return {x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,color,life,max:life,r:r||3};}
function hitPlayer(){
  if(player.invuln>0||player.dead)return;
  if(player.shield>0){player.shield=0;player.invuln=1.2;floater(player.x,player.y-26,'scut spart','#7ef9d2');shake(10,.3);snd.hurt();return;}
  if((player.guard||0)>0){player.guard--;player.invuln=1.6;floater(player.x,player.y-26,'😇 păzit!','#ffe46b');shake(10,.3);snd.hurt();updateHUD();return;}
  player.lives--; runStats.hitThisWave=true; player.hitThisWave=true; snd.hurt(); boom(player.x,player.y,30,'#7ef9d2'); shake(18,.5); combo=0;mult=1; if(frenzyT<=0)frenzy*=0.5;
  // losing a life also knocks the active weapon down a level (min 1) — every hit hurts your firepower
  const wk=player.weapon, wl=player.lvl[wk]||0;
  if(wl>1){ player.lvl[wk]=wl-1; floater(player.x,player.y-42,'⬇ muniție -1','#ff9ec4'); }
  updateHUD();
  if(player.lives<=0){player.dead=true;player.deadT=1.3;}
  else{player.invuln=2.4;player.x=W/2;player.y=H-130;}
}

//==================================================================
// LOOP
//==================================================================
let last=performance.now();
function loop(now){ let dt=(now-last)/1000; last=now; dt=Math.min(dt,0.05);
  if(hitstop>0){hitstop-=dt; dt*=0.15;}
  try{ if(state==='playing')update(dt); draw(); }
  catch(err){ console.error('frame error:',err); try{ showFatal('cadru: '+((err&&err.message)||err)); }catch(_){} }
  requestAnimationFrame(loop);
}
// ================= ONLINE CO-OP (own WebSocket relay) =================
// ▼▼▼ PUNE AICI ADRESA SERVERULUI TĂU (după ce îl pui pe Render) ▼▼▼
// Pe telefon nu ai consola de erori. Cand ceva crapa, il aratam pe ecran, o singura data,
// ca sa se poata citi si raporta in loc sa ghicim.
let _fatalSeen = '';
function showFatal(msg){
  msg = String(msg || 'eroare necunoscuta');
  if(_fatalSeen === msg) return;            // acelasi mesaj la 60 de cadre pe secunda — il aratam o data
  _fatalSeen = msg;
  try{
    let d = document.getElementById('errBox');
    if(!d){
      d = document.createElement('div'); d.id = 'errBox';
      d.style.cssText = 'position:fixed;left:6px;right:6px;top:6px;z-index:99999;background:rgba(140,10,40,.95);'
        + 'color:#fff;font:600 12px/1.4 system-ui,sans-serif;padding:10px 12px;border-radius:10px;'
        + 'white-space:pre-wrap;max-height:46vh;overflow:auto;user-select:text;-webkit-user-select:text';
      d.onclick = ()=>{ d.remove(); _fatalSeen = ''; };
      document.body.appendChild(d);
    }
    d.textContent = '⚠ ' + msg + '\n\n(atinge ca să închizi)';
  }catch(e){}
}
try{
  window.addEventListener('error', e=>showFatal((e.message||'eroare') + ' @ linia ' + (e.lineno||'?')));
  window.addEventListener('unhandledrejection', e=>showFatal('promisiune: ' + ((e.reason && e.reason.message) || e.reason)));
}catch(e){}

// Terenul gazdei, potrivit in ecranul oaspetelui: un singur factor de scalare + centrare.
// Cat timp nu esti oaspete, ramane gol si nu schimba nimic.
const coopView = { sc:1, pw:0, ph:0, ox:0, oy:0 };

// ——— netezirea miscarii la oaspete ———
// Instantaneele vin de 20 de ori pe secunda. Daca am sari direct la fiecare, miscarea
// ar fi in trepte. Asa ca pastram obiectele de la un instantaneu la altul (dupa un id
// dat de gazda) si le tragem lin spre pozitia noua. Nimic din asta nu ruleaza la gazda.
let _nidSeq = 0;
function NID(o){ return o.__nid || (o.__nid = ++_nidSeq); }
const NET_STEP = 0.05;   // gazda trimite la fiecare 50 ms
let netSnapT = 0;        // cat timp a trecut de la ultimul instantaneu
// Interpolare adevarata, nu netezire exponentiala: fiecare obiect merge in linie dreapta
// de unde era la ultimul instantaneu pana unde trebuie sa fie la urmatorul, si ajunge
// exact acolo. Asa nu ramane cronic in urma, cum s-ar intampla cu o apropiere procentuala.
function mergeNet(oldList, snap, build){
  const by = new Map();
  for(const o of oldList) if(o.__id !== undefined) by.set(o.__id, o);
  const out = [];
  for(const s of snap){
    const fresh = build(s);
    const prev = by.get(s.i);
    if(prev){                 // il stiam deja: pleaca de unde e desenat acum spre tinta noua
      prev.px = prev.x; prev.py = prev.y;
      prev.tx = fresh.x; prev.ty = fresh.y;
      for(const k in fresh) if(k !== 'x' && k !== 'y') prev[k] = fresh[k];
      out.push(prev);
    }else{                    // nou pe ecran: apare direct la locul lui, fara sa alunece
      fresh.__id = s.i;
      fresh.px = fresh.tx = fresh.x; fresh.py = fresh.ty = fresh.y;
      out.push(fresh);
    }
  }
  return out;
}
function smoothNet(list, a){
  for(const o of list){
    if(o.tx !== undefined){ o.x = o.px + (o.tx - o.px) * a; o.y = o.py + (o.ty - o.py) * a; }
  }
}

// cablarea câmpului — se face AICI, după ce constantele de mai sus există
{ const f = el('coopRelay');
  const tg = el('coopRelayToggle');
  if(tg) tg.onclick = ()=>{ const b = el('coopRelayBox'); showRelayBox(!b || b.style.display === 'none'); };
  if(f){
    f.addEventListener('input', ()=>{ f.style.borderColor='rgba(255,255,255,.22)'; });
    const commit = ()=>{ const n = saveRelayFromField();
      if(n){ f.value = n; relayHint('✓ salvată pe acest dispozitiv', '#7ef9d2'); }
      else  { relayHint('adresă goală — co-op-ul nu poate porni', '#ff8fc7'); } };
    f.addEventListener('change', commit);
    f.addEventListener('blur', commit);
    f.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ commit(); f.blur(); } });
    // cât timp scrii în câmp, tastele nu mai comandă nava
    ['keydown','keyup','keypress'].forEach(t=>f.addEventListener(t, e=>e.stopPropagation()));
  }
  try{ refreshRelayUI(); }catch(e){}
}
// ▲▲▲ ex: 'wss://kawaii-coop-relay.onrender.com' ▲▲▲
function shortId(){ return 'KW'+Math.random().toString(36).slice(2,7).toUpperCase(); }
function setCoopStatus(s){ const e=el('coopStatus'); if(e)e.textContent=s; }
function coopReset(){ net.stopped=true; net.room=null; try{ clearTimeout(net.retryT); }catch(e){}
  try{ if(net.ws){ net.ws.onclose=null; net.ws.onerror=null; net.ws.close(); } }catch(e){}
  net.mode='off'; net.ws=null; net.role=null; net.connected=false; net.tries=0;
  p2.active=false; p2.dead=false; p2.deadT=0; p2.lives=3; }
function startRoom(code,asHost){
  const RELAY_URL = getRelay();
  if(!relayIsSet(RELAY_URL)){
    el('coopCode').style.display='none';
    setCoopStatus('');
    showRelayBox(true);
    relayHint('⚠️ Scrie adresa serverului aici.', '#ffe46b');
    try{ const f=el('coopRelay'); if(f){ f.focus(); f.style.borderColor='#ffe46b'; } }catch(e){}
    return;
  }
  coopReset();                       // pune net.stopped=true; îl scoatem imediat mai jos
  net.role=asHost?'host':'guest';
  net.room=code; net.asHost=asHost; net.stopped=false; net.tries=0;
  el('coopCode').style.display='flex'; el('coopCodeVal').textContent=code;
  showCoopIntro(false);
  try{ el('coopCode').scrollIntoView({block:'nearest'}); }catch(e){}
  coopOpen();
}

// Serverul e pe un plan gratuit și adoarme; un GET simplu îl trezește mai repede
// decât o cerere de WebSocket care expiră.
function coopWake(url){ try{ fetch(String(url).replace(/^ws/,'http'),{mode:'no-cors',cache:'no-store'}); }catch(e){} }

function coopOpen(){
  if(net.stopped||!net.room)return;
  const RELAY_URL=getRelay(); if(!relayIsSet(RELAY_URL))return;
  try{ if(net.ws){ net.ws.onclose=null; net.ws.onerror=null; net.ws.close(); } }catch(e){}
  net.tries=(net.tries||0)+1;
  if(net.tries===1)coopWake(RELAY_URL);
  if(!net.connected){
    setCoopStatus(net.tries===1 ? 'mă conectez la server...'
                : net.tries<=3   ? 'serverul se trezește… mai durează puțin'
                                 : 'tot încerc… ('+net.tries+')');
  }
  let ws; try{ ws=new WebSocket(RELAY_URL); }catch(e){ setCoopStatus('eroare server: '+e); coopRetry(); return; }
  net.ws=ws;
  ws.onopen=()=>{ net.tries=0; try{ws.send(JSON.stringify({type:'join',room:net.room}));}catch(e){}
    if(net.connected){ if(state==='playing')toast('Reconectat ✓','#7ef9d2'); }
    else setCoopStatus(net.asHost?'cod gata · așteaptă prietenul':'aștept gazda...'); };
  ws.onmessage=(ev)=>{ let m; try{m=JSON.parse(ev.data);}catch(e){return;}
    if(m.type==='peer'){ if(!net.connected){ net.connected=true; net.mode=net.asHost?'host':'guest';
      p2.active=true; p2.x=W/2; p2.y=H-130; setCoopStatus('CONECTAT! pornim...'); setTimeout(()=>startGame(),400); } }
    else if(m.type==='left'){ if(state==='playing')toast('Co-op deconectat','#ff8fc7'); else setCoopStatus('celălalt a plecat — creează sau intră din nou'); }
    else if(m.type==='msg'){ onNetData(m.data); }
    else if(m.type==='error'){
      // camera a fost curățată fiindcă a stat singură prea mult: o refacem, codul rămâne valabil
      if(m.reason==='timeout'){ setCoopStatus('încă aștept… codul e tot bun'); try{ws.send(JSON.stringify({type:'join',room:net.room}));}catch(e){} return; }
      const M={bad_code:'cod invalid',room_full:'camera e deja plină',server_full:'serverul e ocupat — încearcă mai târziu'};
      setCoopStatus(M[m.reason]||'eroare de conectare');
      if(m.reason==='bad_code'||m.reason==='room_full')net.stopped=true; } };
  ws.onclose=()=>{ if(net.stopped)return;
    if(state==='playing')toast('Conexiune pierdută — reîncerc…','#ff8fc7');
    else if(net.tries===0)setCoopStatus('conexiune pierdută — reîncerc…');
    coopRetry(); };
  ws.onerror=()=>{};                 // onclose vine imediat după și se ocupă el
}

function coopRetry(){
  if(net.stopped||!net.room)return;
  try{ clearTimeout(net.retryT); }catch(e){}
  const wait=Math.min(6000, 700*Math.pow(1.7,Math.min(net.tries||1,5)));
  net.retryT=setTimeout(coopOpen, wait);
}

// Telefonul închide conexiunea când ieși din aplicație — de exemplu ca să trimiți
// codul pe WhatsApp. La întoarcere reintrăm în aceeași cameră, cu același cod.
try{ document.addEventListener('visibilitychange', ()=>{
  if(document.hidden||net.stopped||!net.room)return;
  if(!net.ws||net.ws.readyState>1){ net.tries=0; coopOpen(); }
}); }catch(e){}

// Blocul cu punga fiecăruia, pe ecranul final. Ascuns dacă n-a fost co-op.
function showCoopSplit(sMine,sHis,cMine,cHis){ const cs=el('coopSplit'); if(!cs)return;
  const on=(net.mode!=='off'&&p2.active);
  cs.style.display=on?'flex':'none';
  if(!on)return;
  const put=(id,v)=>{ const n=el(id); if(n)n.textContent=(v|0).toLocaleString(); };
  put('oScoreMe',sMine); put('oScoreHim',sHis); put('oCoinsMe',cMine); put('oCoinsHim',cHis); }
function netHost(){ startRoom(shortId(),true); }
function netJoin(code){ startRoom(code,false); }
function netSend(o){ if(net.ws&&net.ws.readyState===1){ if(net.ws.bufferedAmount>180000)return;
  try{net.ws.send(JSON.stringify({type:'msg',data:o}));}catch(e){} } }
function onNetData(m){ if(!m)return;
  if(net.mode==='host'){
    if(m.t==='in'){ if(p2.dead)return; p2.x=clamp((m.nx!==undefined?m.nx*W:m.x),24,W-24); p2.y=clamp((m.ny!==undefined?m.ny*H:m.y),H*0.42,H-34); p2.active=true; }
    else if(m.t==='act'){ if(p2.dead)return; if(m.a==='rocket')fireMissile(p2); else if(m.a==='burst')activateBurst(p2); }
  } else if(net.mode==='guest'){
    if(m.t==='s')applySnapshot(m);
    else if(m.t==='over'){ score=m.sc; state='over';
      if(m.sc1!==undefined)player.score=m.sc1|0; if(m.sc2!==undefined)p2.score=m.sc2|0;
      if(m.co){ runStats.coins=(m.co|0)+(m.co2|0); addCoins(m.co|0); } ['menu','story','coop','opts','pause'].forEach(s=>ui[s].classList.add('hide'));
      ui.over.classList.remove('hide'); ui.finalScore.textContent=score.toLocaleString(); el('overTitle').textContent='CO-OP TERMINAT';
      el('oWave').textContent=Math.max(runStats.maxWave,wave); el('oKills').textContent=runStats.kills;
      el('oCombo').textContent='x'+(runStats.maxMult||1); el('oCoins').textContent=runStats.coins;
      el('oMissiles').textContent=runStats.missiles; el('oBoss').textContent=runStats.bossKills;
      showCoopSplit(m.sc1|0, m.sc2|0, m.co|0, m.co2|0);
      // recordul oaspetelui: tot partea lui
      try{ const my=m.sc1|0; if(my>best){ best=my; localStorage.setItem('ki_best',my);
        if(ui.bestLine)ui.bestLine.textContent='✨ record nou!'; } }catch(e){} }
  } }
function netSnapshot(){
  if(!net.connected)return;
  const iw=W||1, ih=H||1, P=(v)=>+(v).toFixed(3);
  // Steagurile de aspect: fara ele oaspetele desena un pui in locul unui asteroid.
  const EF=(e)=>((e.asteroid?1:0)|(e.fire?2:0)|(e.ice?4:0)|(e.elite?8:0)|(e.baby?16:0)
                |((e.bub&&!e.bubBroken)?32:0)|(e.bauble?64:0)|(e.leaf?128:0));
  const en=enemies.slice(0,60).map(e=>{ const o={i:NID(e),x:P((e.x||0)/iw),y:P((e.y||0)/ih),r:P((e.r||14)/ih),ty:e.type||'bird',ac:e.acc||0,bo:e.boss?1:0,uf:e.ufo?1:0,hr:Math.max(0,Math.min(1,(e.hp||0)/(e.maxHp||1))),bl:e.blink<0?1:0,nm:(e.boss&&e.name)?e.name:0,co:(e.boss&&e.col)?e.col:0};
    const f=EF(e); if(f){ o.fg=f;
      if(e.bauble&&e.bcol)o.bc=e.bcol;
      if(e.leaf){ if(e.lcol)o.lc=e.lcol; if(e.face!==undefined)o.fc=e.face|0; } }
    return o; });
  const eb=eBullets.slice(0,90).map(b=>({i:NID(b),x:P((b.x||0)/iw),y:P((b.y||0)/ih),r:P((b.r||7)/ih),c:b.color||'#ffd1f0',k:b.bk||'drop'}));
  const pb=bullets.slice(0,40).map(b=>({i:NID(b),x:P((b.x||0)/iw),y:P((b.y||0)/ih),r:P((b.r||4)/ih),c:b.color||'#ffffff',ty:b.type||'b'}));
  const pk=pickups.slice(0,24).map(p=>({i:NID(p),x:P((p.x||0)/iw),y:P((p.y||0)/ih),ty:p.type||'coin',
    tr:p.tier||0, w:p.weapon||0}));
  // fasciculele de laser sunt efemere (se refac in fiecare cadru): fara ele in
  // instantaneu, oaspetele nu vedea NICIUN glonț cat timp cineva tragea cu laser.
  const bm=beams.slice(0,8).map(b=>({x:P((b.x||0)/iw),y:P((b.y||0)/ih),w:P((b.w||12)/ih)}));
  const snap={t:'s',sc:score|0,wv:wave|0,lv:player.lives|0,cm:mult||1,
    p1x:P((player.x||0)/iw),p1y:P((player.y||0)/ih),en:en,eb:eb,pb:pb,pk:pk,bm:bm,
    hw:iw, hh:ih, wm:player.wingmen|0,
    // frenezia e a echipei intregi (bonus de viteza pentru amandoi): fara ea in
    // instantaneu, oaspetele nu vedea niciodata aura, bara sau anuntul "FRENEZIE!"
    fz:+frenzy.toFixed(3), fzt:+frenzyT.toFixed(2),
    fl:(flash>0&&flashCol)?flashCol:0};
  // Starea fiecărei nave, ca oaspetele să-și vadă viețile LUI, nu pe ale gazdei.
  // `h` = nava gazdei, `g` = nava oaspetelui — rolurile sunt fixe, nu mai trebuie alt indicator.
  const SS=(s)=>({lv:s.lives|0,w:s.weapon||0,wl:((s.lvl&&s.lvl[s.weapon])||0)|0,d:s.dead?1:0,
                  sc:s.score|0,co:s.coins|0,wm:s.wingmen|0,sh:s.shield>0?1:0,
                  ms:s.missiles|0,bu:s.burst|0});
  snap.h=SS(player);
  if(p2.active)snap.g=SS(p2);
  if(bossIntro>0&&introBoss){ snap.bt=+(INTRO_DUR-bossIntro).toFixed(2); snap.bty=introBoss.type||'bird'; snap.bnm=introBoss.name||''; snap.bco=introBoss.col||'#ffffff'; snap.bac=introBoss.acc||0; snap.bst=introBoss.style||0; snap.blf=introBoss.leafBoss?1:0; }
  netSend(snap);
}
function enterGuestPlay(){ state='playing';
  ['menu','story','coop','opts','pause','over'].forEach(s=>ui[s].classList.add('hide'));
  ui.touchpad.style.display='flex';
  player.dead=false; player.deadT=0;
  if(!player.x||!player.y){player.x=W/2;player.y=H-130;} }
// Desface starea unei nave dintr-un instantaneu. Poziția NU se atinge aici:
// oaspetele își mișcă singur nava, iar a gazdei e interpolată separat.
function applyShipState(s,d){
  s.lives=d.lv|0; s.dead=!!d.d; s.wingmen=d.wm|0; s.shield=d.sh?1:0;
  s.score=d.sc|0; s.coins=d.co|0;
  if(d.ms!==undefined)s.missiles=d.ms|0; if(d.bu!==undefined)s.burst=d.bu|0;
  if(d.w&&WEAPONS&&WEAPONS[d.w]){ s.weapon=d.w; if(!s.lvl)s.lvl={}; s.lvl[d.w]=d.wl|0; }
  if(s.dead)s.deadT=0;
}
function applySnapshot(m){
  try{
  if(state!=='playing')enterGuestPlay();
  wave=m.wv; mult=m.cm; waveActive=true;
  // `m.g` e nava NOASTRĂ (suntem oaspete), `m.h` e a gazdei. Fără ele, cădem pe vechiul câmp comun.
  const MINE=m.g||null, HIS=m.h||null;
  const wasMeDead=player.dead, wasHimDead=p2.dead;
  // Scorul afișat rămâne deocamdată cel al echipei (la fel ca la gazdă): partea fiecăruia
  // se poate desprinde abia după ce gloanțele își poartă nava prin damageEnemy.
  score=m.sc;
  if(MINE) applyShipState(player,MINE);
  else { player.lives=m.lv; player.wingmen=m.wm|0; }
  if(HIS) applyShipState(p2,HIS);
  // vestea proastă, o singură dată, la trecerea de la viu la mort
  if(player.dead&&!wasMeDead){ toast('Ai fost doborât 💔 — prietenul continuă','#ff8fc7'); shake(18,.5); }
  if(p2.dead&&!wasHimDead&&!player.dead) toast('Prietenul a fost doborât 💔','#ff8fc7');
  // potrivim terenul gazdei in ecranul nostru cu un singur factor, pastrand forma
  const hw = m.hw || W, hh = m.hh || H;
  const sc = Math.min(W / hw, H / hh);
  const pw = hw * sc, ph = hh * sc;               // terenul de joc, in pixelii nostri
  coopView.sc = sc; coopView.pw = pw; coopView.ph = ph;
  coopView.ox = (W - pw) / 2; coopView.oy = (H - ph) / 2;   // centrat
  const MX = v => coopView.ox + v * pw;           // v = fractie din latimea gazdei
  const MY = v => coopView.oy + v * ph;
  const MR = v => v * ph;                         // razele erau raportate la inaltimea gazdei
  // pastram obiectele de la un instantaneu la altul, ca sa le putem misca lin spre pozitia noua
  enemies=mergeNet(enemies, m.en||[], e=>{ const f=e.fg|0;
    return {x:MX(e.x),y:MY(e.y),r:MR(e.r),type:e.ty,acc:e.ac||null,boss:!!e.bo,ufo:!!e.uf,hp:e.hr,maxHp:1,
      t:performance.now()/1000,blink:e.bl?-1:1,hit:0,name:e.nm||'',col:e.co||'#ffffff',enrage:e.hr<0.34,ouch:0,
      // aspectul, refacut din steaguri; ce nu se trimite se naste din id, ca sa fie stabil
      asteroid:!!(f&1), rock:!!(f&1), fire:!!(f&2), ice:!!(f&4),
      elite:!!(f&8), baby:!!(f&16),
      bub:(f&32)?1:0, bubBroken:!(f&32),
      bauble:!!(f&64), bcol:e.bc||'#ff8fc7',
      leaf:!!(f&128), lcol:e.lc||'#e0742a', face:e.fc|0,
      wobp:((e.i*37)%628)/100, crackSeed:1+((e.i*7919)%99999)};
    });
  eBullets=mergeNet(eBullets, m.eb||[], b=>({x:MX(b.x),y:MY(b.y),r:MR(b.r),color:b.c,bk:b.k,t:0,vx:0,vy:240}));
  bullets=mergeNet(bullets, m.pb||[], b=>({x:MX(b.x),y:MY(b.y),r:MR(b.r),color:b.c,type:b.ty,vx:0,vy:-880,spin:0}));
  pickups=mergeNet(pickups, m.pk||[], p=>({x:MX(p.x),y:MY(p.y),type:p.ty,r:15,t:0,
    tier:p.tr||0,
    weapon:(p.w && WEAPONS && WEAPONS[p.w]) ? p.w : Object.keys(WEAPONS||{pulse:1})[0]}));
  // fasciculele nu se interpoleaza — se refac in fiecare cadru la gazda, deci
  // le refacem direct din instantaneul curent, nu prin mergeNet
  beams.length=0; (m.bm||[]).forEach(b=>beams.push({x:MX(b.x),y:MY(b.y),w:MR(b.w)||12}));
  netSnapT = 0;                               // porneste cronometrul pana la urmatorul instantaneu
  p2.px=p2.x; p2.py=p2.y; p2.tx=MX(m.p1x); p2.ty=MY(m.p1y);
  if(!p2.active){ p2.x=p2.px=p2.tx; p2.y=p2.py=p2.ty; }   // prima data apare direct, nu aluneca din colt
  p2.active=true;
  // frenezia e a echipei: fara sincronizarea asta oaspetele nu vedea niciodata
  // aura, bara sau anuntul de FRENEZIE, desi bonusul de viteza tot se aplica pe gazda
  const wasFrenzy=frenzyT>0;
  frenzy=m.fz||0; frenzyT=m.fzt||0;
  if(frenzyT>0&&!wasFrenzy){ flash=0.4; flashCol='#ffd1ec'; shake(11,.32); toast('FRENEZIE! 🌟','#ff8fc7'); }
  if(m.fl){flash=0.3;flashCol=m.fl;}
  if(m.bt!==undefined){ bossIntro=INTRO_DUR-m.bt; introBoss={type:m.bty,name:m.bnm,col:m.bco,acc:m.bac||null,leafBoss:!!m.blf,style:m.bst||0,slammed:true}; } else bossIntro=0;
  updateHUD();
  }catch(e){} }
function guestUpdate(dt){
  if(!player.dead){ player.prevx=player.x;
    if(pointer.active){const tx=pointer.x,ty=clamp(pointer.y,H*0.42,H-34); player.x+=(tx-player.x)*Math.min(1,dt*22); player.y+=(ty-player.y)*Math.min(1,dt*22);}
    else{let mx=0,my=0; if(keys['arrowleft']||keys['a'])mx-=1; if(keys['arrowright']||keys['d'])mx+=1; if(keys['arrowup']||keys['w'])my-=1; if(keys['arrowdown']||keys['s'])my+=1; const l=Math.hypot(mx,my)||1; player.x+=mx/l*520*dt; player.y+=my/l*520*dt;}
    player.x=clamp(player.x,24,W-24); player.y=clamp(player.y,gravityMode?H*0.14:H*0.42,H-34);
    player.vx=(player.x-player.prevx)/Math.max(dt,0.001); player.tilt=lerp(player.tilt,clamp(player.vx*0.0006,-.32,.32),Math.min(1,dt*10)); }
  // netezim tot ce vine de la gazda: intre doua instantanee, obiectele aluneca spre pozitia noua
  { netSnapT += dt;
    const a = Math.min(1, netSnapT / NET_STEP);
    smoothNet(enemies, a); smoothNet(eBullets, a); smoothNet(bullets, a); smoothNet(pickups, a);
    // rotatia rocilor e locala: instantaneul n-o trimite, ar sacada la fiecare cadru primit
    for(const e of enemies){ if(e.asteroid){ e.spin=(e.spin||0)+dt*4;
      const dx=(e.tx||e.x)-(e.px||e.x), dy=(e.ty||e.y)-(e.py||e.y);
      e.vx=dx/NET_STEP; e.vy=dy/NET_STEP; } }
    if(p2.tx !== undefined){ p2.x = p2.px + (p2.tx - p2.px) * a; p2.y = p2.py + (p2.ty - p2.py) * a; } }
  // nava oaspetelui ramane in acelasi dreptunghi de joc ca al gazdei, altfel ar zbura in benzile laterale
  if(coopView.pw > 0){
    player.x = clamp(player.x, coopView.ox + 24, coopView.ox + coopView.pw - 24);
    player.y = clamp(player.y, coopView.oy + coopView.ph * 0.42, coopView.oy + coopView.ph - 34);
  }
  net.sendT-=dt; if(net.sendT<=0){ net.sendT=0.055;
    const _pw = coopView.pw || W || 1, _ph = coopView.ph || H || 1;
    netSend({t:'in',
      nx:+(((player.x - coopView.ox) / _pw)).toFixed(3),
      ny:+(((player.y - coopView.oy) / _ph)).toFixed(3)}); }
  for(const p of particles){ if(p.grav)p.vy+=p.grav*dt; if(p.vr)p.spin=(p.spin||0)+p.vr*dt; p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;} particles=particles.filter(p=>p.life>0); if(particles.length>200)particles.splice(0,particles.length-200);
  // update(dt) al gazdei stinge flash/shake — oaspetele nu-l ruleaza niciodata,
  // deci fara asta orice tremur sau fulger (moarte, frenezie) ramanea blocat pe ecran
  if(flash>0)flash=Math.max(0,flash-dt*1.6);
  if(shakeT>0)shakeT=Math.max(0,shakeT-dt);
}
// Lovitura merge la nava atinsă: vieți, scut și moarte proprii. Cealaltă navă joacă mai departe.
function hitTeam(ship){ if(ship.invuln>0||ship.dead)return;
  if(ship.shield>0){ship.shield=0;ship.invuln=1.4;floater(ship.x,ship.y-26,'scut spart','#7ef9d2');shake(10,.3);snd.hurt();return;}
  ship.lives--; ship.hitThisWave=true; if(ship===player)runStats.hitThisWave=true; snd.hurt(); boom(ship.x,ship.y,30,'#7ef9d2'); shake(18,.5); combo=0;mult=1; updateHUD();
  if(ship.lives<=0){ ship.dead=true; ship.deadT=1.1; if(ship===p2)toast('P2 a fost doborât 💔','#ff8fc7'); }
  else { ship.invuln=2.4; ship.x=W/2; ship.y=H-130; } }
function update(dt){
  if(net.mode==='guest'){ guestUpdate(dt); return; }
  bgScroll+=dt*(1+warpT*7); formT+=dt; chainT+=dt;
  _ftA+=dt; _ftN++;
  if(_ftN>=120){ const avg=_ftA/_ftN; if(avg>0.024)lowFx=true; else if(avg<0.017)lowFx=false; _ftA=0; _ftN=0; }
  // formation choreography: slow constant descent toward the player + periodic swoop-dive waves
  if(waveActive && !traveling && !bonusMode && !raidMode && bossIntro<=0){
    formDrop=Math.min(formDrop+dt*8, H*0.17);
    diveTimer-=dt;
    if(diveTimer<=0){ diveTimer=Math.max(1.4, rand(2.6,4.4)-wave*0.05);
      const cand=enemies.filter(e=>e.pattern==='gridfloat'&&!e.diving&&!e.boss&&!e.baby&&e.y>=e.gy-3);
      if(cand.length){ const n=Math.min(cand.length,1+randi(0,Math.min(2,Math.floor(wave/4))));
        for(let i=0;i<n&&cand.length;i++){ const e=cand.splice(randi(0,cand.length-1),1)[0];
          e.diving=true; e.dvT=0; e.dvDur=rand(2.0,2.7); e.dvSx=e.x; e.dvSy=e.y; e.dvDir=(e.x<W/2?1:-1); snd.swoosh&&snd.swoosh(); }
      }
    }
  }
  if(traveling){ const cp=clamp(1-betweenT/TRAVEL_DUR,0,1);
    warpT = cp<0.18 ? cp/0.18 : (cp<0.68 ? 1 : clamp(1-(cp-0.68)/0.32*0.92,0.08,1));
    // ship flies off into the distance (shrinks) then arrives at the new planet (grows back)
    travelScale = clamp(0.34 + 0.66*Math.pow(Math.abs(cp-0.5)*2,1.4), 0.34, 1);
    if(travelMap){ const pp=pathPoint(travelMap.pts, easeInOut(cp));
      player.x+=(pp.x-player.x)*Math.min(1,dt*6); player.y+=(pp.y-player.y)*Math.min(1,dt*6);
    } else { player.x+=(W/2-player.x)*Math.min(1,dt*2.4); player.y+=(H*0.74-player.y)*Math.min(1,dt*2.4); }
  } else { warpT=clamp(warpT-dt/0.35,0,1); travelScale=1; }
  for(const s of warpStars){ s.y+=dt*(36+warpT*1700)*s.v; if(s.y>H+8){s.y=-8;s.x=rand(0,W);} }
  for(const s of fgSparks){ s.y-=s.v*dt; s.tw+=dt*2.5; if(s.y<-6){s.y=H+6;s.x=rand(0,W);} }
  for(const a of ambient){ a.y+=a.v*dt; a.sw+=dt*1.5; a.rot+=a.vr*dt; if(a.y>H+8){a.y=-8;a.x=rand(0,W);} }
  checkAchv();
  if(bossIntro>0){ bossIntro-=dt; const tt=INTRO_DUR-bossIntro;
    if(introBoss&&!introBoss.slammed&&tt>=2.05){ introBoss.slammed=true;
      shake(24,.6); flash=0.45; flashCol=introBoss.col; snd.boom();
      const cx=W/2,cy=H*0.42, col=introBoss.col;
      for(let i=0;i<46;i++)particles.push(part(cx,cy,rand(0,TAU),rand(160,520),Math.random()<.5?'#fff':col,rand(.4,.9),rand(2,5)));
      particles.push({x:cx,y:cy,vx:0,vy:0,life:.4,max:.4,r:20,grow:420,ring:true,color:col});
    } }
  // Pragurile de bonus sunt ale fiecărei nave: urci spre 100.000 pe scorul TĂU.
  for(const s of activeShips()){ const who=(s===p2)?'P2 · ':'';
    if((s.score|0)>=(s.nextLife||1e18)){ s.nextLife+=100000;
      if(s.lives<6){ s.lives++; toast(who+'VIAȚĂ BONUS 💗 ('+(s.score|0).toLocaleString()+')','#ff8fc7'); }
      else addScore(s,2000);
      flash=0.25; flashCol='#ff8fc7'; updateHUD(); }
    if((s.score|0)>=(s.nextBurst||1e18)){ s.nextBurst+=150000;
      if(s.burst<4){ s.burst++; toast(who+'BURST BONUS 🔥 ('+(s.score|0).toLocaleString()+')','#ff8a3b'); }
      else addScore(s,2000);
      updateHUD(); } }
  if(player.shield>0)player.shield-=dt;
  if(player.magnet>0)player.magnet-=dt;
  if(p2.magnet>0)p2.magnet-=dt;
  if(frenzyT>0){ frenzyT-=dt; if(frenzyT<0)frenzyT=0; if(frenzyT===0)frenzy=0; }
  if(player.burstT>0)player.burstT-=dt;
  if(player.muzzle>0)player.muzzle-=dt;
  if(player.invuln>0)player.invuln-=dt;
  if(p2.invuln>0)p2.invuln-=dt;
  if(p2.dead&&p2.deadT>0)p2.deadT-=dt;
  if(p2.shield>0)p2.shield-=dt;
  if(p2.burstT>0)p2.burstT-=dt;
  if(p2.muzzle>0)p2.muzzle-=dt;
  if(flash>0)flash-=dt*1.6;
  if(shakeT>0)shakeT-=dt;
  camZoomT=(bossIntro>0||enemies.some(e=>e.boss))?0.8:1; camZoom+=(camZoomT-camZoom)*Math.min(1,dt*2.5);
  if(comboT>0){comboT-=dt; if(comboT<=0){combo=0;mult=1;updateHUD();}}

  // player
  if(!player.dead){
    player.prevx=player.x;
    if(!traveling){
    if(gravityMode){ // near-normal control + a gentle pull toward the well (fun, never fighting the player)
      if(pointer.active){ const z=camZoom||1; const tx=W/2+(pointer.x-W/2)/z, ty=clamp(H/2+(pointer.y-H/2)/z,H*0.16,H-34);
        player.x+=(tx-player.x)*Math.min(1,dt*16); player.y+=(ty-player.y)*Math.min(1,dt*16);
      } else { let mx=0,my=0;
        if(keys['arrowleft']||keys['a'])mx-=1; if(keys['arrowright']||keys['d'])mx+=1;
        if(keys['arrowup']||keys['w'])my-=1; if(keys['arrowdown']||keys['s'])my+=1;
        const l=Math.hypot(mx,my)||1; player.x+=mx/l*560*dt; player.y+=my/l*560*dt; }
      player.x+=(W/2-player.x)*0.35*dt; player.y+=(H*0.40-player.y)*0.35*dt;   // soft gravity drift
      player.gvx=0; player.gvy=0;
    }
    else if(pointer.active){ const z=camZoom||1; const tx=W/2+(pointer.x-W/2)/z,ty=clamp(H/2+(pointer.y-H/2)/z,H*0.42,H-34); const sm=player.spdMul||1;
      player.x+=(tx-player.x)*Math.min(1,dt*22*sm); player.y+=(ty-player.y)*Math.min(1,dt*22*sm);
    } else { let mx=0,my=0;
      if(keys['arrowleft']||keys['a'])mx-=1; if(keys['arrowright']||keys['d'])mx+=1;
      if(keys['arrowup']||keys['w'])my-=1; if(keys['arrowdown']||keys['s'])my+=1;
      const l=Math.hypot(mx,my)||1; player.x+=mx/l*640*(player.spdMul||1)*dt; player.y+=my/l*640*(player.spdMul||1)*dt; }
    }
    player.x=clamp(player.x,24,W-24); player.y=clamp(player.y,gravityMode?H*0.14:H*0.42,H-34);
    player.vx=(player.x-player.prevx)/Math.max(dt,0.001);
    {
      player.tilt=lerp(player.tilt,clamp(player.vx*0.0006,-0.32,0.32),Math.min(1,dt*10));
    }
    // horizontal facing on raid stages: ship turns and aims sideways toward the incoming enemies
    let aimTarget=0;
    if(raidMode){
      let nx=null,bd=1e18;
      for(const e of enemies){ if(e.dead||e.y<0||e.bonus)continue; const d=Math.abs(e.x-player.x); if(d<bd){bd=d;nx=e.x;} }
      if(player._aimSide===undefined)player._aimSide=1;
      if(nx!=null){ if(nx>player.x+30)player._aimSide=1; else if(nx<player.x-30)player._aimSide=-1; }
      aimTarget=player._aimSide*Math.PI/2;
    }
    let da=aimTarget-player.aimRot; while(da>Math.PI)da-=2*Math.PI; while(da<-Math.PI)da+=2*Math.PI;
    player.aimRot+=da*Math.min(1,dt*12);
    if(!player.dead){ const wc=WEAPONS[player.weapon].color; player.trailT=(player.trailT||0)-dt;
      if(player.trailT<=0){ player.trailT=0.05; particles.push({x:player.x+rand(-3,3),y:player.y+player.r*0.7,vx:rand(-14,14)+player.vx*0.02,vy:rand(70,140),color:Math.random()<.5?wc:'#bfe9ff',life:.34,max:.34,r:rand(2,3.6)}); } }
  } else { if(player.deadT>0)player.deadT-=dt;
    if(player.deadT<=0&&(!p2.active||p2.dead))gameOver(); }
  // tragerea e în afara ramurii: fiecare navă vie trage cu arma ei, chiar dacă cealaltă a murit
  fireAllShips(dt);

  // bullets
  for(const b of bullets){
    if(b.phome){ let t=null,bd=1e18; for(const en of enemies){ if(en.dead)continue; const d=dist2(b.x,b.y,en.x,en.y); if(d<bd){bd=d;t=en;} }
      if(t){ const ang=Math.atan2(t.y-b.y,t.x-b.x), sp=Math.hypot(b.vx,b.vy)||500, cur=Math.atan2(b.vy,b.vx);
        let da=ang-cur; while(da>Math.PI)da-=TAU; while(da<-Math.PI)da+=TAU; const na=cur+clamp(da,-2.4*dt,2.4*dt);
        b.vx=Math.cos(na)*sp; b.vy=Math.sin(na)*sp; } }
    if(b.boomer){ b.vx+=(b.ax||0)*dt; b.vy+=(b.ay||0)*dt; b.life-=dt; if(b.life<=0)b.gone=true; }
    b.x+=b.vx*dt; b.y+=b.vy*dt;
    if(b.type==='missile'&&Math.random()<.7)particles.push({x:b.x,y:b.y+6,vx:rand(-20,20),vy:rand(30,70),color:'#ffd2ec',life:.3,max:.3,r:rand(2,4)}); }
  bullets=bullets.filter(b=> b.boomer ? !b.gone : (b.y>-40&&b.y<H+40&&b.x>-40&&b.x<W+40&&!b.gone));
  for(const b of eBullets){ if(b.blob){b.vy+=(b.grav||0)*dt;}
    if(b.home&&b.homeT>0&&!player.dead){ b.homeT-=dt; const dx=player.x-b.x,dy=player.y-b.y,d=Math.hypot(dx,dy);
      if(d>24){ const spd=b.spd||Math.hypot(b.vx,b.vy)||180; let nvx=b.vx+((dx/d*spd)-b.vx)*Math.min(1,dt*1.8), nvy=b.vy+((dy/d*spd)-b.vy)*Math.min(1,dt*1.8); const m=Math.hypot(nvx,nvy)||1; b.vx=nvx/m*spd; b.vy=nvy/m*spd; } }
    b.x+=b.vx*dt;b.y+=b.vy*dt;b.t=(b.t||0)+dt;
    if(b.blob&&b.y>H*0.55&&b.vy>0&&!b.split){ b.split=true; b.gone=true;
      for(let k=-1;k<=1;k++)eBullets.push(eBullet(b.x,b.y,k*120,140,b.color)); } }
  eBullets=eBullets.filter(b=>!b.gone&&b.y<H+40&&b.y>-80&&b.x>-40&&b.x<W+40&&(b.t||0)<9&&!((b.t||0)>1.2&&!b.blob&&Math.hypot(b.vx,b.vy)<10));
  updateBossBeams(dt);

  // enemies
  for(const e of enemies){ e.t+=dt; if(e.hit>0)e.hit-=dt; if(e.ouch>0)e.ouch-=dt; e.blink-=dt; if(e.blink<-0.15)e.blink=rand(2.5,5.5);
    if(e.boss){ bossAI(e,dt); }
    else { moveEnemy(e,dt); e.fireT-=dt;
      if(!e.bonus&&!e.baby&&wave>=2&&e.fireT<=0&&e.y>0&&e.y<H*0.72){ e.fireT=rand(1.7,3.6)*fireFreqMul*Math.max(0.5,1-wave*0.009)*(wave<=3?1.8:1); enemyShoot(e); } }
    if((!e.bonus||e.asteroid)&&!player.dead&&player.invuln<=0){const rr=e.r+player.r-6;
      if(dist2(e.x,e.y,player.x,player.y)<rr*rr){hitPlayer(); if(!e.boss&&!e.asteroid)damageEnemy(e,9999,e.x,e.y,null,player);}}
    if(net.mode==='host'&&p2.active&&p2.invuln<=0&&!e.bonus&&!p2.dead){const rr=e.r+p2.r-6;
      if(dist2(e.x,e.y,p2.x,p2.y)<rr*rr){hitTeam(p2); if(!e.boss)damageEnemy(e,9999,e.x,e.y,null,p2);}}
  }
  enemies=enemies.filter(e=>!e.dead&&e.y<H+120&&e.x>-160&&e.x<W+160);

  // bullet vs enemy
  for(const b of bullets){
    let done=false;
    for(const e of enemies){ if(e.dead)continue; const rr=e.r*1.25+b.r+3;
      if(dist2(b.x,b.y,e.x,e.y)<rr*rr){
        if(b.type==='missile'){ boom(b.x,b.y,12,'#8fd3ff'); shake(6,.15);
          for(const e2 of enemies)if(dist2(b.x,b.y,e2.x,e2.y)<b.splash*b.splash)damageEnemy(e2,b.dmg,b.x,b.y,null,b.own);
          b.gone=true; done=true; break; }
        if(b.type==='plasma'){ boom(b.x,b.y,10,'#b07bff'); shake(4,.1);
          for(const e2 of enemies){ if(e2.dead)continue; const d2=dist2(b.x,b.y,e2.x,e2.y);
            if(d2<b.splash*b.splash){ const fall=e2===e?1:0.55; damageEnemy(e2,b.dmg*fall,e2.x,e2.y,'plasma',b.own); } }
          particles.push({x:b.x,y:b.y,vx:0,vy:0,life:.28,max:.28,r:8,grow:b.splash*1.6,ring:true,color:'#b07bff'});
          b.gone=true; done=true; break; }
        if(!b.hitList)b.hitList=[]; if(b.hitList.indexOf(e)>=0)continue;
        damageEnemy(e,b.dmg,b.x,b.y,b.wpn,b.own); b.hitList.push(e);
        if((b.pierce||0)>0){ b.pierce--; } else { b.gone=true; done=true; break; }
      } }
    if(done)continue;
  }
  bullets=bullets.filter(b=>!b.gone);

  // enemy bullet vs player
  for(const b of eBullets){ if(player.dead||player.invuln>0)break; const rr=player.r-3+(b.r||7);
    const gd=dist2(b.x,b.y,player.x,player.y);
    if(gd<rr*rr){b.gone=true;hitPlayer();}
    else if(!b._grz && gd<(rr+16)*(rr+16)){ b._grz=true; addFrenzy(0.012); runStats.graze=(runStats.graze||0)+1;
      const a=Math.atan2(player.y-b.y,player.x-b.x)+Math.PI;
      particles.push(part(b.x,b.y,a,rand(40,90),'#bfe9ff',rand(.15,.3),rand(1.5,2.6)));
      if(runStats.graze%25===0){ toast('RAZANT ×'+runStats.graze+' ⚡','#bfe9ff'); if(snd.pickup)snd.pickup(); } } }
  if(net.mode==='host'&&p2.active&&p2.invuln<=0&&!p2.dead){ for(const b of eBullets){ const rr=p2.r-3+(b.r||7);
    if(dist2(b.x,b.y,p2.x,p2.y)<rr*rr){b.gone=true;hitTeam(p2);break;} } }
  eBullets=eBullets.filter(b=>!b.gone);

  // obiectele de pe jos — trase spre o navă doar cât ține magnetul; culese de nava care le atinge
  for(const p of pickups){ p.t+=dt;
    const ships=activeShips();
    const puller=ships.find(s=>s.magnet>0)||(frenzyT>0?ships[0]:null);
    if(puller){ p.x+=(puller.x-p.x)*Math.min(1,dt*9); p.y+=(puller.y-p.y)*Math.min(1,dt*9); }
    else{p.x+=p.vx*dt;p.y+=p.vy*dt;}
    for(const ship of ships){ if(p.gone)break;
      const rr=ship.r+p.r; if(dist2(p.x,p.y,ship.x,ship.y)<rr*rr){ collect(p,ship); p.gone=true; } } }
  pickups=pickups.filter(p=>!p.gone&&p.y<H+40);

  // particles / floaters / zaps
  for(const pa of particles){ if(pa.ring){pa.r+=pa.grow*dt;} else {pa.x+=pa.vx*dt;pa.y+=pa.vy*dt;pa.vx*=0.95;pa.vy*=0.95;} pa.life-=dt; }
  if(particles.length>460)particles.splice(0,particles.length-460);
  particles=particles.filter(p=>p.life>0); if(particles.length>200)particles.splice(0,particles.length-200);
  for(const f of floaters){f.y-=34*dt;f.life-=dt;} floaters=floaters.filter(f=>f.life>0);
  for(const z of zaps)z.life-=dt; zaps=zaps.filter(z=>z.life>0);

  // spawn queue
  if(spawnQ.length){ for(const s of spawnQ){s.t-=dt; if(s.t<=0&&!s.done){s.mk();s.done=true;}} spawnQ=spawnQ.filter(s=>!s.done); }

  // bonus
  if(bonusMode&&waveActive)updateBonus(dt);

  // wave clear -> warp ONLY when the planet (sector) changes; otherwise a quick beat
  if(waveActive&&!bonusMode&&spawnQ.length===0&&enemies.length===0){
    waveActive=false; eBullets.length=0; bossBeams.length=0;
    // Valul perfect îl ia fiecare navă care a scăpat neatinsă — separat.
    if(runStats._wasCombat){ const bonus=Math.round(500*(1+wave*0.1)*scoreNow()); let any=false;
      for(const s of activeShips()){ if(s.hitThisWave)continue; any=true;
        addScore(s,bonus); floater(s.x,s.y-42,'VAL PERFECT +'+bonus,'#7ef9d2');
        toast((s===p2?'P2 · ':'')+'VAL PERFECT! ✨','#7ef9d2'); }
      if(any)addFrenzy(0.25); }
    const planetChanges=Math.floor((wave-1)/10)!==Math.floor(wave/10);
    traveling=planetChanges; betweenT=planetChanges?TRAVEL_DUR:1.0;
    // vacuum up anything still on the field so nothing is lost during the transition
    player.magnet=Math.max(player.magnet,betweenT+0.6);
    if(planetChanges)startTravel();
    if(wave===2 || wave%10===0)showPerks();   // early demo perk + after each boss
  }
  if(!waveActive){betweenT-=dt; if(betweenT<=0)nextWave();}

  // bg motion
  for(const s of stars0){s.y+=s.v*dt; if(s.y>H){s.y=-2;s.x=rand(0,W);}}
  for(const s of stars1){s.y+=s.v*dt; if(s.y>H){s.y=-2;s.x=rand(0,W);}}
  for(const s of stars2){s.y+=s.v*dt; s.tw+=dt*3; if(s.y>H){s.y=-2;s.x=rand(0,W);}}
  for(const d of dust){d.y+=d.v*dt; if(d.y-6>H){d.y=-6;d.x=rand(0,W);}}
  for(const n of nebs){n.y+=n.v*dt; if(n.y-n.r>H){n.y=-n.r;n.x=rand(0,W);}}
  for(const c of clouds){c.y+=c.v*dt; if(c.y-c.r>H){c.y=-c.r;c.x=rand(0,W);c.r=rand(200,380);c.a=rand(.05,.11);c.vi=randi(0,2);}}
  // occasional shooting star streaking across the sky
  if(!traveling && shootStars.length<2 && Math.random()<dt*0.10)
    shootStars.push({x:rand(W*0.05,W*0.95),y:rand(-20,H*0.25),vx:(Math.random()<.5?1:-1)*rand(260,420),vy:rand(150,260),life:rand(.6,1.0),max:.9});
  for(const ss of shootStars){ ss.x+=ss.vx*dt; ss.y+=ss.vy*dt; ss.life-=dt; }
  if(shootStars.length)shootStars=shootStars.filter(s=>s.life>0);

  if(net.mode==='host'){ net.snapT-=dt; if(net.snapT<=0){ net.snapT=0.05; netSnapshot(); } }
}

// current formation slot for an enemy: wider zig-zag lateral march + synchronized swell + slow descent toward the player
function gridPos(e){
  const A=Math.min(70,W*0.10);
  const march=Math.sin(formT*0.6)*A + Math.sin(formT*1.9+0.5)*A*0.34;   // two speeds => zig-zag weave
  const pulse=1+Math.sin(formT*1.1)*0.13;                                // synchronized breathing swell
  const ox=(e.gx-W/2)*(pulse-1);
  return { x:e.gx+march+ox+Math.sin(formT*1.5+e.swing)*13,
           y:e.gy+formDrop+Math.sin(formT*1.35+e.swing)*6+Math.sin(formT*0.9+e.gx*0.01)*5 };
}
function moveEnemy(e,dt){
  // swoop attack: peel out of formation, dive down toward the player in an arc, sweep out laterally, loop back to slot
  if(e.diving){ e.dvT+=dt; const u=clamp(e.dvT/e.dvDur,0,1), k=u*u*(3-2*u);   // smoothstep
    const g=gridPos(e), dir=e.dvDir;
    const p0x=e.dvSx,p0y=e.dvSy;
    const p1x=player.x-dir*90, p1y=H*0.50;
    const p2x=e.dvSx+dir*(200+Math.min(160,W*0.2)), p2y=H*0.70;
    const p3x=g.x,p3y=g.y;
    const mt=1-k;
    e.x=mt*mt*mt*p0x+3*mt*mt*k*p1x+3*mt*k*k*p2x+k*k*k*p3x;
    e.y=mt*mt*mt*p0y+3*mt*mt*k*p1y+3*mt*k*k*p2y+k*k*k*p3y;
    e.diveAng=Math.atan2(player.y-e.y,player.x-e.x);
    if(u>=1){ e.diving=false; }
    return;
  }
  switch(e.pattern){
    case 'gridfloat': if(e.y<e.gy){e.y+=140*dt; if(e.y>e.gy)e.y=e.gy;} else{
      const g=gridPos(e); e.x=g.x; e.y=g.y;
    } break;
    case 'sine': e.x+=e.vx*dt; e._b=e._b??e.y; e.y=e._b+Math.sin(e.t*e.freq+e.phase)*e.amp; break;
    case 'descend': if(e.y<e.holdY)e.y+=e.vy*dt; else e.x+=Math.sin(e.t*2)*e.driftX*dt*8; break;
    case 'spiral': e.srad+=e.sgrow*dt; e.sang+=dt*2.2; e.x=e.scx+Math.cos(e.sang)*e.srad; e.y=e.scy+Math.sin(e.sang)*e.srad*0.6+e.t*18; break;
    case 'swoop': e.x+=e.vx*dt; e.y+=e.vy*dt+Math.sin(e.t*e.wob+e.wobp)*40*dt; break;
    case 'fly': e.x+=e.vx*dt; e.y+=Math.sin(e.t*3)*26*dt; break;
    case 'fall': e.y+=e.vy*dt; e.x+=Math.sin(e.t*2.5+(e.wobp||0))*e.driftX*dt; e.spin=(e.spin||0)+dt*4; break;
    case 'raid': e.x+=e.vx*dt; e._b=e._b??e.y; e.y=e._b+Math.sin(e.t*(e.wob||1.6)+(e.wobp||0))*22; break;
    case 'rock': e.x+=(e.vx||0)*dt; e.y+=(e.vy||0)*dt; e.spin=(e.spin||0)+(e.vr||1)*dt; break;
    case 'orbit': e.oa=(e.oa||0)+(e.osp||1)*dt; e.orad=clamp((e.orad||80)+(e.ogrow||0)*dt,50,Math.min(W,H)*0.42);
      e.x=(e.ocx||W/2)+Math.cos(e.oa)*e.orad; e.y=(e.ocy||H*0.42)+Math.sin(e.oa)*e.orad*0.66; break;
    case 'chain': { const s=chainT*0.62-(e.chainIx||0)*0.30;    // each segment trails the one ahead
      if(s<0){ e.x=-70; e.y=-70; break; }                       // parked off-screen until its turn
      e.y=(s*120)%(H+215)-110;                                  // weaves down and loops (stays under cull limit)
      e.x=W/2+Math.sin(s*1.9)*W*0.37+Math.sin(s*5.1)*14;
    } break;
    case 'boss': break; // handled by bossAI
  }
}
function enemyShoot(e){
  if(e.boss){ e.atk=(e.atk+1)%3;
    if(e.atk===0)for(let i=-3;i<=3;i++)eBullets.push(eBullet(e.x,e.y+e.r,i*70,240,e.col));
    else if(e.atk===1)for(let k=0;k<3;k++){const a=Math.atan2(player.y-e.y,player.x-e.x)+rand(-.18,.18);eBullets.push(eBullet(e.x,e.y,Math.cos(a)*320,Math.sin(a)*320,e.col));}
    else for(let i=0;i<11;i++){const a=i/11*TAU;eBullets.push(eBullet(e.x,e.y,Math.cos(a)*190,Math.sin(a)*190,e.col));}
  } else { const a=Math.atan2(player.y-e.y,player.x-e.x);
    const sp=180+Math.min(170,wave*5); eBullets.push(eBullet(e.x,e.y+e.r*0.4,Math.cos(a)*sp,Math.max(150,Math.sin(a)*sp),CRITCOL[e.type]));
    if(wave>=14&&Math.random()<0.45){ const a2=a+rand(-0.32,0.32); eBullets.push(eBullet(e.x,e.y+e.r*0.4,Math.cos(a2)*sp,Math.max(150,Math.sin(a2)*sp),CRITCOL[e.type])); } }
}
function eBullet(x,y,vx,vy,col,kind){return {x,y,vx,vy,r:8,color:col||'#fff',bk:kind||'drop'};}
function shake(m,t){shakeMag=m;shakeT=t;}

//==================================================================
// DRAW

//==================================================================
// HUD
//==================================================================

//==================================================================
// GO
//==================================================================
try{ applyTheme(); }catch(e){}
try{ applyMenuTheme(); }catch(e){}
try{ updateCoinUI(); checkDailyLogin(); }catch(e){}
try{ musApply(); }catch(e){}
updateHUD(); requestAnimationFrame(loop);

// ——— punte de test: expune internele pentru testele din dezvoltare/ ———
// Adaos pur (nu schimba comportamentul jocului). Testele o folosesc prin
// window.__dbg in loc sa taie felii de text din fisier.
window.__dbg = { hitTeam, collect, activeShips, fireAllShips, fireFrom, fireMissile, activateBurst,
  startGame, spawnPickup, mkEnemy, damageEnemy, addScore, updateHUD, drawP2,
  netHost, netJoin, netSend, netSnapshot, onNetData, applySnapshot, guestUpdate,
  normRelay, getRelay, setRelay, relayIsSet, refreshRelayUI, coopReset,
  get player(){return player}, get p2(){return p2}, get net(){return net}, get state(){return state},
  get score(){return score}, get wave(){return wave}, get combo(){return combo}, get mult(){return mult},
  get coins(){return coins}, get W(){return W}, get H(){return H}, get bossIntro(){return bossIntro},
  get enemies(){return enemies}, get bullets(){return bullets}, get eBullets(){return eBullets},
  get pickups(){return pickups}, get beams(){return beams}, get runStats(){return runStats},
  get WEAPONS(){return WEAPONS}, get frenzy(){return frenzy}, get frenzyT(){return frenzyT},
  set: { score:v=>score=v, combo:v=>combo=v, mult:v=>mult=v, state:v=>state=v, wave:v=>wave=v,
         bossIntro:v=>bossIntro=v, frenzyT:v=>frenzyT=v, coins:v=>addCoins(v-coins),
         enemies:a=>enemies=a, bullets:a=>bullets=a, eBullets:a=>eBullets=a,
         pickups:a=>pickups=a, beams:a=>beams=a } };

export { COIN_TIERS, INTRO_DUR, TRAVEL_DUR, activateBurst, ambient, beams, betweenT, bgScroll, bossBeams, bossIntro, bullets, camZoom, clouds, coopReset, daily, drawTravelMap, dust, eBullets, enemies, eventOf, fgSparks, fireMissile, flash, flashCol, floaters, frenzy, frenzyT, gravityMode, introBoss, lowFx, mult, nebs, net, netHost, netJoin, p2, part, particles, pickups, player, runAchvNew, score, sector, sectorIndex, selectedShip, shake, shakeMag, shakeT, shootStars, stars0, stars1, stars2, startGame, startStory, state, toMenu, toast, togglePause, travelScale, traveling, warpStars, warpT, wave, zaps };

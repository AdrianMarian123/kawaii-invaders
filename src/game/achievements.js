// Realizarile (achievements): lista, conditiile si desblocarea cu
// animatia de pop-up. Progresul se salveaza in localStorage (ki_achv).
import { snd } from './audio.js';
import { el } from './utils.js';
import { player, runAchvNew, score } from './sim.js';

// ---------------- achievements ----------------
let achv={}; try{achv=JSON.parse(localStorage.getItem('ki_achv')||'{}');}catch(e){achv={};}
const runStats={kills:0,bossKills:0,coins:0,missiles:0,maxMult:1,maxWave:0,hitThisWave:false,noHitWaves:0,bearKilled:false,leafBoss:false};
function maxedWeapon(){ for(const k in player.lvl) if(player.lvl[k]>=9) return true; return false; }
const ACHV=[
  {id:'first', i:'⭐', n:'PRIMUL ZBOR',        c:s=>s.kills>=1},
  {id:'hunter',i:'🎯', n:'VÂNĂTOR (100)',      c:s=>s.kills>=100},
  {id:'exter', i:'💥', n:'EXTERMINATOR (750)', c:s=>s.kills>=750},
  {id:'boss1', i:'👑', n:'ȘEF DOBORÂT',        c:s=>s.bossKills>=1},
  {id:'boss5', i:'🏆', n:'SPARGĂTOR DE ȘEFI',  c:s=>s.bossKills>=5},
  {id:'combo', i:'🔥', n:'COMBO x9',           c:s=>s.maxMult>=9},
  {id:'coins', i:'🪙', n:'COLECȚIONAR (100)',  c:s=>s.coins>=100},
  {id:'arsen', i:'✦',  n:'ARSENAL COMPLET',    c:s=>maxedWeapon()},
  {id:'intan', i:'🛡', n:'INTANGIBIL',          c:s=>s.noHitWaves>=1},
  {id:'lives', i:'💗', n:'NOUĂ VIEȚI',         c:s=>player.lives>=6},
  {id:'rocket',i:'🚀', n:'RACHETOR (50)',     c:s=>s.missiles>=50},
  {id:'w25',   i:'🚀', n:'NEÎNFRICAT (val 25)',c:s=>s.maxWave>=25},
  {id:'w50',   i:'🌌', n:'LEGENDĂ (val 50)',   c:s=>s.maxWave>=50},
  {id:'patri', i:'🇷🇴', n:'PATRIOT',            c:s=>s.bearKilled},
  {id:'mill',  i:'💎', n:'MILIONAR',           c:s=>score>=1000000},
  {id:'mill5', i:'✨', n:'CINCI MILIOANE',     c:s=>score>=5000000},
  {id:'k250', i:'🔫', n:'ELITĂ (250)',         c:s=>s.kills>=250},
  {id:'k2000',i:'☠️', n:'MĂCELAR (2000)',      c:s=>s.kills>=2000},
  {id:'boss3',i:'🥉', n:'TREI ȘEFI',           c:s=>s.bossKills>=3},
  {id:'boss10',i:'🥇',n:'ZECE ȘEFI',           c:s=>s.bossKills>=10},
  {id:'bossA',i:'👹', n:'STĂPÂNUL BESTIARULUI',c:s=>s.bossKills>=13},
  {id:'coin500',i:'💰',n:'BANCHER (500)',      c:s=>s.coins>=500},
  {id:'nohit5',i:'👻', n:'FANTOMĂ (5 valuri)', c:s=>s.noHitWaves>=5},
  {id:'w10',  i:'🛸', n:'EXPLORATOR (val 10)', c:s=>s.maxWave>=10},
  {id:'w75',  i:'🌠', n:'CUCERITOR (val 75)',  c:s=>s.maxWave>=75},
  {id:'w100', i:'♾️', n:'NEMURITOR (val 100)', c:s=>s.maxWave>=100},
  {id:'perk5',i:'🧬', n:'CONSTRUCTOR (5 upgrade)',c:s=>player.perks.length>=5},
  {id:'leaf', i:'🍂', n:'REGELE FRUNZĂ ÎNVINS',c:s=>s.leafBoss},
];
function checkAchv(){ for(const a of ACHV){ if(!achv[a.id] && a.c(runStats)) unlockAchv(a); } }
function unlockAchv(a){ achv[a.id]=1; runAchvNew.push(a); try{localStorage.setItem('ki_achv',JSON.stringify(achv));}catch(e){}
  if(snd.achv)snd.achv();
  const wrap=el('achvWrap'); if(!wrap)return;
  const d=document.createElement('div'); d.className='achvPop';
  d.innerHTML='<span class="ic">'+a.i+'</span><span class="tx"><b>ACHIEVEMENT</b><small>'+a.n+'</small></span>';
  wrap.appendChild(d); setTimeout(()=>{ d.style.animation='achvOut .5s ease forwards'; setTimeout(()=>d.remove(),520); },3000);
}

export { ACHV, achv, checkAchv, runStats };

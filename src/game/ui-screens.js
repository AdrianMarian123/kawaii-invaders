// Intrarea de la jucator (tastatura, touch, pointer) si cablarea tuturor
// ecranelor de meniu: butoane, optiuni grafice, bestiar, medalii, co-op,
// video-ul de intro. Ruleaza la incarcare si doar leaga handlere.
import { audioInit, musNextTrack, musTogglePlay, snd, toggleMute } from './audio.js';
import { SPRITES, W, applyAspect, ctx, cv, setCtx, updateGfxUI } from './canvas.js';
import { el, ui } from './utils.js';
import { closeShop, openShop } from './meta.js';
import { setMenuTheme } from './menu-theme.js';
import { refreshRelayUI, saveRelayFromField, showCoopIntro } from '../net/relay-config.js';
import { BEAST, CRITCOL, WEAK, WEAPONS } from './config.js';
import { drawCritter } from '../render/draw.js';
import { ACHV, achv, runStats } from './achievements.js';
import { activateBurst, coopReset, daily, fireMissile, netHost, netJoin, score, startGame, startStory, state, toMenu, toast, togglePause, wave } from './sim.js';

//==================================================================
const keys={}; let pointer={x:0,y:0,active:false};
addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(['arrowleft','arrowright','arrowup','arrowdown',' '].includes(k))e.preventDefault();
  keys[k]=true;
  if(k==='p')togglePause();
  if(k==='x')fireMissile();
  if(k==='c')activateBurst();
  if(k==='m')toggleMute();
  if(k==='enter'&&state==='menu')startStory(false);
});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
cv.addEventListener('pointerdown',e=>{audioInit();pointer.active=true;ptr(e);});
cv.addEventListener('pointermove',e=>{if(pointer.active)ptr(e);});
addEventListener('pointerup',()=>pointer.active=false);
function ptr(e){const r=cv.getBoundingClientRect();pointer.x=e.clientX-r.left;pointer.y=e.clientY-r.top;}

el('coopBtn').onclick=()=>{audioInit();ui.menu.classList.add('hide');ui.coop.classList.remove('hide');};
el('gfxBtn').onclick=()=>{audioInit();updateGfxUI();ui.menu.classList.add('hide');ui.opts.classList.remove('hide');};
el('optsBack').onclick=()=>{ui.opts.classList.add('hide');ui.menu.classList.remove('hide');};
{ const b=el('shopBtn'); if(b)b.onclick=()=>openShop(); }
{ const d=el('musDockBtn'); if(d)d.onclick=()=>{ const p=el('musPanel'); if(p)p.classList.toggle('hide'); };
  const pv=el('musPrev'); if(pv)pv.onclick=()=>musNextTrack(-1);
  const nx=el('musNext'); if(nx)nx.onclick=()=>musNextTrack(1);
  const pl=el('musPlay'); if(pl)pl.onclick=()=>musTogglePlay();
  const mn=el('musMin'); const pnl=el('musPanel');
  const applyMin=()=>{ if(!pnl||!mn)return; const on=pnl.classList.contains('min'); mn.textContent=on?'+':'–'; mn.title=on?'extinde':'minimizează'; };
  try{ if(localStorage.getItem('ki_mus_min')==='1'&&pnl)pnl.classList.add('min'); }catch(e){}
  applyMin();
  if(mn)mn.onclick=(ev)=>{ ev.stopPropagation(); if(!pnl)return; pnl.classList.toggle('min');
    try{localStorage.setItem('ki_mus_min',pnl.classList.contains('min')?'1':'0');}catch(e){} applyMin(); }; }
{ // playerul se poate muta (meniu/pauză/over — nu în timpul luptei); poziția se salvează
  const pn=el('musPanel');
  if(pn){
    let dragging=false,dx=0,dy=0;
    const clampXY=(x,y)=>{ const r=pn.getBoundingClientRect(), w=r.width||170, h=r.height||120;
      return [Math.max(4,Math.min(innerWidth-w-4,x)), Math.max(4,Math.min(innerHeight-h-4,y))]; };
    const setPos=(x,y)=>{ pn.style.position='fixed'; pn.style.left=x+'px'; pn.style.top=y+'px'; pn.style.right='auto'; pn.style.bottom='auto'; };
    try{ const sv=JSON.parse(localStorage.getItem('ki_mus_pos')||'null');
      if(sv&&typeof sv.x==='number'){ setPos(Math.max(4,Math.min(innerWidth-170,sv.x)), Math.max(4,Math.min(innerHeight-120,sv.y))); } }catch(e){}
    pn.addEventListener('pointerdown',e=>{ if(state==='playing')return;
      if(e.target&&e.target.classList&&(e.target.classList.contains('musCtl')||e.target.classList.contains('musMin')))return;
      const r=pn.getBoundingClientRect(); dragging=true; dx=e.clientX-r.left; dy=e.clientY-r.top;
      pn.classList.add('dragging'); try{ pn.setPointerCapture(e.pointerId); }catch(_){}
      e.preventDefault(); });
    pn.addEventListener('pointermove',e=>{ if(!dragging)return;
      const [x,y]=clampXY(e.clientX-dx,e.clientY-dy); setPos(x,y); e.preventDefault(); });
    const end=e=>{ if(!dragging)return; dragging=false; pn.classList.remove('dragging');
      try{ const r=pn.getBoundingClientRect(); localStorage.setItem('ki_mus_pos',JSON.stringify({x:Math.round(r.left),y:Math.round(r.top)})); }catch(_){}
    };
    pn.addEventListener('pointerup',end); pn.addEventListener('pointercancel',end);
    addEventListener('resize',()=>{ if(pn.style.position==='fixed'){ const r=pn.getBoundingClientRect(); const [x,y]=clampXY(r.left,r.top); setPos(x,y); } });
  }
}
{ const t=el('dailyToggle'); if(t)t.onclick=()=>{ const p=el('dailyPanel'), c=el('dsCaret'); if(!p)return; const hid=p.classList.contains('hide'); p.classList.toggle('hide',!hid); if(c)c.classList.toggle('up',hid); }; }
{ const b=el('shopBack'); if(b)b.onclick=()=>closeShop(); }
{ const b=el('drClaim'); if(b)b.onclick=()=>{ el('dailyReward').classList.add('hide'); }; }
document.querySelectorAll('.gopt').forEach(b=>b.onclick=()=>{audioInit();applyAspect(b.dataset.k);});
document.querySelectorAll('.topt').forEach(b=>b.onclick=()=>{ try{audioInit();}catch(e){} setMenuTheme(b.dataset.t); if(snd&&snd.pickup)snd.pickup(); });
el('coopBack').onclick=()=>{coopReset();el('coopCode').style.display='none';showCoopIntro(true);ui.coop.classList.add('hide');ui.menu.classList.remove('hide');};
// ori de cate ori se deschide ecranul CO-OP, arata adresa salvata
try{ new MutationObserver(()=>{ if(!ui.coop.classList.contains('hide')){ try{refreshRelayUI();}catch(e){} } })
      .observe(ui.coop, {attributes:true, attributeFilter:['class']}); }catch(e){}
el('coopHost').onclick=()=>{audioInit();saveRelayFromField();netHost();};
el('coopJoin').onclick=()=>{audioInit();saveRelayFromField();const code=(prompt('Introdu codul prietenului:')||'').trim().toUpperCase();if(code)netJoin(code);};
el('helpBtn').onclick=()=>{ try{audioInit();}catch(e){} ui.menu.classList.add('hide'); el('help').classList.remove('hide');
  try{ renderMedals(); buildBestiary(); }catch(e){ console.error('help:',e); } };
{ const b=el('helpBack'); if(b)b.onclick=()=>{ el('help').classList.add('hide'); ui.menu.classList.remove('hide'); }; }
function buildBestiary(){ const c=el('bestiary'); if(!c||c._built)return; c._built=true;
  for(const b of BEAST){ const wk=WEAK[b.key], W=WEAPONS[wk], im=SPRITES[b.key];
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.05);border-radius:14px;padding:6px 10px';
    let icon='<div style="width:40px;height:40px;border-radius:10px;flex:0 0 auto;background:'+(CRITCOL[b.key]||'rgba(255,255,255,.08)')+'"></div>';
    try{
      if(im&&im.src){ icon='<img src="'+im.src+'" width="40" height="40" style="border-radius:10px;flex:0 0 auto;background:rgba(255,255,255,.04)">'; }
      else{ const pc=document.createElement('canvas'); pc.width=pc.height=80; const pg=pc.getContext('2d');
        const oldc=ctx; setCtx(pg); try{ drawCritter(40,44,52,b.key,0,false,false,null); }finally{ setCtx(oldc); }
        icon='<img src="'+pc.toDataURL()+'" width="40" height="40" style="border-radius:10px;flex:0 0 auto;background:rgba(255,255,255,.04)">'; }
    }catch(e){ /* iconiță indisponibilă — rămâne pastila colorată */ }
    row.innerHTML=icon
      +'<div style="flex:1;min-width:0;text-align:left">'
      +'<div style="font-family:\'Baloo 2\';font-weight:700;font-size:13px;color:#fff">'+b.name+'</div>'
      +'<div style="font-size:11px;opacity:.72;line-height:1.25">'+b.lore+'</div></div>'
      +'<div style="flex:0 0 auto;text-align:center;color:'+W.color+';font-family:\'Baloo 2\';font-weight:700;font-size:10px;min-width:52px">'
      +'<div style="font-size:18px;line-height:1">'+W.icon+'</div>slab la<br>'+W.name+'</div>';
    c.appendChild(row);
  }
}
// --- intro video (with baked chiptune music), shown once before the menu ---
function initIntro(){
  const data=window.__INTRO__, scr=el('introScreen'), vid=el('introVid'), bg=el('introBg'), hint=el('introSound'), skip=el('introSkip');
  if(!data||!scr||!vid){ if(scr)scr.style.display='none'; return; }
  let done=false;
  const finish=()=>{ if(done)return; done=true; try{vid.pause(); if(bg)bg.pause();}catch(e){}
    scr.style.transition='opacity .5s'; scr.style.opacity='0';
    setTimeout(()=>{ scr.style.display='none'; try{vid.removeAttribute('src'); vid.load(); if(bg){bg.removeAttribute('src'); bg.load();}}catch(e){} },520); };
  if(bg){ bg.src=data; bg.muted=true; bg.play().catch(()=>{}); }
  vid.src=data; scr.style.display='flex'; vid.muted=true;
  vid.play().then(()=>{ vid.muted=false; hint.style.display='none'; }).catch(()=>{ vid.muted=true; vid.play().catch(()=>{}); });
  const unmute=()=>{ vid.muted=false; hint.style.display='none'; };
  const onTap=e=>{ if(e&&e.target===skip)return; vid.play().catch(()=>{}); unmute(); };
  scr.addEventListener('pointerdown',onTap);
  scr.addEventListener('touchstart',onTap,{passive:true});
  scr.addEventListener('click',onTap);
  skip.addEventListener('click',e=>{ e.stopPropagation(); finish(); });
  vid.addEventListener('ended',finish);
  vid.addEventListener('error',finish);
}
initIntro();
function renderMedals(){ const m=el('medals'); if(!m)return; const got=ACHV.filter(a=>achv[a.id]).length;
  el('medalCount').textContent='🏅 medalii: '+got+' / '+ACHV.length;
  m.innerHTML=ACHV.map(a=>{ const on=achv[a.id];
    return '<div title="'+a.n+'" style="width:42px;height:42px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:20px;'
      +'border:2px solid '+(on?'var(--yellow)':'rgba(255,255,255,.12)')+';background:rgba(36,16,56,.5);'
      +(on?'box-shadow:0 0 12px rgba(255,228,107,.4);':'filter:grayscale(1);opacity:.32;')+'">'+a.i+'</div>'; }).join(''); }
el('storyGo').onclick=startGame;
el('storyBack').onclick=()=>{ui.story.classList.add('hide');ui.menu.classList.remove('hide');};
el('againBtn').onclick=startGame;
el('menuBtn').onclick=toMenu;
{ const b=el('shareBtn'); if(b)b.onclick=()=>{
    const w=Math.max(runStats.maxWave,wave);
    const line=daily?('📅 Kawaii Invaders — provocarea zilei: '+score.toLocaleString()+' puncte, valul '+w+'! Poți mai mult?')
                    :('🚀 Am făcut '+score.toLocaleString()+' puncte în Kawaii Invaders (valul '+w+', '+runStats.kills+' inamici doborâți)! Încearcă și tu 🌸');
    if(navigator.share){ navigator.share({title:'Kawaii Invaders',text:line}).catch(()=>{}); }
    else if(navigator.clipboard){ navigator.clipboard.writeText(line).then(()=>toast('📋 scor copiat!','#7ef9d2')).catch(()=>toast(line,'#8fd3ff')); }
    else toast('📋 '+line,'#8fd3ff');
  }; }
el('quitBtn').onclick=toMenu;
el('resumeBtn').onclick=togglePause;
el('pauseBtn').onclick=togglePause;
el('muteBtn').onclick=toggleMute;
el('btnMissile').onclick=fireMissile;
el('btnBurst').onclick=activateBurst;

export { keys, pointer };

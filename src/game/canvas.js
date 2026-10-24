// Panza jocului: canvas-ul principal + bufferul de glow la jumatate de
// rezolutie, marimea terenului (W/H/DPR), presetarile de aspect si
// registrele de sprite-uri/fundaluri decodate din base64.
import { hooks } from './utils.js';
import { applyMenuTheme } from './menu-theme.js';

const cv=document.getElementById('game'); let ctx=cv.getContext('2d');
// schimba temporar tinta de desen (folosit de previzualizarile din magazin/bestiar)
function setCtx(c){ ctx=c; }
const gcv=document.createElement('canvas'); const gctx=gcv.getContext('2d'); // half-res glow buffer
const GS=0.5; // glow scale
let W=0,H=0,DPR=1;
function resize(){ DPR=Math.min(window.devicePixelRatio||1, Math.max(window.innerWidth,window.innerHeight)>=820?1.25:1.5); const wrap=document.getElementById('wrap'); const land=window.innerWidth>window.innerHeight; try{ wrap.style.maxWidth=land?'100vw':(ASPECTS[gfxKey]||'calc(100dvh * 0.5625)'); }catch(e){ wrap.style.maxWidth=land?'100vw':'calc(100dvh * 0.5625)'; } const rb=wrap.getBoundingClientRect(); W=Math.round(rb.width); H=Math.round(rb.height);
  cv.width=Math.floor(W*DPR); cv.height=Math.floor(H*DPR); ctx.setTransform(DPR,0,0,DPR,0,0);
  gcv.width=Math.max(1,Math.floor(W*GS)); gcv.height=Math.max(1,Math.floor(H*GS)); }
addEventListener('resize',resize); addEventListener('orientationchange',()=>setTimeout(resize,250)); resize();
const IS_TOUCH=matchMedia('(pointer:coarse)').matches;
const ASPECTS={phone:'calc(100dvh * 0.5625)', pc:'calc(100dvh * 0.75)', wide:'calc(100dvh * 1.5)', full:'100vw'};
let gfxKey='phone';
function updateGfxUI(){ document.querySelectorAll('.gopt').forEach(b=>b.classList.toggle('go',b.dataset.k===gfxKey)); applyMenuTheme(); }
function applyAspect(k){ if(!ASPECTS[k])k='phone'; gfxKey=k; document.getElementById('wrap').style.maxWidth=ASPECTS[k];
  try{localStorage.setItem('ki_gfx',k);}catch(e){} resize(); if(hooks.initBg)hooks.initBg(); updateGfxUI(); }
(function(){ let k; try{k=localStorage.getItem('ki_gfx');}catch(e){} if(!k)k=IS_TOUCH?'phone':'pc'; applyAspect(k); })();

// ---- baked sprite assets (loaded from embedded base64) ----
const SPRITES={};
(function(){ const src=window.__SPRITES__||{}; for(const k in src){ const im=new Image(); im.src=src[k]; SPRITES[k]=im; } })();
function sprite(k){ const im=SPRITES[k]; return (im&&im.complete&&im.naturalWidth>0)?im:null; }
const BGIMG={};
(function(){ const src=window.__BG__||{}; for(const k in src){ const im=new Image(); im.src=src[k]; BGIMG[k]=im; } })();
function bgImg(k){ const im=BGIMG[k]; return (im&&im.complete&&im.naturalWidth>0)?im:null; }

export { GS, H, SPRITES, W, applyAspect, bgImg, ctx, cv, gctx, gcv, setCtx, sprite, updateGfxUI };

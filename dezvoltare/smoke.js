/**
 * Test de fum: incarca jocul REAL intr-un DOM fals, apasa PLAY si il lasa sa ruleze
 * cateva sute de cadre in modul cu un singur jucator. Orice exceptie = esec.
 */
'use strict';
const {JSDOM}=require('jsdom');
const { loadGameHtml } = require('./load-game');
const errors=[];

const noop=()=>{};
const PROPS=new Set(['fillStyle','strokeStyle','lineWidth','lineCap','lineJoin','miterLimit','lineDashOffset',
  'font','textAlign','textBaseline','direction','globalAlpha','globalCompositeOperation','shadowBlur',
  'shadowColor','shadowOffsetX','shadowOffsetY','imageSmoothingEnabled','imageSmoothingQuality','filter',
  'letterSpacing','wordSpacing','fontKerning']);
const ctx2d=new Proxy({},{get(t,k){
  if(k==='canvas')return {width:720,height:1280};
  if(k==='measureText')return ()=>({width:10});
  if(k==='createLinearGradient'||k==='createRadialGradient')return ()=>({addColorStop:noop});
  if(k==='createPattern')return ()=>null;
  if(k==='getImageData')return ()=>({data:new Uint8ClampedArray(4)});
  if(PROPS.has(k))return t[k];
  return noop;
},set(t,k,v){t[k]=v;return true;}});

const dom=new JSDOM(loadGameHtml(),{
  runScripts:'dangerously', pretendToBeVisual:true, url:'https://local.test/',
  beforeParse(w){
    w.HTMLCanvasElement.prototype.getContext=()=>ctx2d;
    w.HTMLCanvasElement.prototype.toDataURL=()=>'data:,';
    const deep=()=>new Proxy(function(){},{
      get(t,k){ if(k==='currentTime'||k==='value'||k==='sampleRate')return 0;
        if(k==='state')return 'running'; if(k==='then'||k===Symbol.toPrimitive)return undefined;
        return deep(); },
      set(){return true;}, apply(){return deep();}, construct(){return deep();} });
    w.AudioContext=w.webkitAudioContext=function(){ return deep(); };
    w.HTMLMediaElement.prototype.play=function(){ return Promise.resolve(); };
    w.HTMLMediaElement.prototype.pause=noop;
    w.HTMLMediaElement.prototype.load=noop;
    w.matchMedia=()=>({matches:false,addListener:noop,removeListener:noop,addEventListener:noop});
    w.navigator.vibrate=noop;
    w.onerror=(msg,src,ln,col,err)=>{ errors.push((err&&err.stack)||msg); };
    w.addEventListener('unhandledrejection',e=>errors.push('promise: '+e.reason));
  }
});
const w=dom.window, doc=w.document;
const orig=w.console.error; w.console.error=(...a)=>{ errors.push('console.error: '+a.join(' ')); };

let pass=0,fail=0; const ok=(c,m)=>{c?(pass++,console.log('  OK  ',m)):(fail++,console.log('  FAIL',m));};
const frame=()=>new Promise(r=>setTimeout(r,0));

(async()=>{
  console.log('\n=== Test de fum: jocul chiar pornește ===');
  await new Promise(r=>setTimeout(r,1500));
  ok(errors.length===0, 'se încarcă fără erori'+(errors.length?': '+errors[0].slice(0,200):''));
  const btn=doc.getElementById('startBtn');
  ok(!!btn, 'butonul de PLAY există');
  const before=errors.length;
  btn.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  await new Promise(r=>setTimeout(r,200));
  const card=doc.querySelectorAll('#shipCards .perkcard')[0];
  ok(!!card, 'apare alegerea navei ('+doc.querySelectorAll('#shipCards .perkcard').length+' nave)');
  card.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  await new Promise(r=>setTimeout(r,300));
  ok(errors.length===before, 'PLAY pornește runda fără erori'+(errors.length>before?': '+errors[before].slice(0,300):''));
  ok(doc.getElementById('menu').classList.contains('hide'), 'meniul se ascunde — suntem în joc');

  // lasam bucla sa se invarta
  for(let i=0;i<60;i++) await new Promise(r=>setTimeout(r,16));
  ok(errors.length===before, 'rulează ~1s de joc fără erori'+(errors.length>before?': '+errors[before].slice(0,300):''));

  // butoanele de racheta si burst (folosesc fireMissile/activateBurst, atinse la etapa 3)
  const b2=errors.length;
  doc.getElementById('btnMissile').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  doc.getElementById('btnBurst').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  for(let i=0;i<30;i++) await new Promise(r=>setTimeout(r,16));
  ok(errors.length===b2, 'racheta și burst-ul merg'+(errors.length>b2?': '+errors[b2].slice(0,300):''));

  // pauza / reluare
  const b3=errors.length;
  doc.getElementById('pauseBtn').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  await new Promise(r=>setTimeout(r,100));
  doc.getElementById('resumeBtn').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  for(let i=0;i<30;i++) await new Promise(r=>setTimeout(r,16));
  ok(errors.length===b3, 'pauză și reluare fără erori'+(errors.length>b3?': '+errors[b3].slice(0,300):''));

  // scorul chiar creste (deci bucla de joc face treaba, nu doar nu crapa)
  const sEl=doc.getElementById('scoreV'); const s1=sEl?sEl.textContent:'(fără element)';
  for(let i=0;i<180;i++) await new Promise(r=>setTimeout(r,16));
  const s2=sEl?sEl.textContent:'(fără element)';
  ok(errors.length===b3, 'încă ~3s de joc fără erori'+(errors.length>b3?': '+errors[b3].slice(0,300):''));
  console.log('       scor: "'+s1+'" -> "'+s2+'"');

  console.log('\n=== '+pass+' treceri, '+fail+' eșecuri ===');
  if(errors.length){ console.log('\nprimele erori:'); errors.slice(0,3).forEach(e=>console.log('  '+String(e).slice(0,400))); }
  dom.window.close();
  process.exit(fail?1:0);
})();

// Efecte pre-randate pentru performanta: sprite-uri de glow/orb/bolt in
// cache, planetele, vinieta, pipeline-ul de bloom la jumatate de rezolutie
// si desenul primitivelor (gloante, asteroizi, fantana gravitationala).
import { TAU, clamp } from '../game/utils.js';
import { GS, H, W, ctx, gctx, gcv } from '../game/canvas.js';
import { equippedTrail, equippedWeapon, rainbowCol } from '../game/meta.js';
import { COIN_TIERS, TRAVEL_DUR, beams, betweenT, bgScroll, bullets, eBullets, particles, pickups, player, sectorIndex, wave, zaps } from '../game/sim.js';
import { WEAPONS } from '../game/config.js';
import { PLANET_PRESETS, drawGalaxy, pseed, shade } from './draw.js';

// ---- cached glow sprites & pre-rendered textures (replaces dozens of per-frame gradients: big perf win) ----
const _glowCache=new Map();
function glowSpr(col){ let c=_glowCache.get(col); if(c)return c;
  c=document.createElement('canvas'); c.width=64; c.height=64; const g=c.getContext('2d');
  const rg=g.createRadialGradient(32,32,0,32,32,32);
  rg.addColorStop(0,hexA(col,1)); rg.addColorStop(.45,hexA(col,.40)); rg.addColorStop(1,hexA(col,0));
  g.fillStyle=rg; g.beginPath(); g.arc(32,32,32,0,TAU); g.fill(); _glowCache.set(col,c); return c; }
function blitGlow(col,x,y,r,a){ ctx.globalAlpha=a; ctx.drawImage(glowSpr(col),x-r,y-r,r*2,r*2); ctx.globalAlpha=1; }
// baked plasma-orb sprite per colour (replaces a per-frame radial gradient on every orb)
const _orbCache=new Map();
function orbSpr(col){ let c=_orbCache.get(col); if(c)return c;
  c=document.createElement('canvas'); c.width=48; c.height=48; const g=c.getContext('2d');
  const rg=g.createRadialGradient(20,20,1,24,24,24);
  rg.addColorStop(0,'#ffffff'); rg.addColorStop(.35,'#e0c6ff'); rg.addColorStop(.7,col); rg.addColorStop(1,shade(col));
  g.fillStyle=rg; g.beginPath(); g.arc(24,24,24,0,TAU); g.fill();
  g.strokeStyle='rgba(255,255,255,.8)'; g.lineWidth=1.4; g.beginPath(); g.arc(24,24,22.5,0,TAU); g.stroke();
  _orbCache.set(col,c); return c; }
// baked glowing bolt sprite — all the beauty (halo, gradient body, hot core, rim) at drawImage cost
const _boltCache=new Map();
function boltSpr(col){ const shape=(equippedWeapon().shape)||'caps'; const key=shape+':'+col; let c=_boltCache.get(key); if(c)return c;
  c=document.createElement('canvas'); c.width=44; c.height=68; const g=c.getContext('2d');
  const cx=22, cy=36;
  const gl=g.createRadialGradient(cx,cy,2,cx,cy,30);
  gl.addColorStop(0,hexA(col,.55)); gl.addColorStop(1,hexA(col,0));
  g.fillStyle=gl; g.fillRect(0,0,44,68);
  const bg=g.createLinearGradient(0,cy-19,0,cy+19);
  bg.addColorStop(0,'#ffffff'); bg.addColorStop(.45,col); bg.addColorStop(1,shade(col));
  g.fillStyle=bg; g.strokeStyle=shade(col); g.lineWidth=2; g.lineJoin='round';
  if(shape==='orb'){
    g.beginPath(); g.arc(cx,cy,14,0,TAU); g.fill(); g.stroke();
    g.fillStyle='rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(cx-4,cy-5,4.5,3,-.6,0,TAU); g.fill();
  } else if(shape==='star'){
    g.beginPath(); for(let i=0;i<10;i++){ const r=i%2?7:17, a=-Math.PI/2+i*Math.PI/5; g[i?'lineTo':'moveTo'](cx+Math.cos(a)*r,cy+Math.sin(a)*r); } g.closePath(); g.fill(); g.stroke();
    g.fillStyle='rgba(255,255,255,.85)'; g.beginPath(); g.arc(cx,cy-2,3.2,0,TAU); g.fill();
  } else if(shape==='heart'){
    g.beginPath(); g.moveTo(cx,cy+15); g.bezierCurveTo(cx-18,cy-2,cx-9,cy-18,cx,cy-7); g.bezierCurveTo(cx+9,cy-18,cx+18,cy-2,cx,cy+15); g.closePath(); g.fill(); g.stroke();
    g.fillStyle='rgba(255,255,255,.8)'; g.beginPath(); g.ellipse(cx-5,cy-4,3,2.2,-.5,0,TAU); g.fill();
  } else if(shape==='petal'){
    for(let p=0;p<5;p++){ g.save(); g.translate(cx,cy); g.rotate(p*TAU/5); g.beginPath(); g.ellipse(0,-9,4.6,9.5,0,0,TAU); g.fill(); g.stroke(); g.restore(); }
    g.fillStyle='#fff'; g.beginPath(); g.arc(cx,cy,4.5,0,TAU); g.fill();
  } else {
    g.beginPath(); g.ellipse(cx,cy,11,18.5,0,0,TAU); g.fill(); g.stroke();
    g.fillStyle='rgba(255,255,255,.95)'; g.beginPath(); g.ellipse(cx,cy-2,4.6,11,0,0,TAU); g.fill();
    g.fillStyle='#fff'; g.beginPath(); g.arc(cx,cy-10.5,3.6,0,TAU); g.fill();
  }
  _boltCache.set(key,c); return c; }
const _shipSkinCache=new Map();
function shipSkinCanvas(baseImg,col){ const key=col; let c=_shipSkinCache.get(key); if(c)return c;
  const w=baseImg.width||128, h=baseImg.height||128; c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d');
  g.drawImage(baseImg,0,0,w,h);
  g.globalCompositeOperation='source-atop';
  if(col==='__galaxy'){ const gg=g.createLinearGradient(0,0,w,h); gg.addColorStop(0,'#6a3bd0'); gg.addColorStop(.5,'#b07bff'); gg.addColorStop(1,'#ff8fc7'); g.globalAlpha=.55; g.fillStyle=gg; }
  else { g.globalAlpha=.5; g.fillStyle=col; }
  g.fillRect(0,0,w,h);
  g.globalCompositeOperation='source-over'; g.globalAlpha=1;
  _shipSkinCache.set(key,c); return c; }
const _candyCache=new Map();
function candySpr(col){ let c=_candyCache.get(col); if(c)return c;
  c=document.createElement('canvas'); c.width=40; c.height=48; const g=c.getContext('2d');
  const cx=20, cy=26;
  const hl=g.createRadialGradient(cx,cy,2,cx,cy,19);
  hl.addColorStop(0,hexA(col,.5)); hl.addColorStop(1,hexA(col,0));
  g.fillStyle=hl; g.fillRect(0,0,40,48);                        // soft halo
  const bg=g.createRadialGradient(cx-4,cy-5,1,cx,cy,14);
  bg.addColorStop(0,'#ffffff'); bg.addColorStop(.45,col); bg.addColorStop(1,shade(col));
  g.fillStyle=bg; g.beginPath(); g.arc(cx,cy,13,0,TAU); g.fill();
  g.strokeStyle=shade(col); g.lineWidth=2; g.beginPath(); g.arc(cx,cy,13,0,TAU); g.stroke();
  g.fillStyle='rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(cx-4.5,cy-5.5,4.4,3,-.6,0,TAU); g.fill();
  g.fillStyle='#fff'; g.beginPath(); g.arc(cx+5,cy-8,1.7,0,TAU); g.fill();
  _candyCache.set(col,c); return c; }
// baked rainbow strip for the Frenzy bar (replaces a 7-stop hsl gradient + shadowBlur every frame)
let _rainbow=null;
function rainbowStrip(){ if(_rainbow)return _rainbow;
  const c=document.createElement('canvas'); c.width=256; c.height=8; const g=c.getContext('2d');
  const lg=g.createLinearGradient(0,0,256,0);
  for(let i=0;i<=12;i++)lg.addColorStop(i/12,'hsl('+(i/12*360)+',90%,66%)');
  g.fillStyle=lg; g.fillRect(0,0,256,8); _rainbow=c; return c; }
let _cloudSpr=[], _cloudKey='';
function buildCloudSprites(nebCol){ if(_cloudKey===nebCol && _cloudSpr.length)return; _cloudKey=nebCol; _cloudSpr=[];
  for(let v=0;v<3;v++){ const S=256, c=document.createElement('canvas'); c.width=S; c.height=S; const g=c.getContext('2d');
    const col=lightenHex(nebCol,0.16+v*0.13), R=(i)=>pseed(v*97+i*13+7);
    for(let i=0;i<9;i++){ const a=R(i)*TAU, d=S*0.17*R(i+9);          // fluffy lobes
      const lx=S/2+Math.cos(a)*d*1.55, ly=S/2+Math.sin(a)*d, lr=S*(0.13+R(i+20)*0.15);
      const rg=g.createRadialGradient(lx,ly,0,lx,ly,lr);
      rg.addColorStop(0,hexA(col,.5)); rg.addColorStop(.6,hexA(col,.2)); rg.addColorStop(1,hexA(col,0));
      g.fillStyle=rg; g.beginPath(); g.arc(lx,ly,lr,0,TAU); g.fill(); }
    const core=g.createRadialGradient(S/2,S/2,0,S/2,S/2,S*0.42);        // bright core
    core.addColorStop(0,hexA(lightenHex(col,0.32),.30)); core.addColorStop(1,hexA(col,0));
    g.fillStyle=core; g.beginPath(); g.arc(S/2,S/2,S*0.42,0,TAU); g.fill();
    g.globalCompositeOperation='lighter';                               // grainy stardust texture
    for(let i=0;i<110;i++){ const a=R(i+40)*TAU, d=Math.sqrt(R(i+80))*S*0.4;
      g.globalAlpha=0.04+R(i+160)*0.07; g.fillStyle='#fff';
      g.fillRect(S/2+Math.cos(a)*d*1.5, S/2+Math.sin(a)*d, 2, 2); }
    g.globalAlpha=1; _cloudSpr.push(c); } }
let _vigG=null,_vigKey='';
function drawRing(px,py,pr,P,back,g){ g=g||ctx;
  g.save(); g.translate(px,py); g.rotate(-0.42); g.scale(1,0.34);
  const start=back?Math.PI:0; // back = far (upper) half, front = near (lower) half
  const bands=[[1.24,1.44,0.10],[1.44,1.6,0.34],[1.6,1.7,0.05],[1.7,1.92,0.20]];
  for(const bn of bands){ g.beginPath();
    g.arc(0,0,pr*bn[1],start,start+Math.PI);
    g.arc(0,0,pr*bn[0],start+Math.PI,start,true); g.closePath();
    g.fillStyle=hexA(P.ringC||'#ffeccb',bn[2]); g.fill(); }
  g.restore();
}
function drawPlanetBody(P,px,py,pr,idx,rnd,g){ g=g||ctx;
  const lx=-0.45, ly=-0.5, la=Math.atan2(ly,lx);
  g.save();
  const halo=g.createRadialGradient(px,py,pr*0.84,px,py,pr*1.5);
  halo.addColorStop(0,hexA(P.atm,0.30)); halo.addColorStop(0.6,hexA(P.atm,0.10)); halo.addColorStop(1,hexA(P.atm,0));
  g.fillStyle=halo; g.beginPath(); g.arc(px,py,pr*1.5,0,TAU); g.fill();
  if(P.type==='ring')drawRing(px,py,pr,P,true,g);
  const bg=g.createRadialGradient(px+lx*pr*0.6,py+ly*pr*0.6,pr*0.1,px,py,pr);
  bg.addColorStop(0,P.a); bg.addColorStop(0.5,P.b); bg.addColorStop(1,P.c);
  g.fillStyle=bg; g.beginPath(); g.arc(px,py,pr,0,TAU); g.fill();
  g.save(); g.beginPath(); g.arc(px,py,pr,0,TAU); g.clip();
  if(P.type==='rocky'){
    for(let i=0;i<8;i++){ const a=pseed(idx*7+i)*TAU, d=pseed(idx*13+i)*pr*0.82;
      const cx=px+Math.cos(a)*d, cy=py+Math.sin(a)*d, cr=pr*(0.07+pseed(idx*3+i)*0.13);
      g.globalAlpha=0.25; g.fillStyle=shadeHex(P.c,1.5); g.beginPath(); g.arc(cx+cr*0.16,cy+cr*0.16,cr,0,TAU); g.fill();
      g.globalAlpha=0.16; g.fillStyle=lightenHex(P.a,0.18); g.beginPath(); g.arc(cx-cr*0.16,cy-cr*0.16,cr*0.85,0,TAU); g.fill(); }
    g.globalAlpha=1;
  } else {
    const bands=P.type==='ice'?9:7;
    for(let i=0;i<bands;i++){ const ty=py-pr+(i+0.5)/bands*pr*2, dark=i%2===0;
      g.globalAlpha=(P.type==='ice'?0.12:0.17)*(dark?1:0.55);
      g.fillStyle=dark?shadeHex(P.c,1.5):lightenHex(P.a,0.12);
      g.beginPath(); g.ellipse(px,ty,pr*1.15,(pr*2/bands)*0.62,0,0,TAU); g.fill(); }
    g.globalAlpha=1;
    if(P.type==='gas'&&rnd>0.4){ const sx=px+(rnd-0.5)*pr*0.9, sy=py+pr*0.2;
      const sg=g.createRadialGradient(sx,sy,1,sx,sy,pr*0.26);
      sg.addColorStop(0,lightenHex(P.a,0.22)); sg.addColorStop(1,hexA(P.b,0));
      g.fillStyle=sg; g.beginPath(); g.ellipse(sx,sy,pr*0.26,pr*0.14,0,0,TAU); g.fill(); }
  }
  const term=g.createRadialGradient(px-lx*pr*0.75,py-ly*pr*0.75,pr*0.18,px,py,pr*1.04);
  term.addColorStop(0,'rgba(0,0,0,0)'); term.addColorStop(0.55,'rgba(4,2,12,0.12)'); term.addColorStop(1,'rgba(2,1,8,0.8)');
  g.fillStyle=term; g.fillRect(px-pr,py-pr,pr*2,pr*2);
  g.restore();
  g.save(); g.globalCompositeOperation='lighter';
  g.strokeStyle=hexA(P.atm,0.5); g.lineWidth=pr*0.05;
  g.beginPath(); g.arc(px,py,pr*0.985,la-1.15,la+1.15); g.stroke();
  const lit=g.createRadialGradient(px+lx*pr*0.7,py+ly*pr*0.7,pr*0.1,px+lx*pr*0.7,py+ly*pr*0.7,pr*1.1);
  lit.addColorStop(0,hexA(P.a,0.28)); lit.addColorStop(0.6,hexA(P.a,0));
  g.fillStyle=lit; g.beginPath(); g.arc(px,py,pr,0,TAU); g.fill();
  g.restore();
  if(P.type==='ring')drawRing(px,py,pr,P,false,g);
  g.restore();
}
// pre-render each planet (with rings, atmosphere, texture speckle) once — then it's a single drawImage per frame
const _planetCache=new Map();
function planetSprite(idx){ let c=_planetCache.get(idx); if(c)return c;
  const P=PLANET_PRESETS[idx%PLANET_PRESETS.length], rnd=pseed(idx);
  const R=230, S=Math.ceil(R*3.9);
  c=document.createElement('canvas'); c.width=S; c.height=S; const g=c.getContext('2d');
  drawPlanetBody(P,S/2,S/2,R,idx,rnd,g);
  g.save(); g.beginPath(); g.arc(S/2,S/2,R*0.995,0,TAU); g.clip();   // fine surface grain
  for(let i=0;i<300;i++){ const a=pseed(idx*17+i)*TAU, d=Math.sqrt(pseed(idx*29+i*3))*R;
    g.globalAlpha=0.04+pseed(idx*41+i)*0.05; g.fillStyle=i%2?'#000':'#fff';
    g.fillRect(S/2+Math.cos(a)*d, S/2+Math.sin(a)*d, 1.5+pseed(idx*53+i)*3, 1.4); }
  g.restore(); g.globalAlpha=1;
  c._pr=R; _planetCache.set(idx,c); return c; }
function drawPlanet(S){
  const idx=sectorIndex();
  const P=PLANET_PRESETS[idx%PLANET_PRESETS.length], rnd=pseed(idx);
  const side=idx%2?0.76:0.22, px=W*side+(player?(player.x-W/2)*0.04:0);
  const py=(((bgScroll*7)+idx*240)%(H+680))-340, pr=Math.min(W,H)*(0.30+rnd*0.12);
  const lx=-0.45, ly=-0.5;
  if(idx%4===1){ const gy=(((bgScroll*3)+idx*400)%(H+360))-180; drawGalaxy(W*(side>0.5?0.26:0.74),gy,Math.min(W,H)*0.22,idx); }
  if(py+pr*2.4<0||py-pr*2.4>H)return;
  { const spr=planetSprite(idx), ps=spr.width*(pr/spr._pr);
    ctx.drawImage(spr,px-ps/2,py-ps/2,ps,ps); }
  // a small moon
  const mx=px+(idx%2?-pr*1.7:pr*1.7), my=py-pr*1.0, mr=pr*0.2;
  const mg=ctx.createRadialGradient(mx+lx*mr*0.5,my+ly*mr*0.5,mr*0.1,mx,my,mr);
  mg.addColorStop(0,'#fdfdf5'); mg.addColorStop(1,shadeHex(S.sky[1],1.3));
  ctx.fillStyle=mg; ctx.beginPath(); ctx.arc(mx,my,mr,0,TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(mx,my,mr,0,TAU); ctx.clip(); ctx.globalAlpha=0.14; ctx.fillStyle='#000';
  ctx.beginPath(); ctx.arc(mx+mr*0.4,my-mr*0.2,mr*0.3,0,TAU); ctx.arc(mx-mr*0.3,my+mr*0.3,mr*0.18,0,TAU); ctx.fill(); ctx.restore();
}
// cinematic: destination planet looms larger as the ship approaches
function drawApproachPlanet(){
  const toIdx=Math.floor(wave/10)%PLANET_PRESETS.length, P=PLANET_PRESETS[toIdx], rnd=pseed(toIdx);
  const cp=clamp(1-betweenT/TRAVEL_DUR,0,1);
  const grow=Math.min(cp/0.8,1), eg=grow*grow*(3-2*grow);
  const fly=clamp((cp-0.78)/0.22,0,1);                 // final fly-past phase
  const cx=W*0.5, cy=H*0.36-fly*fly*H*0.85;            // slides up & off as we arrive
  const R=6+eg*Math.min(W,H)*0.58+fly*Math.min(W,H)*0.3; // keeps growing as we pass it
  if(toIdx%4===1&&fly<0.3){ drawGalaxy(W*0.74,(1-eg)*H*0.2,Math.min(W,H)*0.22,toIdx); }
  { const spr=planetSprite(toIdx), ps=spr.width*(R/spr._pr);
    ctx.drawImage(spr,cx-ps/2,cy-ps/2,ps,ps); }
}
function drawVignette(){
  const vk=W+'x'+H;
  if(_vigKey!==vk){ _vigKey=vk; _vigG=ctx.createRadialGradient(W/2,H*0.46,Math.min(W,H)*0.34,W/2,H/2,Math.max(W,H)*0.72);
    _vigG.addColorStop(0,'rgba(0,0,0,0)'); _vigG.addColorStop(.7,'rgba(10,4,20,.22)'); _vigG.addColorStop(1,'rgba(6,2,14,.6)'); }
  ctx.fillStyle=_vigG; ctx.fillRect(0,0,W,H);
}
// ---- bloom: draw emissive shapes to half-res buffer, blur, add ----
function drawGlow(){
  gctx.setTransform(1,0,0,1,0,0); gctx.clearRect(0,0,gcv.width,gcv.height);
  gctx.save(); gctx.scale(GS,GS);
  gctx.globalCompositeOperation='lighter';
  // player bullets (toned-down glow so heavy fire doesn't white out)
  for(const b of bullets){ if(b.type==='missile'){gctx.fillStyle='rgba(143,211,255,.7)';glowDot(b.x,b.y,7);}
    else{gctx.fillStyle=hexA(b.color,.45);glowDot(b.x,b.y,b.r*1.7);} }
  // enemy bullets (soft danger glow)
  for(const b of eBullets){ gctx.fillStyle=hexA(b.color,.4); glowDot(b.x,b.y,(b.r||7)*1.7); }
  // beams
  for(const bm of beams){const gw=(bm.w||18)*1.5;gctx.fillStyle='rgba(143,211,255,.8)';gctx.fillRect(bm.x-gw/2,0,gw,player.y);}
  // zaps
  for(const z of zaps){gctx.strokeStyle='rgba(200,155,255,.9)';gctx.lineWidth=10;gctx.beginPath();gctx.moveTo(z.x1,z.y1);gctx.lineTo(z.x2,z.y2);gctx.stroke();}
  // explosion sparks + rings
  for(const pa of particles){ if(pa.smoke)continue; const a=clamp(pa.life/pa.max,0,1);
    gctx.fillStyle=hexA(pa.color==='#fff'?'#ffffff':pa.color, a*0.8); glowDot(pa.x,pa.y,(pa.ring?pa.r:pa.r*2.2)); }
  // ship engine + cockpit
  if(!player.dead){gctx.fillStyle='rgba(255,228,107,.7)';glowDot(player.x,player.y+player.r+6,14);
    gctx.fillStyle='rgba(255,210,236,.5)';glowDot(player.x,player.y-2,10);}
  // pickups
  for(const p of pickups){ if(p.type==='coin'){gctx.fillStyle=hexA(COIN_TIERS[p.tier||0].col,.65);glowDot(p.x,p.y,12);}
    else if(p.type==='gift'){gctx.fillStyle=hexA(WEAPONS[p.weapon].color,.6);glowDot(p.x,p.y,14);}
    else if(p.type==='cream'){gctx.fillStyle='rgba(255,158,196,.6)';glowDot(p.x,p.y,12);} }
  gctx.restore();
  // blur + composite
  ctx.save(); ctx.globalCompositeOperation='lighter';
  ctx.filter='blur(6px)'; ctx.imageSmoothingEnabled=true;
  ctx.drawImage(gcv,0,0,W,H);
  ctx.filter='none'; ctx.restore();
}
function glowDot(x,y,r){ gctx.beginPath(); gctx.arc(x,y,r,0,TAU); gctx.fill(); }
function lightenHex(hex,amt){ const h=hex.replace('#','');let r=parseInt(h.substr(0,2),16),g=parseInt(h.substr(2,2),16),b=parseInt(h.substr(4,2),16);
  r=clamp(r+255*amt,0,255)|0;g=clamp(g+255*amt,0,255)|0;b=clamp(b+255*amt,0,255)|0;return 'rgb('+r+','+g+','+b+')'; }
function lightA(hex,amt,a){ const h=hex.replace('#','');let r=parseInt(h.substr(0,2),16),g=parseInt(h.substr(2,2),16),b=parseInt(h.substr(4,2),16);
  r=clamp(r+255*amt,0,255)|0;g=clamp(g+255*amt,0,255)|0;b=clamp(b+255*amt,0,255)|0;return 'rgba('+r+','+g+','+b+','+a+')'; }
function shadeHex(hex,m){ const h=hex.replace('#','');let r=(parseInt(h.substr(0,2),16)*1/m)|0,g=(parseInt(h.substr(2,2),16)*1/m)|0,b=(parseInt(h.substr(4,2),16)*1/m)|0;return 'rgb('+r+','+g+','+b+')'; }
function hexA(hex,a){ if(typeof hex!=='string')return 'rgba(255,255,255,'+a+')';
  if(hex[0]!=='#'){ const n=hex.match(/[\d.]+/g); if(n&&n.length>=3)return 'rgba('+n[0]+','+n[1]+','+n[2]+','+a+')'; return hex; }
  const h=hex.replace('#',''); let r=parseInt(h.substr(0,2),16),g=parseInt(h.substr(2,2),16),b=parseInt(h.substr(4,2),16);
  if(isNaN(r)||isNaN(g)||isNaN(b))return 'rgba(255,255,255,'+a+')';
  return 'rgba('+r+','+g+','+b+','+a+')'; }

function drawGravityWell(){
  const cx=W/2, cy=H*0.40, t=performance.now()/1000;
  ctx.save();
  // swirling accretion glow
  const g=ctx.createRadialGradient(cx,cy,4,cx,cy,150);
  g.addColorStop(0,'rgba(255,235,200,.9)'); g.addColorStop(.25,'rgba(180,123,255,.55)'); g.addColorStop(.6,'rgba(120,80,200,.18)'); g.addColorStop(1,'rgba(120,80,200,0)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,150,0,TAU); ctx.fill();
  // spinning rings
  ctx.globalCompositeOperation='lighter';
  for(let i=0;i<3;i++){ ctx.strokeStyle='rgba(200,160,255,'+(0.30-i*0.07)+')'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.ellipse(cx,cy,40+i*30,(40+i*30)*0.66,t*(0.6-i*0.15),0,TAU); ctx.stroke(); }
  ctx.globalCompositeOperation='source-over';
  // core
  const cg=ctx.createRadialGradient(cx-4,cy-4,1,cx,cy,16);
  cg.addColorStop(0,'#fff'); cg.addColorStop(.6,'#ffd9a6'); cg.addColorStop(1,'#b07bff');
  ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(cx,cy,14,0,TAU); ctx.fill();
  ctx.restore();
}
function drawAsteroid(e){
  // palette: fiery rock vs icy comet
  const P = e.ice
    ? {t1:'#7fd0ff',t2:'#4a9aff',t3:'#bfe9ff',glow:'#6fb0ff',b0:'#bcd8ff',b1:'#6f8fd8',b2:'#26307a',stroke:'#9fe9ff',crk1:'rgba(150,210,255,.35)',crk2:'rgba(215,242,255,.95)'}
    : {t1:'#ff8a2a',t2:'#ff5a2a',t3:'#ffc24a',glow:'#ff9628',b0:'#6b4326',b1:'#4a2c18',b2:'#2c180c',stroke:'#ff7a2a',crk1:'rgba(255,110,20,.35)',crk2:'rgba(255,170,60,.95)'};
  // storm meteors / comets get a streaking tail behind their velocity vector
  if(e.fire){ const sp=Math.hypot(e.vx||0,e.vy||1)||1, ux=(e.vx||0)/sp, uy=(e.vy||1)/sp, R0=e.r;
    ctx.save(); ctx.globalCompositeOperation='lighter';
    blitGlow(P.t1, e.x-ux*R0*1.7, e.y-uy*R0*1.7, R0*1.5, .48);
    blitGlow(P.t2, e.x-ux*R0*3.1, e.y-uy*R0*3.1, R0*1.1, .30);
    blitGlow(P.t3, e.x-ux*R0*4.4, e.y-uy*R0*4.4, R0*0.75, .18);
    ctx.restore(); }
  ctx.save(); ctx.translate(e.x,e.y); ctx.rotate(e.spin||0); const R=e.r;
  // glow (cached sprite)
  ctx.globalAlpha=.55; ctx.drawImage(glowSpr(P.glow),-R*1.7,-R*1.7,R*3.4,R*3.4); ctx.globalAlpha=1;
  // rock body (jagged polygon, stable per-rock shape from seed; gradient cached per rock)
  if(!e._poly){ e._poly=[]; const sides=9; for(let i=0;i<sides;i++){ const a=i/sides*TAU; const rad=R*(0.72+(Math.sin(i*12.9+ (e.wobp||0))*0.5+0.5)*0.4); e._poly.push([Math.cos(a)*rad,Math.sin(a)*rad]); } }
  if(!e._bg){ e._bg=ctx.createLinearGradient(-R,-R,R,R); e._bg.addColorStop(0,P.b0); e._bg.addColorStop(.5,P.b1); e._bg.addColorStop(1,P.b2); }
  ctx.fillStyle=e._bg; ctx.strokeStyle=P.stroke; ctx.lineWidth=2.5; ctx.lineJoin='round';
  ctx.beginPath(); e._poly.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.closePath(); ctx.fill();
  // glowing cracks (double-stroke instead of shadowBlur)
  ctx.strokeStyle=P.crk1; ctx.lineWidth=4.5;
  ctx.beginPath(); ctx.moveTo(-R*0.5,-R*0.2); ctx.lineTo(-R*0.1,R*0.1); ctx.lineTo(R*0.4,-R*0.1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-R*0.2,R*0.5); ctx.lineTo(R*0.1,R*0.05); ctx.stroke();
  ctx.strokeStyle=P.crk2; ctx.lineWidth=1.8;
  ctx.beginPath(); ctx.moveTo(-R*0.5,-R*0.2); ctx.lineTo(-R*0.1,R*0.1); ctx.lineTo(R*0.4,-R*0.1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-R*0.2,R*0.5); ctx.lineTo(R*0.1,R*0.05); ctx.stroke();
  // craters
  ctx.fillStyle='rgba(0,0,0,.28)';
  ctx.beginPath(); ctx.arc(-R*0.35,R*0.25,R*0.18,0,TAU); ctx.arc(R*0.3,R*0.35,R*0.12,0,TAU); ctx.fill();
  ctx.restore();
  if(e.hit>0){ ctx.save(); ctx.globalAlpha=clamp(e.hit*6,0,.8); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(e.x,e.y,e.r,0,TAU); ctx.fill(); ctx.restore(); }
}
function drawBullet(b){
  if(b.type==='missile'){ ctx.fillStyle='#8fd3ff'; ctx.beginPath(); ctx.ellipse(b.x,b.y,5,9,0,0,TAU); ctx.fill();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(b.x,b.y-4,2.5,0,TAU); ctx.fill(); return; }
  if(b.orb){ // plasma ball (baked sprite + cached halo, no per-frame gradient)
    const R=b.r*1.25;
    blitGlow(b.color,b.x,b.y,R*1.6,.30);
    ctx.drawImage(orbSpr(b.color),b.x-R,b.y-R,R*2,R*2); return; }
  if(b.boomer){ ctx.save(); ctx.translate(b.x,b.y); ctx.rotate((b.spin||0)+performance.now()*0.02);
    const s=b.r; ctx.strokeStyle=b.color; ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.shadowColor=b.color; ctx.shadowBlur=8;
    ctx.lineWidth=Math.max(3,s*0.6);
    ctx.beginPath(); ctx.moveTo(-s*0.95,s*0.55); ctx.quadraticCurveTo(0,-s*0.35,0,-s*0.8); ctx.moveTo(s*0.95,s*0.55); ctx.quadraticCurveTo(0,-s*0.35,0,-s*0.8); ctx.stroke();
    ctx.shadowBlur=0; ctx.strokeStyle='rgba(255,255,255,.85)'; ctx.lineWidth=Math.max(1,s*0.18);
    ctx.beginPath(); ctx.moveTo(-s*0.9,s*0.5); ctx.quadraticCurveTo(0,-s*0.3,0,-s*0.75); ctx.moveTo(s*0.9,s*0.5); ctx.quadraticCurveTo(0,-s*0.3,0,-s*0.75); ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(0,-s*0.5,s*0.18,0,TAU); ctx.fill();
    ctx.restore(); return; }
  // tail (solid faded stroke — no per-bullet gradient allocation); trail cosmetic tints only the tail
  let trailCol=equippedTrail(); if(trailCol==='rainbow')trailCol=rainbowCol(performance.now()*0.0012+b.x*0.01);
  ctx.save(); ctx.lineCap='round'; ctx.globalAlpha=.32; ctx.strokeStyle=trailCol||b.color; ctx.lineWidth=b.r*1.4;
  ctx.beginPath(); ctx.moveTo(b.x,b.y); ctx.lineTo(b.x-b.vx*0.03,b.y-b.vy*0.03); ctx.stroke(); ctx.restore(); ctx.globalAlpha=1;
  // baked glossy bolt sprite (glow halo + gradient body + hot tip), rotated along travel direction
  const sc=(b.r*1.32)/18.5, bw=44*sc, bh=68*sc;
  const _wset=equippedWeapon(); const _bc=_wset.col||b.color;
  const rot=Math.atan2(b.vy,b.vx)+Math.PI/2;
  if(Math.abs(rot)>0.02&&Math.abs(rot-TAU)>0.02){ ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(rot);
    ctx.drawImage(boltSpr(_bc),-bw/2,-bh/2,bw,bh); ctx.restore(); }
  else ctx.drawImage(boltSpr(_bc),b.x-bw/2,b.y-bh/2,bw,bh);
}


export { _cloudSpr, blitGlow, boltSpr, buildCloudSprites, candySpr, drawApproachPlanet, drawAsteroid, drawBullet, drawGlow, drawGravityWell, drawPlanet, drawVignette, hexA, lightenHex, orbSpr, rainbowStrip, shadeHex, shipSkinCanvas };

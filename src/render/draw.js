// Tot desenul jocului: compozitorul draw(), scenele de meniu (plaja/spatiu),
// cinematicele de boss, fundalurile si planetele, cache-urile de sprite-uri
// cu glow/bloom si desenarea navelor, inamicilor, bosilor si pickup-urilor.
// Doar CITESTE starea de simulare din sim (all.js) — nu o modifica.
import { _cloudSpr, blitGlow, boltSpr, buildCloudSprites, candySpr, drawApproachPlanet, drawAsteroid, drawBullet, drawGlow, drawGravityWell, drawPlanet, drawVignette, hexA, lightenHex, orbSpr, rainbowStrip, shadeHex, shipSkinCanvas } from './glow-fx.js';

import { drawBossIntro } from './boss-intro.js';

import { drawMenuFx } from './menu-fx.js';

import { menuTheme } from '../game/menu-theme.js';
import { GS, H, W, bgImg, ctx, gctx, gcv, sprite } from '../game/canvas.js';
import { TAU, clamp, lerp, rand } from '../game/utils.js';
import { CRITCOL, SECTORS, WEAPONS } from '../game/config.js';
import { critCol, equippedAura, equippedShip, equippedTrail, equippedWeapon, equippedWing, rainbowCol } from '../game/meta.js';
import { snd, tone } from '../game/audio.js';
import { COIN_TIERS, INTRO_DUR, TRAVEL_DUR, ambient, beams, betweenT, bgScroll, bossBeams, bossIntro, bullets, camZoom, clouds, drawTravelMap, dust, eBullets, enemies, eventOf, fgSparks, flash, flashCol, floaters, frenzy, frenzyT, gravityMode, introBoss, lowFx, nebs, net, p2, part, particles, pickups, player, sector, sectorIndex, selectedShip, shake, shakeMag, shakeT, shootStars, stars0, stars1, stars2, state, travelScale, traveling, warpStars, warpT, wave, zaps } from '../game/sim.js';

//==================================================================
function draw(){
  const S=sector();
  ctx.clearRect(0,0,W,H);
  if(state==='menu'||state==='story'){ drawMenuFx(); return; }
  ctx.fillStyle=(S&&S.sky)?S.sky[1]:'#0a0612'; ctx.fillRect(0,0,W,H);
  ctx.save(); ctx.translate(W/2,H/2); ctx.scale(camZoom,camZoom); ctx.translate(-W/2,-H/2);
  drawBackground(S);

  ctx.save();
  if(shakeT>0){const m=shakeMag*shakeT;ctx.translate(rand(-m,m),rand(-m,m));}

  // ground shadows under sprites (depth)
  ctx.fillStyle='rgba(0,0,0,.18)';
  for(const e of enemies){ if(e.boss||e.bauble||e.leaf)continue; ctx.beginPath(); ctx.ellipse(e.x,e.y+e.r*0.9,e.r*0.9,e.r*0.32,0,0,TAU); ctx.fill(); }
  for(const p of pickups){ ctx.beginPath(); ctx.ellipse(p.x,p.y+13,9,3.5,0,0,TAU); ctx.fill(); }

  // beams behind ship — bm.y is the bottom edge of whichever ship fired it
  for(const bm of beams){ const bw=bm.w||12, by=bm.y!==undefined?bm.y:(player.y-player.r);
    const grd=ctx.createLinearGradient(bm.x,0,bm.x,by);
    grd.addColorStop(0,'rgba(143,211,255,0)'); grd.addColorStop(1,'rgba(143,211,255,.8)');
    ctx.fillStyle=grd; ctx.fillRect(bm.x-bw/2,0,bw,by);
    ctx.fillStyle='rgba(255,255,255,.72)'; ctx.fillRect(bm.x-bw*0.17,0,bw*0.34,by); }
  // zaps
  for(const z of zaps){ const a=z.life/z.max; ctx.lineCap='round'; ctx.lineJoin='round';
    const pts=[[z.x1,z.y1]]; for(let i=1;i<=6;i++){const tt=i/6;pts.push([z.x1+(z.x2-z.x1)*tt+rand(-8,8),z.y1+(z.y2-z.y1)*tt+rand(-8,8)]);}
    const path=()=>{ctx.beginPath(); pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.stroke();};
    ctx.globalAlpha=a*0.4; ctx.strokeStyle='#c89bff'; ctx.lineWidth=7; path();       // soft wide underlay
    ctx.globalAlpha=a;     ctx.strokeStyle='#e6c9ff'; ctx.lineWidth=2.6; path();      // bright core
    ctx.globalAlpha=1; }

  if(gravityMode)drawGravityWell();
  for(const p of pickups)drawPickup(p);
  for(const e of enemies){
    if(e.boss){ if(bossIntro<=0)drawBoss(e); continue; }
    if(e.asteroid){ drawAsteroid(e); continue; }
    if(e.bauble){ drawBauble(e); continue; }
    if(e.leaf){ drawLeaf(e); continue; }
    // soft drop shadow lifts the critter off the background
    const sy=e.y+(e.ufo?e.r*1.25:e.r*0.92);
    ctx.save(); ctx.globalAlpha=0.16; ctx.fillStyle='#04020a';
    ctx.beginPath(); ctx.ellipse(e.x,sy,e.r*0.72,e.r*0.24,0,0,TAU); ctx.fill(); ctx.restore();
    if(e.ufo) drawUfo(e.x, e.y+e.r*0.55, e.r*1.5, e.t);
    if(e.elite){ ctx.save(); const t=performance.now()*0.004, pr=e.r*(1.7+Math.sin(t*2)*0.12);
      const g=ctx.createRadialGradient(e.x,e.y,e.r*0.5,e.x,e.y,pr); g.addColorStop(0,'rgba(255,214,74,.5)'); g.addColorStop(1,'rgba(255,214,74,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(e.x,e.y,pr,0,TAU); ctx.fill();
      ctx.fillStyle='#fff6cf'; for(let i=0;i<5;i++){ const a=t+i/5*TAU, rr=e.r*1.5; const sx=e.x+Math.cos(a)*rr, sy2=e.y+Math.sin(a)*rr, ss=1.6+Math.sin(t*3+i)*1.2;
        ctx.beginPath(); ctx.moveTo(sx,sy2-ss-2); ctx.lineTo(sx+ss*0.5,sy2); ctx.lineTo(sx,sy2+ss+2); ctx.lineTo(sx-ss*0.5,sy2); ctx.closePath(); ctx.fill(); }
      ctx.restore(); }
    drawCritter(e.x, e.y - (e.ufo?e.r*0.35:0), e.r*2*(e.ufo?0.86:1), e.type, Math.sin(e.t*1.6)*0.03, e.hit>0, e.blink<0, e.acc, e.ufo, e.ouch>0);
    if(e.ufo)drawDome(e.x, e.y - e.r*0.35, e.r*0.92);
    if(e.baby)drawBabyShell(e);
    if(e.bub && !e.bubBroken)drawEnemyBubble(e);
  }

  // enemy bullets — varied shapes per kind
  for(const b of eBullets){ ctx.save(); ctx.translate(b.x,b.y); const k=b.bk||'drop';
    ctx.globalAlpha=.3; ctx.fillStyle=b.color; ctx.beginPath(); ctx.arc(-b.vx*0.012,-b.vy*0.012,(b.r||7)*0.55,0,TAU); ctx.fill(); ctx.globalAlpha=1;
    if(k==='orb'){
      ctx.drawImage(orbSpr(b.color),-b.r*1.1,-b.r*1.1,b.r*2.2,b.r*2.2);   // baked plasma ball — no per-frame gradient
    } else if(k==='star'){
      ctx.rotate(b.t*6); ctx.fillStyle=b.color; ctx.strokeStyle='rgba(255,255,255,.7)'; ctx.lineWidth=1.5; ctx.beginPath();
      for(let i=0;i<10;i++){const a=-Math.PI/2+i/10*TAU,rr=i%2?b.r*0.5:b.r*1.15;const px=Math.cos(a)*rr,py=Math.sin(a)*rr;i?ctx.lineTo(px,py):ctx.moveTo(px,py);} ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if(k==='spike'){
      ctx.rotate(Math.atan2(b.vy,b.vx)+Math.PI/2); ctx.fillStyle=b.color; ctx.strokeStyle='rgba(255,255,255,.6)'; ctx.lineWidth=1.2;
      ctx.beginPath(); ctx.moveTo(0,-b.r*1.5); ctx.lineTo(b.r*0.7,b.r*0.9); ctx.lineTo(-b.r*0.7,b.r*0.9); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else {
      const s2=(b.r*1.25)/13;                                   // glossy candy ball (baked: halo + gradient + gloss)
      ctx.drawImage(candySpr(b.color),-20*s2,-24*s2,40*s2,48*s2);
    }
    ctx.restore(); }

  for(const b of bullets)drawBullet(b);
  if(traveling)drawTravelMap();
  if(!player.dead||player.deadT>0.6)drawPlayer();
  if(net.mode!=='off'&&p2.active&&(!p2.dead||p2.deadT>0.6))drawP2();

  // particles (smoke fades to dark, sparks stay bright)
  for(const pa of particles){ ctx.globalAlpha=clamp(pa.life/pa.max,0,1);
    if(pa.ring){ctx.strokeStyle=pa.color;ctx.lineWidth=clamp(4*pa.life/pa.max,1,4);ctx.beginPath();ctx.arc(pa.x,pa.y,pa.r,0,TAU);ctx.stroke();}
    else if(pa.smoke){ctx.fillStyle=pa.color;ctx.beginPath();ctx.arc(pa.x,pa.y,pa.r*(1.6-pa.life/pa.max),0,TAU);ctx.fill();}
    else if(pa.frag){ const an=(pa.ang0||0)+(pa.spin||0)*(pa.max-pa.life); ctx.save(); ctx.translate(pa.x,pa.y); ctx.rotate(an); ctx.fillStyle=pa.color; ctx.strokeStyle='#41525f'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.ellipse(0,0,pa.r*1.7,pa.r*0.7,0,0,TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }
    else if(pa.glass){ const an=(pa.ang0||0)+(pa.spin||0)*(pa.max-pa.life); ctx.save(); ctx.translate(pa.x,pa.y); ctx.rotate(an); ctx.fillStyle='rgba(200,240,255,.45)'; ctx.strokeStyle='rgba(255,255,255,.7)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,-pa.r*1.5); ctx.lineTo(pa.r,pa.r); ctx.lineTo(-pa.r*0.8,pa.r*0.9); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
    else if(pa.head){ const im=sprite(pa.head); const an=(pa.ang0||0)+(pa.spin||0)*(pa.max-pa.life); ctx.save(); ctx.translate(pa.x,pa.y); ctx.rotate(an); const sM=pa.r*2; if(im)ctx.drawImage(im,-sM/2,-sM/2,sM,sM); ctx.restore(); }
    else{ctx.fillStyle=pa.color;ctx.beginPath();ctx.arc(pa.x,pa.y,pa.r,0,TAU);ctx.fill();} }
  ctx.globalAlpha=1;
  for(const f of floaters){ ctx.globalAlpha=clamp(f.life/f.max,0,1); ctx.font='700 15px "Baloo 2",sans-serif'; ctx.textAlign='center';
    ctx.fillStyle='rgba(0,0,0,.4)'; ctx.fillText(f.txt,f.x+1,f.y+1); ctx.fillStyle=f.color; ctx.fillText(f.txt,f.x,f.y); }
  ctx.globalAlpha=1;
  ctx.restore();

  if(!lowFx)drawGlow();      // bloom pass (skipped on weak devices)
  ctx.restore();
  drawVignette();
  if(!lowFx)drawColorGrade();
  drawFrenzy();
  if(player.burstT>0){ ctx.save(); ctx.globalCompositeOperation='lighter';
    const vg=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.42,W/2,H/2,Math.max(W,H)*0.78);
    vg.addColorStop(0,'rgba(255,140,60,0)'); vg.addColorStop(1,'rgba(255,120,40,'+(0.13+0.05*Math.sin(bgScroll*9)).toFixed(3)+')');
    ctx.fillStyle=vg; ctx.fillRect(0,0,W,H); ctx.restore(); }
  if(flash>0){ctx.fillStyle=hexA(flashCol,clamp(flash,0,.6));ctx.fillRect(0,0,W,H);}
  if(bossIntro>0&&introBoss)drawBossIntro();
}
function drawColorGrade(){
  // gentle teal-shadow / warm-highlight wash for a graded, premium look
  ctx.save();
  ctx.globalCompositeOperation='soft-light';
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'rgba(255,226,180,0.16)');   // warm top
  g.addColorStop(0.5,'rgba(255,255,255,0)');
  g.addColorStop(1,'rgba(40,90,150,0.18)');     // cool bottom
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  // faint top sheen (cached gradient)
  ctx.globalCompositeOperation='lighter';
  if(_sheenH!==H){ _sheenH=H; _sheenG=ctx.createLinearGradient(0,0,0,H*0.3);
    _sheenG.addColorStop(0,'rgba(255,255,255,0.05)'); _sheenG.addColorStop(1,'rgba(255,255,255,0)'); }
  ctx.fillStyle=_sheenG; ctx.fillRect(0,0,W,H*0.3);
  ctx.restore();
}

function drawBackground(S){
  const sk=S.sky[0]+S.sky[1]+'|'+H;
  if(_skyKey!==sk){ _skyKey=sk; _skyG=ctx.createLinearGradient(0,0,0,H); _skyG.addColorStop(0,S.sky[0]); _skyG.addColorStop(1,S.sky[1]); }
  ctx.fillStyle=_skyG; ctx.fillRect(0,0,W,H);
  // continuously-scrolling nebula clouds — pre-rendered textured sprites (fluffy lobes + stardust grain)
  buildCloudSprites(S.neb);
  for(const c of clouds){ const spr=_cloudSpr[c.vi||0]; if(!spr)continue;
    ctx.globalAlpha=Math.min(1,c.a*6.5); ctx.drawImage(spr,c.x-c.r,c.y-c.r,c.r*2,c.r*2); }
  ctx.globalAlpha=1;
  if(traveling){ const T=SECTORS[Math.floor(wave/10)%SECTORS.length], e=clamp(1-betweenT/TRAVEL_DUR,0,1);
    const tk=T.sky[0]+T.sky[1]+'|'+H;
    if(_tvKey!==tk){ _tvKey=tk; _tvG=ctx.createLinearGradient(0,0,0,H); _tvG.addColorStop(0,T.sky[0]); _tvG.addColorStop(1,T.sky[1]); }
    ctx.globalAlpha=e*0.8; ctx.fillStyle=_tvG; ctx.fillRect(0,0,W,H); ctx.globalAlpha=1;
    // morph the nebula scenery into the destination planet's colours as we arrive
    const ne=clamp((e-0.4)/0.6,0,1);
    if(ne>0){ for(const n of nebs) blitGlow(T.neb,n.x,n.y,n.r,n.a*1.5*ne); }
  }
  // layered nebula (cached glow sprites — no per-frame gradients)
  for(const n of nebs) blitGlow(S.neb,n.x,n.y,n.r,n.a*1.5);
  // faint diagonal galactic band for depth (cached gradient)
  ctx.save(); ctx.globalAlpha=0.05; ctx.translate(W*0.5,H*0.42); ctx.rotate(-0.7);
  const bk=S.neb+'|'+H;
  if(_bandKey!==bk){ _bandKey=bk; _bandG=ctx.createLinearGradient(0,-H*0.22,0,H*0.22);
    _bandG.addColorStop(0,hexA(S.neb,0)); _bandG.addColorStop(.5,lightenHex(S.neb,0.45)); _bandG.addColorStop(1,hexA(S.neb,0)); }
  ctx.fillStyle=_bandG; ctx.fillRect(-W,-H*0.22,W*2,H*0.44); ctx.restore(); ctx.globalAlpha=1;
  // distant stars
  ctx.fillStyle='rgba(200,215,255,.28)'; for(const s of stars0)ctx.fillRect(s.x,s.y,s.s,s.s);
  ctx.fillStyle='rgba(255,255,255,.5)'; for(const s of stars1)ctx.fillRect(s.x,s.y,s.s,s.s);
  // a planet drifting in the distance (or the destination looming during travel)
  if(traveling)drawApproachPlanet(); else drawPlanet(S);
  // bright twinkling stars (halo = cached sprite, not per-star gradients)
  for(const s of stars2){ const a=0.5+0.5*Math.sin(s.tw), col=s.col||'#fff';
    if(s.s>2.2) blitGlow(col,s.x,s.y,s.s*6,a*0.22);
    ctx.globalAlpha=a; ctx.fillStyle=col; ctx.beginPath(); ctx.arc(s.x,s.y,s.s,0,TAU); ctx.fill();
    if(s.s>1.8){ctx.globalAlpha=a*0.5;ctx.fillStyle=col;ctx.fillRect(s.x-s.s*2,s.y-0.4,s.s*4,0.8);ctx.fillRect(s.x-0.4,s.y-s.s*2,0.8,s.s*4);} }
  ctx.globalAlpha=1;
  // shooting stars streaking by
  for(const ss of shootStars){ const a=clamp(ss.life/ss.max,0,1);
    ctx.save(); ctx.lineCap='round';
    ctx.globalAlpha=a*0.30; ctx.strokeStyle='#9fd0ff'; ctx.lineWidth=3.4;
    ctx.beginPath(); ctx.moveTo(ss.x,ss.y); ctx.lineTo(ss.x-ss.vx*0.20,ss.y-ss.vy*0.20); ctx.stroke();
    ctx.globalAlpha=a*0.9; ctx.strokeStyle='#fff'; ctx.lineWidth=1.6;
    ctx.beginPath(); ctx.moveTo(ss.x,ss.y); ctx.lineTo(ss.x-ss.vx*0.12,ss.y-ss.vy*0.12); ctx.stroke();
    ctx.restore(); }
  ctx.globalAlpha=1;
  // hyperspace warp streaks during travel between sectors
  if(warpT>0.02){
    ctx.save(); ctx.lineCap='round';
    for(const s of warpStars){ const len=(6+warpT*warpT*195)*s.v;
      ctx.strokeStyle='rgba(216,232,255,'+(0.26+0.55*warpT).toFixed(3)+')'; ctx.lineWidth=0.5+s.w*warpT;
      ctx.beginPath(); ctx.moveTo(s.x,s.y); ctx.lineTo(s.x,s.y-len); ctx.stroke(); }
    ctx.globalCompositeOperation='lighter';
    const tg=ctx.createRadialGradient(W/2,H*0.3,0,W/2,H*0.3,Math.max(W,H)*0.55);
    tg.addColorStop(0,'rgba(150,200,255,'+(0.11*warpT).toFixed(3)+')'); tg.addColorStop(1,'rgba(150,200,255,0)');
    ctx.fillStyle=tg; ctx.fillRect(0,0,W,H); ctx.restore();
  }
  // drifting sugar sparkles (foreground ambiance)
  ctx.save(); ctx.globalCompositeOperation='lighter';
  for(const s of fgSparks){ ctx.globalAlpha=0.22+0.45*(0.5+0.5*Math.sin(s.tw)); ctx.fillStyle=s.col; ctx.beginPath(); ctx.arc(s.x,s.y,s.s,0,TAU); ctx.fill(); }
  ctx.globalAlpha=1; ctx.restore();
  // seasonal ambient (snow / petals / embers / hearts / spirits)
  const amode={winter:'snow',christmas:'snow',spring:'petal',martisor:'petal',autumn:'ember',leaves:'ember',valentine:'heart',halloween:'spooky'}[eventOf()];
  if(amode&&ambient.length){ ctx.save(); if(amode==='ember'||amode==='spooky')ctx.globalCompositeOperation='lighter';
    for(const a of ambient){ const ax=a.x+Math.sin(a.sw)*a.swA, ay=a.y;
      if(amode==='snow'){ ctx.globalAlpha=.7; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(ax,ay,a.s*0.8,0,TAU); ctx.fill(); }
      else if(amode==='petal'){ ctx.globalAlpha=.82; ctx.fillStyle=a.s>2.7?'#ffd6e8':'#ff9ec4'; ctx.save(); ctx.translate(ax,ay); ctx.rotate(a.rot); ctx.beginPath(); ctx.ellipse(0,0,a.s*1.5,a.s*0.7,0,0,TAU); ctx.fill(); ctx.restore(); }
      else if(amode==='ember'){ ctx.globalAlpha=.45+.4*(0.5+0.5*Math.sin(a.sw*3)); ctx.fillStyle=a.s>2.7?'#ff8a3a':'#ffc24a'; ctx.beginPath(); ctx.arc(ax,ay,a.s*0.75,0,TAU); ctx.fill(); }
      else if(amode==='heart'){ ctx.globalAlpha=.72; ctx.fillStyle=a.s>2.7?'#ffb3cc':'#ff8fb5'; drawHeart(ax,ay,a.s*1.5); }
      else { ctx.globalAlpha=.4; ctx.fillStyle='#b07aff'; ctx.beginPath(); ctx.arc(ax,ay,a.s*0.9,0,TAU); ctx.fill(); }
    }
    ctx.globalAlpha=1; ctx.restore();
  }
  const ev=S.event||'normal';
  for(const d of dust){
    if(ev==='winter'){ ctx.globalAlpha=d.a*5; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(d.x,d.y,d.s*0.6,0,TAU); ctx.fill(); }
    else if(ev==='autumn'){ ctx.globalAlpha=d.a*5; ctx.fillStyle=(d.s>3?'#ff8a3b':'#e85d2a'); ctx.save(); ctx.translate(d.x,d.y); ctx.rotate(d.y*0.05); ctx.beginPath(); ctx.ellipse(0,0,d.s*1.1,d.s*0.5,0,0,TAU); ctx.fill(); ctx.restore(); }
    else if(ev==='spring'){ ctx.globalAlpha=d.a*5; ctx.fillStyle='#ffb6d8'; ctx.save(); ctx.translate(d.x,d.y); ctx.rotate(d.x*0.05); ctx.beginPath(); ctx.ellipse(0,0,d.s*1.0,d.s*0.55,0,0,TAU); ctx.fill(); ctx.restore(); }
    else if(ev==='summer'){ ctx.globalAlpha=(0.4+0.4*Math.sin(d.y*0.1+bgScroll*3)); ctx.fillStyle='#fff7c4'; ctx.fillRect(d.x,d.y,d.s*0.7,d.s*0.7); }
    else if(ev==='halloween'){
      if(d.s>3.4){ ctx.globalAlpha=0.55; ctx.fillStyle='#1a0f24'; drawBat(d.x,d.y,d.s*1.4); }
      else { ctx.globalAlpha=d.a*5; ctx.fillStyle=(d.s>2.6?'#ff8a3b':'#d8542a'); ctx.save(); ctx.translate(d.x,d.y); ctx.rotate(d.y*0.05+d.x); ctx.beginPath(); ctx.ellipse(0,0,d.s*1.2,d.s*0.5,0,0,TAU); ctx.fill(); ctx.restore(); } }
    else if(ev==='christmas'){ ctx.globalAlpha=d.a*5; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(d.x,d.y,d.s*0.7,0,TAU); ctx.fill();
      if(d.s>3){ctx.globalAlpha=0.8; ctx.fillStyle=(Math.floor(d.x)%2?'#ff5a5a':'#7ef9a0'); ctx.fillRect(d.x,d.y-6,3,3);} }
    else if(ev==='romania'||ev==='unire'){ ctx.globalAlpha=0.7; const cc=[[0,70,173],[252,209,22],[206,17,38]][Math.floor(d.x)%3]; ctx.fillStyle='rgb('+cc[0]+','+cc[1]+','+cc[2]+')'; ctx.fillRect(d.x,d.y,d.s*0.7,d.s*2.2); }
    else if(ev==='military'){ ctx.globalAlpha=0.6; ctx.save(); ctx.translate(d.x,d.y); ctx.rotate(0.5);
      ctx.fillStyle='#3f5226'; ctx.beginPath(); ctx.ellipse(0,0,d.s*1.1,d.s*1.4,0,0,TAU); ctx.fill();         // grenade body
      ctx.fillStyle='#2c3a1a'; ctx.fillRect(-d.s*0.4,-d.s*1.9,d.s*0.8,d.s*0.6);                                // cap
      ctx.strokeStyle='#7a8a55'; ctx.lineWidth=0.8; ctx.beginPath(); ctx.moveTo(d.s*0.3,-d.s*1.7); ctx.lineTo(d.s*1.0,-d.s*1.4); ctx.stroke(); // pin
      ctx.restore(); }
    else if(ev==='valentine'){ ctx.globalAlpha=d.a*5; ctx.fillStyle=(d.s>3?'#ff5a8c':'#ff9ec4'); const s=d.s*0.9,hx=d.x,hy=d.y;
      ctx.beginPath(); ctx.moveTo(hx,hy+s*0.6); ctx.bezierCurveTo(hx-s,hy-s*0.4,hx-s*0.2,hy-s,hx,hy-s*0.3); ctx.bezierCurveTo(hx+s*0.2,hy-s,hx+s,hy-s*0.4,hx,hy+s*0.6); ctx.fill(); }
    else if(ev==='martisor'){ ctx.globalAlpha=0.85; ctx.fillStyle=(Math.floor(d.x)%2?'#e23b3b':'#ffffff'); ctx.beginPath(); ctx.arc(d.x,d.y,d.s*0.55,0,TAU); ctx.fill(); }
    else { ctx.globalAlpha=d.a; ctx.fillStyle=hexA(S.accent,1); ctx.fillRect(d.x,d.y,d.s*0.6,d.s*3); }
  }
  ctx.globalAlpha=1;
  // soft bottom aura for depth
  const bgrad=ctx.createLinearGradient(0,H,0,H*0.7);
  bgrad.addColorStop(0,hexA(S.accent,0.12)); bgrad.addColorStop(1,hexA(S.accent,0));
  ctx.fillStyle=bgrad; ctx.fillRect(0,H*0.7,W,H*0.3);
}
function drawBat(x,y,s){ ctx.save(); ctx.translate(x,y); const f=Math.sin(performance.now()/200+x)*0.4;
  ctx.beginPath(); ctx.moveTo(0,0);
  ctx.quadraticCurveTo(-s*1.2,-s*(0.6+f),-s*1.8,0); ctx.quadraticCurveTo(-s*1.1,s*0.2,-s*0.6,s*0.1); ctx.lineTo(0,s*0.3);
  ctx.lineTo(s*0.6,s*0.1); ctx.quadraticCurveTo(s*1.1,s*0.2,s*1.8,0); ctx.quadraticCurveTo(s*1.2,-s*(0.6+f),0,0); ctx.fill();
  ctx.beginPath(); ctx.arc(0,-s*0.1,s*0.4,0,TAU); ctx.fill(); ctx.restore();
}
const PLANET_PRESETS=[
  {type:'gas',  a:'#ffd9a0', b:'#e0913c', c:'#7e3d12', atm:'#ffb86b'},                    // amber gas giant
  {type:'ring', a:'#ffe8b0', b:'#d9a94e', c:'#7a5318', atm:'#ffe0a0', ringC:'#ffeccb'},   // saturn
  {type:'ice',  a:'#d6f3ff', b:'#6fb6e6', c:'#244e86', atm:'#9fe0ff'},                    // ice giant
  {type:'rocky',a:'#ffc0a4', b:'#c8543a', c:'#5e1e16', atm:'#ff8a6b'},                    // mars-like
  {type:'gas',  a:'#e6c9ff', b:'#9a6fd6', c:'#3f2870', atm:'#c9a0ff'},                    // violet gas
  {type:'ring', a:'#cfe9d0', b:'#5fae74', c:'#1f5536', atm:'#9fe6b6', ringC:'#d6f0d8'},   // green ringed
  {type:'ice',  a:'#cfe0ff', b:'#7f8fe0', c:'#2c2f7a', atm:'#a8b8ff'},                    // blue ice
  {type:'rocky',a:'#ffe0a8', b:'#caa14a', c:'#6e4e18', atm:'#ffd27a'},                    // desert
];
function pseed(i){ const s=Math.sin(i*127.1+311.7)*43758.5453; return s-Math.floor(s); }
function drawGalaxy(gx,gy,gr,seed){
  ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.translate(gx,gy);
  ctx.rotate(seed*1.7+bgScroll*0.015); ctx.scale(1,0.46);
  const core=ctx.createRadialGradient(0,0,1,0,0,gr*0.55);
  core.addColorStop(0,'rgba(255,247,228,0.45)'); core.addColorStop(0.35,'rgba(255,206,150,0.16)'); core.addColorStop(1,'rgba(140,100,200,0)');
  ctx.fillStyle=core; ctx.beginPath(); ctx.arc(0,0,gr*0.55,0,TAU); ctx.fill();
  for(let arm=0;arm<2;arm++){ const off=arm*Math.PI;
    for(let i=0;i<70;i++){ const tt=i/70, ang=off+tt*5.4, rr=gr*0.07+tt*gr*0.52;
      const a=((1-tt)*0.12).toFixed(3);
      ctx.fillStyle='rgba(208,206,255,'+a+')';
      ctx.beginPath(); ctx.arc(Math.cos(ang)*rr,Math.sin(ang)*rr,gr*0.022*(1-tt)+0.5,0,TAU); ctx.fill(); } }
  ctx.restore();
}
let _skyG=null,_skyKey='', _bandG=null,_bandKey='', _tvG=null,_tvKey='', _sheenG=null,_sheenH=0;
// frenzy overdrive aura — shared by both ships, since the boost applies to the whole team
function drawFrenzyAura(x,y,r){
  if(frenzyT<=0)return;
  ctx.save(); ctx.translate(x,y); const t=performance.now()*0.006, R=r*2.1+Math.sin(t*2)*3;
  ctx.globalCompositeOperation='lighter';
  for(let i=0;i<6;i++){ const a=t+i/6*TAU; ctx.fillStyle='hsla('+((i/6*360+t*120)%360)+',95%,65%,.5)';
    ctx.beginPath(); ctx.arc(Math.cos(a)*R*0.5,Math.sin(a)*R*0.5,R*0.5,0,TAU); ctx.fill(); }
  ctx.restore();
}
// wingmen — tiny teacup chihuahua helpers in pink sweaters. Called inside a
// ctx already translated to the ship's position; drawn for either ship so a
// teammate's dogs show up too, not just your own.
function drawWingmen(ship){
  for(let i=0;i<(ship.wingmen||0);i++){ const sx=(i===0?-44:44), by=-2+Math.sin(performance.now()/280+i*2)*2, R=11;
    const tan='#ecd2a6', tanLine='#b89a6a';
    ctx.save(); ctx.translate(sx,by); ctx.lineJoin='round';
    // sweater body (colour from equipped teammate skin)
    const _wc=equippedWing(); ctx.fillStyle=_wc; ctx.strokeStyle=shade(_wc); ctx.lineWidth=2;
    ctx.beginPath(); ctx.ellipse(0,R*1.2,R*0.8,R*0.62,0,0,TAU); ctx.fill(); ctx.stroke();
    // big bat ears
    ctx.strokeStyle=tanLine; ctx.lineWidth=2; ctx.fillStyle=tan;
    for(const ex of [-1,1]){ ctx.beginPath(); ctx.moveTo(ex*R*0.4,-R*0.55); ctx.lineTo(ex*R*1.3,-R*1.45); ctx.lineTo(ex*R*1.02,-R*0.15); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle='#efa6b6'; for(const ex of [-1,1]){ ctx.beginPath(); ctx.moveTo(ex*R*0.5,-R*0.55); ctx.lineTo(ex*R*1.08,-R*1.2); ctx.lineTo(ex*R*0.92,-R*0.3); ctx.closePath(); ctx.fill(); }
    // head
    ctx.fillStyle=tan; ctx.strokeStyle=tanLine; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(0,0,R,R*0.98,0,0,TAU); ctx.fill(); ctx.stroke();
    // white blaze + muzzle
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.moveTo(-R*0.16,-R*0.92); ctx.lineTo(R*0.16,-R*0.92); ctx.lineTo(R*0.2,R*0.1); ctx.lineTo(-R*0.2,R*0.1); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0,R*0.32,R*0.5,R*0.55,0,0,TAU); ctx.fill();
    // big eyes + sparkle
    ctx.fillStyle='#33232a';
    ctx.beginPath(); ctx.arc(-R*0.44,-R*0.05,R*0.3,0,TAU); ctx.arc(R*0.44,-R*0.05,R*0.3,0,TAU); ctx.fill();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(-R*0.36,-R*0.16,R*0.1,0,TAU); ctx.arc(R*0.52,-R*0.16,R*0.1,0,TAU); ctx.fill();
    // nose + mouth
    ctx.fillStyle='#33232a'; ctx.beginPath(); ctx.ellipse(0,R*0.2,R*0.13,R*0.1,0,0,TAU); ctx.fill();
    ctx.strokeStyle='#7a5a4a'; ctx.lineWidth=1.1; ctx.beginPath(); ctx.moveTo(0,R*0.3); ctx.lineTo(0,R*0.42); ctx.moveTo(0,R*0.42); ctx.arc(-R*0.12,R*0.42,R*0.12,0,Math.PI*0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,R*0.42); ctx.arc(R*0.12,R*0.42,R*0.12,Math.PI*0.5,Math.PI); ctx.stroke();
    ctx.restore(); }
}
// ---- player ship: cute Mochi pod ----
function drawPlayer(){
  const x=player.x,y=player.y;
  const blink=player.invuln>0&&Math.floor(player.invuln*12)%2===0;
  drawFrenzyAura(x,y,player.r);
  ctx.save(); ctx.translate(x,y); ctx.rotate((player.aimRot||0)+player.tilt);
  if(traveling)ctx.scale(travelScale,travelScale);
  if(blink)ctx.globalAlpha=0.4;
  drawWingmen(player);
  // burst-fire aura (flickering flame ring)
  if(player.burstT>0){ const k=player.burstT<1?player.burstT:1; ctx.save(); ctx.globalCompositeOperation='lighter';
    for(let i=0;i<3;i++){ ctx.strokeStyle='rgba(255,'+(140+i*30)+',60,'+(0.3*k)+')'; ctx.lineWidth=3-i;
      ctx.beginPath(); ctx.arc(0,0,player.r+10+i*5+Math.sin(performance.now()/60+i)*2,0,TAU); ctx.stroke(); } ctx.restore(); }
  // magnet aura (dashed pulsing ring)
  if(player.magnet>0){ const blink=player.magnet<2&&Math.floor(player.magnet*8)%2===0;
    if(!blink){ ctx.save(); ctx.strokeStyle='rgba(255,143,199,.5)'; ctx.lineWidth=2.5; ctx.setLineDash([6,7]);
      ctx.lineDashOffset=-performance.now()/40; ctx.beginPath(); ctx.arc(0,0,player.r+22,0,TAU); ctx.stroke(); ctx.restore(); } }
  // shield
  if(player.shield>0){ ctx.strokeStyle='rgba(126,249,210,'+(0.45+0.3*Math.sin(performance.now()/120))+')';
    ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,0,player.r+13,0,TAU); ctx.stroke();
    ctx.strokeStyle='rgba(126,249,210,.2)'; ctx.beginPath(); ctx.arc(0,0,player.r+8,0,TAU); ctx.stroke(); }
  // thruster
  const fl=12+Math.random()*10+warpT*42;
  ctx.save(); ctx.globalCompositeOperation='lighter';
  const eg=ctx.createRadialGradient(0,player.r+4,0,0,player.r+4,fl*1.7);
  eg.addColorStop(0,'rgba(255,214,128,.5)'); eg.addColorStop(1,'rgba(255,143,199,0)');
  ctx.fillStyle=eg; ctx.beginPath(); ctx.arc(0,player.r+4,fl*1.7,0,TAU); ctx.fill(); ctx.restore();
  const fg=ctx.createLinearGradient(0,player.r-2,0,player.r+fl); fg.addColorStop(0,'#ffe46b'); fg.addColorStop(1,'rgba(255,143,199,0)');
  ctx.fillStyle=fg; ctx.beginPath(); ctx.moveTo(-7,player.r-3); ctx.lineTo(0,player.r+fl); ctx.lineTo(7,player.r-3); ctx.closePath(); ctx.fill();
  const cg=ctx.createLinearGradient(0,player.r-2,0,player.r+fl*0.72); cg.addColorStop(0,'#ffffff'); cg.addColorStop(1,'rgba(255,228,107,0)');
  ctx.fillStyle=cg; ctx.beginPath(); ctx.moveTo(-3.4,player.r-3); ctx.lineTo(0,player.r+fl*0.72); ctx.lineTo(3.4,player.r-3); ctx.closePath(); ctx.fill();
  // muzzle flash — brief bright bloom at the nose the instant a shot leaves
  if(player.muzzle>0){ const k=player.muzzle/0.07; ctx.save(); ctx.globalCompositeOperation='lighter';
    const mg=ctx.createRadialGradient(0,-player.r-2,0,0,-player.r-2,16*k+6);
    mg.addColorStop(0,'rgba(255,255,255,'+(0.9*k)+')'); mg.addColorStop(.4,'rgba(255,228,140,'+(0.6*k)+')'); mg.addColorStop(1,'rgba(255,143,199,0)');
    ctx.fillStyle=mg; ctx.beginPath(); ctx.arc(0,-player.r-2,16*k+6,0,TAU); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,'+(0.7*k)+')'; ctx.lineWidth=2*k+0.5;
    for(let i=0;i<4;i++){ const a=-Math.PI/2+(i-1.5)*0.5; const L=(10*k+5); ctx.beginPath(); ctx.moveTo(0,-player.r-2); ctx.lineTo(Math.cos(a)*L,-player.r-2+Math.sin(a)*L); ctx.stroke(); }
    ctx.restore(); }
  const im=sprite('ship');
  if(im){ const d=player.r*3.7; let auraCol=equippedAura(); if(auraCol==='rainbow')auraCol=rainbowCol(performance.now()*0.001); if(!auraCol&&selectedShip)auraCol=selectedShip.col;
    if(auraCol){ const gg=ctx.createRadialGradient(0,0,d*0.12,0,0,d*0.52); gg.addColorStop(0,hexA(auraCol,.5)); gg.addColorStop(1,hexA(auraCol,0)); ctx.fillStyle=gg; ctx.beginPath(); ctx.arc(0,0,d*0.52,0,TAU); ctx.fill(); }
    const sk=equippedShip(); let drawImg=im;
    if(sk&&sk.col){ let tc=sk.col; if(tc==='rainbow'){ const hb=Math.floor((performance.now()*0.05)%12)*30; tc='hsl('+hb+',90%,66%)'; } if(sk.id==='s_galaxy')tc='__galaxy'; drawImg=shipSkinCanvas(im,tc); }
    ctx.drawImage(drawImg,-d/2,-d/2,d,d); ctx.restore(); return; }
  // vector fallback
  const hg=ctx.createLinearGradient(0,-player.r,0,player.r); hg.addColorStop(0,'#ffffff'); hg.addColorStop(1,'#c8eede');
  ctx.fillStyle=hg; ctx.strokeStyle='#6fcab0'; ctx.lineWidth=2.5;
  ctx.beginPath(); ctx.moveTo(0,-player.r-4);
  ctx.quadraticCurveTo(player.r+5,-2,player.r-3,player.r-2);
  ctx.quadraticCurveTo(0,player.r+5,-(player.r-3),player.r-2);
  ctx.quadraticCurveTo(-(player.r+5),-2,0,-player.r-4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#7ef9d2'; ctx.beginPath(); ctx.moveTo(-player.r+2,4); ctx.lineTo(-player.r-7,12); ctx.lineTo(-player.r+4,12); ctx.fill();
  ctx.beginPath(); ctx.moveTo(player.r-2,4); ctx.lineTo(player.r+7,12); ctx.lineTo(player.r-4,12); ctx.fill();
  ctx.fillStyle='#ffd2ec'; ctx.beginPath(); ctx.arc(0,-2,player.r*0.45,0,TAU); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.7)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(0,-2,player.r*0.45,0,TAU); ctx.stroke();
  ctx.fillStyle='#241038'; ctx.beginPath(); ctx.arc(-5,-3,2.6,0,TAU); ctx.arc(5,-3,2.6,0,TAU); ctx.fill();
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(-6,-4,1,0,TAU); ctx.arc(4,-4,1,0,TAU); ctx.fill();
  ctx.fillStyle='rgba(255,126,179,.7)'; ctx.beginPath(); ctx.arc(-9,1,2.2,0,TAU); ctx.arc(9,1,2.2,0,TAU); ctx.fill();
  ctx.restore();
}
// ---- teammate ship (P2) — same companion/overdrive visuals as your own ship ----
function drawP2(){ const im=sprite('ship'); if(!im||p2.dead&&p2.deadT<=0.6)return;
  const R=p2.r||19;
  drawFrenzyAura(p2.x,p2.y,R);
  ctx.save(); ctx.translate(p2.x,p2.y); if(p2.invuln>0&&Math.floor(performance.now()/80)%2)ctx.globalAlpha=0.4;
  drawWingmen(p2);
  ctx.strokeStyle='rgba(126,249,210,.7)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,0,R+8,0,TAU); ctx.stroke();
  const fl=10+Math.random()*8; ctx.fillStyle='rgba(143,211,255,.8)'; ctx.beginPath(); ctx.moveTo(-6,R); ctx.lineTo(6,R); ctx.lineTo(0,R+fl); ctx.fill();
  const d=R*2.6; ctx.drawImage(im,-d/2,-d/2,d,d); ctx.globalAlpha=1;
  ctx.fillStyle='#7ef9d2'; ctx.font='800 11px "Baloo 2"'; ctx.textAlign='center'; ctx.fillText('P2',0,-R-12); ctx.restore(); }

// ---- accessory overlays (drawn in local space; R = half draw size) ----
const ANCHORS={ // eyeY/dx = eyes; ear = where an ear sits; top = head crown for hats
  bird:  {eyeY:0.06, dx:0.24, earX:0.26, earY:-0.54, top:-0.52},
  dragon:{eyeY:0.02, dx:0.24, earX:0.34, earY:-0.52, top:-0.56},
  star:  {eyeY:0.00, dx:0.26, earX:0.34, earY:-0.44, top:-0.50},
  nimbus:{eyeY:0.00, dx:0.24, earX:0.32, earY:-0.56, top:-0.50},
  panda: {eyeY:0.00, dx:0.24, earX:0.40, earY:-0.44, top:-0.50},
  hamster:{eyeY:-0.04, dx:0.22, earX:0.27, earY:-0.55, top:-0.58},
  penguin:{eyeY:0.02,dx:0.20, earX:0.22, earY:-0.50, top:-0.52},
  ghost: {eyeY:-0.02,dx:0.22, earX:0.24, earY:-0.42, top:-0.48},
  bear:  {eyeY:0.00, dx:0.24, earX:0.42, earY:-0.44, top:-0.50},
  snowman:{eyeY:-0.12,dx:0.17, earX:0.20, earY:-0.40, top:-0.42},
  wolf:  {eyeY:0.04, dx:0.25, earX:0.34, earY:-0.52, top:-0.48},
  lynx:  {eyeY:0.00, dx:0.24, earX:0.34, earY:-0.54, top:-0.50},
  shroom:{eyeY:0.30, dx:0.23, earX:0.34, earY:-0.30, top:-0.56},
};
function drawAcc(type,acc,R,t){
  if(!acc)return; const A=ANCHORS[type]||ANCHORS.nimbus;
  const ey=A.eyeY*R, dx=A.dx*R, top=A.top*R, earX=A.earX*R, earY=A.earY*R;
  ctx.lineJoin='round'; ctx.lineCap='round';
  if(acc==='glasses'||acc==='sunglasses'){
    const rad=R*0.18, dark=acc==='sunglasses';
    ctx.strokeStyle='#2a2030'; ctx.lineWidth=R*0.04;
    ctx.fillStyle=dark?'rgba(30,16,40,.92)':'rgba(180,230,255,.45)';
    for(const sx of [-1,1]){ ctx.beginPath(); ctx.arc(sx*dx,ey,rad,0,TAU); ctx.fill(); ctx.stroke();
      if(!dark){ctx.fillStyle='rgba(255,255,255,.6)';ctx.beginPath();ctx.arc(sx*dx-rad*0.3,ey-rad*0.3,rad*0.3,0,TAU);ctx.fill();ctx.fillStyle='rgba(180,230,255,.45)';} }
    ctx.beginPath(); ctx.moveTo(-dx+rad*0.8,ey); ctx.lineTo(dx-rad*0.8,ey);
    ctx.moveTo(-dx-rad,ey); ctx.lineTo(-dx-rad*1.7,ey-rad*0.4); ctx.moveTo(dx+rad,ey); ctx.lineTo(dx+rad*1.7,ey-rad*0.4); ctx.stroke();
  } else if(acc==='monocle'){
    const rad=R*0.2; ctx.strokeStyle='#caa53a'; ctx.lineWidth=R*0.05; ctx.fillStyle='rgba(180,230,255,.4)';
    ctx.beginPath(); ctx.arc(dx,ey,rad,0,TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='rgba(120,90,40,.8)'; ctx.lineWidth=R*0.025;
    ctx.beginPath(); ctx.moveTo(dx,ey+rad); ctx.quadraticCurveTo(dx+R*0.06,ey+R*0.3,dx-R*0.04,ey+R*0.42); ctx.stroke();
  } else if(acc==='bow'){           // on the ear
    const bx=earX, by=earY; ctx.fillStyle='#ff5a8c'; ctx.strokeStyle='#d63b6e'; ctx.lineWidth=R*0.03;
    for(const sx of [-1,1]){ ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(bx+sx*R*0.18,by-R*0.12); ctx.lineTo(bx+sx*R*0.18,by+R*0.12); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(bx,by,R*0.06,0,TAU); ctx.fill(); ctx.stroke();
  } else if(acc==='flower'){        // on the (other) ear
    const fx=-earX, fy=earY; ctx.fillStyle='#ff7ab8';
    for(let k=0;k<5;k++){const a=k/5*TAU+t;ctx.beginPath();ctx.ellipse(fx+Math.cos(a)*R*0.09,fy+Math.sin(a)*R*0.09,R*0.06,R*0.04,a,0,TAU);ctx.fill();}
    ctx.fillStyle='#ffe46b'; ctx.beginPath(); ctx.arc(fx,fy,R*0.05,0,TAU); ctx.fill();
  } else if(acc==='halo'){
    const hy=top*1.05; ctx.strokeStyle='#ffe46b'; ctx.lineWidth=R*0.07; ctx.shadowColor='#ffe46b'; ctx.shadowBlur=8;
    ctx.beginPath(); ctx.ellipse(0,hy,R*0.32,R*0.1,0,0,TAU); ctx.stroke(); ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(255,255,255,.8)'; ctx.lineWidth=R*0.02; ctx.beginPath(); ctx.ellipse(0,hy,R*0.32,R*0.1,0,Math.PI*1.05,Math.PI*1.6); ctx.stroke();
  } else if(acc==='party'){
    const hy=top; ctx.fillStyle='#7ad0ff'; ctx.strokeStyle='#3aa6e0'; ctx.lineWidth=R*0.03;
    ctx.beginPath(); ctx.moveTo(-R*0.2,hy+R*0.05); ctx.lineTo(R*0.2,hy+R*0.05); ctx.lineTo(0,hy-R*0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='#ff8fc7'; ctx.lineWidth=R*0.05;
    ctx.beginPath(); ctx.moveTo(-R*0.14,hy-R*0.05); ctx.lineTo(R*0.06,hy-R*0.18); ctx.moveTo(-R*0.04,hy-R*0.22); ctx.lineTo(R*0.12,hy-R*0.34); ctx.stroke();
    ctx.fillStyle='#ffe46b'; ctx.beginPath(); ctx.arc(0,hy-R*0.5,R*0.07,0,TAU); ctx.fill();
  } else if(acc==='headphones'){
    ctx.strokeStyle='#3a2438'; ctx.lineWidth=R*0.07; ctx.beginPath(); ctx.arc(0,ey,Math.abs(top),Math.PI*1.12,Math.PI*1.88); ctx.stroke();
    ctx.fillStyle='#ff8fc7'; ctx.strokeStyle='#d63b6e'; ctx.lineWidth=R*0.03;
    for(const sx of [-1,1]){ ctx.beginPath(); ctx.ellipse(sx*(earX+R*0.02),ey,R*0.1,R*0.15,0,0,TAU); ctx.fill(); ctx.stroke(); }
  } else if(acc==='tophat'){
    const hy=top; ctx.fillStyle='#2a1840'; ctx.strokeStyle='#120a22'; ctx.lineWidth=R*0.03;
    ctx.beginPath(); ctx.ellipse(0,hy+R*0.04,R*0.34,R*0.08,0,0,TAU); ctx.fill(); ctx.stroke();
    ctx.fillRect(-R*0.2,hy-R*0.34,R*0.4,R*0.38); ctx.strokeRect(-R*0.2,hy-R*0.34,R*0.4,R*0.38);
    ctx.fillStyle='#ff5a8c'; ctx.fillRect(-R*0.2,hy-R*0.02,R*0.4,R*0.06);
  } else if(acc==='witchhat'){
    const hy=top; ctx.fillStyle='#3a2152'; ctx.strokeStyle='#1c0f2c'; ctx.lineWidth=R*0.03;
    ctx.beginPath(); ctx.ellipse(0,hy+R*0.06,R*0.42,R*0.1,0,0,TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-R*0.26,hy+R*0.05); ctx.quadraticCurveTo(R*0.08,hy-R*0.2,R*0.22,hy-R*0.72); ctx.quadraticCurveTo(R*0.04,hy-R*0.2,R*0.26,hy+R*0.05); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#ffe46b'; ctx.fillRect(-R*0.2,hy-R*0.04,R*0.4,R*0.07);
    ctx.fillStyle='#ffe46b'; ctx.beginPath(); ctx.moveTo(0,hy-R*0.06); for(let i=0;i<10;i++){const a=-Math.PI/2+i/10*TAU,rr=i%2?R*0.02:R*0.05;ctx.lineTo(Math.cos(a)*rr,hy-R*0.06+Math.sin(a)*rr);} ctx.fill();
  } else if(acc==='pumpkin'){
    const hy=top*0.9; ctx.fillStyle='#ff7a1a'; ctx.strokeStyle='#c95a10'; ctx.lineWidth=R*0.03;
    ctx.beginPath(); ctx.ellipse(0,hy,R*0.2,R*0.16,0,0,TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='#c95a10'; ctx.lineWidth=R*0.02; for(const o of [-0.1,0,0.1]){ctx.beginPath();ctx.moveTo(o*R*2,hy-R*0.15);ctx.lineTo(o*R*2,hy+R*0.15);ctx.stroke();}
    ctx.fillStyle='#3a7d2a'; ctx.fillRect(-R*0.02,hy-R*0.24,R*0.04,R*0.08);
  } else if(acc==='santa'){
    const hy=top; ctx.fillStyle='#e23b3b'; ctx.strokeStyle='#a82020'; ctx.lineWidth=R*0.03;
    ctx.beginPath(); ctx.moveTo(-R*0.26,hy+R*0.06); ctx.lineTo(R*0.26,hy+R*0.06); ctx.quadraticCurveTo(R*0.34,hy-R*0.32,-R*0.06,hy-R*0.30); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.ellipse(0,hy+R*0.07,R*0.3,R*0.07,0,0,TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(-R*0.06,hy-R*0.30,R*0.07,0,TAU); ctx.fill();
  } else if(acc==='scarf'){
    const sy=R*0.62; ctx.fillStyle='#e23b3b'; ctx.strokeStyle='#a82020'; ctx.lineWidth=R*0.03;
    ctx.beginPath(); ctx.ellipse(0,sy,R*0.36,R*0.12,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillRect(R*0.12,sy,R*0.12,R*0.3); ctx.strokeRect(R*0.12,sy,R*0.12,R*0.3);
    ctx.strokeStyle='#fff'; ctx.lineWidth=R*0.02; for(let i=0;i<3;i++)ctx.strokeRect(R*0.12,sy+R*0.06+i*R*0.09,R*0.12,0.1);
  } else if(acc==='helmet'){            // Chicken-Invaders style army helmet
    const hy=top*0.92; ctx.fillStyle='#5a6b35'; ctx.strokeStyle='#39481f'; ctx.lineWidth=R*0.035;
    ctx.beginPath(); ctx.ellipse(0,hy+R*0.08,R*0.42,R*0.1,0,0,TAU); ctx.fill(); ctx.stroke();      // brim
    ctx.beginPath(); ctx.arc(0,hy+R*0.08,R*0.36,Math.PI,0); ctx.closePath(); ctx.fill(); ctx.stroke(); // dome
    ctx.fillStyle='rgba(255,255,255,.18)'; ctx.beginPath(); ctx.ellipse(-R*0.1,hy-R*0.06,R*0.14,R*0.07,-0.5,0,TAU); ctx.fill(); // shine
    // yellow star
    ctx.fillStyle='#ffe24a'; ctx.beginPath();
    for(let i=0;i<10;i++){const a=-Math.PI/2+i/10*TAU,rr=i%2?R*0.05:R*0.12;const px=Math.cos(a)*rr,py=hy-R*0.05+Math.sin(a)*rr;i?ctx.lineTo(px,py):ctx.moveTo(px,py);} ctx.closePath(); ctx.fill();
    // camo blotches
    ctx.fillStyle='#41502a'; ctx.beginPath(); ctx.ellipse(R*0.16,hy-R*0.04,R*0.08,R*0.05,0,0,TAU); ctx.ellipse(-R*0.22,hy+R*0.02,R*0.06,R*0.04,0,0,TAU); ctx.fill();
  } else if(acc==='hearts'){            // floating valentine hearts
    for(let i=0;i<2;i++){ const hx=(i?1:-1)*R*0.22, hy=top*0.96+Math.sin(t*3+i)*R*0.05, s=R*0.12;
      ctx.fillStyle=i?'#ff5a8c':'#ff8fc7';
      ctx.beginPath(); ctx.moveTo(hx,hy+s*0.6);
      ctx.bezierCurveTo(hx-s,hy-s*0.4,hx-s*0.2,hy-s,hx,hy-s*0.3);
      ctx.bezierCurveTo(hx+s*0.2,hy-s,hx+s,hy-s*0.4,hx,hy+s*0.6); ctx.fill(); }
  } else if(acc==='martisor'){          // red-white twined string on the chest
    const sy=R*0.5; ctx.lineWidth=R*0.05; ctx.lineCap='round';
    ctx.strokeStyle='#e23b3b'; ctx.beginPath(); ctx.moveTo(-R*0.14,sy-R*0.12); ctx.quadraticCurveTo(0,sy,R*0.14,sy+R*0.12); ctx.stroke();
    ctx.strokeStyle='#fff'; ctx.beginPath(); ctx.moveTo(R*0.14,sy-R*0.12); ctx.quadraticCurveTo(0,sy,-R*0.14,sy+R*0.12); ctx.stroke();
    ctx.fillStyle='#fff'; ctx.strokeStyle='#e23b3b'; ctx.lineWidth=R*0.02;       // little flower trinket
    for(let k=0;k<4;k++){const a=k/4*TAU;ctx.beginPath();ctx.ellipse(Math.cos(a)*R*0.06,sy+R*0.02+Math.sin(a)*R*0.06,R*0.045,R*0.03,a,0,TAU);ctx.fill();ctx.stroke();}
    ctx.fillStyle='#ffe24a'; ctx.beginPath(); ctx.arc(0,sy+R*0.02,R*0.03,0,TAU); ctx.fill();
  }
}
function drawDome(x,y,r){ ctx.save();
  const g=ctx.createRadialGradient(x-r*0.3,y-r*0.4,r*0.1,x,y,r); g.addColorStop(0,'rgba(255,255,255,.30)'); g.addColorStop(.55,'rgba(180,230,255,.10)'); g.addColorStop(1,'rgba(150,200,255,.04)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
  ctx.strokeStyle='rgba(200,240,255,.55)'; ctx.lineWidth=Math.max(1.5,r*0.07); ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.7)'; ctx.lineWidth=Math.max(1,r*0.05); ctx.beginPath(); ctx.arc(x,y,r*0.82,Math.PI*1.05,Math.PI*1.45); ctx.stroke(); ctx.restore(); }
function ufoBreak(e){ const x=e.x,y=e.y+e.r*0.55; shake(8,.25); snd.explode();
  particles.push({x,y,vx:0,vy:0,life:.18,max:.18,r:e.r*0.9,color:'#fff'});
  particles.push({x,y,vx:0,vy:0,life:.4,max:.4,r:e.r*0.6,grow:120,ring:true,color:'#bfe9ff'});
  for(let i=0;i<7;i++){ const a=rand(0,TAU),sp=rand(120,300); particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-40,life:rand(.6,1.0),max:1.0,r:rand(4,7),frag:true,color:i%2?'#cfe0ee':'#9fb4c6',ang0:rand(0,TAU),spin:rand(-10,10)}); }
  for(let i=0;i<6;i++){ const a=rand(-Math.PI,0),sp=rand(140,320); particles.push({x:e.x,y:e.y-e.r*0.35,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-60,life:rand(.5,.9),max:.9,r:rand(3,6),glass:true,color:'#bfe9ff',ang0:rand(0,TAU),spin:rand(-12,12)}); }
  particles.push({x:e.x,y:e.y-e.r*0.35,vx:rand(-60,60),vy:rand(-260,-180),life:1.0,max:1.0,r:e.r*0.8,head:e.type,ang0:0,spin:rand(-8,8)});
  for(let i=0;i<8;i++)particles.push(part(x,y,rand(0,TAU),rand(90,260),Math.random()<.5?'#fff':'#ffe46b',rand(.3,.6),rand(2,4))); }
function drawUfo(x,y,R,t){
  ctx.save(); ctx.translate(x,y); ctx.rotate(Math.sin(t*2.2)*0.10);
  // glow
  ctx.fillStyle='rgba(143,211,255,.18)'; ctx.beginPath(); ctx.ellipse(0,R*0.1,R*1.1,R*0.5,0,0,TAU); ctx.fill();
  // base saucer
  const g=ctx.createLinearGradient(0,-R*0.2,0,R*0.3); g.addColorStop(0,'#dff3ff'); g.addColorStop(1,'#7fb8d8');
  ctx.fillStyle=g; ctx.strokeStyle='#5a7e96'; ctx.lineWidth=R*0.06;
  ctx.beginPath(); ctx.ellipse(0,0,R*0.9,R*0.34,0,0,TAU); ctx.fill(); ctx.stroke();
  // lights
  for(let i=-2;i<=2;i++){ ctx.fillStyle=(Math.floor(t*6)+i)%2?'#ffe46b':'#ff8fc7'; ctx.beginPath(); ctx.arc(i*R*0.34,R*0.06,R*0.07,0,TAU); ctx.fill(); }
  ctx.restore();
}

// ---- enemies: original critters ----
function drawHeart(x,y,s){ ctx.beginPath(); ctx.moveTo(x,y+s*0.35); ctx.bezierCurveTo(x+s,y-s*0.5,x+s*0.55,y-s,x,y-s*0.35); ctx.bezierCurveTo(x-s*0.55,y-s,x-s,y-s*0.5,x,y+s*0.35); ctx.closePath(); ctx.fill(); }
function drawBauble(e){ const r=e.r, c=e.bcol;
  ctx.save(); ctx.translate(e.x,e.y);
  // cap + hook
  ctx.fillStyle='#e8c75a'; ctx.fillRect(-r*0.24,-r-r*0.42,r*0.48,r*0.45);
  ctx.strokeStyle='#e8c75a'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,-r-r*0.5,r*0.2,Math.PI*0.1,Math.PI*0.9); ctx.stroke();
  // ball
  const g=ctx.createRadialGradient(-r*0.35,-r*0.4,r*0.1,0,0,r*1.05);
  g.addColorStop(0,lightenHex(c,0.45)); g.addColorStop(.55,c); g.addColorStop(1,shadeHex(c,1.8));
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,r,0,TAU); ctx.fill();
  // decorative band + glint
  ctx.strokeStyle='rgba(255,255,255,.4)'; ctx.lineWidth=1.6; ctx.beginPath(); ctx.arc(0,-r*0.12,r*0.72,0.25,Math.PI-0.25); ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(-r*0.36,-r*0.36,r*0.16,r*0.26,-0.5,0,TAU); ctx.fill();
  ctx.restore(); }
function drawLeafBig(cx,cy,r,base,t){
  ctx.save(); ctx.translate(cx,cy); ctx.lineJoin='round';
  ctx.fillStyle=base; ctx.strokeStyle=shadeHex(base,1.7); ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(0,-r*1.25); ctx.quadraticCurveTo(r*1.15,-r*0.1,0,r*1.25); ctx.quadraticCurveTo(-r*1.15,-r*0.1,0,-r*1.25); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle=shadeHex(base,1.4); ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(0,-r*1.05); ctx.lineTo(0,r*0.95);
  for(const s of [-1,1]) for(let k=0;k<3;k++){ const yy=-r*0.5+k*r*0.45; ctx.moveTo(0,yy); ctx.lineTo(s*r*0.55,yy+r*0.3); } ctx.stroke();
  const ey=-r*0.2, lk=Math.sin((t||0)*4)*r*0.05;
  ctx.strokeStyle='#3a1c10'; ctx.lineWidth=r*0.06; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(-r*0.55,ey-r*0.46); ctx.lineTo(-r*0.18,ey-r*0.3); ctx.moveTo(r*0.55,ey-r*0.46); ctx.lineTo(r*0.18,ey-r*0.3); ctx.stroke();
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.ellipse(-r*0.34,ey,r*0.28,r*0.37,0,0,TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(r*0.34,ey,r*0.28,r*0.37,0,0,TAU); ctx.fill();
  ctx.fillStyle='#241410'; ctx.beginPath(); ctx.arc(-r*0.32+lk,ey-r*0.05,r*0.14,0,TAU); ctx.arc(r*0.34+lk,ey-r*0.05,r*0.14,0,TAU); ctx.fill();
  ctx.fillStyle='#3a1410'; ctx.beginPath(); ctx.ellipse(0,r*0.46,r*0.3,r*0.36,0,0,TAU); ctx.fill();
  ctx.fillStyle='#d8606a'; ctx.beginPath(); ctx.ellipse(0,r*0.6,r*0.15,r*0.15,0,0,TAU); ctx.fill();
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.moveTo(-r*0.14,r*0.22); ctx.lineTo(-r*0.06,r*0.36); ctx.lineTo(-r*0.22,r*0.36); ctx.closePath(); ctx.moveTo(r*0.14,r*0.22); ctx.lineTo(r*0.06,r*0.36); ctx.lineTo(r*0.22,r*0.36); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawLeaf(e){ const r=e.r, c=e.lcol, rot=(e.spin0||0)+Math.sin(e.t*2.5+(e.wobp||0))*0.5, look=Math.sin((e.wobp||0))*r*0.05;
  ctx.save(); ctx.translate(e.x,e.y); ctx.rotate(rot); ctx.lineJoin='round';
  // leaf body
  ctx.fillStyle=c; ctx.strokeStyle=shadeHex(c,1.7); ctx.lineWidth=1.6;
  ctx.beginPath(); ctx.moveTo(0,-r*1.2); ctx.quadraticCurveTo(r*1.1,-r*0.1,0,r*1.2); ctx.quadraticCurveTo(-r*1.1,-r*0.1,0,-r*1.2); ctx.closePath(); ctx.fill(); ctx.stroke();
  // faint central vein + stem
  ctx.strokeStyle=shadeHex(c,1.45); ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,-r*1.05); ctx.lineTo(0,-r*0.55); ctx.moveTo(0,r*0.85); ctx.lineTo(0,r*1.1); ctx.stroke();
  ctx.strokeStyle=shadeHex(c,2.1); ctx.lineWidth=1.6; ctx.beginPath(); ctx.moveTo(0,r*1.1); ctx.lineTo(0,r*1.42); ctx.stroke();
  // --- face (varied expressions) ---
  const ey=-r*0.18, face=e.face||0;
  ctx.lineCap='round';
  if(face===1){ // angry
    ctx.strokeStyle='#3a1c10'; ctx.lineWidth=r*0.09;
    ctx.beginPath(); ctx.moveTo(-r*0.54,ey-r*0.38); ctx.lineTo(-r*0.14,ey-r*0.14); ctx.moveTo(r*0.54,ey-r*0.38); ctx.lineTo(r*0.14,ey-r*0.14); ctx.stroke();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.ellipse(-r*0.32,ey+r*0.04,r*0.24,r*0.18,0,0,TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(r*0.32,ey+r*0.04,r*0.24,r*0.18,0,0,TAU); ctx.fill();
    ctx.fillStyle='#241410'; ctx.beginPath(); ctx.arc(-r*0.3,ey+r*0.04,r*0.1,0,TAU); ctx.arc(r*0.3,ey+r*0.04,r*0.1,0,TAU); ctx.fill();
    ctx.strokeStyle='#3a1410'; ctx.lineWidth=r*0.08; ctx.beginPath(); ctx.moveTo(-r*0.3,r*0.44); ctx.lineTo(-r*0.15,r*0.52); ctx.lineTo(0,r*0.44); ctx.lineTo(r*0.15,r*0.52); ctx.lineTo(r*0.3,r*0.44); ctx.stroke();
  } else if(face===2){ // shocked
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(-r*0.34,ey,r*0.34,0,TAU); ctx.fill(); ctx.beginPath(); ctx.arc(r*0.34,ey,r*0.34,0,TAU); ctx.fill();
    ctx.fillStyle='#241410'; ctx.beginPath(); ctx.arc(-r*0.34+look,ey,r*0.1,0,TAU); ctx.arc(r*0.34+look,ey,r*0.1,0,TAU); ctx.fill();
    ctx.fillStyle='#3a1410'; ctx.beginPath(); ctx.arc(0,r*0.5,r*0.13,0,TAU); ctx.fill();
  } else if(face===3){ // dizzy X-eyes
    ctx.strokeStyle='#241410'; ctx.lineWidth=r*0.08;
    for(const ex of [-1,1]){ const cx2=ex*r*0.34; ctx.beginPath(); ctx.moveTo(cx2-r*0.16,ey-r*0.16); ctx.lineTo(cx2+r*0.16,ey+r*0.16); ctx.moveTo(cx2+r*0.16,ey-r*0.16); ctx.lineTo(cx2-r*0.16,ey+r*0.16); ctx.stroke(); }
    ctx.strokeStyle='#3a1410'; ctx.lineWidth=r*0.07; ctx.beginPath(); ctx.moveTo(-r*0.26,r*0.46); ctx.quadraticCurveTo(-r*0.13,r*0.36,0,r*0.46); ctx.quadraticCurveTo(r*0.13,r*0.56,r*0.26,r*0.46); ctx.stroke();
  } else if(face===4){ // derp
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(-r*0.34,ey,r*0.3,0,TAU); ctx.fill(); ctx.beginPath(); ctx.arc(r*0.36,ey+r*0.05,r*0.2,0,TAU); ctx.fill();
    ctx.fillStyle='#241410'; ctx.beginPath(); ctx.arc(-r*0.4,ey+r*0.05,r*0.12,0,TAU); ctx.arc(r*0.42,ey+r*0.08,r*0.08,0,TAU); ctx.fill();
    ctx.fillStyle='#3a1410'; ctx.beginPath(); ctx.arc(0,r*0.4,r*0.16,0,Math.PI); ctx.fill();
    ctx.fillStyle='#d8606a'; ctx.beginPath(); ctx.ellipse(r*0.05,r*0.52,r*0.1,r*0.14,0,0,TAU); ctx.fill();
  } else { // 0 screaming
    ctx.strokeStyle='#3a1c10'; ctx.lineWidth=Math.max(1.4,r*0.07);
    ctx.beginPath(); ctx.moveTo(-r*0.5,ey-r*0.42); ctx.lineTo(-r*0.16,ey-r*0.3); ctx.moveTo(r*0.5,ey-r*0.42); ctx.lineTo(r*0.16,ey-r*0.3); ctx.stroke();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.ellipse(-r*0.34,ey,r*0.27,r*0.34,0,0,TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(r*0.34,ey,r*0.27,r*0.34,0,0,TAU); ctx.fill();
    ctx.fillStyle='#241410'; ctx.beginPath(); ctx.arc(-r*0.32+look,ey-r*0.08,r*0.12,0,TAU); ctx.arc(r*0.32+look,ey-r*0.08,r*0.12,0,TAU); ctx.fill();
    ctx.fillStyle='#3a1410'; ctx.beginPath(); ctx.ellipse(0,r*0.42,r*0.24,r*0.32,0,0,TAU); ctx.fill();
    ctx.fillStyle='#d8606a'; ctx.beginPath(); ctx.ellipse(0,r*0.56,r*0.13,r*0.13,0,0,TAU); ctx.fill();
  }
  ctx.restore(); }
function drawBabyShell(e){ const r=e.r, w=r*1.15;
  ctx.save(); ctx.translate(e.x,e.y-r*0.88); ctx.rotate(Math.sin(e.t*2)*0.13);
  ctx.fillStyle='#fff'; ctx.strokeStyle='#d8c4b0'; ctx.lineWidth=1.4; ctx.lineJoin='round';
  ctx.beginPath(); ctx.arc(0,0,w,Math.PI,0,false);
  const zig=6; for(let i=0;i<=zig;i++){ const px=w-(2*w)*(i/zig); ctx.lineTo(px,(i%2?7:1)); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#ffe0ec'; ctx.beginPath(); ctx.arc(-w*0.4,-w*0.32,r*0.13,0,TAU); ctx.arc(w*0.35,-w*0.48,r*0.11,0,TAU); ctx.fill();
  ctx.restore();
  ctx.fillStyle='rgba(255,150,180,.5)'; ctx.beginPath(); ctx.arc(e.x-r*0.5,e.y+r*0.18,r*0.2,0,TAU); ctx.arc(e.x+r*0.5,e.y+r*0.18,r*0.2,0,TAU); ctx.fill();
}
function axolotlBody(d){
  const bc=CRITCOL.pip, bs=shade(bc), belly='#dff5ff', fin='#f78aa8', ol='#3a2438';
  ctx.lineJoin='round'; ctx.lineWidth=Math.max(1.1,d*0.02); ctx.strokeStyle=ol;
  // codiță cu înotătoare (în spate, dreapta)
  ctx.fillStyle=fin; ctx.beginPath();
  ctx.moveTo(d*0.05,d*0.30); ctx.quadraticCurveTo(d*0.40,d*0.25,d*0.50,d*0.56);
  ctx.quadraticCurveTo(d*0.30,d*0.50,d*0.07,d*0.46); ctx.closePath(); ctx.fill(); ctx.stroke();
  // piciorușe
  ctx.fillStyle=bc;
  ctx.beginPath(); ctx.ellipse(-d*0.11,d*0.55,d*0.072,d*0.05,0,0,TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(d*0.11,d*0.55,d*0.072,d*0.05,0,0,TAU); ctx.fill(); ctx.stroke();
  // trup
  ctx.fillStyle=bc; ctx.beginPath(); ctx.ellipse(0,d*0.40,d*0.20,d*0.17,0,0,TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle=belly; ctx.beginPath(); ctx.ellipse(0,d*0.43,d*0.12,d*0.11,0,0,TAU); ctx.fill();
  // mânuțe (se mișcă lin)
  const aw=Math.sin(performance.now()/360)*d*0.018; ctx.fillStyle=bc;
  ctx.beginPath(); ctx.ellipse(-d*0.21,d*0.36+aw,d*0.055,d*0.078,0.5,0,TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(d*0.21,d*0.36-aw,d*0.055,d*0.078,-0.5,0,TAU); ctx.fill(); ctx.stroke();
}
function critterBody(d,type,ph){ ph=ph||0;
  const bc=critCol(type), bs=shade(bc);
  ctx.strokeStyle='#3a2438'; ctx.lineWidth=Math.max(1.1,d*0.02); ctx.lineJoin='round';
  ctx.fillStyle=bs; ctx.beginPath(); ctx.ellipse(-d*0.10,d*0.52,d*0.06,d*0.045,0,0,TAU); ctx.ellipse(d*0.10,d*0.52,d*0.06,d*0.045,0,0,TAU); ctx.fill();
  const aw=Math.sin(performance.now()/360+ph)*d*0.020; ctx.fillStyle=bc;
  ctx.beginPath(); ctx.ellipse(-d*0.20,d*0.34+aw,d*0.05,d*0.075,0.5,0,TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(d*0.20,d*0.34-aw,d*0.05,d*0.075,-0.5,0,TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0,d*0.38,d*0.19,d*0.16,0,0,TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.32)'; ctx.beginPath(); ctx.ellipse(0,d*0.40,d*0.11,d*0.10,0,0,TAU); ctx.fill();
}
function _crackAngles(seed,n){ const out=[]; let x=(seed>>>0)||1; for(let i=0;i<n;i++){ x=(x*1103515245+12345)>>>0; out.push((x/4294967296)*TAU); } return out; }
function drawEnemyBubble(e){ const x=e.x,y=e.y,r=e.r*1.34; const frac=e.maxHp?clamp(e.hp/e.maxHp,0,1):1;
  const integ=clamp((frac-0.5)/0.5,0,1);                 // 1 intactă → 0 la pragul de spargere
  ctx.save();
  // sferă translucidă
  const g=ctx.createRadialGradient(x-r*0.3,y-r*0.35,r*0.15,x,y,r);
  g.addColorStop(0,'rgba(255,255,255,0.05)'); g.addColorStop(0.72,'rgba(210,238,255,0.06)');
  g.addColorStop(0.9,'rgba(180,225,255,0.20)'); g.addColorStop(1,'rgba(150,205,255,0.30)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
  // rim + tentă albastră jos
  ctx.lineWidth=2.2; ctx.strokeStyle='rgba(220,244,255,0.7)'; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.stroke();
  ctx.lineWidth=3.2; ctx.strokeStyle='rgba(120,190,255,0.5)'; ctx.beginPath(); ctx.arc(x,y,r*0.995,Math.PI*0.15,Math.PI*0.85); ctx.stroke();
  // luciu stânga-sus
  ctx.strokeStyle='rgba(255,255,255,0.85)'; ctx.lineWidth=2.4; ctx.beginPath(); ctx.arc(x,y,r*0.8,Math.PI*1.05,Math.PI*1.35); ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(x-r*0.42,y-r*0.46,r*0.12,r*0.06,-0.7,0,TAU); ctx.fill();
  // crăpături — cresc pe măsură ce integ scade
  const nc=Math.round((1-integ)*7);
  if(nc>0){ ctx.strokeStyle='rgba(245,252,255,0.9)'; ctx.lineWidth=1.4; ctx.lineJoin='round'; ctx.lineCap='round';
    const angs=_crackAngles(e.crackSeed,nc);
    for(const a0 of angs){ let px=x+Math.cos(a0)*r, py=y+Math.sin(a0)*r; ctx.beginPath(); ctx.moveTo(px,py);
      let a=a0+Math.PI, seg=3+Math.round((1-integ)*3), st=r/(seg+1), h=(e.crackSeed%7)*0.13+0.2;
      for(let k=0;k<seg;k++){ a+=(((k*131+e.crackSeed)%100)/100-0.5)*h*2; px+=Math.cos(a)*st; py+=Math.sin(a)*st; ctx.lineTo(px,py); }
      ctx.stroke();
      // ramificație scurtă
      ctx.beginPath(); ctx.moveTo((x+px)/2,(y+py)/2); ctx.lineTo((x+px)/2+Math.cos(a+1)*st*0.7,(y+py)/2+Math.sin(a+1)*st*0.7); ctx.stroke();
    }
  }
  ctx.restore();
}
function shatterBubble(e){ e.bubBroken=true;
  const r=e.r*1.34;
  for(let i=0;i<18;i++){ const a=i/18*TAU+rand(-0.2,0.2), sp=rand(120,300);
    const p=part(e.x+Math.cos(a)*r,e.y+Math.sin(a)*r,a,sp,Math.random()<0.5?'#eafaff':'#bfe6ff',rand(0.35,0.6),rand(1.6,3.4));
    p.shard=true; p.spin=rand(0,TAU); p.vr=rand(-8,8); p.grav=180; particles.push(p); }
  particles.push({x:e.x,y:e.y,vx:0,vy:0,life:0.4,max:0.4,r:r*0.7,grow:r*4,ring:true,color:'#dff4ff'});
  if(snd&&snd.hit)snd.hit(); if(typeof tone==='function'){ try{ tone(1180,0.09,'triangle',0.14); tone(760,0.12,'square',0.08); }catch(_){}}
}
function drawCritter(x,y,sz,type,wob,flash,blinking,acc,nb,ouch){
  const im=sprite(type);
  if(im){ ctx.save(); ctx.translate(x,y); ctx.rotate(wob);
    const br=1+Math.sin(performance.now()/640)*0.012; ctx.scale(br,2-br);
    if(flash)ctx.filter='brightness(1.9) saturate(1.2)';
    const d=sz*1.55;
    if(!nb)critterBody(d,type,x*0.05);
    ctx.drawImage(im,-d/2,-d/2,d,d);
    ctx.filter='none'; if(acc)drawAcc(type,acc,d/2,wob); if(ouch)hurtFace(type,d/2); ctx.restore(); return; }
  ctx.save(); ctx.translate(x,y); ctx.rotate(wob);
  const s=sz/40; ctx.scale(s,s);
  const col=critCol(type);
  if(flash)ctx.globalAlpha=0.6+Math.random()*0.4;
  const O='#3a2438'; ctx.lineWidth=2.4; ctx.strokeStyle=O; ctx.lineJoin='round';
  if(type==='bird')drawBird(col,blinking);
  else if(type==='dragon')drawDragon(col,blinking);
  else if(type==='hamster')drawHamster(col,blinking);
  else if(type==='shroom')drawShroom(col,blinking);
  else if(type==='star')drawStar(col,blinking);
  else drawNimbus(col,blinking);
  const rim=ctx.createRadialGradient(-8,-9,1,-8,-9,16);
  rim.addColorStop(0,'rgba(255,255,255,.35)'); rim.addColorStop(1,'rgba(255,255,255,0)');
  ctx.globalCompositeOperation='lighter'; ctx.fillStyle=rim; ctx.beginPath(); ctx.arc(-6,-7,14,0,TAU); ctx.fill();
  ctx.globalCompositeOperation='source-over';
  ctx.globalAlpha=1; if(ouch)hurtFace(type,20); ctx.restore();
}
// brief "ouch" expression overlaid when a critter is hit (works over sprites too)
function hurtFace(type,R){
  const A=ANCHORS[type]||ANCHORS.nimbus;
  const ey=A.eyeY*R, dx=A.dx*R, er=R*0.17;
  ctx.save(); ctx.lineCap='round'; ctx.lineJoin='round';
  // squeezed-shut "X" eyes
  ctx.strokeStyle='#2a2030'; ctx.lineWidth=Math.max(1.8,R*0.06);
  for(const sx of [-1,1]){ const cx=sx*dx;
    ctx.beginPath(); ctx.moveTo(cx-er,ey-er); ctx.lineTo(cx+er,ey+er);
    ctx.moveTo(cx+er,ey-er); ctx.lineTo(cx-er,ey+er); ctx.stroke(); }
  // open "O" ouch mouth
  const my=ey+R*0.36, mr=R*0.13;
  ctx.fillStyle='#3a2438'; ctx.beginPath(); ctx.ellipse(0,my,mr*0.9,mr,0,0,TAU); ctx.fill();
  ctx.fillStyle='rgba(255,120,130,.85)'; ctx.beginPath(); ctx.ellipse(0,my+mr*0.22,mr*0.45,mr*0.45,0,0,TAU); ctx.fill();
  // little comic impact ticks above the head
  ctx.strokeStyle='rgba(255,255,255,.92)'; ctx.lineWidth=Math.max(1.2,R*0.04);
  for(const t of [-1,0,1]){ const bx=t*R*0.34, by=-R*0.52;
    ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(bx+t*R*0.05,by-R*0.13); ctx.stroke(); }
  ctx.restore();
}
function shade(col){ // darker variant for gradient bottom
  const h=col.replace('#','');const r=parseInt(h.substr(0,2),16)*0.78|0,g=parseInt(h.substr(2,2),16)*0.78|0,b=parseInt(h.substr(4,2),16)*0.78|0;
  return 'rgb('+r+','+g+','+b+')'; }
function face(blinking,ex,ey,er,mouthY){
  ctx.fillStyle='#2a2030';
  if(blinking){ ctx.lineWidth=2; ctx.strokeStyle='#2a2030';
    ctx.beginPath(); ctx.moveTo(-ex-er,ey); ctx.lineTo(-ex+er,ey); ctx.moveTo(ex-er,ey); ctx.lineTo(ex+er,ey); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(-ex,ey,er,0,TAU); ctx.arc(ex,ey,er,0,TAU); ctx.fill();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(-ex-er*0.3,ey-er*0.35,er*0.4,0,TAU); ctx.arc(ex-er*0.3,ey-er*0.35,er*0.4,0,TAU); ctx.fill();
  }
  ctx.fillStyle='rgba(255,140,160,.55)'; ctx.beginPath(); ctx.arc(-ex-1,ey+er+1,2.6,0,TAU); ctx.arc(ex+1,ey+er+1,2.6,0,TAU); ctx.fill();
  ctx.strokeStyle='#3a2438'; ctx.lineWidth=1.6; ctx.beginPath(); ctx.moveTo(-2.5,mouthY); ctx.quadraticCurveTo(0,mouthY+2.4,2.5,mouthY); ctx.stroke();
}
// ——— noile creaturi (v2 — fidele referinței, extra drăgălașe) ———
function sparkleEyes(bl,ex,ey,er){ if(bl)return; ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.arc(-ex+er*0.42,ey+er*0.34,er*0.22,0,TAU); ctx.arc(ex+er*0.42,ey+er*0.34,er*0.22,0,TAU); ctx.fill(); }
function drawBird(col,bl){ // vrăbiuță albastră rotofeie, ca în referință
  const O='#3a2438'; const fl=Math.sin(performance.now()/240)*0.35;
  // aripioare mici, joase, strânse
  for(const sd of [-1,1]){ ctx.save(); ctx.translate(sd*14.2,3); ctx.rotate(sd*(0.95+fl));
    ctx.fillStyle=shade(col); ctx.lineWidth=2.2; ctx.strokeStyle=O;
    ctx.beginPath(); ctx.ellipse(0,0,3.6,6.2,sd*0.2,0,TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }
  // corp perfect rotund
  const g=ctx.createRadialGradient(-4,-6,2,0,0,17); g.addColorStop(0,'#bfe9ff'); g.addColorStop(.45,col); g.addColorStop(1,shade(col));
  ctx.fillStyle=g; ctx.lineWidth=2.4; ctx.strokeStyle=O;
  ctx.beginPath(); ctx.arc(0,0,16,0,TAU); ctx.fill(); ctx.stroke();
  // panou deschis mare (frunte→burtică), ca în referință
  ctx.fillStyle='#d9f1ff'; ctx.beginPath(); ctx.ellipse(0,3.2,10.6,11.6,0,0,TAU); ctx.fill();
  // trei firicele pe creștet
  ctx.strokeStyle=O; ctx.lineWidth=1.7; ctx.beginPath();
  ctx.moveTo(-2.5,-15.4); ctx.quadraticCurveTo(-4.5,-20,-6,-19.2);
  ctx.moveTo(0,-16); ctx.quadraticCurveTo(0.4,-21.4,-1.2,-21.8);
  ctx.moveTo(2.5,-15.4); ctx.quadraticCurveTo(4.5,-20,6,-19.2); ctx.stroke();
  // cioc mic romb
  ctx.fillStyle='#ffb347'; ctx.lineWidth=1.8;
  ctx.beginPath(); ctx.moveTo(-2.2,0.4); ctx.lineTo(0,-0.8); ctx.lineTo(2.2,0.4); ctx.lineTo(0,3.4); ctx.closePath(); ctx.fill(); ctx.stroke();
  // lăbuțe minuscule
  ctx.fillStyle='#ffb347'; ctx.beginPath(); ctx.ellipse(-5,15.4,2.7,1.8,0,0,TAU); ctx.ellipse(5,15.4,2.7,1.8,0,0,TAU); ctx.fill();
  face(bl,5.8,-3.2,4.0,3);
  sparkleEyes(bl,5.8,-3.2,4.0);
}
function drawDragon(col,bl){ // dragonaș adevărat: bot, aripi-membrană, coadă cu vârf, țepi
  const O='#3a2438'; const fl=Math.sin(performance.now()/230+2)*0.35;
  // coada curbată cu vârf de săgeată (în spate, stânga-jos)
  ctx.strokeStyle=O; ctx.fillStyle=col; ctx.lineWidth=2.2;
  ctx.beginPath(); ctx.moveTo(-9,10);
  ctx.quadraticCurveTo(-19,14,-20,6.5); ctx.quadraticCurveTo(-20.5,12.5,-15.5,14.5); ctx.quadraticCurveTo(-11.5,15.5,-8,12.5); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle=shade(col); ctx.beginPath(); ctx.moveTo(-20,6.5); ctx.lineTo(-24,3.5); ctx.lineTo(-22.5,8.5); ctx.lineTo(-17.5,9); ctx.closePath(); ctx.fill(); ctx.stroke();
  // aripi-membrană de liliac, mari și clare (două degete pe fiecare)
  for(const sd of [-1,1]){ ctx.save(); ctx.translate(sd*12.5,-5.5); ctx.rotate(sd*(0.22+fl*0.4));
    const wg=ctx.createLinearGradient(0,-11,0,7); wg.addColorStop(0,'#bfe8a0'); wg.addColorStop(.55,col); wg.addColorStop(1,shade(col));
    ctx.fillStyle=wg; ctx.lineWidth=2.2; ctx.strokeStyle=O;
    ctx.beginPath(); ctx.moveTo(0,5.5);
    ctx.quadraticCurveTo(sd*4.5,-10,sd*10.5,-11.5);       // marginea din față spre vârf
    ctx.quadraticCurveTo(sd*10.8,-5.5,sd*8.6,-2.6);       // degetul 1
    ctx.quadraticCurveTo(sd*12.4,-2.4,sd*11.6,2.6);       // vârful degetului 2
    ctx.quadraticCurveTo(sd*6.5,4.8,0,5.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    // nervurile membranei
    ctx.lineWidth=1.2; ctx.strokeStyle='rgba(58,36,56,.45)';
    ctx.beginPath(); ctx.moveTo(sd*1.5,3.8); ctx.quadraticCurveTo(sd*6,-3,sd*9.5,-10);
    ctx.moveTo(sd*2.5,4.4); ctx.quadraticCurveTo(sd*7.5,0.5,sd*10.6,1.4); ctx.stroke();
    ctx.restore(); }
  // cornițe crem
  ctx.fillStyle='#f4e8c8'; ctx.lineWidth=2; ctx.strokeStyle=O;
  for(const sd of [-1,1]){ ctx.beginPath(); ctx.moveTo(sd*5.4,-12.8);
    ctx.quadraticCurveTo(sd*9,-19.4,sd*6,-19); ctx.quadraticCurveTo(sd*3.6,-15.8,sd*5.4,-12.8); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  // creastă: țepi mici pe creștet
  ctx.fillStyle=shade(col);
  for(const [tx,th] of [[-2.4,3.2],[0.2,4.2],[2.8,3.0]]){ ctx.beginPath();
    ctx.moveTo(tx-1.4,-14.8); ctx.quadraticCurveTo(tx,-14.8-th,tx+1.4,-14.8); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  // corp rotofei
  const g=ctx.createRadialGradient(-4,-6,2,0,0,18); g.addColorStop(0,'#eaffd6'); g.addColorStop(.45,col); g.addColorStop(1,shade(col));
  ctx.fillStyle=g; ctx.lineWidth=2.4;
  ctx.beginPath(); ctx.arc(0,0,15.6,0,TAU); ctx.fill(); ctx.stroke();
  // burtică crem cu plăci moi
  ctx.fillStyle='#f4eed6'; ctx.beginPath(); ctx.ellipse(0,9.0,7.8,5.2,0,0,TAU); ctx.fill();
  ctx.strokeStyle='rgba(58,36,56,.30)'; ctx.lineWidth=1.1;
  ctx.beginPath(); ctx.moveTo(-5.2,7.8); ctx.quadraticCurveTo(0,9.2,5.2,7.8);
  ctx.moveTo(-4.4,11.2); ctx.quadraticCurveTo(0,12.6,4.4,11.2); ctx.stroke();
  ctx.strokeStyle=O; ctx.lineWidth=2.4;
  // lăbuțe
  ctx.fillStyle=shade(col); ctx.beginPath(); ctx.ellipse(-6.2,15,3.7,2.4,0,0,TAU); ctx.ellipse(6.2,15,3.7,2.4,0,0,TAU); ctx.fill();
  // fața de dragon — curată, ca în referință: ochi mari, nări-punct, zâmbet cu colți albi
  face(bl,5.8,-3.6,3.9,1.8);
  sparkleEyes(bl,5.8,-3.6,3.9);
  ctx.fillStyle='#4f6b3e'; ctx.beginPath(); ctx.arc(-1.6,0.3,0.62,0,TAU); ctx.arc(1.6,0.3,0.62,0,TAU); ctx.fill();
  ctx.fillStyle='#ffffff'; ctx.strokeStyle='rgba(58,36,56,.55)'; ctx.lineWidth=0.8;
  ctx.beginPath(); ctx.moveTo(-2.8,2.5); ctx.lineTo(-2.1,4.6); ctx.lineTo(-1.4,2.8); ctx.closePath();
  ctx.moveTo(2.8,2.5); ctx.lineTo(2.1,4.6); ctx.lineTo(1.4,2.8); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle=O; ctx.lineWidth=2.4;
}
function drawHamster(col,bl){ // 1:1 Hamster Ball: minge maro, pată albă mare, ochi MICI simpli, botic ω
  const O='#3a2438'; const fl=Math.sin(performance.now()/250+1)*0.28;
  // aripioare mici, discrete, în spate
  for(const sd of [-1,1]){ ctx.save(); ctx.translate(sd*13.6,2); ctx.rotate(sd*(1.12+fl*0.6));
    ctx.fillStyle='#ffffff'; ctx.lineWidth=2; ctx.strokeStyle=O;
    ctx.beginPath(); ctx.ellipse(0,-0.5,2.6,4.6,sd*0.2,0,TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }
  // antene — nota de unicitate
  ctx.strokeStyle=O; ctx.lineWidth=1.8; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(-4.4,-14.6); ctx.quadraticCurveTo(-7.5,-20.5,-8.8,-22.6);
  ctx.moveTo(4.4,-14.6); ctx.quadraticCurveTo(7.5,-20.5,8.8,-22.6); ctx.stroke(); ctx.lineCap='butt';
  ctx.fillStyle=col; ctx.strokeStyle=O; ctx.lineWidth=1.6;
  ctx.beginPath(); ctx.arc(-9.2,-23.4,2.1,0,TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(9.2,-23.4,2.1,0,TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(-9.9,-24.1,0.7,0,TAU); ctx.arc(8.5,-24.1,0.7,0,TAU); ctx.fill();
  // urechi mici rotunde pe contur
  ctx.fillStyle=col; ctx.lineWidth=2.2; ctx.strokeStyle=O;
  ctx.beginPath(); ctx.arc(-8.6,-12.4,3.4,0,TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(8.6,-12.4,3.4,0,TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#f3c4e6'; ctx.beginPath(); ctx.arc(-8.6,-12.1,1.5,0,TAU); ctx.arc(8.6,-12.1,1.5,0,TAU); ctx.fill();
  // corp minge maro-cald
  const g=ctx.createRadialGradient(-4,-6,2,0,0,18); g.addColorStop(0,'#d9bff0'); g.addColorStop(.5,col); g.addColorStop(1,shade(col));
  ctx.fillStyle=g; ctx.lineWidth=2.4;
  ctx.beginPath(); ctx.arc(0,0.4,15.8,0,TAU); ctx.fill(); ctx.stroke();
  // pată albă mare (bot+burtică), ovală, jos-centru
  ctx.fillStyle='#fdfdfd'; ctx.beginPath(); ctx.ellipse(0,6.4,10.4,9.2,0,0,TAU); ctx.fill();
  // brațe-nub la marginea albului
  ctx.fillStyle=col; ctx.strokeStyle=O; ctx.lineWidth=2.2;
  ctx.beginPath(); ctx.ellipse(-11.4,7.4,2.5,3.4,0.5,0,TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(11.4,7.4,2.5,3.4,-0.5,0,TAU); ctx.fill(); ctx.stroke();
  // piciorușe-nub
  ctx.fillStyle=shade(col); ctx.beginPath(); ctx.ellipse(-4.6,15.9,3.0,1.9,0,0,TAU); ctx.ellipse(4.6,15.9,3.0,1.9,0,0,TAU); ctx.fill();
  // ——— fața fidelă: ochi MICI, botic ω mic, obrăjori roz pe granița alb/maro ———
  if(bl){ ctx.strokeStyle='#2a2030'; ctx.lineWidth=2; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-5.2,-3.6); ctx.lineTo(-2.4,-3.6); ctx.moveTo(2.4,-3.6); ctx.lineTo(5.2,-3.6); ctx.stroke(); ctx.lineCap='butt';
  } else { ctx.fillStyle='#2a2030';
    ctx.beginPath(); ctx.ellipse(-3.8,-3.6,1.7,2.3,0,0,TAU); ctx.ellipse(3.8,-3.6,1.7,2.3,0,0,TAU); ctx.fill();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(-4.3,-4.5,0.7,0,TAU); ctx.arc(3.3,-4.5,0.7,0,TAU); ctx.fill();
  }
  // obrăjori roz, lateral, sub ochi
  ctx.fillStyle='rgba(255,150,168,.6)'; ctx.beginPath(); ctx.ellipse(-7.2,0.4,2.6,1.8,0,0,TAU); ctx.ellipse(7.2,0.4,2.6,1.8,0,0,TAU); ctx.fill();
  // botic ω mic
  ctx.strokeStyle='#3a2438'; ctx.lineWidth=1.5; ctx.lineJoin='round';
  ctx.beginPath();
  ctx.moveTo(-2.4,-0.6); ctx.quadraticCurveTo(-1.2,0.8,0,-0.5); ctx.quadraticCurveTo(1.2,0.8,2.4,-0.6); ctx.stroke();
}
function drawShroom(col,bl){ // ciupercuță curată: pălărie mare netedă, buline simple, față mare
  const O='#3a2438'; const cream='#f8ead0';
  // piciorul dolofan (aici stă fața)
  const bgd=ctx.createRadialGradient(-3,4,2,0,8,13); bgd.addColorStop(0,'#ffffff'); bgd.addColorStop(.55,cream); bgd.addColorStop(1,shade(cream));
  ctx.fillStyle=bgd; ctx.lineWidth=2.4; ctx.strokeStyle=O;
  ctx.beginPath(); ctx.moveTo(-8.6,0);
  ctx.quadraticCurveTo(-10.4,13.6,0,14.4); ctx.quadraticCurveTo(10.4,13.6,8.6,0);
  ctx.quadraticCurveTo(0,2.2,-8.6,0); ctx.closePath(); ctx.fill(); ctx.stroke();
  // brațe-nub
  ctx.fillStyle=cream; ctx.beginPath(); ctx.ellipse(-9.6,7.6,2.4,3.2,0.5,0,TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(9.6,7.6,2.4,3.2,-0.5,0,TAU); ctx.fill(); ctx.stroke();
  // piciorușe
  ctx.fillStyle=shade(cream); ctx.beginPath(); ctx.ellipse(-4.6,14.9,3.2,2.1,0,0,TAU); ctx.ellipse(4.6,14.9,3.2,2.1,0,0,TAU); ctx.fill();
  // pălăria mare, netedă, ușor evazată
  const cg=ctx.createRadialGradient(-5,-13,2,0,-7,18); cg.addColorStop(0,'#ff8f8f'); cg.addColorStop(.5,col); cg.addColorStop(1,shade(col));
  ctx.fillStyle=cg; ctx.lineWidth=2.4;
  ctx.beginPath(); ctx.moveTo(-16,-2.2);
  ctx.quadraticCurveTo(-17.4,-16.5,-6,-20.3); ctx.quadraticCurveTo(0,-21.8,6,-20.3);
  ctx.quadraticCurveTo(17.4,-16.5,16,-2.2);
  ctx.quadraticCurveTo(9,0.8,0,0.8); ctx.quadraticCurveTo(-9,0.8,-16,-2.2); ctx.closePath(); ctx.fill(); ctx.stroke();
  // umbra fină de sub pălărie
  ctx.strokeStyle='rgba(58,36,56,.22)'; ctx.lineWidth=1.4;
  ctx.beginPath(); ctx.moveTo(-11,-0.4); ctx.quadraticCurveTo(0,2.4,11,-0.4); ctx.stroke();
  ctx.strokeStyle=O; ctx.lineWidth=2.4;
  // buline albe simple + luciu moale
  ctx.fillStyle='#ffffff';
  ctx.beginPath(); ctx.arc(-8.5,-11.5,3.0,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(1.5,-16,2.4,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(9.5,-9,2.0,0,TAU); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(-5.5,-16.5,4.6,2.2,-0.45,0,TAU); ctx.fill();
  // fața mare pe picior
  face(bl,4.4,6.4,3.3,10.2);
  sparkleEyes(bl,4.4,6.4,3.3);
}
function drawPip(col,bl){ // round fuzzball with antennae
  ctx.strokeStyle='#3a2438';
  // antennae
  ctx.lineWidth=1.8; ctx.beginPath(); ctx.moveTo(-5,-13); ctx.quadraticCurveTo(-9,-22,-12,-22); ctx.moveTo(5,-13); ctx.quadraticCurveTo(9,-22,12,-22); ctx.stroke();
  ctx.fillStyle=col; ctx.beginPath(); ctx.arc(-12,-22,2.4,0,TAU); ctx.arc(12,-22,2.4,0,TAU); ctx.fill();
  // fuzzy body (bumpy circle)
  const g=ctx.createRadialGradient(-4,-5,2,0,0,18); g.addColorStop(0,'#fff'); g.addColorStop(.4,col); g.addColorStop(1,shade(col));
  ctx.fillStyle=g; ctx.lineWidth=2.4; ctx.strokeStyle='#3a2438';
  ctx.beginPath(); for(let i=0;i<=16;i++){const a=i/16*TAU,rr=15+Math.sin(a*6)*1.6;const px=Math.cos(a)*rr,py=Math.sin(a)*rr;i?ctx.lineTo(px,py):ctx.moveTo(px,py);} ctx.closePath(); ctx.fill(); ctx.stroke();
  // feet
  ctx.fillStyle=shade(col); ctx.beginPath(); ctx.ellipse(-7,15,4,2.6,0,0,TAU); ctx.ellipse(7,15,4,2.6,0,0,TAU); ctx.fill();
  face(bl,6,-3,3.2,4);
}
function drawGlob(col,bl){ // jiggly blob droplet
  const g=ctx.createRadialGradient(-4,-6,2,0,2,18); g.addColorStop(0,'#fff'); g.addColorStop(.45,col); g.addColorStop(1,shade(col));
  ctx.fillStyle=g; ctx.lineWidth=2.4; ctx.strokeStyle='#3a2438';
  ctx.beginPath(); ctx.moveTo(0,-16); ctx.bezierCurveTo(13,-15,17,3,12,11); ctx.bezierCurveTo(7,17,-7,17,-12,11); ctx.bezierCurveTo(-17,3,-13,-15,0,-16); ctx.fill(); ctx.stroke();
  // gloss
  ctx.fillStyle='rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(-5,-7,4,6,-0.5,0,TAU); ctx.fill();
  face(bl,6,-1,3,6);
}
function drawStar(col,bl){ // 5-point star sprite
  const g=ctx.createRadialGradient(0,-2,2,0,0,18); g.addColorStop(0,'#fff'); g.addColorStop(.5,col); g.addColorStop(1,shade(col));
  ctx.fillStyle=g; ctx.lineWidth=2.4; ctx.strokeStyle='#3a2438'; ctx.beginPath();
  for(let i=0;i<10;i++){const a=-Math.PI/2+i/10*TAU,rr=i%2?7:17;const px=Math.cos(a)*rr,py=Math.sin(a)*rr;i?ctx.lineTo(px,py):ctx.moveTo(px,py);} ctx.closePath(); ctx.fill(); ctx.stroke();
  face(bl,5,0,2.8,5);
}
function drawNimbus(col,bl){ // fluffy cloud
  ctx.fillStyle=col; ctx.lineWidth=2.4; ctx.strokeStyle='#3a2438';
  ctx.beginPath();
  ctx.arc(-9,2,8,Math.PI*0.5,Math.PI*1.5); ctx.arc(-3,-7,9,Math.PI,TAU);
  ctx.arc(8,-5,8,Math.PI*1.2,Math.PI*0.4); ctx.arc(10,4,7,Math.PI*1.7,Math.PI*0.6);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  const g=ctx.createLinearGradient(0,-12,0,12); g.addColorStop(0,'rgba(255,255,255,.6)'); g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=g; ctx.fill();
  face(bl,6,-1,3,5);
}
function drawBoss(e){
  // HP bar with phase pips
  const bw=Math.min(W*0.74,460),bh=14,bx=W/2-bw/2,by=46;
  ctx.fillStyle='rgba(0,0,0,.5)'; rr(bx-3,by-3,bw+6,bh+6,9); ctx.fill();
  ctx.fillStyle='#2a1840'; rr(bx,by,bw,bh,7); ctx.fill();
  const pct=clamp(e.hp/e.maxHp,0,1);
  const g=ctx.createLinearGradient(bx,0,bx+bw,0);
  if(e.enrage){g.addColorStop(0,'#ff3b5c');g.addColorStop(1,'#ffb15c');}else{g.addColorStop(0,e.col);g.addColorStop(1,'#fff');}
  ctx.fillStyle=g; rr(bx,by,bw*pct,bh,7); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.5)'; ctx.lineWidth=2;
  for(const t of [0.33,0.66]){ ctx.beginPath(); ctx.moveTo(bx+bw*t,by); ctx.lineTo(bx+bw*t,by+bh); ctx.stroke(); }
  ctx.fillStyle='#fff'; ctx.font='800 14px "Baloo 2"'; ctx.textAlign='center';
  ctx.fillText('👑 '+e.name+(e.enrage?' 😡':''),W/2,by-8);

  // telegraph beams (drawn first so boss/effect overlay)
  drawBossBeams();

  // body — sprite, with breathing, an attack "punch", enrage tint
  ctx.save(); ctx.translate(e.x,e.y);
  const breathe=1+Math.sin(e.t*3)*0.03;
  const punch=e.mouth>0?e.mouth*0.18:0;            // quick squash when it attacks
  const pop=(e.arrive>0)?e.arrive*0.5:0;           // brief swell as it slams into view
  ctx.scale(breathe+punch+pop, (2-breathe)-punch+pop);
  const im=sprite(e.type);
  if(e.leafBoss){
    const r=e.r, base=e.col||'#e0742a', body=e.hit>0?'#fff6e0':(e.enrage?'#ff7a3a':base);
    ctx.lineJoin='round';
    ctx.fillStyle=body; ctx.strokeStyle=shadeHex(base,1.7); ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(0,-r*1.25); ctx.quadraticCurveTo(r*1.15,-r*0.1,0,r*1.25); ctx.quadraticCurveTo(-r*1.15,-r*0.1,0,-r*1.25); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle=shadeHex(base,1.4); ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(0,-r*1.05); ctx.lineTo(0,r*0.95);
    for(const s of [-1,1]) for(let k=0;k<3;k++){ const yy=-r*0.5+k*r*0.45; ctx.moveTo(0,yy); ctx.lineTo(s*r*0.55,yy+r*0.3); } ctx.stroke();
    // angry screaming face
    const ey=-r*0.2, lk=Math.sin(e.t*4)*r*0.05, mo=0.7+(e.mouth||0)*0.7;
    ctx.strokeStyle='#3a1c10'; ctx.lineWidth=r*0.06; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-r*0.55,ey-r*0.46); ctx.lineTo(-r*0.18,ey-r*0.3); ctx.moveTo(r*0.55,ey-r*0.46); ctx.lineTo(r*0.18,ey-r*0.3); ctx.stroke();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.ellipse(-r*0.34,ey,r*0.28,r*0.37,0,0,TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(r*0.34,ey,r*0.28,r*0.37,0,0,TAU); ctx.fill();
    ctx.fillStyle='#241410'; ctx.beginPath(); ctx.arc(-r*0.32+lk,ey-r*0.05,r*0.14,0,TAU); ctx.arc(r*0.34+lk,ey-r*0.05,r*0.14,0,TAU); ctx.fill();
    ctx.fillStyle='#3a1410'; ctx.beginPath(); ctx.ellipse(0,r*0.46,r*0.3,r*0.36*mo,0,0,TAU); ctx.fill();
    ctx.fillStyle='#d8606a'; ctx.beginPath(); ctx.ellipse(0,r*0.6,r*0.15,r*0.15*mo,0,0,TAU); ctx.fill();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.moveTo(-r*0.14,r*0.22); ctx.lineTo(-r*0.06,r*0.36); ctx.lineTo(-r*0.22,r*0.36); ctx.closePath(); ctx.moveTo(r*0.14,r*0.22); ctx.lineTo(r*0.06,r*0.36); ctx.lineTo(r*0.22,r*0.36); ctx.closePath(); ctx.fill();
  } else if(im){ const d=e.r*2.6; critterBody(d,e.type,0); if(e.hit>0)ctx.filter='brightness(1.8)'; else if(e.enrage)ctx.filter='saturate(1.35) hue-rotate(-14deg)';
    ctx.drawImage(im,-d/2,-d/2,d,d); ctx.filter='none';
  } else { drawCritter(0,0,e.r*2,e.type,0,e.hit>0,false); }
  // enrage: subtle red glow ring (no face overlay, keeps the cute baked face correct)
  if(e.enrage){ ctx.globalCompositeOperation='lighter'; ctx.strokeStyle='rgba(255,70,100,'+(0.25+0.2*Math.sin(e.t*8))+')';
    ctx.lineWidth=5; ctx.beginPath(); ctx.arc(0,0,e.r*0.95,0,TAU); ctx.stroke(); ctx.globalCompositeOperation='source-over'; }
  ctx.restore();

  // crown — only when the boss isn't already wearing a hat (no double head-items)
  const HATS=['witchhat','tophat','santa','party','pumpkin','headphones','halo','helmet','hearts'];
  if(!e.leafBoss && !HATS.includes(e.acc)){
    ctx.save(); ctx.translate(e.x,e.y-e.r*0.78*((2-breathe)));
    ctx.fillStyle='#ffe46b'; ctx.strokeStyle='#caa53a'; ctx.lineWidth=2.5;
    const cw=e.r*0.5; ctx.beginPath(); ctx.moveTo(-cw,0); ctx.lineTo(-cw,-cw*0.7); ctx.lineTo(-cw*0.4,-cw*0.25);
    ctx.lineTo(0,-cw*0.9); ctx.lineTo(cw*0.4,-cw*0.25); ctx.lineTo(cw,-cw*0.7); ctx.lineTo(cw,0); ctx.closePath(); ctx.fill(); ctx.stroke();
    for(const jx of [-cw*0.7,0,cw*0.7]){ctx.fillStyle=jx===0?'#ff6bd6':'#8fd3ff';ctx.beginPath();ctx.arc(jx,-cw*0.5,2.8,0,TAU);ctx.fill();}
    ctx.restore();
  }
  // signature accessory
  if(e.acc && !e.leafBoss){ ctx.save(); ctx.translate(e.x,e.y); drawAcc(e.type,e.acc,e.r*1.3,e.t); ctx.restore(); }
}
function drawBossBeams(){
  for(const bm of bossBeams){
    const c=bm.bolt?bm.col:(bm.col||'#ff5a7a');
    if(bm.horiz){
      if(bm.charge>0){ const a=0.25+0.35*Math.abs(Math.sin(performance.now()/60));
        ctx.fillStyle=hexA(c,a*0.5); ctx.fillRect(0,bm.y-bm.h/2,W,bm.h);
        ctx.strokeStyle=hexA('#ffffff',a); ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(0,bm.y-bm.h/2); ctx.lineTo(W,bm.y-bm.h/2); ctx.moveTo(0,bm.y+bm.h/2); ctx.lineTo(W,bm.y+bm.h/2); ctx.stroke();
      } else if(bm.active>0){
        const grd=ctx.createLinearGradient(0,bm.y-bm.h/2,0,bm.y+bm.h/2);
        grd.addColorStop(0,hexA(c,0)); grd.addColorStop(.5,hexA(c,.95)); grd.addColorStop(1,hexA(c,0));
        ctx.fillStyle=grd; ctx.fillRect(0,bm.y-bm.h/2,W,bm.h);
        ctx.fillStyle='rgba(255,255,255,.85)'; ctx.fillRect(0,bm.y-bm.h*0.18,W,bm.h*0.36);
      }
      continue;
    }
    if(bm.charge>0){ // warning
      const a=0.25+0.35*Math.abs(Math.sin(performance.now()/60));
      ctx.fillStyle=hexA(bm.bolt?bm.col:'#ff5a7a',a*0.5);
      ctx.fillRect(bm.x-bm.w/2,0,bm.w,H);
      ctx.strokeStyle=hexA('#ffffff',a); ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(bm.x-bm.w/2,0); ctx.lineTo(bm.x-bm.w/2,H); ctx.moveTo(bm.x+bm.w/2,0); ctx.lineTo(bm.x+bm.w/2,H); ctx.stroke();
    } else if(bm.active>0){
      const grd=ctx.createLinearGradient(bm.x-bm.w/2,0,bm.x+bm.w/2,0);
      const cc=bm.bolt?bm.col:'#ff5a7a';
      grd.addColorStop(0,hexA(cc,0)); grd.addColorStop(.5,hexA(cc,.95)); grd.addColorStop(1,hexA(cc,0));
      ctx.fillStyle=grd; ctx.fillRect(bm.x-bm.w/2,0,bm.w,H);
      ctx.fillStyle='rgba(255,255,255,.85)'; ctx.fillRect(bm.x-bm.w*0.18,0,bm.w*0.36,H);
    }
  }
}
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function drawFrenzy(){
  if(state!=='playing'&&state!=='perk')return;
  const active=frenzyT>0, val=active?clamp(frenzyT/6,0,1):clamp(frenzy,0,1);
  if(val<=0&&!active)return;
  const bw=Math.min(220,W*0.46), bh=8, bx=(W-bw)/2, by=H-18;
  ctx.save();
  rr(bx,by,bw,bh,bh/2); ctx.fillStyle='rgba(255,255,255,.12)'; ctx.fill();
  const fw=Math.max(0,bw*val);
  if(fw>2){ rr(bx,by,fw,bh,bh/2);
    if(active){ const strip=rainbowStrip(), sw=strip.width, off=(performance.now()*0.06)%sw;
      ctx.save(); ctx.clip();                                  // clip to the rounded fill path
      ctx.drawImage(strip, bx-off,    by, sw, bh);
      ctx.drawImage(strip, bx-off+sw, by, sw, bh);
      ctx.restore(); }
    else { ctx.fillStyle='#ff8fc7'; ctx.fill(); } }
  ctx.font='800 10px "Baloo 2",sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle=active?'#fff':'rgba(255,255,255,.65)';
  ctx.fillText(active?'★ FRENEZIE ★':'frenezie', W/2, by-7);
  ctx.restore();
}

const COINSHEET=new Image(); COINSHEET.src="data:image/webp;base64,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";
function drawPickup(p){
  ctx.save(); ctx.translate(p.x,p.y+Math.sin(p.t*4)*2);
  // animated sprite-sheet frames (10-frame spin, 72px cells): rows 0 silver,1 gold,2 star,3 diamond,4 chest,5 bug
  const CS=COINSHEET, csR=CS&&CS.complete&&CS.naturalWidth>0;
  if(csR){ const F=72, sp=Math.floor(p.t*12)%10;
    const blit=(row,size,fr)=>ctx.drawImage(CS,((fr==null?sp:fr))*F,row*F,F,F,-size/2,-size/2,size,size);
    if(p.type==='coin'){ const tier=p.tier||0;
      blit({0:6,1:0,2:1,3:3}[tier],38); ctx.restore(); return;
    } else if(p.type==='gift'){ const cf=Math.floor(p.t*8)%10; blit(4,46,cf);
      ctx.fillStyle='#241038'; ctx.strokeStyle='rgba(255,255,255,.9)'; ctx.lineWidth=3;
      ctx.font='800 12px "Baloo 2"'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.strokeText(WEAPONS[p.weapon].icon,0,-3); ctx.fillText(WEAPONS[p.weapon].icon,0,-3);
      ctx.restore(); return; }
  }
  if(p.type==='coin'){ const T=COIN_TIERS[p.tier||0];
    const star=(R,r,rot)=>{ ctx.beginPath(); for(let i=0;i<10;i++){const a=rot-Math.PI/2+i*Math.PI/5,rad=i%2?r:R,x=Math.cos(a)*rad,y=Math.sin(a)*rad; i?ctx.lineTo(x,y):ctx.moveTo(x,y);} ctx.closePath(); };
    ctx.lineJoin='round';
    if((p.tier||0)===3){
      // diamant — brilliant-cut gem with facets, glow and twinkle
      const sc=0.9+0.1*Math.abs(Math.sin(p.t*3)); ctx.scale(sc,1);
      const gl=ctx.createRadialGradient(0,0,1,0,0,15); gl.addColorStop(0,'rgba(159,233,255,.55)'); gl.addColorStop(1,'rgba(159,233,255,0)');
      ctx.fillStyle=gl; ctx.beginPath(); ctx.arc(0,-1,15,0,TAU); ctx.fill();
      const g=ctx.createLinearGradient(0,-9,0,12); g.addColorStop(0,'#f4feff'); g.addColorStop(.5,T.col); g.addColorStop(1,T.edge);
      ctx.fillStyle=g; ctx.strokeStyle='#eafcff'; ctx.lineWidth=1.4;
      ctx.beginPath(); ctx.moveTo(-8,-5); ctx.lineTo(8,-5); ctx.lineTo(9,-2); ctx.lineTo(0,12); ctx.lineTo(-9,-2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,.7)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(-8,-5); ctx.lineTo(-3.5,-2); ctx.lineTo(3.5,-2); ctx.lineTo(8,-5);
      ctx.moveTo(-9,-2); ctx.lineTo(-3.5,-2); ctx.lineTo(0,12); ctx.moveTo(3.5,-2); ctx.lineTo(0,12); ctx.moveTo(3.5,-2); ctx.lineTo(9,-2); ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.85)'; ctx.beginPath(); ctx.moveTo(-8,-5); ctx.lineTo(-1.5,-5); ctx.lineTo(-3.5,-2); ctx.closePath(); ctx.fill();
      const tw=0.4+0.6*Math.abs(Math.sin(p.t*5)); ctx.save(); ctx.translate(4,-6); ctx.globalAlpha=tw; ctx.fillStyle='#fff'; star(3.2,1,0); ctx.fill(); ctx.restore();
    } else {
      // metal coin: milled rim, embossed star, sweeping glint, edge-on flip
      const R=9.2, spin=p.t*3.1, asc=Math.abs(Math.cos(spin));
      if(asc<0.16){ // edge-on: show milled band
        const eg=ctx.createLinearGradient(-3,0,3,0); eg.addColorStop(0,T.edge); eg.addColorStop(.5,T.col); eg.addColorStop(1,T.edge);
        ctx.fillStyle=eg; rr(-2.4,-R,4.8,R*2,2.2); ctx.fill();
        ctx.strokeStyle='rgba(0,0,0,.28)'; ctx.lineWidth=.6;
        for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.moveTo(i*1.1,-R+1.5); ctx.lineTo(i*1.1,R-1.5); ctx.stroke(); }
      } else {
        ctx.scale(asc,1);
        ctx.fillStyle=T.edge; ctx.beginPath(); ctx.arc(0,0,R,0,TAU); ctx.fill();
        ctx.strokeStyle='rgba(0,0,0,.18)'; ctx.lineWidth=.7;
        for(let i=0;i<24;i++){const a=i/24*TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a)*(R-0.7),Math.sin(a)*(R-0.7)); ctx.lineTo(Math.cos(a)*R,Math.sin(a)*R); ctx.stroke();}
        const g=ctx.createRadialGradient(-2.6,-3,1,0,0,R); g.addColorStop(0,'#ffffff'); g.addColorStop(.45,T.col); g.addColorStop(1,T.edge);
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,R-1.8,0,TAU); ctx.fill();
        ctx.fillStyle='rgba(0,0,0,.20)'; ctx.save(); ctx.translate(0,.7); star(4.6,1.9,0); ctx.fill(); ctx.restore();
        const sg=ctx.createLinearGradient(0,-5,0,5); sg.addColorStop(0,'#fff'); sg.addColorStop(1,T.col);
        ctx.fillStyle=sg; star(4.4,1.8,0); ctx.fill();
        ctx.save(); ctx.beginPath(); ctx.arc(0,0,R-1.8,0,TAU); ctx.clip();
        const gx=Math.sin(p.t*2)*R; const glg=ctx.createLinearGradient(gx-5,0,gx+5,0);
        glg.addColorStop(0,'rgba(255,255,255,0)'); glg.addColorStop(.5,'rgba(255,255,255,.55)'); glg.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle=glg; ctx.fillRect(-R,-R,R*2,R*2); ctx.restore();
      }
      const tw=0.3+0.7*Math.abs(Math.sin(p.t*4+(p.tier||0))); ctx.save(); ctx.globalAlpha=tw; ctx.fillStyle='#fff'; ctx.translate(4.5,-4.5); star(2.6,.8,0); ctx.fill(); ctx.restore();
    }
  } else if(p.type==='gift'){ const c=WEAPONS[p.weapon].color;
    ctx.fillStyle='rgba(0,0,0,.3)'; rr(-13,-11,26,24,5); ctx.fill();
    const g=ctx.createLinearGradient(0,-13,0,13); g.addColorStop(0,'#fff'); g.addColorStop(.3,c); g.addColorStop(1,shade(c));
    ctx.fillStyle=g; rr(-13,-13,26,26,6); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.95)'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(0,-13); ctx.lineTo(0,13); ctx.moveTo(-13,0); ctx.lineTo(13,0); ctx.stroke();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.moveTo(-4,-13); ctx.quadraticCurveTo(0,-19,4,-13); ctx.fill();
    ctx.fillStyle='#241038'; ctx.font='800 13px "Baloo 2"'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(WEAPONS[p.weapon].icon,0,1);
  } else if(p.type==='cream'){
    ctx.fillStyle='#e0a45a'; ctx.strokeStyle='#b87a36'; ctx.lineWidth=1.5; ctx.lineJoin='round';
    ctx.beginPath(); ctx.moveTo(-6,-2); ctx.lineTo(6,-2); ctx.lineTo(0,13); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='rgba(150,90,40,.55)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(-3,2); ctx.lineTo(2,3); ctx.moveTo(-1,6); ctx.lineTo(3,5); ctx.stroke();
    const g=ctx.createRadialGradient(-2,-8,1,0,-5,9); g.addColorStop(0,'#ffd9e6'); g.addColorStop(1,'#ff9ec4');
    ctx.fillStyle=g; ctx.strokeStyle='#e87ba6'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(-3.5,-6,5,0,TAU); ctx.arc(3.5,-6,5,0,TAU); ctx.arc(0,-10,5.5,0,TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(-3.5,-6,5,0,TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(3.5,-6,5,0,TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(0,-10,5.5,0,TAU); ctx.stroke();
    ctx.fillStyle='#e0506a'; ctx.beginPath(); ctx.arc(0,-15,2.3,0,TAU); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(-2,-9,1.6,0,TAU); ctx.fill();
  } else { let em='⭐'; if(p.type==='missile')em='🚀'; else if(p.type==='burst')em='🔥'; else if(p.type==='bomb')em='💥'; else if(p.type==='shield')em='🛡'; else if(p.type==='wing')em='👯'; else if(p.type==='life')em='💗'; else if(p.type==='magnet')em='🧲';
    ctx.fillStyle='rgba(255,255,255,.16)'; ctx.beginPath(); ctx.arc(0,0,15,0,TAU); ctx.fill();
    ctx.font='20px serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(em,0,1); }
  ctx.restore();
}

export { PLANET_PRESETS, boltSpr, candySpr, draw, drawAcc, drawCritter, drawGalaxy, drawLeafBig, drawP2, hexA, lightenHex, pseed, rr, shade, shatterBubble, shipSkinCanvas, ufoBreak };

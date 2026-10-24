// Cinematicele de prezentare a bosilor: figura bosului, barele de film,
// numele animat si cele sase stiluri de intro.
import { TAU, clamp, lerp, rand } from '../game/utils.js';
import { H, W, ctx } from '../game/canvas.js';
import { drawAcc, drawCritter, drawLeafBig, hexA } from './draw.js';
import { INTRO_DUR, bossIntro, introBoss } from '../game/sim.js';

// shared: draw the boss figure centred at current transform origin
function drawBossFig(sz,tt,ib,acc,hurt){
  if(ib.leafBoss){ drawLeafBig(0,0,sz*0.46,ib.col,tt); }
  else { drawCritter(0,0,sz,ib.type,0,!!hurt,false,null); if(acc&&ib.acc)drawAcc(ib.type,ib.acc,sz*0.78,tt); }
}
// shared: cinematic film bars + end fade
function introBars(col,tt,outF){
  const eo=t=>1-(1-clamp(t,0,1))*(1-clamp(t,0,1));
  const barH=H*0.15*eo(tt/0.4)*outF;
  ctx.fillStyle='#05030c'; ctx.fillRect(0,0,W,barH); ctx.fillRect(0,H-barH,W,barH);
  ctx.strokeStyle=hexA(col,0.9*outF); ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(0,barH); ctx.lineTo(W,barH); ctx.moveTo(0,H-barH); ctx.lineTo(W,H-barH); ctx.stroke();
}
// shared: name drops in letter by letter + BOSS subtitle (starts ~tt 2.15)
function drawBossName(cx,cy,ib,tt,outF,sz){
  const col=ib.col, eo=t=>1-(1-clamp(t,0,1))*(1-clamp(t,0,1)), name=ib.name||'';
  let fs=clamp(W*0.085,26,52); ctx.font='800 '+fs+'px "Baloo 2",Fredoka,sans-serif';
  while(ctx.measureText(name).width>W*0.9&&fs>16){ fs-=2; ctx.font='800 '+fs+'px "Baloo 2",Fredoka,sans-serif'; }
  const totW=ctx.measureText(name).width; let px=cx-totW/2; const ny=cy+sz*0.92+30;
  ctx.textAlign='left'; ctx.lineJoin='round';
  for(let i=0;i<name.length;i++){ const ch=name[i], cw=ctx.measureText(ch).width;
    const lk=clamp((tt-2.15-i*0.045)/0.16,0,1);
    if(lk>0){ const ls=lerp(1.8,1,eo(lk)), la=lk*outF;
      ctx.save(); ctx.translate(px+cw/2,ny); ctx.scale(ls,ls); ctx.rotate((1-lk)*0.2*((i%2)?1:-1));
      ctx.lineWidth=fs*0.22; ctx.strokeStyle='rgba(5,3,12,'+la.toFixed(3)+')'; ctx.strokeText(ch,-cw/2,0);
      ctx.fillStyle=hexA('#ffffff',la); ctx.fillText(ch,-cw/2,0); ctx.restore(); }
    px+=cw; }
  ctx.textAlign='center';
  const sub=clamp((tt-2.1)/0.2,0,1);
  if(sub>0){ ctx.font='800 '+Math.round(fs*0.34)+'px "Baloo 2",sans-serif'; ctx.fillStyle=hexA(col,sub*outF);
    ctx.fillText('⚠  B O S S  ⚠',cx,ny-fs*0.95); }
}
function drawBossIntro(){
  const tt=INTRO_DUR-bossIntro, ib=introBoss, col=ib.col, cx=W/2, cy=H*0.42;
  const eo=t=>1-(1-clamp(t,0,1))*(1-clamp(t,0,1));
  const outF=clamp((INTRO_DUR-tt)/0.5,0,1);
  const dim=clamp(tt/0.45,0,1)*0.42*outF;
  ctx.save(); ctx.fillStyle='rgba(6,3,14,'+dim+')'; ctx.fillRect(0,0,W,H);
  introBars(col,tt,outF);
  const style=ib.style||0;
  if(style===0){
    // ——— STIL 0: ALERTĂ → FLY-BY → SLAM (primul boss) ———
    if(tt<0.95){
      const aA=(0.5+0.5*Math.sin(tt*22))*clamp(tt/0.15,0,1)*clamp((0.95-tt)/0.25,0,1);
      ctx.save(); ctx.globalAlpha=aA*0.26; ctx.fillStyle='#ff2d4d';
      ctx.translate(0,H*0.30); ctx.rotate(-0.06);
      const soff=(tt*340)%80;
      for(let x=-160;x<W+160;x+=80){ ctx.fillRect(x+soff,0,40,H*0.13); }
      ctx.restore();
      ctx.textAlign='center'; const fs2=clamp(W*0.06,20,34);
      ctx.font='800 '+fs2+'px "Baloo 2",Fredoka,sans-serif';
      ctx.fillStyle='rgba(255,60,90,'+aA.toFixed(3)+')';
      ctx.fillText('⚠  A L E R T Ă  ⚠',cx,H*0.28);
    }
    if(tt>=0.55&&tt<2.05){
      const u=clamp((tt-0.55)/1.40,0,1);
      const fx=lerp(-W*0.35,W*1.35,u), fy=H*0.34+Math.sin(u*Math.PI)*H*0.05;
      const fsz=Math.min(W,H)*0.30;
      ctx.save(); ctx.globalCompositeOperation='lighter';
      for(let i=0;i<7;i++){ const ly=fy+(i-3)*fsz*0.22;
        ctx.strokeStyle=hexA(col,0.10+0.10*Math.sin(tt*30+i)); ctx.lineWidth=2+(i%3);
        ctx.beginPath(); ctx.moveTo(fx-fsz*2.2,ly); ctx.lineTo(fx-fsz*0.6,ly); ctx.stroke(); }
      ctx.restore();
      for(let g=2;g>=0;g--){ const gx=fx-g*fsz*0.55, ga=g===0?1:0.16/g;
        ctx.save(); ctx.translate(gx,fy); ctx.rotate(0.10); ctx.globalAlpha=ga;
        drawBossFig(fsz*0.92,tt,ib,g===0,false); ctx.restore(); }
    }
    if(tt>=2.05){
      const k=clamp((tt-2.05)/0.25,0,1);
      const rayA=0.14*clamp((tt-2.0)/0.4,0,1)*outF;
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(tt*0.5); ctx.globalCompositeOperation='lighter';
      for(let i=0;i<14;i++){ ctx.rotate(TAU/14); ctx.fillStyle=hexA(col,rayA*(0.5+0.5*Math.sin(tt*3+i)));
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(W*0.9,-30); ctx.lineTo(W*0.9,30); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      const sz=Math.min(W,H)*0.25*lerp(1.65,1.0,eo(k));
      for(let rg=0;rg<2;rg++){ const rk=clamp((tt-2.05-rg*0.12)/0.6,0,1); if(rk>0&&rk<1){
        ctx.save(); ctx.globalAlpha=(1-rk)*0.5*outF; ctx.strokeStyle=col; ctx.lineWidth=6*(1-rk)+1;
        ctx.beginPath(); ctx.arc(cx,cy,sz*(0.6+rk*2.1),0,TAU); ctx.stroke(); ctx.restore(); } }
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(Math.sin(tt*2.2)*0.05);
      ctx.shadowColor=col; ctx.shadowBlur=30; drawBossFig(sz,tt,ib,true,tt<2.25); ctx.restore();
      drawBossName(cx,cy,ib,tt,outF,sz);
    }
  } else if(style===1){
    // ——— STIL 1: WARP-IN (teleport digital) — inele care implodează + boss din felii scanline ———
    if(tt<2.05){
      ctx.save(); ctx.globalCompositeOperation='lighter';
      for(let r=0;r<5;r++){ const u=clamp((tt-r*0.12)/1.5,0,1); if(u<=0||u>=1)continue;
        const rad=lerp(Math.max(W,H)*0.8,0,eo(u));
        ctx.strokeStyle=hexA(col,(1-u)*0.5); ctx.lineWidth=3;
        ctx.beginPath(); ctx.arc(cx,cy,rad,0,TAU); ctx.stroke(); }
      ctx.restore();
      const asm=clamp((tt-0.7)/1.2,0,1);
      if(asm>0){ const sz=Math.min(W,H)*0.25;
        ctx.save(); ctx.translate(cx,cy); ctx.globalAlpha=asm;
        const slices=9;
        for(let i=0;i<slices;i++){ const sy=-sz+i/slices*sz*2, sh=sz*2/slices+1;
          const off=(1-asm)*(i%2?1:-1)*W*0.6*(1-i/slices);
          ctx.save(); ctx.beginPath(); ctx.rect(-sz+off,sy,sz*2,sh); ctx.clip();
          ctx.translate(off,0); drawBossFig(sz,tt,ib,false,false); ctx.restore(); }
        ctx.restore();
        ctx.save(); ctx.globalAlpha=(0.5+0.5*Math.sin(tt*40))*0.25*(1-asm); ctx.fillStyle=col;
        for(let y=cy-sz;y<cy+sz;y+=4)ctx.fillRect(cx-sz,y,sz*2,1); ctx.restore();
      }
    } else {
      const k=clamp((tt-2.05)/0.25,0,1);
      const sz=Math.min(W,H)*0.25*lerp(1.5,1.0,eo(k));
      ctx.save(); ctx.globalAlpha=clamp((tt-2.05)/0.15,0,1)*0.6*outF; ctx.globalCompositeOperation='lighter';
      ctx.fillStyle=hexA(col,1); ctx.beginPath(); ctx.arc(cx,cy,sz*1.5*(1-k)+sz*0.4,0,TAU); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(cx,cy); ctx.shadowColor=col; ctx.shadowBlur=30; drawBossFig(sz,tt,ib,true,tt<2.25); ctx.restore();
      drawBossName(cx,cy,ib,tt,outF,sz);
    }
  } else if(style===2){
    // ——— STIL 2: SHATTER (aterizare zdrobitoare) — boss cade de sus, ecranul crapă ———
    if(tt<2.05){
      const u=clamp(tt/1.75,0,1); const fy=lerp(-H*0.4,cy,u*u);   // accelerating fall
      const sz=Math.min(W,H)*0.25;
      ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=0.4;
      ctx.strokeStyle=hexA(col,0.5); ctx.lineWidth=sz*0.9;
      ctx.beginPath(); ctx.moveTo(cx,fy-sz*2); ctx.lineTo(cx,fy); ctx.stroke(); ctx.restore();  // motion trail
      ctx.save(); ctx.translate(cx,fy); ctx.rotate(Math.sin(tt*8)*0.06*(1-u)); drawBossFig(sz,tt,ib,true,false); ctx.restore();
    } else {
      const k=clamp((tt-2.05)/0.3,0,1);
      ctx.save(); ctx.strokeStyle=hexA('#ffffff',(1-k)*0.7*outF); ctx.lineWidth=2+(1-k)*3;
      ctx.translate(cx,cy);
      for(let i=0;i<10;i++){ const a=i/10*TAU+0.2; const len=Math.max(W,H)*0.7*clamp((tt-2.05)/0.4,0,1);
        ctx.beginPath(); ctx.moveTo(0,0); const j1=Math.cos(a)*len*0.4+Math.sin(i)*10, j2=Math.sin(a)*len*0.4+Math.cos(i)*10;
        ctx.lineTo(j1,j2); ctx.lineTo(Math.cos(a)*len,Math.sin(a)*len); ctx.stroke(); }
      ctx.restore();
      for(let rg=0;rg<3;rg++){ const rk=clamp((tt-2.05-rg*0.10)/0.55,0,1); if(rk>0&&rk<1){
        ctx.save(); ctx.globalAlpha=(1-rk)*0.55*outF; ctx.strokeStyle=col; ctx.lineWidth=8*(1-rk)+1;
        ctx.beginPath(); ctx.arc(cx,cy,rk*Math.max(W,H)*0.6,0,TAU); ctx.stroke(); ctx.restore(); } }
      const sz=Math.min(W,H)*0.25*lerp(1.15,1.0,eo(k));
      ctx.save(); ctx.translate(cx,cy+Math.sin(tt*30)*(1-k)*4); ctx.shadowColor=col; ctx.shadowBlur=30; drawBossFig(sz,tt,ib,true,tt<2.3); ctx.restore();
      drawBossName(cx,cy,ib,tt,outF,sz);
    }
  } else if(style===3){
    // ——— STIL 3: OCHI ÎN ÎNTUNERIC (dezvăluire horror) — beznă, doi ochi se deschid, apoi lumina ———
    ctx.save(); ctx.fillStyle='rgba(3,2,9,'+(clamp(tt/0.4,0,1)*0.7*outF)+')'; ctx.fillRect(0,0,W,H); ctx.restore();
    if(tt<1.95){
      const open=clamp((tt-0.4)/0.5,0,1)*clamp((1.95-tt)/0.3,0,1);
      const eh=Math.min(W,H)*0.045*open, ew=eh*1.8, ex=Math.min(W,H)*0.07;
      ctx.save(); ctx.globalCompositeOperation='lighter';
      for(const s of [-1,1]){ ctx.fillStyle=hexA(col,0.9);
        ctx.beginPath(); ctx.ellipse(cx+s*ex,cy-Math.min(W,H)*0.02,ew,eh,0,0,TAU); ctx.fill();
        ctx.fillStyle='rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(cx+s*ex,cy-Math.min(W,H)*0.02,eh*0.4,0,TAU); ctx.fill(); }
      ctx.restore();
    }
    if(tt>=1.95){
      const k=clamp((tt-1.95)/0.3,0,1);
      ctx.save(); ctx.globalAlpha=(1-k)*0.85*outF; ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H); ctx.restore(); // lights snap on
      const sz=Math.min(W,H)*0.25*lerp(1.4,1.0,eo(k));
      ctx.save(); ctx.translate(cx,cy); ctx.shadowColor=col; ctx.shadowBlur=30; drawBossFig(sz,tt,ib,true,tt<2.2); ctx.restore();
      drawBossName(cx,cy,ib,tt,outF,sz);
    }
  } else if(style===4){
    // ——— STIL 4: PARADĂ CU SPOTURI (grandios, teatral) — spoturi baleiază, boss coboară pe rază ———
    if(tt<2.05){
      ctx.save(); ctx.globalCompositeOperation='lighter';
      for(let i=0;i<3;i++){ const a=Math.sin(tt*1.6+i*2.1)*0.5; const bx=cx+a*W*0.4;
        const g=ctx.createLinearGradient(bx,0,bx,H); g.addColorStop(0,hexA(col,0.18)); g.addColorStop(1,hexA(col,0));
        ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(bx,0); ctx.lineTo(bx-70,H); ctx.lineTo(bx+70,H); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      const u=clamp((tt-0.4)/1.5,0,1); const fy=lerp(-H*0.15,cy,eo(u)); const sz=Math.min(W,H)*0.25;
      ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=0.5;
      const g2=ctx.createLinearGradient(cx,0,cx,fy); g2.addColorStop(0,hexA(col,0)); g2.addColorStop(1,hexA(col,0.4));
      ctx.fillStyle=g2; ctx.fillRect(cx-sz*0.6,0,sz*1.2,fy); ctx.restore();
      // sparkles
      ctx.save(); ctx.globalCompositeOperation='lighter';
      for(let i=0;i<10;i++){ const sa=tt*2+i, sx=cx+Math.cos(sa*1.3)*sz*0.9, sy=fy+Math.sin(sa*1.7)*sz*0.7;
        ctx.fillStyle=hexA(Math.random()<.5?'#fff':col,0.6); ctx.beginPath(); ctx.arc(sx,sy,2.2,0,TAU); ctx.fill(); }
      ctx.restore();
      ctx.save(); ctx.translate(cx,fy); ctx.rotate(Math.sin(tt*2)*0.05); drawBossFig(sz,tt,ib,true,false); ctx.restore();
    } else {
      const k=clamp((tt-2.05)/0.25,0,1); const sz=Math.min(W,H)*0.25*lerp(1.2,1.0,eo(k));
      if(k<1){ ctx.save(); ctx.globalCompositeOperation='lighter';
        for(let i=0;i<16;i++){ const a=i/16*TAU; const d=(1-k)*Math.max(W,H)*0.5+40;
          ctx.fillStyle=hexA(i%2?'#fff':col,(1-k)*0.8);
          ctx.beginPath(); ctx.arc(cx+Math.cos(a)*(1-k+0.2)*80+Math.cos(a)*d*k,cy+Math.sin(a)*(1-k+0.2)*80+Math.sin(a)*d*k,3,0,TAU); ctx.fill(); }
        ctx.restore(); }
      ctx.save(); ctx.translate(cx,cy); ctx.shadowColor=col; ctx.shadowBlur=30; drawBossFig(sz,tt,ib,true,tt<2.25); ctx.restore();
      drawBossName(cx,cy,ib,tt,outF,sz);
    }
  } else {
    // ——— STIL 5: INVOCARE FURTUNĂ (elemental) — fulgere lovesc centrul, boss se formează din energie ———
    if(tt<2.05){
      const swirl=clamp(tt/1.6,0,1);
      ctx.save(); ctx.translate(cx,cy); ctx.globalCompositeOperation='lighter';
      for(let i=0;i<3;i++){ ctx.rotate(tt*(0.8+i*0.3)); ctx.strokeStyle=hexA(col,0.12*swirl); ctx.lineWidth=3;
        ctx.beginPath(); ctx.arc(0,0,Math.min(W,H)*(0.12+i*0.06),0.3,TAU-0.3); ctx.stroke(); }
      ctx.restore();
      if(Math.sin(tt*26)>0.4){ ctx.save(); ctx.strokeStyle=hexA('#ffffff',0.8); ctx.lineWidth=rand(2,4); ctx.globalCompositeOperation='lighter';
        ctx.beginPath(); let ly=0, lx=cx+rand(-40,40); ctx.moveTo(lx,ly);
        while(ly<cy){ ly+=rand(20,50); lx+=rand(-30,30); ctx.lineTo(lx,ly); } ctx.lineTo(cx,cy); ctx.stroke(); ctx.restore(); }
      const asm=clamp((tt-0.7)/1.3,0,1);
      if(asm>0){ const sz=Math.min(W,H)*0.25; ctx.save(); ctx.translate(cx,cy); ctx.globalAlpha=asm;
        ctx.shadowColor=col; ctx.shadowBlur=30*asm; drawBossFig(sz,tt,ib,false,false); ctx.restore(); }
    } else {
      const k=clamp((tt-2.05)/0.25,0,1);
      if(k<0.6){ ctx.save(); ctx.globalAlpha=(0.6-k)*outF; ctx.fillStyle='#eaf3ff'; ctx.fillRect(0,0,W,H); ctx.restore(); }
      const sz=Math.min(W,H)*0.25*lerp(1.3,1.0,eo(k));
      ctx.save(); ctx.translate(cx,cy); ctx.shadowColor=col; ctx.shadowBlur=34; drawBossFig(sz,tt,ib,true,tt<2.25); ctx.restore();
      drawBossName(cx,cy,ib,tt,outF,sz);
    }
  }
  ctx.restore();
}

export { drawBossIntro };

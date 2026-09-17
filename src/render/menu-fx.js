// Scenele animate din spatele meniului: plaja de vara (palmieri, valuri,
// recuzita) si spatiul clasic. Doar decor — nu ating starea jocului.
import { menuTheme } from '../game/menu-theme.js';
import { H, W, bgImg, ctx, sprite } from '../game/canvas.js';
import { TAU } from '../game/utils.js';
import { drawCritter, hexA } from './draw.js';

function drawMenuFx(){ if(menuTheme==='summer'){ try{ drawMenuSummer(); return; }catch(e){ /* cade pe tema clasică */ } } drawMenuSpace(); }
// ——— palmier ———
function drawPalm(bx,by,h,t,dir){
  ctx.save(); ctx.translate(bx,by);
  const sway=Math.sin(t*0.5+dir)*0.025, tw=Math.max(7,h*0.05);
  const topX=dir*h*0.17+sway*h*1.2, topY=-h;
  const tg=ctx.createLinearGradient(-tw,0,tw,0); tg.addColorStop(0,'#6b4227'); tg.addColorStop(.5,'#9c6a42'); tg.addColorStop(1,'#6b4227');
  ctx.strokeStyle=tg; ctx.lineWidth=tw; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(dir*h*0.06,-h*0.55,topX,topY); ctx.stroke();
  ctx.strokeStyle='rgba(70,42,24,.35)'; ctx.lineWidth=Math.max(1.4,tw*0.16);
  for(let i=1;i<7;i++){ const p=i/7, x=(1-p)*(1-p)*0+2*(1-p)*p*(dir*h*0.06)+p*p*topX, y=2*(1-p)*p*(-h*0.55)+p*p*topY;
    ctx.beginPath(); ctx.moveTo(x-tw*0.42,y); ctx.lineTo(x+tw*0.42,y); ctx.stroke(); }
  for(let i=0;i<7;i++){
    const a=(-Math.PI*0.92)+(i/6)*(Math.PI*0.84)+sway*1.6, L=h*(0.40+0.10*Math.sin(i*2.1));
    const ex=topX+Math.cos(a)*L*dir, ey=topY+Math.sin(a)*L*0.72;
    const mx=topX+Math.cos(a)*L*0.55*dir, my=topY+Math.sin(a)*L*0.38-L*0.20;
    const lg=ctx.createLinearGradient(topX,topY,ex,ey); lg.addColorStop(0,'#2f7d3f'); lg.addColorStop(1,'#63bf5a');
    ctx.fillStyle=lg;
    ctx.beginPath(); ctx.moveTo(topX,topY);
    ctx.quadraticCurveTo(mx,my-L*0.14,ex,ey);
    ctx.quadraticCurveTo(mx,my+L*0.16,topX,topY); ctx.fill();
    ctx.strokeStyle='rgba(30,80,40,.45)'; ctx.lineWidth=1.3;
    ctx.beginPath(); ctx.moveTo(topX,topY); ctx.quadraticCurveTo(mx,my,ex,ey); ctx.stroke();
  }
  ctx.fillStyle='#8a5a2f';
  for(const [ox,oy] of [[-tw*0.7,-h*0.02],[tw*0.8,-h*0.04],[0,-h*0.06]]){
    ctx.beginPath(); ctx.arc(topX+ox,topY+oy+tw*0.5,tw*0.42,0,TAU); ctx.fill(); }
  ctx.restore();
}
// ——— recuzită de plajă ———
function beachProps(t,sandY){
  const S=Math.min(W,H);
  // umbrelă
  ctx.save(); ctx.translate(W*0.20,sandY+S*0.10);
  ctx.strokeStyle='#c9a06a'; ctx.lineWidth=Math.max(3,S*0.012); ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-S*0.02,-S*0.20); ctx.stroke();
  const ur=S*0.115, uy=-S*0.20;
  for(let i=0;i<6;i++){ ctx.fillStyle=i%2?'#ff8fb0':'#fff2e2';
    ctx.beginPath(); ctx.moveTo(-S*0.02,uy);
    ctx.arc(-S*0.02,uy,ur,Math.PI+i*(Math.PI/6),Math.PI+(i+1)*(Math.PI/6)); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle='rgba(150,90,70,.35)'; ctx.lineWidth=1.6;
  ctx.beginPath(); ctx.arc(-S*0.02,uy,ur,Math.PI,TAU); ctx.stroke();
  ctx.fillStyle='#ffd76b'; ctx.beginPath(); ctx.arc(-S*0.02,uy-S*0.012,S*0.011,0,TAU); ctx.fill();
  ctx.restore();
  // minge de plajă (săltăreață)
  const bx=W*0.36+Math.sin(t*0.8)*W*0.02, by=sandY+S*0.055-Math.abs(Math.sin(t*1.6))*S*0.07, br=S*0.045;
  ctx.save(); ctx.translate(bx,by); ctx.rotate(Math.sin(t*0.9)*0.3);
  const cols=['#ff7aa8','#ffd76b','#7fe0e6','#fff'];
  for(let i=0;i<4;i++){ ctx.fillStyle=cols[i]; ctx.beginPath(); ctx.moveTo(0,0);
    ctx.arc(0,0,br,i*(TAU/4),(i+1)*(TAU/4)); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle='rgba(120,70,90,.3)'; ctx.lineWidth=1.6; ctx.beginPath(); ctx.arc(0,0,br,0,TAU); ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(-br*0.35,-br*0.4,br*0.22,br*0.13,-0.6,0,TAU); ctx.fill();
  ctx.restore();
  // stea de mare
  ctx.save(); ctx.translate(W*0.72,sandY+S*0.115); ctx.rotate(0.4);
  ctx.fillStyle='#ff9a6b'; ctx.beginPath();
  for(let i=0;i<10;i++){ const r=(i%2?S*0.016:S*0.038), a=i*(TAU/10)-Math.PI/2;
    i?ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r):ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r); }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.55)';
  for(let i=0;i<5;i++){ const a=i*(TAU/5)-Math.PI/2; ctx.beginPath(); ctx.arc(Math.cos(a)*S*0.016,Math.sin(a)*S*0.016,S*0.005,0,TAU); ctx.fill(); }
  ctx.restore();
  // scoici
  const shell=(px,py,sc,col)=>{ ctx.save(); ctx.translate(px,py); ctx.scale(sc,sc);
    ctx.fillStyle=col; ctx.beginPath(); ctx.moveTo(0,10); ctx.quadraticCurveTo(-16,2,-11,-9);
    ctx.quadraticCurveTo(-4,-16,0,-14); ctx.quadraticCurveTo(4,-16,11,-9); ctx.quadraticCurveTo(16,2,0,10); ctx.fill();
    ctx.strokeStyle='rgba(170,110,110,.35)'; ctx.lineWidth=1.2;
    for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.moveTo(0,9); ctx.quadraticCurveTo(i*5,-4,i*4.4,-12); ctx.stroke(); }
    ctx.restore(); };
  shell(W*0.60,sandY+S*0.075,S*0.0032,'#ffd9e2');
  shell(W*0.86,sandY+S*0.055,S*0.0026,'#ffe8cf');
  shell(W*0.14,sandY+S*0.135,S*0.0030,'#ffe3ea');
}
function drawMenuSummer(){
  const im=bgImg('summer');
  if(im){ const t=performance.now()/1000;
    const iw=im.naturalWidth, ih=im.naturalHeight;
    const br=1+0.010*Math.sin(t*0.22);                       // respirație foarte lentă, ca să nu pară înghețat
    const cover=Math.max(W/iw,H/ih), fitW=W/iw;
    let sc=cover*br, dy=0;
    if(cover/fitW>1.30){                                     // ecran înalt: potrivim pe lățime, completăm sus/jos
      sc=fitW*br; const dh0=ih*sc; dy=(H-dh0)/2;
      ctx.fillStyle='#904b5e'; ctx.fillRect(0,0,W,Math.max(0,dy)+2);
      ctx.fillStyle='#ee8c55'; ctx.fillRect(0,dy+dh0-2,W,H-(dy+dh0)+2);
    }
    const dw=iw*sc, dh=ih*sc;
    ctx.drawImage(im,(W-dw)/2,(dy||((H-dh)/2))+Math.sin(t*0.17)*2,dw,dh);
    for(let i=0;i<18;i++){ const px=(i*137.5+t*7)%W, py=(i*79.3)%(H*0.42);
      const a=0.16+0.26*Math.abs(Math.sin(t*1.5+i)); ctx.fillStyle='rgba(255,255,240,'+a.toFixed(3)+')';
      const sz=(i%6===0)?2.2:1.2; ctx.fillRect(px,py,sz,sz); }
    return; }
  drawMenuSummerVec();
}
function drawMenuSummerVec(){
  const t=performance.now()/1000, S=Math.min(W,H), hz=H*0.52, seaB=H*0.71, sx=W*0.5;
  // ——— cer de apus ———
  const sky=ctx.createLinearGradient(0,0,0,hz);
  sky.addColorStop(0,'#7a3383'); sky.addColorStop(.30,'#ef6a72'); sky.addColorStop(.62,'#ff9d4e'); sky.addColorStop(1,'#ffd98a');
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,hz);
  const sunY=hz-H*0.085, sunR=S*0.105;
  const halo=ctx.createRadialGradient(sx,sunY,sunR*0.3,sx,sunY,sunR*3.6);
  halo.addColorStop(0,'rgba(255,242,196,.85)'); halo.addColorStop(.28,'rgba(255,198,118,.34)'); halo.addColorStop(1,'rgba(255,160,90,0)');
  ctx.fillStyle=halo; ctx.beginPath(); ctx.arc(sx,sunY,sunR*3.6,0,TAU); ctx.fill();
  ctx.fillStyle='#fff6cf'; ctx.beginPath(); ctx.arc(sx,sunY,sunR,0,TAU); ctx.fill();
  const cloud=(cx,cy,sz,a)=>{ ctx.fillStyle='rgba(255,226,236,'+a+')';
    for(const [ox,oy,r] of [[-sz*0.95,sz*0.10,sz*0.50],[0,0,sz*0.74],[sz*0.88,sz*0.14,sz*0.46],[sz*0.32,-sz*0.34,sz*0.40]]){
      ctx.beginPath(); ctx.arc(cx+ox,cy+oy,r,0,TAU); ctx.fill(); } };
  cloud(W*0.17+Math.sin(t*0.08)*14,H*0.15,S*0.052,.50);
  cloud(W*0.80+Math.sin(t*0.06+2)*16,H*0.10,S*0.042,.42);
  // ——— mare ———
  const sea=ctx.createLinearGradient(0,hz,0,seaB);
  sea.addColorStop(0,'#2b93b0'); sea.addColorStop(.45,'#3fbdd0'); sea.addColorStop(1,'#8ce3e6');
  ctx.fillStyle=sea; ctx.fillRect(0,hz,W,seaB-hz);
  ctx.save(); ctx.globalCompositeOperation='lighter';
  for(let i=0;i<26;i++){ const p=i/26, yy=hz+p*(seaB-hz);
    const w=(S*0.10)*(0.35+p*2.0), a=(1-p)*0.42*(0.6+0.4*Math.sin(t*2+i));
    ctx.fillStyle='rgba(255,238,192,'+a.toFixed(3)+')';
    ctx.fillRect(sx-w/2+Math.sin(t*0.9+i)*7,yy,w,2.3); }
  ctx.restore();
  ctx.strokeStyle='#ffffff'; ctx.lineWidth=2; ctx.lineCap='round';
  for(let i=0;i<7;i++){ const p=(i+1)/8, yy=hz+p*(seaB-hz)*0.96;
    ctx.globalAlpha=0.09+0.05*i; ctx.beginPath();
    for(let x=-24;x<=W+24;x+=26){ const off=Math.sin(x*0.021+t*(0.7+i*0.13)+i)*3.2;
      if(x<=-24)ctx.moveTo(x,yy+off); else ctx.lineTo(x,yy+off); }
    ctx.stroke(); }
  ctx.globalAlpha=1;
  // hamster în colac, în apă
  swimRing(W*0.215, seaB-S*0.045, S*0.075, t);
  // ——— spumă + nisip ———
  ctx.fillStyle='rgba(255,255,255,.9)';
  ctx.beginPath(); ctx.moveTo(0,seaB+S*0.03);
  for(let x=0;x<=W;x+=34) ctx.lineTo(x,seaB+Math.sin(x*0.019+t*1.3)*5.5);
  ctx.lineTo(W,seaB+S*0.03); ctx.closePath(); ctx.fill();
  const sandY=seaB+S*0.022;
  const sand=ctx.createLinearGradient(0,sandY,0,H);
  sand.addColorStop(0,'#ffdfae'); sand.addColorStop(.5,'#fbc98a'); sand.addColorStop(1,'#e9a463');
  ctx.fillStyle=sand; ctx.fillRect(0,sandY,W,H-sandY);
  for(let i=0;i<80;i++){ const gx=(i*97.3)%W, gy=sandY+8+((i*53.7)%Math.max(10,H-sandY-8));
    ctx.fillStyle='rgba(255,255,255,'+(0.04+0.05*((i%3)/2)).toFixed(3)+')'; ctx.fillRect(gx,gy,2,2); }
  // ——— palmieri ———
  drawPalm(W*0.055,H*1.0,S*0.66,t,1);
  drawPalm(W*0.955,H*1.02,S*0.58,t,-1);
  // ——— dreapta: volei + castel + personaje ———
  volleyNet(W*0.845,sandY+S*0.115,S*0.20,S*0.115);
  sandCastle(W*0.905,sandY+S*0.135,S*0.075);
  try{ drawCritter(W*0.775,sandY+S*0.055,S*0.10,'penguin',Math.sin(t*0.9)*0.05,false,false,null); }catch(e){}
  try{ drawCritter(W*0.705,sandY+S*0.045,S*0.10,'nimbus',Math.sin(t*1.4)*0.16,false,false,'sunglasses'); }catch(e){}
  volleyBall(W*0.735,sandY-S*0.045-Math.abs(Math.sin(t*1.5))*S*0.05,S*0.030,t);
  rockShape(W*0.975,sandY+S*0.10,S*0.075);
  try{ drawCritter(W*0.945,sandY+S*0.065,S*0.085,'ghost',Math.sin(t*0.7)*0.06,false,false,null); }catch(e){}
  // ——— stânga: masă cu cocktail + înghețată ———
  sideTable(W*0.075,sandY+S*0.175,S*0.085);
  drinkGlass(W*0.055,sandY+S*0.115,S*0.052,t);
  iceCream(W*0.10,sandY+S*0.120,S*0.042);
  // ——— dreapta-față: cocktail + găletușă ———
  drinkGlass(W*0.885,sandY+S*0.235,S*0.058,t+1.3);
  bucketK(W*0.955,sandY+S*0.255,S*0.055);
  // ——— recuzită împrăștiată ———
  beachProps(t,sandY);
  // ——— sclipici + capete plutitoare cu ochelari ———
  for(let i=0;i<26;i++){ const px=(i*137.5+t*8)%W, py=(i*79.3)%(hz*0.9);
    const a=0.25+0.35*Math.abs(Math.sin(t*1.6+i)); ctx.fillStyle='rgba(255,255,240,'+a.toFixed(3)+')';
    const sz=(i%6===0)?2.4:1.3; ctx.fillRect(px,py,sz,sz); }
  const heads=[['bird','sunglasses',0.20,0.16],['shroom',null,0.34,0.11],['dragon','sunglasses',0.66,0.14]];
  for(let i=0;i<heads.length;i++){ const [ty,acc,fx,fy]=heads[i];
    const px=W*fx+Math.sin(t*0.5+i*2)*W*0.02, py=H*fy+Math.sin(t*0.8+i)*S*0.02;
    try{ drawCritter(px,py,S*0.085,ty,Math.sin(t*0.9+i)*0.10,false,false,acc); }catch(e){} }
  const im=sprite('nimbus');
  if(im){ const px=(t*14)%(W+140)-70, py=H*0.28+Math.sin(t*0.6)*30;
    ctx.globalAlpha=0.75; ctx.drawImage(im,px-26,py-26,52,52); ctx.globalAlpha=1; }
}
// ——— elemente de plajă ———
function swimRing(x,y,r,t){
  const bob=Math.sin(t*1.1)*r*0.08;
  ctx.save(); ctx.translate(x,y+bob);
  ctx.fillStyle='rgba(20,90,110,.22)'; ctx.beginPath(); ctx.ellipse(0,r*0.42,r*1.15,r*0.30,0,0,TAU); ctx.fill();
  try{ drawCritter(0,-r*0.30,r*1.30,'hamster',Math.sin(t*0.8)*0.06,false,false,'sunglasses'); }catch(e){}
  const seg=8;
  for(let i=0;i<seg;i++){ ctx.fillStyle=i%2?'#ff8fb0':'#fff6ea';
    ctx.beginPath(); ctx.arc(0,0,r,i*(TAU/seg),(i+1)*(TAU/seg)); ctx.arc(0,0,r*0.56,(i+1)*(TAU/seg),i*(TAU/seg),true); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle='rgba(150,80,100,.35)'; ctx.lineWidth=1.6;
  ctx.beginPath(); ctx.arc(0,0,r,0,TAU); ctx.moveTo(r*0.56,0); ctx.arc(0,0,r*0.56,0,TAU); ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(-r*0.55,-r*0.5,r*0.20,r*0.09,-0.6,0,TAU); ctx.fill();
  ctx.restore();
}
function volleyNet(x,y,w,h){
  ctx.save(); ctx.translate(x,y);
  ctx.strokeStyle='#b8794a'; ctx.lineWidth=Math.max(3,w*0.035); ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(-w/2,0); ctx.lineTo(-w/2,-h); ctx.moveTo(w/2,0); ctx.lineTo(w/2,-h); ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.8)'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(-w/2,-h); ctx.lineTo(w/2,-h); ctx.moveTo(-w/2,-h*0.36); ctx.lineTo(w/2,-h*0.36); ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.55)'; ctx.lineWidth=1.2;
  for(let i=1;i<8;i++){ const px=-w/2+(i/8)*w; ctx.beginPath(); ctx.moveTo(px,-h); ctx.lineTo(px,-h*0.36); ctx.stroke(); }
  for(let i=1;i<3;i++){ const py=-h+(i/3)*(h*0.64); ctx.beginPath(); ctx.moveTo(-w/2,py); ctx.lineTo(w/2,py); ctx.stroke(); }
  ctx.restore();
}
function volleyBall(x,y,r,t){
  ctx.save(); ctx.translate(x,y); ctx.rotate(t*0.8);
  ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(0,0,r,0,TAU); ctx.fill();
  ctx.strokeStyle='#5aa9d6'; ctx.lineWidth=Math.max(1.4,r*0.14);
  ctx.beginPath(); ctx.arc(0,0,r,0,TAU); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-r,0); ctx.quadraticCurveTo(0,-r*0.5,r,0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0,-r); ctx.quadraticCurveTo(r*0.5,0,0,r); ctx.stroke();
  ctx.restore();
}
function sandCastle(x,y,s){
  ctx.save(); ctx.translate(x,y);
  const g=ctx.createLinearGradient(0,-s,0,0); g.addColorStop(0,'#ffd9a0'); g.addColorStop(1,'#dfa062');
  ctx.fillStyle=g; ctx.strokeStyle='rgba(150,95,50,.45)'; ctx.lineWidth=1.6;
  ctx.beginPath(); ctx.rect(-s*0.85,-s*0.55,s*1.7,s*0.55); ctx.fill(); ctx.stroke();
  for(const tx of [-s*0.8,s*0.35]){ ctx.beginPath(); ctx.rect(tx,-s*1.05,s*0.45,s*1.05); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle='#e9b273';
  for(let i=0;i<5;i++){ ctx.fillRect(-s*0.85+i*s*0.36,-s*0.62,s*0.16,s*0.10); }
  ctx.strokeStyle='#b8794a'; ctx.lineWidth=1.8;
  ctx.beginPath(); ctx.moveTo(s*0.57,-s*1.05); ctx.lineTo(s*0.57,-s*1.5); ctx.stroke();
  ctx.fillStyle='#ff5f6b'; ctx.beginPath(); ctx.moveTo(s*0.57,-s*1.5); ctx.lineTo(s*1.0,-s*1.35); ctx.lineTo(s*0.57,-s*1.2); ctx.closePath(); ctx.fill();
  ctx.fillStyle='rgba(120,70,40,.35)'; ctx.beginPath(); ctx.ellipse(0,0,s*1.0,s*0.13,0,0,TAU); ctx.fill();
  ctx.restore();
}
function sideTable(x,y,s){
  ctx.save(); ctx.translate(x,y);
  ctx.fillStyle='rgba(120,70,40,.28)'; ctx.beginPath(); ctx.ellipse(0,s*0.06,s*0.9,s*0.16,0,0,TAU); ctx.fill();
  ctx.strokeStyle='#a06a3f'; ctx.lineWidth=Math.max(3,s*0.10); ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-s*0.55); ctx.stroke();
  const g=ctx.createLinearGradient(0,-s*0.75,0,-s*0.5); g.addColorStop(0,'#d79a5e'); g.addColorStop(1,'#a86c3c');
  ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(0,-s*0.62,s*0.92,s*0.22,0,0,TAU); ctx.fill();
  ctx.strokeStyle='rgba(120,70,40,.5)'; ctx.lineWidth=1.6; ctx.stroke();
  ctx.restore();
}
function drinkGlass(x,y,s,t){
  ctx.save(); ctx.translate(x,y);
  ctx.strokeStyle='rgba(255,255,255,.85)'; ctx.lineWidth=Math.max(1.6,s*0.055);
  ctx.fillStyle='rgba(255,255,255,.30)';
  ctx.beginPath(); ctx.moveTo(-s*0.52,-s*0.95); ctx.lineTo(s*0.52,-s*0.95); ctx.lineTo(0,-s*0.10); ctx.closePath(); ctx.fill(); ctx.stroke();
  const lg=ctx.createLinearGradient(0,-s*0.9,0,-s*0.2);
  lg.addColorStop(0,'#ff6b9d'); lg.addColorStop(.45,'#ffd76b'); lg.addColorStop(1,'#7fe0e6');
  ctx.fillStyle=lg; ctx.beginPath(); ctx.moveTo(-s*0.44,-s*0.86); ctx.lineTo(s*0.44,-s*0.86); ctx.lineTo(0,-s*0.16); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.85)'; ctx.lineWidth=Math.max(1.5,s*0.05);
  ctx.beginPath(); ctx.moveTo(0,-s*0.10); ctx.lineTo(0,s*0.22); ctx.moveTo(-s*0.36,s*0.24); ctx.lineTo(s*0.36,s*0.24); ctx.stroke();
  ctx.strokeStyle='#ff8fb0'; ctx.lineWidth=Math.max(1.6,s*0.06);
  ctx.beginPath(); ctx.moveTo(s*0.10,-s*0.80); ctx.lineTo(s*0.36,-s*1.30); ctx.stroke();
  const uy=-s*1.34, ur=s*0.42;
  for(let i=0;i<5;i++){ ctx.fillStyle=i%2?'#ff7aa8':'#fff2e2';
    ctx.beginPath(); ctx.moveTo(s*0.20,uy); ctx.arc(s*0.20,uy,ur,Math.PI+i*(Math.PI/5),Math.PI+(i+1)*(Math.PI/5)); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle='#ffd76b'; ctx.beginPath(); ctx.arc(-s*0.30,-s*0.86,s*0.16,0,TAU); ctx.fill();
  ctx.restore();
}
function iceCream(x,y,s){
  ctx.save(); ctx.translate(x,y);
  ctx.fillStyle='rgba(255,255,255,.35)'; ctx.strokeStyle='rgba(255,255,255,.8)'; ctx.lineWidth=1.6;
  ctx.beginPath(); ctx.moveTo(-s*0.5,-s*0.2); ctx.quadraticCurveTo(0,s*0.6,s*0.5,-s*0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
  const balls=[['#ffb3c9',-s*0.24,-s*0.42],['#fff0b8',s*0.20,-s*0.44],['#b8f0d8',-s*0.02,-s*0.72]];
  for(const [c,bx,by] of balls){ ctx.fillStyle=c; ctx.beginPath(); ctx.arc(bx,by,s*0.32,0,TAU); ctx.fill(); }
  ctx.fillStyle='#ff5f6b'; ctx.beginPath(); ctx.arc(-s*0.02,-s*1.02,s*0.13,0,TAU); ctx.fill();
  ctx.restore();
}
function bucketK(x,y,s){
  ctx.save(); ctx.translate(x,y);
  const g=ctx.createLinearGradient(-s,0,s,0); g.addColorStop(0,'#8fd3ff'); g.addColorStop(.5,'#cfeeff'); g.addColorStop(1,'#7ec2f0');
  ctx.fillStyle=g; ctx.strokeStyle='rgba(60,110,150,.5)'; ctx.lineWidth=1.8;
  ctx.beginPath(); ctx.moveTo(-s*0.62,-s*0.75); ctx.lineTo(s*0.62,-s*0.75); ctx.lineTo(s*0.44,s*0.1); ctx.lineTo(-s*0.44,s*0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0,-s*0.75,s*0.62,s*0.16,0,0,TAU); ctx.fill(); ctx.stroke();
  ctx.strokeStyle='rgba(70,120,160,.7)'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(0,-s*0.78,s*0.60,Math.PI*1.08,Math.PI*1.92); ctx.stroke();
  ctx.fillStyle='#3f7fa8'; ctx.font='700 '+Math.round(s*0.62)+'px "Baloo 2",sans-serif'; ctx.textAlign='center';
  ctx.fillText('K',0,-s*0.18); ctx.textAlign='start';
  ctx.restore();
}
function rockShape(x,y,s){
  ctx.save(); ctx.translate(x,y);
  const g=ctx.createLinearGradient(0,-s,0,s*0.2); g.addColorStop(0,'#b9a08f'); g.addColorStop(1,'#8a7264');
  ctx.fillStyle=g; ctx.strokeStyle='rgba(70,55,45,.4)'; ctx.lineWidth=1.8;
  ctx.beginPath(); ctx.moveTo(-s,s*0.15); ctx.quadraticCurveTo(-s*1.05,-s*0.55,-s*0.28,-s*0.85);
  ctx.quadraticCurveTo(s*0.45,-s*1.05,s*0.92,-s*0.42); ctx.quadraticCurveTo(s*1.15,s*0.05,s*0.8,s*0.15);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.18)'; ctx.beginPath(); ctx.ellipse(-s*0.30,-s*0.55,s*0.30,s*0.14,-0.5,0,TAU); ctx.fill();
  ctx.restore();
}
function drawMenuSpace(){
  const t=performance.now()/1000, cx=W/2, cy=H*0.40;
  const g0=ctx.createLinearGradient(0,0,0,H); g0.addColorStop(0,'#160a2e'); g0.addColorStop(1,'#070314');
  ctx.fillStyle=g0; ctx.fillRect(0,0,W,H);
  ctx.save(); ctx.globalCompositeOperation='lighter';
  const cols=['#ff8fc7','#c89bff','#7ef9d2','#ff6bd6','#8fd3ff'], arms=cols.length, maxR=Math.max(W,H)*0.8;
  for(let a=0;a<arms;a++){ const base=t*0.22+a/arms*TAU;
    for(let i=2;i<64;i++){ const r=i/64*maxR, ang=base+r*0.011;
      const x=cx+Math.cos(ang)*r, y=cy+Math.sin(ang)*r*0.9;
      ctx.fillStyle=hexA(cols[a],0.045*(1-i/64)); ctx.beginPath(); ctx.arc(x,y,7+i*0.85,0,TAU); ctx.fill(); } }
  const cg=ctx.createRadialGradient(cx,cy,2,cx,cy,200);
  cg.addColorStop(0,'rgba(255,255,255,.55)'); cg.addColorStop(.3,hexA('#ff8fc7',.45)); cg.addColorStop(1,'rgba(255,143,199,0)');
  ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(cx,cy,200,0,TAU); ctx.fill();
  ctx.restore();
  for(let i=0;i<90;i++){ const sx=(i*73.13)%W, sy=(i*129.7+i*i*0.7)%H;
    const tw=0.4+0.6*Math.abs(Math.sin(t*1.5+i)); ctx.fillStyle='rgba(255,255,255,'+(tw*0.5)+')';
    const s=(i%7===0)?2.2:1.1; ctx.fillRect(sx,sy,s,s); }
  const im=sprite('nimbus');
  if(im){ for(let i=0;i<3;i++){ const px=(t*18+i*W*0.42)%(W+120)-60, py=cy+Math.sin(t*0.6+i*2)*60+(i-1)*70, d=44;
    ctx.globalAlpha=0.5; ctx.drawImage(im,px-d/2,py-d/2,d,d); ctx.globalAlpha=1; } }
}

export { drawMenuFx };

// Marunte de folos general: numere aleatoare, interpolari, acces DOM.
// `ui` e harta elementelor de interfata folosite in tot jocul.

const rand=(a,b)=>a+Math.random()*(b-a), randi=(a,b)=>Math.floor(rand(a,b+1));
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t;
function lerpAngle(a,b,t){ let d=(b-a+Math.PI*3)%(Math.PI*2)-Math.PI; return a+d*t; }
const dist2=(ax,ay,bx,by)=>{const dx=ax-bx,dy=ay-by;return dx*dx+dy*dy;};
const TAU=Math.PI*2;

const el=id=>document.getElementById(id);
const ui={score:el('scoreV'),sector:el('sectorV'),combo:el('comboTag'),lives:el('livesV'),
  weaponbar:el('weaponbar'),menu:el('menu'),story:el('story'),coop:el('coop'),opts:el('opts'),pause:el('pause'),over:el('over'),
  finalScore:el('finalScore'),bestLine:el('bestLine'),overTitle:el('overTitle'),
  banner:el('banner'),bannerTxt:el('bannerTxt'),toast:el('toast'),crawl:el('crawl'),
  touchpad:el('touchpad'),missC:el('missC'),burstC:el('burstC'),muteBtn:el('muteBtn')};

// carlige intre module cu dependinte circulare la pornire (ex. canvas are
// nevoie de initBg dupa ce fundalul e gata, fara sa-l importe la evaluare)
const hooks={};

export { TAU, clamp, dist2, el, hooks, lerp, rand, randi, ui };

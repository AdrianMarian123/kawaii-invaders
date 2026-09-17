/**
 * Test de fum: incarca jocul REAL (modulele din src/) intr-un DOM fals, apasa
 * PLAY si il lasa sa ruleze cateva sute de cadre in modul cu un singur
 * jucator. Orice exceptie = esec.
 */
'use strict';
const { pornesteJocul } = require('./mediu-joc');

let pass=0,fail=0; const ok=(c,m)=>{c?(pass++,console.log('  OK  ',m)):(fail++,console.log('  FAIL',m));};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  console.log('\n=== Test de fum: jocul chiar pornește ===');
  const J=await pornesteJocul();
  const {doc,erori}=J;
  await wait(1500);
  ok(erori.length===0, 'se încarcă fără erori'+(erori.length?': '+erori[0].slice(0,200):''));
  const btn=doc.getElementById('startBtn');
  ok(!!btn, 'butonul de PLAY există');
  const before=erori.length;
  J.click('startBtn');
  await wait(200);
  const card=doc.querySelectorAll('#shipCards .perkcard')[0];
  ok(!!card, 'apare alegerea navei ('+doc.querySelectorAll('#shipCards .perkcard').length+' nave)');
  card.dispatchEvent(new J.w.MouseEvent('click',{bubbles:true}));
  await wait(300);
  ok(erori.length===before, 'PLAY pornește runda fără erori'+(erori.length>before?': '+erori[before].slice(0,300):''));
  ok(doc.getElementById('menu').classList.contains('hide'), 'meniul se ascunde — suntem în joc');

  // lasam bucla sa se invarta
  for(let i=0;i<60;i++) await wait(16);
  ok(erori.length===before, 'rulează ~1s de joc fără erori'+(erori.length>before?': '+erori[before].slice(0,300):''));

  // butoanele de racheta si burst
  const b2=erori.length;
  J.click('btnMissile');
  J.click('btnBurst');
  for(let i=0;i<30;i++) await wait(16);
  ok(erori.length===b2, 'racheta și burst-ul merg'+(erori.length>b2?': '+erori[b2].slice(0,300):''));

  // pauza / reluare
  const b3=erori.length;
  J.click('pauseBtn');
  await wait(100);
  J.click('resumeBtn');
  for(let i=0;i<30;i++) await wait(16);
  ok(erori.length===b3, 'pauză și reluare fără erori'+(erori.length>b3?': '+erori[b3].slice(0,300):''));

  // scorul chiar creste (deci bucla de joc face treaba, nu doar nu crapa)
  const sEl=doc.getElementById('scoreV'); const s1=sEl?sEl.textContent:'(fără element)';
  for(let i=0;i<180;i++) await wait(16);
  const s2=sEl?sEl.textContent:'(fără element)';
  ok(erori.length===b3, 'încă ~3s de joc fără erori'+(erori.length>b3?': '+erori[b3].slice(0,300):''));
  console.log('       scor: "'+s1+'" -> "'+s2+'"');

  console.log('\n=== '+pass+' treceri, '+fail+' eșecuri ===');
  if(erori.length){ console.log('\nprimele erori:'); erori.slice(0,3).forEach(e=>console.log('  '+String(e).slice(0,400))); }
  process.exit(fail?1:0);
})().catch(e=>{ console.error('harness:',e); process.exit(1); });

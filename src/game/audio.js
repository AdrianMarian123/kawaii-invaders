// Sunetul jocului: efecte procedurale (WebAudio) + playerul muzical
// (MP3 incorporat sau piese procedurale). Un singur modul: cele doua
// jumatati impart contextul audio si starea de mute.
import { el, ui } from './utils.js';

let actx=null, master=null, muted=false;
function audioInit(){ if(actx)return; try{ actx=new (window.AudioContext||window.webkitAudioContext)();
  master=actx.createGain(); master.gain.value=0.5; master.connect(actx.destination); if(actx.state==='suspended')actx.resume().catch(()=>{});}catch(e){}
  try{ ensureMusicClock(); }catch(e){} }
function tone(freq,dur,type,vol,sweep){ if(!actx||muted)return;
  const o=actx.createOscillator(),g=actx.createGain(); o.type=type||'triangle'; o.frequency.value=freq;
  if(sweep) o.frequency.exponentialRampToValueAtTime(Math.max(40,freq*sweep),actx.currentTime+dur);
  g.gain.value=vol||0.06; g.gain.exponentialRampToValueAtTime(0.0001,actx.currentTime+dur);
  o.connect(g); g.connect(master); o.start(); o.stop(actx.currentTime+dur+0.02); }
function noise(dur,vol,filterFreq){ if(!actx||muted)return;
  const n=Math.floor(actx.sampleRate*dur), buf=actx.createBuffer(1,n,actx.sampleRate), d=buf.getChannelData(0);
  for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
  const s=actx.createBufferSource(); s.buffer=buf; const f=actx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=filterFreq||1200;
  const g=actx.createGain(); g.gain.value=vol||0.18; s.connect(f); f.connect(g); g.connect(master); s.start(); }
const snd={
  shoot:()=>tone(720,0.06,'square',0.025,0.6),
  scatter:()=>tone(440,0.07,'sawtooth',0.022,0.7),
  zap:()=>tone(900,0.05,'sawtooth',0.03,0.4),
  hit:()=>tone(280,0.04,'square',0.02,0.8),
  pickup:()=>{tone(880,0.08,'triangle',0.05);setTimeout(()=>tone(1320,0.09,'triangle',0.05),60);},
  coin:()=>tone(1500,0.07,'triangle',0.04,1.1),
  explode:()=>{noise(0.35,0.22,900);tone(160,0.3,'sawtooth',0.05,0.4);},
  boom:()=>{noise(0.6,0.32,700);tone(90,0.5,'sawtooth',0.08,0.5);},
  hurt:()=>{tone(200,0.25,'sawtooth',0.07,0.4);noise(0.2,0.12,600);},
  missile:()=>tone(300,0.18,'triangle',0.05,2.2),
  bomb:()=>{noise(0.7,0.3,1600);tone(120,0.6,'square',0.07,0.4);},
  alarm:()=>{tone(660,0.15,'square',0.05);setTimeout(()=>tone(660,0.15,'square',0.05),200);},
  bossIntro:()=>{ noise(0.5,0.18,500); [0,140,280].forEach((d,i)=>setTimeout(()=>tone([330,392,494][i],0.22,'sawtooth',0.06),d));
    setTimeout(()=>tone(660,0.5,'square',0.07),440); setTimeout(()=>{tone(110,0.6,'sawtooth',0.08,0.5);noise(0.5,0.2,700);},520); },
  achv:()=>{ [523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,0.16,'triangle',0.06),i*90)); },
};
function toggleMute(){ muted=!muted; ui.muteBtn.textContent=muted?'🔈':'🔊'; if(master) master.gain.value=muted?0:0.5; if(musAudio)musAudio.muted=muted; try{musApply();}catch(e){} }

// ——— player muzical: MP3 încorporat + piese procedurale, comutabile oriunde ———
let musicOn=true, musTrackIx=0, musAudio=null, musicGain=null, musClock=null, musStep=0, musNextTime=0;
// Analizorul care alimentează licărirea panoului de muzică. Piesele procedurale
// trec prin musicGain, deci le putem asculta direct. Cele din MP3 sunt un element
// <audio> care sună pe lângă AudioContext — createMediaElementSource() îl aduce în
// graf. Sursele sunt data: URL, deci acelaşi origin: analizorul chiar primeşte date.
let musAnalyser=null, _musFreq=null, _musSrc=null, _musLvl=0;
function ensureAnalyser(){
  if(!actx) return null;
  if(!musAnalyser){
    try{ musAnalyser=actx.createAnalyser(); musAnalyser.fftSize=256; musAnalyser.smoothingTimeConstant=0.55;
         _musFreq=new Uint8Array(musAnalyser.frequencyBinCount); }catch(e){ musAnalyser=null; }
  }
  return musAnalyser;
}
// Rutăm MP3-ul prin AudioContext doar când acesta chiar rulează. Altfel elementul
// ar rămâne legat la un context suspendat şi muzica ar amuţi — mai bine sună fără
// licărire decât să nu sune deloc. Conectăm la destination, nu la master, ca să
// păstrăm volumul de acum (musAudio.volume) şi mute-ul pe element.
function routeMusicEl(){
  if(_musSrc||!actx||actx.state!=='running'||!musAudio) return;
  try{
    _musSrc=actx.createMediaElementSource(musAudio);
    const an=ensureAnalyser(); if(an)_musSrc.connect(an);
    _musSrc.connect(actx.destination);
  }catch(e){ _musSrc=null; }   // o singură sursă per element; dacă pică, mergem pe ceas   // o singură sursă per element; dacă pică, mergem pe ceas
}
// 0..1, cu atac instant şi cădere lentă: urcă pe lovitură şi scade între ele.
function musLevel(){
  if(!musicOn||muted) return 0;
  // Rutarea se încearcă aici, nu doar în musApply(): la pornire AudioContext-ul
  // e încă suspendat (niciun gest al jucătorului), deci atunci nu se putea face.
  // Rulând în fiecare cadru, se leagă singură imediat ce contextul porneşte.
  // E no-op după prima reuşită.
  if(!_musSrc && musAudio && !musAudio.paused){ try{ routeMusicEl(); }catch(e){} }
  if(musAnalyser&&_musFreq&&actx&&actx.state==='running'){
    try{
      musAnalyser.getByteFrequencyData(_musFreq);
      let s=0; const n=Math.min(10,_musFreq.length);   // banda de jos: kick + bas
      for(let i=1;i<=n;i++) s+=_musFreq[i];
      const v=Math.min(1,(s/n)/140);
      _musLvl = v>_musLvl ? v : _musLvl+(v-_musLvl)*0.14;
      return _musLvl;
    }catch(e){}
  }
  // fără analizor: puls de ceas, ca panoul să nu pară mort
  const t=(typeof performance!=='undefined'?performance.now():Date.now())/1000;
  return 0.30+0.40*Math.pow(Math.max(0,Math.sin(t*3.1)),3);
}
const NF={G2:98.00,A2:110.00,F2:87.31,C3:130.81,D3:146.83,E3:164.81,F3:174.61,G3:196.00,A3:220.00,C4:261.63,D4:293.66,E4:329.63,F4:349.23,G4:392.00,A4:440.00,B4:493.88,C5:523.25,D5:587.33,E5:659.25,F5:698.46,G5:783.99,A5:880.00,C6:1046.50};
const PROC_TRACKS={
  kawaii:{step:0.245,type:'triangle',vol:0.05,bvol:0.075,sparkle:true,
    lead:['E5','G5','E5','C5','D5',0,'E5','D5','D5','B4','D5','G4','B4',0,'D5','B4','C5','E5','A4','C5','E5',0,'A5','E5','A4','C5','F4','A4','C5',0,'A4','G4'],
    bass:{0:'C3',4:'C3',8:'G2',12:'G2',16:'A2',20:'A2',24:'F2',28:'F2'}},
  drift:{step:0.34,type:'sine',vol:0.045,bvol:0.065,sparkle:false,
    lead:['A4',0,'C5',0,'E5',0,'C5',0,'F4',0,'A4',0,'C5',0,'A4',0,'E4',0,'G4',0,'C5',0,'G4',0,'G4',0,'B4',0,'D5',0,'B4',0],
    bass:{0:'A2',8:'F2',16:'C3',24:'G2'}}};
const TRACKS=[{id:'sunny',n:'Sunny Hill Dash 🎧'},{id:'lost',n:'Memories of a Lost Level 🎼'},{id:'kawaii',n:'Sugar Swarm 🍬'},{id:'drift',n:'Cosmic Drift 🌌'}];
try{ musicOn=(localStorage.getItem('ki_mus_on')!=='0');
  const tid=localStorage.getItem('ki_mus_track'); const ix=TRACKS.findIndex(t=>t.id===tid); if(ix>=0)musTrackIx=ix; }catch(e){}
function curTrack(){ return TRACKS[musTrackIx]; }
function mp3Src(id){ return (window.__MUS__&&window.__MUS__[id])||null; }
function musSave(){ try{localStorage.setItem('ki_mus_on',musicOn?'1':'0');localStorage.setItem('ki_mus_track',curTrack().id);}catch(e){} }
function mnote(freq,dur,type,vol,at){ if(!actx||!musicGain)return;
  const o=actx.createOscillator(),g=actx.createGain(); o.type=type; o.frequency.setValueAtTime(freq,at);
  g.gain.setValueAtTime(0.0001,at); g.gain.exponentialRampToValueAtTime(vol,at+0.02); g.gain.exponentialRampToValueAtTime(0.0001,at+dur);
  o.connect(g); g.connect(musicGain); o.start(at); o.stop(at+dur+0.04); }
function procStep(P,step,at){ const lf=P.lead[step]; if(lf)mnote(NF[lf],P.step*1.7,P.type,P.vol,at);
  const bf=P.bass[step]; if(bf){ mnote(NF[bf],P.step*2.4,'sine',P.bvol,at); mnote(NF[bf]*2,P.step*1.2,'triangle',0.02,at); }
  if(P.sparkle&&step%8===2)mnote(NF.C6,P.step*0.5,'triangle',0.018,at); }
function ensureMusicClock(){ if(musClock||!actx)return;
  if(!musicGain){ musicGain=actx.createGain(); musicGain.gain.value=0.9; musicGain.connect(master||actx.destination);
    const an=ensureAnalyser(); if(an)musicGain.connect(an); }   // ramură paralelă: doar ascultă
  musNextTime=actx.currentTime+0.1;
  musClock=setInterval(()=>{ const t=curTrack();
    if(!actx||muted||!musicOn||!(t.id in PROC_TRACKS)){ musNextTime=actx.currentTime+0.08; return; }
    const P=PROC_TRACKS[t.id];
    while(musNextTime<actx.currentTime+0.35){ procStep(P,musStep,musNextTime); musNextTime+=P.step; musStep=(musStep+1)%P.lead.length; }
  },60); }
function ensureAudioEl(){ if(musAudio)return musAudio;
  try{ musAudio=new Audio(); musAudio.loop=true; musAudio.volume=0.55; }catch(e){}
  return musAudio; }
function musApply(){ const t=curTrack(); const src=mp3Src(t.id);
  if(src&&musicOn&&!muted){ const a=ensureAudioEl(); if(a){ if(a.src!==src)a.src=src; a.muted=false; a.play().catch(()=>{}); try{ routeMusicEl(); }catch(e){} } }
  else if(musAudio){ try{musAudio.pause();}catch(e){} }
  if((t.id in PROC_TRACKS)&&musicOn&&!muted){ audioInit(); ensureMusicClock(); }
  const nm=el('musName'); if(nm)nm.textContent=t.n+((!(t.id in PROC_TRACKS)&&!src)?' (lipsă fișier)':'');
  const pb=el('musPlay'); if(pb)pb.textContent=musicOn?'⏸':'▶';
  const db=el('musDockBtn'); if(db)db.classList.toggle('off',!musicOn); }
function musNextTrack(dir){ musTrackIx=(musTrackIx+dir+TRACKS.length)%TRACKS.length; musStep=0; if(actx)musNextTime=actx.currentTime+0.05; musSave(); musApply(); }
function musTogglePlay(){ musicOn=!musicOn; musSave(); musApply(); }
// Reclamele interstitial au sunetul lor: cat una e pe ecran oprim audio-ul
// jocului si il reluam dupa, fara sa atingem preferinta de mute a jucatorului.
// `ducked` taie si handler-ul de visibilitychange de mai jos, care altfel ar
// reporni muzica in spatele reclamei la prima revenire in prim-plan.
let ducked=false;
function audioDuck(on){ ducked=!!on;
  try{ if(on){ if(musAudio)musAudio.pause(); if(actx&&actx.state==='running')actx.suspend(); }
       else { if(actx)actx.resume().catch(()=>{}); musApply(); } }catch(e){} }
document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&!ducked){ try{ if(actx&&actx.state==='suspended')actx.resume(); musApply(); }catch(e){} } });


export { audioDuck, audioInit, musApply, musLevel, musNextTrack, musTogglePlay, snd, toggleMute, tone };

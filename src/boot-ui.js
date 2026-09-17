(function(){
  // sub Capacitor tot ce trebuie e local (nu are sens un service worker acolo)
  if(!window.Capacitor && 'serviceWorker' in navigator){ window.addEventListener('load',function(){
    navigator.serviceWorker.register('sw.js').then(function(reg){
      // check for a new version whenever the app regains focus, and every 60s
      function poll(){ reg.update().catch(function(){}); }
      document.addEventListener('visibilitychange',function(){ if(!document.hidden)poll(); });
      window.addEventListener('focus',poll); setInterval(poll,60000);
      reg.addEventListener('updatefound',function(){
        var nw=reg.installing; if(!nw)return;
        nw.addEventListener('statechange',function(){
          if(nw.state==='installed' && navigator.serviceWorker.controller){
            // a fresh build is ready — tell it to take over immediately
            try{ nw.postMessage({t:'skip'}); }catch(e){}
            try{ var to=document.getElementById('toast'); if(to){ to.textContent='✨ versiune nouă — se reîncarcă…'; to.classList.add('show'); } }catch(e){}
          }
        });
      });
    }).catch(function(){});
    var reloaded=false;
    navigator.serviceWorker.addEventListener('controllerchange',function(){
      if(reloaded)return; reloaded=true; location.reload();   // new SW active → reload once to get the new build
    });
  }); }
  function lockLand(){ try{ if(screen.orientation&&screen.orientation.lock) screen.orientation.lock('landscape').catch(function(){}); }catch(e){} }
  lockLand(); window.addEventListener('click',lockLand,{once:true});
  { let musToast=false;
    const musOK=()=>{ const t=curTrack(); if(!musicOn)return true;
      if(t&&(t.id in PROC_TRACKS)) return !!(actx&&actx.state==='running');
      return !!(musAudio&&!musAudio.paused); };
    const kick=()=>{ try{ audioInit(); if(actx&&actx.state==='suspended')actx.resume().catch(()=>{}); musApply();
        if(musOK()){ if(musicOn&&!musToast){ musToast=true; try{toast('🎵 '+curTrack().n,'#c9a6ff');}catch(e){} }
          window.removeEventListener('pointerdown',kick); window.removeEventListener('keydown',kick); window.removeEventListener('touchend',kick); }
      }catch(e){} };
    window.addEventListener('pointerdown',kick); window.addEventListener('keydown',kick); window.addEventListener('touchend',kick); }
  var dp=null, b=document.getElementById('installBtn');
  window.addEventListener('beforeinstallprompt',function(e){ e.preventDefault(); dp=e; if(b)b.style.display='block'; });
  if(b)b.addEventListener('click',function(){ if(!dp)return; b.style.display='none'; dp.prompt(); dp.userChoice.finally(function(){ dp=null; }); });
  window.addEventListener('appinstalled',function(){ if(b)b.style.display='none'; lockLand(); });
})();

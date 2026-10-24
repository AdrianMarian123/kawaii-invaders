// Reclame (AdMob) si consimtamant (UMP).
//
// Solo: un interstitial la iesirea din ecranul de final, pe „Din nou" si pe
// „Meniu". Co-op: unul singur la intrare, inainte de WebSocket (ui-screens.js).
// In co-op NU aratam reclama de final: WebView-ul trece in fundal, iar cele doua
// telefoane ar sta in reclame de lungimi diferite si s-ar desincroniza.
//
// Pe web e tot no-op. `maybeShow()` nu respinge niciodata si se rezolva mereu —
// un await agatat aici ar lasa jucatorul pe ecran negru.

import { ADS } from './ads-config.js';
import { audioDuck } from '../game/audio.js';

let AdMob=null, Events=null, Consent=null;
let started=false, ready=false, canAsk=true, npa=false, lastShown=0;
let inflight=null;                 // reclama in curs; al doilea apelant o asteapta

const REMOVED_KEY='ki_ads_removed';

function isNative(){ try{ return !!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform()); }catch(e){ return false; } }

// Poarta cumparaturii „fara reclame"; billing.js scrie cheia.
function adsRemoved(){ try{ return localStorage.getItem(REMOVED_KEY)==='1'; }catch(e){ return false; } }
function setAdsRemoved(on){ try{ if(on)localStorage.setItem(REMOVED_KEY,'1'); else localStorage.removeItem(REMOVED_KEY); }catch(e){} if(on)ready=false; }

// UMP n-are credentiale in cod: formularul si lista de parteneri se configureaza
// in consola AdMob (Privacy & messaging). `canRequestAds` e verdictul SDK-ului —
// daca e fals nu cerem deloc reclame; fara consimtamant le cerem nepersonalizate.
async function requestConsent(){
  try{
    let info=await AdMob.requestConsentInfo();
    if(info.isConsentFormAvailable && info.status===Consent.REQUIRED) info=await AdMob.showConsentForm();
    canAsk = !info || info.canRequestAds !== false;
    npa = !(info && (info.status===Consent.OBTAINED || info.status===Consent.NOT_REQUIRED));
  }catch(e){ canAsk=true; npa=true; console.warn('[ads] UMP:',e); }
}

// Pre-incarcam din timp: o cerere de retea intre „Din nou" si repornire ar fi lag.
function preload(){
  if(!AdMob || !canAsk || inflight) return;
  AdMob.prepareInterstitial({ adId:ADS.interstitialId, isTesting:ADS.testing, npa })
    .then(()=>{ ready=true; })
    .catch(e=>{ ready=false; console.warn('[ads] preload:',(e&&e.message)||e); });
}

async function initAds(){
  if(started) return;
  started=true;
  if(!isNative() || adsRemoved()) return;
  try{
    const m=await import('@capacitor-community/admob');
    AdMob=m.AdMob; Events=m.InterstitialAdPluginEvents; Consent=m.AdmobConsentStatus;
    await AdMob.initialize({ initializeForTesting: ADS.testing });
    await requestConsent();
    preload();
  }catch(e){ AdMob=null; console.warn('[ads] init:',e); }   // fara reclame, dar jocul merge
}

// showInterstitial() se rezolva cand reclama APARE, nu cand e inchisa — deci
// asteptam Dismissed. Doua plase: daca nu apare in 10s renuntam, iar daca
// Dismissed nu vine, revenirea paginii in prim-plan dupa ce a fost ascunsa
// inseamna oricum ca reclama a disparut.
function present(){
  return new Promise(resolve=>{
    let done=false, shown=false, hid=false, guard=null;
    const hs=[];
    const onVis=()=>{ if(!shown)return; if(document.hidden)hid=true; else if(hid)finish(); };
    function finish(why){
      if(done)return; done=true;
      clearTimeout(guard);
      document.removeEventListener('visibilitychange',onVis);
      for(const h of hs) Promise.resolve(h).then(l=>{ try{ l.remove(); }catch(e){} }).catch(()=>{});
      audioDuck(false);
      if(why) console.warn('[ads] '+why);
      resolve();
    }
    const on=(ev,fn)=>{ try{ hs.push(AdMob.addListener(ev,fn)); }catch(e){} };

    on(Events.Showed, ()=>{ shown=true; clearTimeout(guard); });
    on(Events.Dismissed, ()=>finish());
    on(Events.FailedToShow, ()=>finish('nu s-a putut afisa'));
    document.addEventListener('visibilitychange',onVis);
    guard=setTimeout(()=>{ if(!shown) finish('nu a aparut in 10s'); },10000);

    audioDuck(true);
    AdMob.showInterstitial().catch(e=>finish('showInterstitial: '+((e&&e.message)||e)));
  });
}

// Punctul unic de intrare: `await maybeShow(...)` apoi continua.
// Cat o reclama e pe ecran intoarce aceeasi promisiune, ca un al doilea apelant
// sa nu treaca pe sub ea si sa porneasca o actiune in paralel.
function maybeShow(where){
  if(inflight) return inflight;
  if(!AdMob || adsRemoved()) return Promise.resolve();
  if(ADS.minIntervalS>0 && Date.now()-lastShown < ADS.minIntervalS*1000) return Promise.resolve();
  if(!ready){ preload(); return Promise.resolve(); }   // nu punem jucatorul sa astepte reteaua
  ready=false;
  inflight=present().finally(()=>{
    inflight=null; lastShown=Date.now(); preload();
    if(where) console.log('[ads] '+where);
  });
  return inflight;
}

export { adsRemoved, initAds, maybeShow, setAdsRemoved };

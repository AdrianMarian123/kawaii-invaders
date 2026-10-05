// Reclamele (AdMob) si consimtamantul (UMP).
//
// Unde apar:
//   · solo  — un interstitial la ieșirea din ecranul de final, pe „Din nou" si
//             pe „Meniu", adica dupa ce jucatorul si-a vazut scorul;
//   · co-op — un interstitial la intrarea in co-op, INAINTE sa se deschida
//             WebSocket-ul. Nu la conectare: acolo cele doua telefoane ar sta
//             in reclame de lungimi diferite, gazda ar porni meciul singura, iar
//             conexiunea proaspata s-ar inchide cu WebView-ul in fundal.
//
// Pe web (GitHub Pages) AdMob nu exista. Tot modulul e un no-op acolo, iar
// `maybeShow()` se rezolva instant, deci fluxul jocului e identic pe ambele
// platforme si apelantul nu are nevoie de ramuri separate.
//
// `maybeShow()` nu respinge NICIODATA promisiunea si se rezolva mereu: daca
// reclama lipseste, nu se incarca sau da eroare, jocul merge inainte. Un
// `await` care atarna aici ar insemna jucator blocat pe ecran negru.

import { ADS } from './ads-config.js';
import { audioDuck } from '../game/audio.js';

// —— stare —— (plugin incarcat lenes: pe web nu-l atingem deloc)
let AdMob = null, Events = null, ConsentStatus = null;
let started = false;      // initAds a fost chemat
let ready = false;        // avem un interstitial pre-incarcat
let showing = false;      // una pe ecran / in curs — opreste dublu-tap
let npa = false;          // cerem reclame nepersonalizate (fara consimtamant)
let lastShown = 0;

const REMOVED_KEY = 'ki_ads_removed';

function isNative(){
  try{ return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }
  catch(e){ return false; }
}

// Poarta pentru cumpararea „fara reclame". Billing-ul scrie cheia asta; pana
// atunci e mereu false, deci reclamele merg normal.
function adsRemoved(){ try{ return localStorage.getItem(REMOVED_KEY) === '1'; }catch(e){ return false; } }
function setAdsRemoved(on){
  try{ if(on) localStorage.setItem(REMOVED_KEY,'1'); else localStorage.removeItem(REMOVED_KEY); }catch(e){}
  if(on){ ready = false; }
}

// ——— UMP (consimtamant) ———
// Nu are nicio credentiala in cod: formularul, textele si lista de parteneri se
// configureaza in consola AdMob → Privacy & messaging. Aici doar il cerem.
// Daca jucatorul e in SEE/UK si nu a dat consimtamant, trecem pe reclame
// nepersonalizate (npa) — altfel ar fi incalcare de politica, nu doar venit mai mic.
async function requestConsent(){
  try{
    let info = await AdMob.requestConsentInfo();
    if(info.isConsentFormAvailable && info.status === ConsentStatus.REQUIRED){
      info = await AdMob.showConsentForm();
    }
    npa = !(info && (info.status === ConsentStatus.OBTAINED || info.status === ConsentStatus.NOT_REQUIRED));
  }catch(e){
    npa = true;                                   // in dubiu, nepersonalizate
    console.warn('[ads] UMP:', e);
  }
}

// Pre-incarcam urmatoarea reclama din timp, ca afisarea sa fie instantanee:
// o cerere de retea intre „Din nou" si repornirea meciului s-ar simti ca lag.
function preload(){
  if(!AdMob || showing) return;
  AdMob.prepareInterstitial({ adId: ADS.interstitialId, isTesting: ADS.testing, npa })
    .then(()=>{ ready = true; })
    .catch(e=>{ ready = false; console.warn('[ads] preload:', e && e.message || e); });
}

async function initAds(){
  if(started) return;
  started = true;
  if(!isNative() || adsRemoved()) return;
  try{
    const m = await import('@capacitor-community/admob');
    AdMob = m.AdMob; Events = m.InterstitialAdPluginEvents; ConsentStatus = m.AdmobConsentStatus;
    await AdMob.initialize({ initializeForTesting: ADS.testing });
    await requestConsent();
    preload();
  }catch(e){
    AdMob = null;
    console.warn('[ads] init:', e);               // fara reclame, dar jocul merge
  }
}

// Afiseaza reclama si se rezolva cand ecranul e iar al jocului.
// `showInterstitial()` se rezolva cand reclama APARE, nu cand e inchisa, deci
// asteptam evenimentul Dismissed. Cele doua plase de siguranta:
//   · daca nu apare in 10s, presupunem ca a picat si eliberam jocul;
//   · dupa ce a aparut, un plafon larg, doar ca sa nu rama promisiunea agatata
//     daca Dismissed nu mai vine (reclama poate fi privita legitim 30-60s, deci
//     un timeout scurt ar reporni meciul in spatele reclamei).
function present(){
  return new Promise(resolve=>{
    let done = false, shown = false, guard = null;
    const handles = [];
    const finish = (why)=>{
      if(done) return; done = true;
      clearTimeout(guard);
      for(const h of handles){ Promise.resolve(h).then(l=>{ try{ l.remove(); }catch(e){} }).catch(()=>{}); }
      audioDuck(false);
      if(why) console.warn('[ads] ' + why);
      resolve();
    };
    const on = (ev, fn)=>{ try{ handles.push(AdMob.addListener(ev, fn)); }catch(e){} };

    on(Events.Showed, ()=>{ shown = true; clearTimeout(guard); guard = setTimeout(()=>finish('Dismissed nu a venit'), 300000); });
    on(Events.Dismissed, ()=>finish());
    on(Events.FailedToShow, ()=>finish('reclama nu s-a putut afisa'));

    guard = setTimeout(()=>{ if(!shown) finish('reclama nu a aparut in 10s'); }, 10000);

    audioDuck(true);
    AdMob.showInterstitial().catch(e=>finish('showInterstitial: ' + (e && e.message || e)));
  });
}

// Punctul unic de intrare pentru joc. `await ads.maybeShow()` apoi continua.
async function maybeShow(where){
  if(!AdMob || showing || adsRemoved()) return;
  if(ADS.minIntervalS > 0 && Date.now() - lastShown < ADS.minIntervalS * 1000) return;
  // Reclama neincarcata inseamna ca jucatorul ar aștepta o cerere de retea.
  // Mai bine sarim peste si o pregatim pentru data viitoare.
  if(!ready){ preload(); return; }
  showing = true;
  ready = false;
  try{ await present(); }
  finally{
    showing = false;
    lastShown = Date.now();
    preload();                                    // pregatim urmatoarea
    if(where) console.log('[ads] afisata: ' + where);
  }
}

export { adsRemoved, initAds, maybeShow, setAdsRemoved };

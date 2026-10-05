// Configurarea reclamelor, citita din `.env` la build.
//
// Vite inlocuieste `import.meta.env.VITE_*` cu valori literale la build, deci
// nimic de aici nu e secret: ajunge in dist/ si in APK. E in regula — ID-urile
// AdMob sunt publice prin design. Cheile care trebuie sa rama secrete (service
// account Google Play) nu au ce caut aici, ci doar pe server.
//
// Testele din dezvoltare/ importa src/main.js ca ESM nativ in Node, fara Vite:
// acolo `import.meta.env` e undefined, de unde fallback-ul pe {}.
const E = import.meta.env || {};

// ID-urile OFICIALE DE TEST ale Google. Fallback-ul le pastreaza ca jocul sa
// fie functional pe o clona fara `.env`, in loc sa ceara reclame cu adId gol.
const TEST_INTERSTITIAL = 'ca-app-pub-3940256099942544/1033173712';

function flag(v, implicit){
  if(v === undefined || v === '') return implicit;
  return String(v).toLowerCase() === 'true';
}
function seconds(v, implicit){
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : implicit;
}

const interstitialId = E.VITE_ADMOB_INTERSTITIAL_ID || TEST_INTERSTITIAL;

export const ADS = {
  interstitialId,
  // `isTesting` pe fiecare cerere: chiar daca ID-ul e cel real, cere reclame de
  // test. Testarea pe ID-uri reale e frauda de clicuri si suspenda contul AdMob.
  // Implicit true — ca sa fie nevoie de un pas explicit pentru reclame reale.
  testing: flag(E.VITE_ADMOB_TESTING, true) || interstitialId === TEST_INTERSTITIAL,
  // 0 = reclama la fiecare meci. Supapa pentru cazul in care devine prea des.
  minIntervalS: seconds(E.VITE_ADS_MIN_INTERVAL_S, 0)
};

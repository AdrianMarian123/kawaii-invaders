// Configurarea reclamelor, citita din `.env` la build.
//
// Vite inlocuieste `import.meta.env.VITE_*` cu valori literale, deci nimic de
// aici nu e secret: ajunge in dist/ si in APK. E in regula — ID-urile AdMob sunt
// publice prin design. Cheile care trebuie sa ramana secrete stau pe server.
//
// Testele importa src/main.js ca ESM nativ in Node, fara Vite: acolo
// `import.meta.env` e undefined, de unde fallback-ul pe {}.
const E = import.meta.env || {};

// ID-ul OFICIAL DE TEST al Google: pastreaza jocul functional pe o clona fara
// `.env`, in loc sa ceara reclame cu adId gol.
const TEST_INTERSTITIAL = 'ca-app-pub-3940256099942544/1033173712';

const interstitialId = E.VITE_ADMOB_INTERSTITIAL_ID || TEST_INTERSTITIAL;

// Doar „false" scos explicit opreste modul de test. Orice altceva (gol, "0",
// scris gresit) ramane pe test: o greseala de tipar nu trebuie sa ajunga sa
// ceara reclame reale pe unitatea ta — e frauda de clicuri si suspenda contul.
const testing = String(E.VITE_ADMOB_TESTING).toLowerCase() !== 'false'
             || interstitialId === TEST_INTERSTITIAL;

const n = Number(E.VITE_ADS_MIN_INTERVAL_S);

export const ADS = {
  interstitialId,
  testing,
  // 0 = reclama la fiecare meci. Supapa daca devine prea des.
  minIntervalS: Number.isFinite(n) && n >= 0 ? n : 0
};

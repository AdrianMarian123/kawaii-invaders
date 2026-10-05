/**
 * Punte intre `.env` si stratul nativ Android.
 *
 * AdMob cere App ID-ul ca <meta-data> in AndroidManifest.xml, altfel SDK-ul
 * arunca o excepsie la pornirea aplicatiei. Vite nu poate scrie in manifest,
 * asa ca `.env` ramane singura sursa de adevar si scriptul asta copiaza ce
 * trebuie in `android/admob.properties`, de unde il citeste build.gradle si il
 * injecteaza in manifest printr-un manifestPlaceholder.
 *
 * Rulare:  npm run sync:android
 */
const { readFileSync, writeFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const ENV_FILE = join(root, '.env');
const OUT_FILE = join(root, 'android', 'admob.properties');

// ID-ul de test al Google: pastreaza aplicatia functionala pe o clona proaspata,
// fara `.env`, in loc sa o lase sa crape la pornire cu un App ID gol.
const TEST_APP_ID = 'ca-app-pub-3940256099942544~3347511713';

// parser minimal de .env — nu merita o dependinta pentru atat
function parseEnv(text){
  const out = {};
  for(const raw of text.split(/\r?\n/)){
    const line = raw.trim();
    if(!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if(eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    out[key] = val;
  }
  return out;
}

const env = existsSync(ENV_FILE) ? parseEnv(readFileSync(ENV_FILE, 'utf8')) : {};
if(!existsSync(ENV_FILE)) console.warn('⚠️  .env lipseste — folosesc App ID-ul de test. Copiaza .env.example in .env.');

const appId = env.VITE_ADMOB_APP_ID || TEST_APP_ID;

// forma ca-app-pub-<cifre>~<cifre>; un App ID stricat nu da eroare la build, ci
// un crash la prima pornire pe telefon — mai bine ne oprim aici
if(!/^ca-app-pub-\d+~\d+$/.test(appId)){
  console.error('\u2716 VITE_ADMOB_APP_ID nu are forma ca-app-pub-XXXXXXXX~YYYYYYYY: ' + JSON.stringify(appId));
  process.exit(1);
}

const isTest = appId === TEST_APP_ID;
writeFileSync(OUT_FILE,
  '# GENERAT de dezvoltare/sync-android-config.js din .env \u2014 nu edita manual.\n' +
  '# Editeaza .env si ruleaza `npm run sync:android`.\n' +
  'admobAppId=' + appId + '\n', 'utf8');

console.log('\u2713 android/admob.properties \u2190 .env');
console.log('  admobAppId = ' + appId + (isTest ? '   (ID DE TEST \u2014 nu e cel al tau)' : ''));
if(!isTest) console.log('  \u2139  ID real: verifica si ca VITE_ADMOB_TESTING=false inainte de release.');

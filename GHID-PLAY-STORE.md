# Ghid: de la cod la Kawaii Invaders pe Google Play

Acest ghid presupune că ai deja un cont de dezvoltator Google Play verificat
și plătit. Parcurge pașii în ordine — o singură dată per calculator pentru
partea de instalare, apoi de fiecare dată când vrei o versiune nouă pentru
partea de build.

## 0. Ce trebuie să ai instalat (o singură dată)

- **Node.js** — îl ai deja (proiectul rulează cu el).
- **Android Studio** — îl ai deja instalat, cu Android SDK.
- **JDK 17 sau mai nou** — ai deja Java 23 instalat, e suficient.

Verifică rapid în terminal:

```powershell
java -version
echo $env:ANDROID_HOME
```

Dacă `ANDROID_HOME` e gol, deschide Android Studio → Settings → Languages &
Frameworks → Android SDK, și copiază acolo calea "Android SDK Location";
apoi setează variabila de mediu `ANDROID_HOME` (sau `ANDROID_SDK_ROOT`) la
acea cale.

## 1. Structura de build

Jocul are acum două ținte:

- **Web** (GitHub Pages): `npm run build` → `dist/` → publicat automat de
  `.github/workflows/pages.yml` la fiecare push pe `main`.
- **Android** (Capacitor): `dist/` e copiat în proiectul nativ din `android/`,
  care se compilează cu Gradle într-un fișier `.aab` (Android App Bundle) —
  formatul cerut de Play Store.

Fluxul complet, de fiecare dată când vrei o versiune nouă pe telefon:

```powershell
npm run build              # reconstruieste web-ul in dist/
npx cap sync android        # copiaza dist/ + pluginurile in proiectul Android
```

Ca să rulezi jocul pe un telefon/emulator conectat, direct din linia de comandă:

```powershell
npx cap run android
```

Sau deschide proiectul în Android Studio (mai comod pentru depanare):

```powershell
npx cap open android
```

## 2. Cheia de semnare (keystore) — o singură dată, pentru totdeauna

Play Store cere ca fiecare versiune să fie semnată cu **aceeași cheie**
(sau să folosești Play App Signing, vezi pasul 4). Generezi cheia o
singură dată, cu `keytool` (vine cu JDK-ul):

```powershell
keytool -genkeypair -v -keystore kawaii-release.keystore -alias kawaii -keyalg RSA -keysize 2048 -validity 10000
```

Ți se vor cere: o parolă pentru keystore, o parolă pentru cheie (poți pune
aceeași), și câteva date (nume, organizație — poți lăsa simplu, nu contează
pentru joc).

**FOARTE IMPORTANT — fă o copie de siguranță a fișierului `kawaii-release.keystore`
și a celor două parole, undeva în afara acestui calculator** (un manager de
parole, un drive extern, un cont cloud privat). **Dacă pierzi cheia, nu mai
poți publica actualizări la aceeași aplicație — Google nu o poate recupera
pentru tine.** Nu pune fișierul în Git (verifică `.gitignore`).

Recomand să pui fișierul undeva în afara acestui repo, de exemplu:
`C:\Users\ionap\keys\kawaii-release.keystore`.

## 3. Configurează semnarea în proiect

Creează fișierul `android/keystore.properties` (NU se va commite — e deja
în `.gitignore`) cu conținutul:

```properties
storeFile=C:\\Users\\ionap\\keys\\kawaii-release.keystore
storePassword=parola-ta-de-keystore
keyAlias=kawaii
keyPassword=parola-ta-de-cheie
```

Apoi editează `android/app/build.gradle`: chiar înainte de blocul
`android { ... }`, adaugă:

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

Iar în interiorul blocului `android { ... }`, adaugă (lângă `buildTypes`):

```gradle
signingConfigs {
    release {
        if (keystorePropertiesFile.exists()) {
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
    }
}
```

## 4. Construiește versiunea semnată (AAB)

```powershell
npm run build
npx cap sync android
cd android
.\gradlew.bat bundleRelease
```

Fișierul rezultat apare la:
`android\app\build\outputs\bundle\release\app-release.aab`

Acesta e fișierul pe care îl încarci pe Play Console.

## 5. Play Console — prima publicare

1. Intră pe [play.google.com/console](https://play.google.com/console) cu
   contul tău de dezvoltator.
2. **Creează aplicație** → nume: „Kawaii Invaders”, limba implicită română,
   tip: Joc, gratuit.
3. **Play App Signing** — Google îți va cere să activezi asta (e implicit
   acum pentru aplicații noi). Google păstrează o a doua cheie de semnare
   "de platformă" și re-semnează AAB-ul tău automat — asta e un plus de
   siguranță, nu înlocuiește nevoia de a-ți păstra propria cheie din pasul 2.
4. **Fișă Play Store** (Store listing):
   - Descriere scurtă și completă (poți traduce din `README.md`).
   - Icoană 512×512 — ai deja `resources/icon.png` (1024×1024, se
     redimensionează automat) sau `public/icon-512.png`.
   - Grafică din categoria "Feature graphic" (1024×500) — de creat separat,
     nu există încă în proiect.
   - Capturi de ecran (minim 2, pe orizontală — jocul e landscape).
5. **Chestionarul de clasificare a conținutului** (content rating) —
   răspunde sincer. Jocul e un shooter cute fără violență realistă, dar
   **are reclame și achiziții din aplicație** — ambele trebuie declarate aici.
   Declarația greșită e motiv de suspendare, nu doar de respingere.
6. **Formularul "Data safety"** — jocul în sine nu colectează date personale,
   dar **SDK-urile de monetizare o fac**, și asta trebuie declarat:
   - **AdMob** colectează **ID-ul de publicitate** (Advertising ID) și date
     aproximative de utilizare, pentru reclame. Permisiunea
     `com.google.android.gms.permission.AD_ID` e adăugată automat de SDK în
     manifest — o vezi în manifestul final după build.
   - **RevenueCat** procesează istoricul de cumpărături și un identificator de
     utilizator anonim.
   - Codul propriu al jocului: singura comunicare e cu serverul de relay de
     co-op (`kawaii-relay.onrender.com`), care transportă doar poziții și
     acțiuni de joc, fără identitate și fără date personale.

   Google publică liste oficiale „Data safety" pentru ambele SDK-uri — ia
   răspunsurile de acolo, nu din memorie, fiindcă se schimbă.
7. **Content → App content**: declară **că ai reclame** („Ads" → Yes) și
   **achiziții din aplicație**. La secțiunea de public țintă, dacă marchezi
   jocul ca fiind (și) pentru copii, intri sub politica *Families* — acolo
   reclamele trebuie servite din rețele certificate pentru familii și
   interstitialele au reguli în plus. Un joc „kawaii" e ușor citit ca fiind
   pentru copii, deci citește politica înainte de a răspunde.
8. **Upload**: la secțiunea "Testare" → "Testare internă" (Internal testing),
   creează o versiune și încarcă `app-release.aab`. Testează cu propriul cont
   Google înainte să treci la producție.
9. Când ești mulțumit, promovează versiunea din "Testare internă" spre
   "Producție" (Production) — Google mai face o rundă de verificare
   (de obicei ore, uneori 1-2 zile pentru aplicații noi).

## 5b. Monetizare: reclame (AdMob + UMP) și cumpărături (RevenueCat)

Toată configurarea trece prin **un singur fișier: `.env`** (gitignorat).
Pornește de la `.env.example`:

```bash
cp .env.example .env
```

Valorile implicite sunt **ID-urile de test ale Google**, deci jocul merge
imediat, fără cont AdMob. Nu testa niciodată pe ID-urile reale: e fraudă de
clicuri și îți poate suspenda contul.

### Unde apar reclamele

| Mod | Când | De ce acolo |
|---|---|---|
| Solo | La sfârșitul fiecărui meci, pe „Din nou" **și** pe „Meniu" | După ce jucătorul și-a văzut scorul. Dacă ar fi doar pe „Meniu", cine apasă mereu „Din nou" n-ar vedea niciodată reclamă. |
| Co-op | O dată, la intrarea în co-op, **înainte** de conectare | Nu la conectare: acolo cele două telefoane ar sta în reclame de lungimi diferite, gazda ar porni meciul singură, iar conexiunea proaspătă s-ar închide cu WebView-ul în fundal. |

Pauza minimă dintre reclame se reglează din `.env`
(`VITE_ADS_MIN_INTERVAL_S`, implicit `0` = la fiecare meci), fără să umbli
în cod.

### AdMob — pași

1. Creează aplicația în [AdMob](https://apps.admob.com) și o unitate de
   reclamă de tip **Interstitial**.
2. Pune în `.env`: `VITE_ADMOB_APP_ID` și `VITE_ADMOB_INTERSTITIAL_ID`.
3. `npm run sync:android` — duce App ID-ul în `AndroidManifest.xml`.
   JS-ul nu poate scrie în manifest, iar fără acel `<meta-data>` SDK-ul AdMob
   **crapă la pornirea aplicației**. De asta există pasul.
4. Abia la build-ul de release: `VITE_ADMOB_TESTING=false`.

### UMP (consimțământ) — nu are nimic de pus în `.env`

Formularul, textele și lista de parteneri se configurează în **AdMob →
Privacy & messaging**. Codul doar îl cere la pornire. Dacă jucătorul e în
SEE/UK și nu dă consimțământ, jocul trece automat pe reclame
nepersonalizate — altfel ar fi încălcare de politică, nu doar venit mai mic.

### RevenueCat + Play Console — pași

1. În **Play Console → Monetize → Products → In-app products**, creează un
   produs pentru fiecare `id` din [`src/monetize/catalog.js`](src/monetize/catalog.js).
   Tipul trebuie să se potrivească cu `repeatable`:
   - `repeatable: false` → **non-consumable** (fără reclame, skin-uri)
   - `repeatable: true` → **consumable** (monede, gemuri)
2. În RevenueCat: creează proiectul, leagă-l la Play Console (are nevoie de un
   **service account** Google Play — cheia aceea stă **doar** în RevenueCat,
   niciodată în `.env` sau în cod), apoi importă produsele.
   Marchează consumabilele ca *consumable* — altfel SDK-ul nu le consumă la
   Google și jucătorul nu le mai poate cumpăra a doua oară.
3. Pentru non-consumabile, creează câte un *entitlement* cu numele din câmpul
   `entitlement` al produsului.
4. Pune cheia **publică** de SDK pentru Android (începe cu `goog_`) în
   `.env`, la `VITE_REVENUECAT_API_KEY`. Cheia secretă (`sk_...`) nu intră
   niciodată în client.

Tabul **„💳 Magazin"** apare în shop-ul jocului doar când Billing e configurat
și Google a întors prețuri. Prețurile sunt mereu cele de la Google, în moneda
jucătorului — niciodată scrise în cod.

### Ce e secret și ce nu

`.env` **nu e un loc pentru secrete.** Vite inline-uiește orice variabilă
`VITE_*` în bundle, deci tot ce pui acolo ajunge în `dist/` și în APK, unde
oricine îl poate extrage și citi.

| Valoare | Secret? | Unde stă |
|---|---|---|
| ID-uri AdMob (app, unitate) | nu | `.env` |
| ID-uri de produs (SKU) | nu | `src/monetize/catalog.js` |
| Cheia publică RevenueCat (`goog_`) | nu | `.env` |
| Cheia secretă RevenueCat (`sk_`) | **da** | doar pe server |
| Service account Google Play (JSON) | **da** | doar în RevenueCat / pe server |
| Keystore-ul de semnare | **da** | doar local, vezi pasul 2 |

## 6. Versiuni ulterioare

De fiecare dată când modifici jocul și vrei o versiune nouă pe Play Store:

1. Crește numărul de versiune în `android/app/build.gradle`
   (`versionCode` — un întreg care trebuie să crească mereu; `versionName`
   — textul vizibil, ex. „1.1”).
2. `npm run build:android` (face build-ul web, scrie App ID-ul AdMob din
   `.env` în `android/admob.properties` și rulează `cap sync`)
3. `cd android && .\gradlew.bat bundleRelease`
4. Încarcă noul `.aab` în Play Console, într-o "Testare internă" nouă sau
   direct în producție.

## 7. Co-op online pe Android

Nu trebuie nimic special: jocul folosește `wss://` (WebSocket securizat)
către același server de relay ca versiunea web, iar Capacitor servește
pagina prin `https://localhost` — deci conexiunea e considerată sigură de
Android și funcționează din prima. Un jucător pe telefon și unul pe browser
pot juca împreună, cu același cod de cameră.

Notă: progresul salvat (monede, realizări) e local pe fiecare instalare —
versiunea Android și cea web au origini diferite, deci progresul lor e
separat. E normal și așteptat.

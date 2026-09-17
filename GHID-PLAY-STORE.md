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
   răspunde sincer; un shooter cute fără violență realistă, fără achiziții,
   fără reclame, iese de obicei cu rating pentru toate vârstele sau apropiat.
6. **Formularul "Data safety"** — jocul **nu colectează și nu partajează
   date personale**. Singura comunicare de rețea e cu serverul de relay de
   co-op (`kawaii-relay.onrender.com`), care transportă doar poziții și
   acțiuni de joc (fără identitate, fără date personale) — menționează asta
   dacă formularul întreabă despre comunicare în rețea.
7. **Content → App content**: declară că nu ai reclame, nu ai achiziții din
   aplicație (confirmat: jocul rămâne gratuit, fără monetizare).
8. **Upload**: la secțiunea "Testare" → "Testare internă" (Internal testing),
   creează o versiune și încarcă `app-release.aab`. Testează cu propriul cont
   Google înainte să treci la producție.
9. Când ești mulțumit, promovează versiunea din "Testare internă" spre
   "Producție" (Production) — Google mai face o rundă de verificare
   (de obicei ore, uneori 1-2 zile pentru aplicații noi).

## 6. Versiuni ulterioare

De fiecare dată când modifici jocul și vrei o versiune nouă pe Play Store:

1. Crește numărul de versiune în `android/app/build.gradle`
   (`versionCode` — un întreg care trebuie să crească mereu; `versionName`
   — textul vizibil, ex. „1.1”).
2. `npm run build && npx cap sync android`
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

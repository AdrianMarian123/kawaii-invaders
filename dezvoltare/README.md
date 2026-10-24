# Dezvoltare

Testele automate pentru jocul din rădăcina repo-ului. Toate pornesc jocul
**adevărat** — modulele din `../src/`, exact cele care ajung și în build —
peste un DOM fals (jsdom) sau, pentru co-op, în procese-copil separate.

## Cum le rulezi

O singură dată, din **rădăcina** repo-ului (nu de aici):

```bash
npm install
```

Apoi, tot din rădăcină:

```bash
npm test            # tot (~2 minute)
npm run test:unit   # doar cele rapide (~30 s)
npm run test:joc    # doar jocul rulat pe bune (~1,5 minute)
```

## Cum funcționează

- `mediu-joc.js` — pornește o instanță de joc: jsdom pentru DOM, petice pentru
  canvas/audio/localStorage, apoi `import('../src/main.js')` — chiar codul
  jocului, nu o felie de text extrasă din HTML.
- `copil-joc.js` — pentru scenariile cu doi jucători (co-op), pornește
  fiecare instanță în **procesul ei** (modulele ES se încarcă o singură dată
  pe proces) și vorbește cu ea prin mesaje IPC (`eval`, `click`).
- `window.__dbg` — o mică punte de test, definită permanent la finalul lui
  `../src/game/sim.js` (funcții + getteri/setteri către starea jocului).
  E adaos pur, nu schimbă comportamentul — dar fără ea testele n-ar avea cum
  să ajungă la variabilele din interiorul modulelor.

## Ce verifică fiecare

| Fișier | Ce verifică | Cât durează |
|---|---|---|
| `e2e.js` | rețeaua de co-op: adresa serverului, schimbul gazdă↔oaspete, mărimea instantaneului | rapid |
| `etapa1-test.js` | fiecare navă are viețile ei; când una moare, cealaltă continuă | rapid |
| `etapa2-test.js` | fiecare navă trage cu arma și nivelul ei | rapid |
| `etapa3-test.js` | cadourile de pe jos merg la nava care le-a atins | rapid |
| `reconect-test.js` | conexiunea se reface singură când cade (pornește un server local) | ~25 s |
| `smoke.js` | jocul chiar pornește și rulează, cu un singur jucător | ~20 s |
| `coop-smoke.js` | două instanțe reale ale jocului + server local; tot co-op-ul pe viu | ~40 s |

## Serverul de co-op

Serverul adevărat are repo-ul lui: <https://github.com/AdrianMarian123/kawaii-relay>.

Testele **îl folosesc pe el, dacă îl ai clonat alături** — adică `kawaii-relay` lângă
`kawaii-invaders`, ca în `D:\git\`. Așa verifici serverul care rulează de fapt pe Render,
nu o copie. `relay-path.js` se ocupă de alegere.

`server-relay.js` din dosarul ăsta e doar plasa de siguranță: pe un calculator fără clona
serverului, testele merg mai departe pe copie. La pornire îți spune pe care l-a folosit:

```
server de test: serverul adevărat (kawaii-relay)
server de test: copia din dosar
```

Dacă cele două ajung să difere, testele rulează pe cel **adevărat** și îți scriu un
avertisment cu comanda exactă de sincronizare. Nu mai poți verifica din greșeală o
versiune veche fără să afli.

## Invariantul de care atârnă scorul

Punctele intră mereu prin `addScore(ship, n)`, care adaugă în același timp la totalul
echipei și la partea navei. De aici:

```
player.score + p2.score === score
```

`coop-smoke.js` îl verifică după fiecare din cele zece arme, după rachete, cadouri și
bonusuri. **Dacă adaugi o cale nouă de daune și uiți să-i dai nava, testul pică imediat**
în loc să dea puncte greșitului în tăcere.

## Istoricul deciziilor

`PLAN-doi-jucatori.md` — cum s-a ajuns de la „P2 e a doua gură de tun a gazdei" la doi
jucători adevărați, ce s-a decis la fiecare pas și de ce. Merită citit înainte de a
schimba ceva la co-op.

## La publicare

Nu mai trebuie umblat manual la nicio versiune de cache: `npm run build`
produce fișiere cu hash în nume (ex. `index-Ab12Cd.js`), iar service worker-ul
(`src/sw.js`, construit de `vite-plugin-pwa`) își reconstruiește singur lista
de precache la fiecare build și își curăță singur cache-urile vechi.

Push pe `main` publică automat pe GitHub Pages, prin `.github/workflows/pages.yml`
(care rulează `npm run build` și publică `dist/`).

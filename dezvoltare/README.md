# Dezvoltare

Testele automate pentru jocul din rădăcina repo-ului. **Toate citesc direct
`../index.html`** — adică exact fișierul care se publică, nu o copie care poate rămâne
în urmă.

## Cum le rulezi

O singură dată, ca să aduci `ws` și `jsdom`:

```bash
cd dezvoltare
npm install
```

Apoi:

```bash
npm test            # tot (~2 minute)
npm run test:unit   # doar cele rapide (~30 s)
npm run test:joc    # doar jocul rulat pe bune (~1,5 minute)
```

## Ce verifică fiecare

| Fișier | Ce verifică | Cât durează |
|---|---|---|
| `e2e.js` | rețeaua de co-op: adresa serverului, schimbul gazdă↔oaspete, mărimea instantaneului | rapid |
| `etapa1-test.js` | fiecare navă are viețile ei; când una moare, cealaltă continuă | rapid |
| `etapa2-test.js` | fiecare navă trage cu arma și nivelul ei | rapid |
| `etapa3-test.js` | cadourile de pe jos merg la nava care le-a atins | rapid |
| `reconect-test.js` | conexiunea se reface singură când cade (pornește un server local) | ~25 s |
| `smoke.js` | jocul chiar pornește și rulează, cu un singur jucător | ~20 s |
| `coop-smoke.js` | două copii ale jocului + server local; tot co-op-ul pe viu | ~40 s |

`smoke.js` și `coop-smoke.js` încarcă jocul întreg într-un DOM fals (jsdom), apasă
butoanele și îl lasă să ruleze câteva secunde. Prind genul de eroare pe care testele pe
stub-uri o ratează. `coop-smoke.js` injectează o punte spre interiorul codului **doar în
copia din memorie** — fișierul de pe disc nu e atins.

## Serverul de co-op

`server-relay.js` e o copie a serverului, ținută aici **doar ca testele să poată porni
unul local**. Serverul adevărat are repo-ul lui:
<https://github.com/AdrianMarian123/kawaii-relay>. Dacă îl modifici acolo, adu copia și
aici, altfel testele verifică o versiune veche.

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

Se modifică `../index.html`, iar versiunea se urcă în **două** locuri, care trebuie să
rămână identice:

- `../index.html` → `<div class="verTag">ki-vNN</div>`
- `../sw.js` → `const C='ki-vNN';`

Fără asta, telefoanele care au jocul instalat servesc mai departe versiunea din cache.
Push pe `main` publică automat, prin `.github/workflows/pages.yml`.

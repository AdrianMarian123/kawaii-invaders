# Plan: doi jucători adevărați în co-op

Stare la data scrierii: versiunea publicată e **ki-v66**, la
https://adrianmarian123.github.io/kawaii-invaders/

---

## Ce e în folderul ăsta (dă-le pe toate la începutul conversației noi)

| Fișier | Ce e |
|---|---|
| `PLAN-doi-jucatori.md` | documentul ăsta |
| `index-ACTUAL-v66.html` | jocul așa cum e publicat acum — **aici se lucrează** |
| `index-ORIGINAL.html` | jocul nemodificat, dinainte de co-op — doar ca referință |
| `patch.py` | modificările făcute până acum, aplicate peste original |
| `e2e.js` | cele 76 de teste automate |
| `server-relay.js` | serverul de co-op (nu se atinge, merge deja pe Render) |

**Cum se lucrează de acum:** modifică direct `index-ACTUAL-v66.html`. Refacerea de față
înseamnă rescrieri de blocuri întregi, iar `patch.py` merge pe potriviri exacte de text —
ar deveni o piedică. Îl păstrăm doar ca istoric al modificărilor de până acum.

`e2e.js` citește implicit `build/index.html`; schimbă calea de sus a fișierului către
`index-ACTUAL-v66.html` (sau redenumește-l) și rulează `node e2e.js`. Are nevoie de
pachetul `ws` (`npm install ws`).

La final: fișierul modificat + `sw.js` cu versiunea mărită se pun în repo-ul
`kawaii-invaders` și se dă commit + push. Publicarea pe link e automată.

Codul jocului se modifică de acum **direct în `index-ACTUAL-v66.html`** (vezi tabelul de mai sus).



---

## Reguli decise de Adrian

| Întrebare | Decizie |
|---|---|
| Când un jucător moare | Celălalt continuă singur. Jocul se termină când mor amândoi. |
| Arme | Fiecare o ia pe a lui. Cadoul cules schimbă arma doar celui care l-a atins. |
| Scor și monede | **Separate**, fiecare al lui. Ecranul final are nevoie de două coloane. |

---

## De ce nu e un patch mic

În versiunea actuală P2 **nu e un jucător**, e o a doua gură de tun a gazdei:

```js
const origins=[{x:player.x+rvx(0,-player.r), y:player.y+rvy(0,-player.r)}];
for(let i=0;i<player.wingmen;i++) origins.push({x:player.x+(i===0?-44:44), y:player.y-2});
if(net.mode==='host'&&p2.active) origins.push({x:p2.x, y:p2.y-player.r});
for(const o of origins){
  if(player.weapon==='pulse'){ ... }        // ← arma și nivelul GAZDEI, pentru toate gurile
```

Iar viețile sunt un singur număr comun:

```js
function hitTeam(ship){
  if(ship.invuln>0||player.dead)return;
  ...
  player.lives--;                            // ← indiferent cine a fost lovit
  if(player.lives<=0){ player.dead=true; player.deadT=1.1; }
}
```

Și obiectele de pe jos le culege doar `player`, niciodată `p2`.

---

## Etape (în ordinea asta, fiecare testabilă separat)

### Etapa 1 — P2 devine navă adevărată ✅ GATA
Transformă `p2` din marcaj de poziție în obiect cu aceeași formă ca `player`:
`{x,y,r,lives,weapon,lvl:{},fireT,invuln,dead,deadT,shield,wingmen,missiles,burst,score,coins}`.

- `hitTeam(ship)` scade `ship.lives`, nu `player.lives`, și marchează `ship.dead`.
- Sfârșitul rundei: **doar** când `player.dead && (!p2.active || p2.dead)`.
- Nava moartă nu mai e desenată și nu mai e țintă pentru coliziuni.
- Locuri de atins: `hitTeam`, `hitPlayer`, ambele verificări `dist2(...,p2.x,p2.y)`,
  și condiția de game over.

**Test:** P2 pierde toate viețile → gazda joacă mai departe, scorul curge, runda nu se termină.

> **Făcut.** În plus față de plan: când moare *gazda* prima, tragerea era prinsă în
> `if(!player.dead){...}`, deci P2 rămânea viu dar fără gloanțe și runda se bloca la infinit.
> Blocul de tragere a ieșit din ramură (`fireAllShips` se cheamă necondiționat).
> Mesajele oaspetelui nu mai mișcă și nu mai declanșează nimic pentru un P2 mort.

### Etapa 2 — fiecare trage cu arma lui ✅ GATA
Blocul de tras trebuie să devină funcție de navă. Acum citește peste tot `player.weapon`,
`player.lvl`, `wl`, `player.r`. Extrage-l ca `function fireFrom(ship)` și cheamă-l o dată
pentru `player` și, dacă e cazul, o dată pentru `p2`.

Atenție: `origins` amestecă acum nava gazdei, catelușii ei **și** P2 — trebuie despărțite,
catelușii rămân la nava căreia îi aparțin.

**Test:** gazda cu laser și P2 cu scatter trag simultan cu proiectile diferite.

> **Făcut.** `fireFrom(ship,dt)` + `activeShips()` + `fireAllShips(dt)`.
> `updateLaser(ship,dt)` e și el pe navă, iar `beams` se golește o dată pe cadru în
> `fireAllShips`, ca să încapă fasciculele amândurora. `mkBolt(...,ship)` ia perforarea
> și raza de la nava care a tras. `playerFire(dt)` a rămas ca alias, să nu se rupă nimic.

### Etapa 3 — obiectele de pe jos, pe două nave ✅ GATA
Verificarea de culegere trebuie făcută pentru ambele nave, iar efectul aplicat celui care
a atins: arma din cadou merge la `ship.weapon`, moneda la `ship.coins` și `ship.score`.

> **Făcut.** `collect(p,ship)`; bucla de culegere trece prin `activeShips()`.
> `fireMissile(ship)` și `activateBurst(ship)` primesc și ele nava, iar butoanele
> oaspetelui acționează nava LUI, nu pe a gazdei. Anunțurile pentru P2 sunt prefixate „P2 · ".
> `ship.score`/`ship.coins` se adună **pe lângă** `score`/`runStats.coins` globale —
> etapa 4 doar comută afișarea pe ele, nimic nu trebuie rescris.

### Etapa 4 — scor și monede separate ✅ GATA
Două perechi de contoare. Instantaneul trimite ambele, plus un indicator `me` ca oaspetele
să știe care sunt ale lui. Ecranul final capătă două coloane. Punga se salvează în
`ki_coins` doar cu ce a strâns jucătorul respectiv.

> **Monedele: gata.** Fiecare pleacă acasă doar cu ce a cules el (`ship.coins`); ecranul
> final are un bloc cu două coloane, 💗 tu / 💙 prietenul. Mesajul `over` duce acum
> `co` (ale tale) și `co2` (ale lui).
>
> **Scorul: gata.** Fiecare sursă de daune își poartă acum nava, iar `damageEnemy` dă
> punctele celui care a tras. HUD-ul arată fiecăruia scorul LUI, ecranul final are patru
> chip-uri (scorul tău / al prietenului, monedele tale / ale lui), iar recordul din
> `ki_best` salvează partea ta, ca să rămână comparabil cu rundele solo.

### Etapa 5 — HUD și instantaneu ✅ GATA
HUD-ul arată două rânduri de inimioare. Instantaneul (`netSnapshot`) trebuie extins cu:
viețile fiecăruia, arma și nivelul fiecăruia, scorul și monedele fiecăruia, `dead` pentru
fiecare. Acum trimite un singur `lv`.

> **Făcut.** Instantaneul poartă `h` (nava gazdei) și `g` (nava oaspetelui), fiecare cu
> vieți, armă, nivel, `dead`, scor, monede, cateluși, scut, rachete, burst. Rolurile fiind
> fixe, oaspetele știe fără alt indicator că `g` e al lui. Instantaneul a crescut de la
> 17,0 la **17,2 KB** — departe de limita de 64.
>
> HUD-ul are două rânduri: 💗 tu, 💙 prietenul; al doilea apare doar în co-op, iar nava
> moartă arată 💀. Oaspetele primește și un anunț când e doborât el sau prietenul.
>
> Două teste din cele 76 vechi verificau explicit modelul cu viață comună
> (*„vieti + multiplicator ajung la oaspete"* aștepta ca oaspetele să vadă viețile gazdei).
> Le-am rescris pe semantica nouă și am adăugat verificări în jur — de aici 84 în loc de 76.
>
> **De reținut:** azi oaspetele încă nu-și vede propria stare —
> instantaneul trimite un singur `lv`, deci pe ecranul lui apar viețile gazdei, iar dacă
> nava lui moare el n-are de unde ști: continuă să zboare o navă fantomă. Gazda vede tot
> corect. Asta e exact ce rezolvă etapa 5, de-aia n-am extins `netSnapshot` pe jumătate.
>
> Tot acolo: `damageEnemy` înmulțește cu `player.dmgMul` global, deci gloanțele lui P2
> se bucură de bonusurile gazdei.

---

## Cum se împart punctele

Fiecare sursă de daune își poartă nava până la `damageEnemy(e,dmg,hx,hy,wpn,owner)`:

| Sursa | Cum ajunge nava acolo |
|---|---|
| gloanțe (3 locuri) | `mkBolt` pune nava pe glonț ca `b.own` |
| laser | `updateLaser(ship,dt)` |
| arc și storm | `doArc(...,ship)` / `doStorm(...,ship)` |
| racheta | `fireMissile(ship)` |
| ciocnire navă-inamic (2 locuri) | chiar nava lovită |

`addScore(ship,n)` adaugă în același timp la totalul echipei și la partea navei, deci
**invariantul `player.score + p2.score === score` e adevărat prin construcție**.
`coop-smoke.js` îl verifică după fiecare din cele 10 arme, după rachete, cadouri și bonusuri:
dacă vreo cale nouă uită să-și poarte nava, testul pică imediat, nu tăcut.

`damageEnemy` ia și `owner.dmgMul`, nu pe cel global — bonusurile de daune sunt ale navei.

**Deciziile lui Adrian, implementate:**

1. **Praguri proprii.** Fiecare urcă spre 100.000 (viață) și 150.000 (burst) pe scorul LUI.
   Pragurile stau în `ship.nextLife` / `ship.nextBurst`; variabilele globale au dispărut.
2. **Valul perfect** îl ia fiecare navă care a scăpat neatinsă, separat (`ship.hitThisWave`).
   Dacă scapă amândoi, iau amândoi.
3. **`ki_best`** salvează partea ta, și la gazdă și la oaspete.

---

## Ce să nu strici

- **Modul cu un singur jucător.** Tot ce ține de a doua navă trebuie să fie inactiv când
  `!p2.active`. Cel mai sigur: `const ships = p2.active ? [player,p2] : [player];` și bucle
  peste `ships`, ca la un jucător codul să facă exact ce făcea înainte.
- **Instantaneul sub 64 KB** — limita serverului. Acum e la 17,0 KB.
- Rulează `npm test` după fiecare etapă. Toate testele trebuie să treacă.

## Comenzi

O singură dată, ca să aduci `ws` și `jsdom`:

```bash
npm install
```

Apoi:

```bash
npm test              # tot: 189 de verificări
npm run test:unit     # rapid — e2e (87) + etapele 1/2/3 (9+18+15)
npm run test:joc      # lent (~1 min) — jocul real: solo (9) + co-op (54)
```

| Fișier | Ce verifică |
|---|---|
| `e2e.js` | cele 76 de teste de rețea de dinainte |
| `etapa1-test.js` | vieți, moarte și desen separate pentru P2 |
| `etapa2-test.js` | fiecare navă trage cu arma și nivelul ei |
| `etapa3-test.js` | cadourile merg la nava care le-a atins |
| `smoke.js` | jocul chiar pornește și rulează, cu un singur jucător |
| `coop-smoke.js` | două copii ale jocului + server real; toate cele 5 etape pe viu, plus invariantul punctelor |

`smoke.js` și `coop-smoke.js` încarcă jocul întreg într-un DOM fals (jsdom), apasă butoanele
și îl lasă să ruleze — prind exact felul de eroare pe care testele pe stub-uri o ratează.
`coop-smoke.js` injectează o punte `__dbg` spre interiorul codului, **doar în copia din
memorie**; fișierul de pe disc nu e atins.
La publicare, `index-ACTUAL-v66.html` se copiază peste `index.html` în repo-ul
`kawaii-invaders`, împreună cu `sw.js` (cu versiunea mărită), și se dă commit + push;
publicarea pe link e automată.

**Toate cele cinci etape sunt gata.** Înainte de publicare merită jucat pe două telefoane
adevărate: testele acoperă logica, dar nu și cum se simte jocul.

---

## v68 — aspectul inamicilor la oaspete

**Simptom (găsit de Adrian la valul 8):** gazda vedea asteroizi, oaspetele vedea pui.

**Cauza:** instantaneul trimitea doar `type`. Asteroizii sunt inamici cu `type:'star'` plus
steagul `asteroid:true`, iar desenul se ramifică pe steag, nu pe tip:
`if(e.asteroid){ drawAsteroid(e); continue; }`. Steagul nu călătorea, deci oaspetele cădea
pe `drawCritter('star')`. Bug vechi, dinainte de lucrul la doi jucători — s-a văzut abia
acum, când doi oameni se uită la același val în același timp.

Aceeași problemă o aveau, tăcut, și: inamicii aurii (fără aura), puii mici (fără coajă),
globulețele de brad, frunzele de toamnă și **bulele Hamster Ball** — pe care oaspetele nu
le-a văzut niciodată.

**Rezolvarea:** un singur câmp `fg`, o mască de biți cu steagurile care schimbă desenul
(rocă, coadă de cometă, gheață, auriu, pui mic, bulă, globuleț, frunză), trimis doar când
nu e zero. Culorile de globuleț și frunză merg alături. Ce nu se trimite — rotația rocii,
forma ei, crăpăturile bulei — se naște la oaspete din id, ca să fie stabil între cadre,
iar rotația se animă local (dacă venea prin rețea, ar fi sacadat la fiecare instantaneu).
Instantaneul a rămas la 17,2 KB.

**Testul care nu-l mai lasă să se întoarcă:** `coop-smoke.js` creează la gazdă câte un
exemplar din fiecare fel — asteroid, cometă, auriu, pui mic, inamic cu bulă, globuleț,
frunză, farfurie — și compară **ramura de desen** aleasă de gazdă cu cea aleasă de oaspete.
Nu compară câmpuri, ci ce se vede. Dacă cineva adaugă un steag de aspect nou și uită
instantaneul, testul pică.

---

## v69 — conexiunea care nu se mai reface

**Simptom (din testarea pe telefoane):** uneori nu se conectau, în ambele sensuri —
când gazda era pe iPhone, când era pe Android. Aparent aleatoriu.

**Cauza:** nu serverul. **Clientul nu reîncerca niciodată.** `ws.onclose` nu făcea nimic
dacă runda nu începuse:

```js
ws.onclose=()=>{ if(state==='playing')toast('Conexiune pierdută','#ff8fc7'); };
```

Iar telefonul închide conexiunea exact în momentul cel mai prost: **când ieși din
aplicație ca să trimiți codul pe WhatsApp.** Serverul vede conexiunea închisă, șterge
camera (`leaveRoom` → `rooms.delete`), dar ecranul gazdei arată în continuare
„cod gata · așteaptă prietenul". Prietenul intră cu codul, creează o cameră **nouă**,
goală, și așteaptă. Amândoi așteaptă, la infinit, fără niciun mesaj de eroare.

De aici și asimetria: pica cel care ieșea din aplicație ca să dea codul.

A doua cauză, mai blândă: serverul e pe plan gratuit și adoarme. Prima conexiune a zilei
pica pur și simplu, cu „serverul poate doarme — mai încearcă în ~30s", și trebuia să apeși
tu din nou.

**Rezolvarea**, toată în client (serverul n-a fost atins):

- reîncercare automată cu pas crescător, până la 6 secunde între încercări;
- la revenirea în aplicație (`visibilitychange`) reintrăm imediat în **aceeași cameră** —
  codul dat prietenului rămâne valabil;
- un `fetch` simplu spre server înainte de WebSocket, ca să trezească serverul adormit;
- `net.stopped` oprește reîncercările când apeși „înapoi", ca să nu rămână un ciclu în fundal;
- eroarea `timeout` de la server (cameră singură 10 minute) reface camera în loc s-o abandoneze.

**Dovada:** `reconect-test.js` rulează scenariul pe serverul de relay adevărat — gazda pierde
conexiunea, prietenul intră cu codul, trebuie să se găsească totuși. Pe versiunea publicată
înainte: **8 eșecuri din 14**. Cu reparația: **14 din 14**.

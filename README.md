# Kawaii Invaders

Joc arcade cu co-op online pentru doi jucători.

**Joacă aici:** https://adrianmarian123.github.io/kawaii-invaders/

## Cum jucați în doi

Unul apasă **CO-OP ONLINE → CREEAZĂ JOC** și primește un cod scurt (ex. `KWA1B2`).
Celălalt apasă **INTRĂ CU COD** și îl introduce. Jocul pornește singur.

Prima conectare a zilei poate dura ~1 minut: serverul de co-op stă pe un plan
gratuit care adoarme după 15 minute fără trafic. În timpul jocului nu adoarme.

## Serverul de co-op

Codul serverului: https://github.com/AdrianMarian123/kawaii-relay
Adresa: `wss://kawaii-relay.onrender.com` — deja scrisă în joc, nu trebuie configurat nimic.

Serverul nu simulează jocul. Gazda rulează tot jocul la ea și trimite ~18
instantanee pe secundă; oaspetele trimite doar poziția lui și acțiunile.
Serverul doar transportă mesajele între cei doi.

Dacă vrei alt server, ecranul CO-OP are un câmp pentru adresă. Poți folosi și
`?relay=adresa-ta` în link.

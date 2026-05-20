# Booking Rules

Jedan termin = jedna rezervacija.

Svi slotovi rade na:

- 00
- 15
- 30
- 45

Postoje 2 režima rezervacije:

## Fleksibilno

Korisnik bira:

- vremeOd
- vremeDo

Sistem proverava:

- dostupnost
- preklapanje
- preparation time
- busy intervale

## Fiksno

Korisnik bira:

- samo početak termina

Sistem automatski računa:

- vremeDo

na osnovu:

- trajanjeTermina

## Preparation Time

Preparation time:

- ulazi u busy intervale
- zaključava dodatni period
- sprečava preklapanje rezervacija

Preparation time:

- mora da se računa pri proveri dostupnosti
- mora da se vidi u busy intervalima

## Busy Intervals

Busy interval uključuje:

- aktivne rezervacije
- preparation time

Busy interval:

- blokira nove rezervacije

## Free Intervals

Korisnik mora videti:

- slobodne intervale
- zauzete intervale

## Zabranjeno

Ne sme postojati:

- dupla rezervacija
- preklapanje termina
- race condition problem
- rezervacija van radnog vremena

## Booking Service

Centralna booking logika mora biti u:

- bookingService.js

Ne sme postojati:

- duplirana booking logika
- booking logika u React komponentama
- booking logika direktno u controllerima

## Slot Pravila

Svi termini:

- moraju biti validirani
- moraju biti normalizovani
- moraju biti u koracima od 15 minuta

## API

Glavni endpoint:

GET /api/timeslots/playroom/:playroomId/available?datum=YYYY-MM-DD

Response:

- workingHours
- busyIntervals
- freeIntervals

## Production Pravila

Kritične booking operacije:

- koristiti transaction/session
- imati race condition zaštitu
- imati unique protection
- validirati sve inpute

## Frontend Pravila

Frontend mora prikazivati:

- busy intervale
- free intervale
- zaključane slotove
- preparation time efekte

UI mora biti:

- responsive
- brz
- jasan korisniku

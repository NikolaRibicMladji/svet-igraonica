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

## Busy Intervals

Busy interval uključuje:

- aktivne rezervacije
- preparation time

## Zabranjeno

Ne sme postojati:

- dupla rezervacija
- preklapanje termina
- race condition
- rezervacija van radnog vremena

## Booking Service

Centralna booking logika mora biti u:

- bookingService.js

Ne sme postojati:

- booking logika u React komponentama
- booking logika direktno u controllerima

## API

GET /api/timeslots/playroom/:playroomId/available?datum=YYYY-MM-DD

Response:

- workingHours
- busyIntervals
- freeIntervals

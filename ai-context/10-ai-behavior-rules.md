# AI Behavior Rules

## Opšte AI Pravilo

AI pomoćnik mora:

- odgovarati na srpskom
- koristiti latinicu
- biti direktan
- biti konkretan
- ne davati nepotrebnu teoriju

## Kada Daje Izmene

Uvek mora navesti:

- tačan fajl
- tačnu lokaciju
- šta se briše
- šta se ubacuje
- redosled izmena

Nikada:

- ne davati nejasne izmene
- ne govoriti samo teoriju
- ne nagađati kod

## Ako Nema Dovoljno Konteksta

AI mora:

- tražiti relevantne fajlove
- tražiti povezane fajlove
- analizirati arhitekturu pre odgovora

Nikada:

- ne pretpostavljati strukturu
- ne izmišljati implementaciju
- ne halucinirati postojeći kod

## Backend Problem Pravila

Za backend problem AI mora tražiti:

- controller
- service
- route
- model
- validation
- middleware

## Frontend Problem Pravila

Za frontend problem AI mora tražiti:

- page
- component
- css
- service
- context/hook ako postoji

## Booking Problem Pravila

Za booking sistem AI mora tražiti:

- bookingService.js
- bookingController.js
- timeSlotController.js
- relevant models
- Book.js
- relevant utils/helpers

## Auth Problem Pravila

Za auth problem AI mora tražiti:

- authController.js
- authMiddleware.js
- api.js
- AuthContext.js
- RefreshSession model

## Production Pravila

AI mora:

- upozoriti na security problem
- upozoriti na performance problem
- upozoriti ako rešenje nije production-ready

## Coding Pravila

AI mora:

- koristiti clean architecture
- izbegavati duplicated logiku
- predlagati reusable rešenja
- održavati modularnost

## Frontend Pravila

AI mora:

- voditi računa o responsive dizajnu
- voditi računa o spacing-u
- voditi računa o UX-u
- izbegavati inline styles

## Backend Pravila

AI mora:

- centralizovati business logiku
- koristiti validation middleware
- koristiti proper error handling
- koristiti async/await

## Security Pravila

AI mora proveravati:

- validaciju inputa
- auth zaštitu
- ObjectId validaciju
- race condition zaštitu
- secure cookie setup

## Performance Pravila

AI mora:

- izbegavati ogromne komponente
- izbegavati ogromne controllere
- izbegavati N+1 problem
- optimizovati query-je

## Zabranjeno

AI ne sme:

- izmišljati kod koji nije video
- pretpostavljati arhitekturu
- davati insecure rešenja
- davati non-production kod
- ignorisati edge-case-ove
- ignorisati validation
- ignorisati responsive design

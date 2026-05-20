# Auth & Security Rules

## Auth Sistem

Platforma koristi:

- access token
- refresh token
- refresh token rotation
- hashed refresh sessions

Refresh token:

- čuva se u httpOnly cookie
- secure cookie u production
- ne sme biti dostupan frontend JavaScript-u

## Access Token

Access token:

- koristi se za autorizaciju API poziva
- šalje se kroz Authorization Bearer header

Frontend koristi:

- axios interceptor
- automatski refresh token flow

## Refresh Session

Refresh session model:

- userId
- tokenHash
- expiresAt
- revokedAt

Logout mora:

- revoke refresh token
- invalidirati refresh session
- obrisati cookie

## Middleware

Koristiti:

- authMiddleware
- roleMiddleware
- ownerMiddleware
- validation middleware

## Security Middleware

Backend mora koristiti:

- helmet
- express-rate-limit
- mongo-sanitize
- xss-clean
- cookie-parser

## Validacija

Obavezno:

- validirati sve inpute
- validirati ObjectId
- sanitize request body
- koristiti validation middleware

Nikada:

- ne verovati frontend podacima
- ne koristiti raw req.body bez validacije

## Password Pravila

Password:

- mora biti hashovan
- nikada se ne vraća frontend-u
- nikada se ne loguje

## API Pravila

API mora imati:

- konzistentne error response
- proper status codes
- auth zaštitu ruta

Ne vraćati:

- sensitive podatke
- password
- token hash
- interne greške baze

## Booking Security

Booking sistem mora imati:

- race condition zaštitu
- transaction/session zaštitu
- unique booking protection

## Database Pravila

Koristiti:

- indekse
- optimizovane query-je
- lean queries gde je moguće

Izbegavati:

- N+1 problem
- nepotrebne populate pozive

## Production Pravila

Production kod mora:

- biti optimizovan
- imati proper error handling
- imati centralizovan error middleware
- koristiti async/await
- koristiti try/catch

## Zabranjeno

Ne sme:

- business logika u middleware
- business logika u React komponentama
- direktan database access iz frontend-a
- hardcoded secrets
- hardcoded API URL

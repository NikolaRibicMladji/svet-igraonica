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

## Middleware

Koristiti:

- authMiddleware
- roleMiddleware
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

Nikada:

- ne verovati frontend podacima

## Production Pravila

Production kod mora:

- imati proper error handling
- koristiti async/await
- koristiti try/catch

## Zabranjeno

Ne sme:

- hardcoded secrets
- insecure cookies
- otvoren CORS
- vraćanje sensitive podataka

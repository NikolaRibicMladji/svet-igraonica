# Deployment & Production Rules

## Deploy Platforme

Frontend:

- Vercel

Backend:

- Render

## Frontend Env

Frontend koristi:

- REACT_APP_API_URL

Frontend:

- koristi axios
- koristi withCredentials true
- koristi Authorization Bearer token

## Backend Env

Backend koristi:

- MONGO_URI
- JWT_SECRET
- REFRESH_TOKEN_SECRET
- NODE_ENV

Nikada:

- ne hardcodovati secrets
- ne commitovati .env fajlove

## Backend Start

Backend start:

```bash
node server.js
```

Frontend start:

```bash
npm start
```

## Auth Production Pravila

Auth koristi:

- access token
- refresh token cookie
- refresh token rotation

Refresh token:

- httpOnly cookie
- secure cookie u production
- sameSite pravilno podešen

## Cookie Pravila

Production cookie:

- secure: true
- httpOnly: true

Development:

- secure false gde je potrebno lokalno

## CORS Pravila

CORS:

- mora dozvoliti frontend domen
- credentials moraju biti enabled

Koristiti:

```js
credentials: true;
```

Ne koristiti:

- wildcard origin sa credentials

## Security Middleware

Backend mora koristiti:

- helmet
- express-rate-limit
- mongo-sanitize
- xss-clean

## Production Pravila

Production kod:

- mora imati proper logging
- mora imati centralizovan error handling
- mora biti optimizovan

## Database Pravila

Mongo konekcija:

- koristiti proper error handling
- koristiti reconnect strategiju gde ima smisla

## Frontend Production Pravila

Frontend:

- ne sme imati hardcoded API URL
- ne sme imati debug console logove
- mora koristiti environment variables

## Backend Production Pravila

Backend:

- ne sme vraćati stack trace u production
- ne sme leak-ovati sensitive podatke
- mora koristiti validation middleware

## Zabranjeno

Ne sme:

- hardcoded secrets
- hardcoded API URL
- disabled security middleware
- open CORS policy
- insecure cookies
- raw production errors

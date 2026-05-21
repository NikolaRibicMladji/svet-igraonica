# API & Deployment Rules

## API Response

Uspešan response:

{
"success": true,
"message": "Poruka",
"data": {}
}

Error response:

{
"success": false,
"message": "Greška",
"errors": []
}

## Status Codes

Koristiti:

- 200 OK
- 201 Created
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict
- 422 Validation Error
- 500 Internal Server Error

## Frontend Deploy

Frontend deploy:

- Vercel

## Backend Deploy

Backend deploy:

- Render

## Environment Variables

Backend:

- MONGO_URI
- JWT_SECRET
- REFRESH_TOKEN_SECRET
- NODE_ENV

Frontend:

- REACT_APP_API_URL

## Cookie Pravila

Production cookie:

- secure: true
- httpOnly: true
- sameSite pravilno podešen

## CORS Pravila

Koristiti:

credentials: true

Ne koristiti:

- wildcard origin sa credentials

## Security Middleware

Backend mora koristiti:

- helmet
- express-rate-limit
- mongo-sanitize
- xss-clean
- cookie-parser

## Production Pravila

Production kod mora:

- imati centralizovan error handling
- koristiti validation middleware
- ne vraćati stack trace
- ne leak-ovati sensitive podatke

## Zabranjeno

Ne sme:

- hardcoded secrets
- open CORS policy
- insecure cookies
- raw production errors
- hardcoded API URL

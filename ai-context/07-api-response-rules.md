# API & Response Rules

## Opšta API Pravila

API mora biti:

- konzistentan
- predvidiv
- siguran
- validiran
- production-ready

Svi endpointi:

- koriste validation middleware
- imaju proper status codes
- imaju konzistentan response format

## Response Format

Uspešan response:

```json
{
  "success": true,
  "message": "Poruka",
  "data": {}
}
```

Error response:

```json
{
  "success": false,
  "message": "Greška",
  "errors": []
}
```

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

Ne koristiti:

- random status kodove
- 200 za error response

## Validation Pravila

Validation mora proveravati:

- body
- params
- query

Validation:

- mora biti pre controllera
- mora vraćati jasne error poruke

## Booking Endpoint Pravila

Booking endpoint:

- mora proveravati preklapanje
- mora proveravati availability
- mora proveravati preparation time
- mora koristiti transaction/session

## Auth Endpoint Pravila

Auth endpointi:

- ne vraćaju sensitive podatke
- koriste secure cookie
- koriste refresh rotation

## Error Handling

Sve greške:

- prolaze kroz centralizovan error middleware

Ne vraćati:

- stack trace
- Mongo interne greške
- sensitive podatke

## Database Pravila

Koristiti:

- optimized queries
- indexes
- lean() gde ima smisla

Izbegavati:

- N+1 problem
- nepotrebne populate pozive

## Frontend API Pravila

Frontend koristi:

- centralizovan api.js
- axios instance
- interceptor
- withCredentials true

API pozivi:

- ne smeju biti razbacani svuda

## Loading & Error State

Frontend mora imati:

- loading state
- error state
- retry gde ima smisla

## Zabranjeno

Ne sme:

- direktni fetch svuda
- raw req.body korišćenje
- nevalidirani input
- nekonzistentni response
- duplicated API logic

# Database & Models Rules

## MongoDB

Koristi:

- MongoDB
- Mongoose

## Model Pravila

Svi modeli moraju:

- imati validaciju
- imati proper indekse
- koristiti semantic naming

## Booking Model

Booking mora imati:

- playroomId
- roditeljId
- datum
- vremeOd
- vremeDo
- status

## Booking Zaštita

Ne sme postojati:

- dupla rezervacija
- preklapanje termina

## Index Pravila

Obavezni indeksi:

- booking pretrage
- datum
- playroomId
- userId
- status

## Query Pravila

Koristiti:

- lean()
- select()
- optimized queries

Izbegavati:

- N+1 query problem
- nepotrebne populate pozive

## Scalability

Kod mora biti:

- modularan
- lako proširiv
- lako održiv
# Database & Performance Rules

## Database Pravila

Koristi:

- MongoDB
- Mongoose

Svi modeli moraju:

- imati validaciju
- imati proper indekse
- koristiti semantic naming

## Index Pravila

Obavezno koristiti indekse za:

- booking pretrage
- datume
- playroomId
- userId
- aktivne rezervacije

Booking sistem mora biti optimizovan za:

- proveru dostupnosti
- busy intervale
- free intervale
- owner dashboard

## Query Pravila

Koristiti:

- lean() gde nije potreban full mongoose document
- select() za ograničavanje podataka
- pagination gde ima smisla

Izbegavati:

- N+1 query problem
- nepotrebne populate pozive
- vraćanje ogromnih datasetova

## Booking Performance

Booking sistem mora:

- biti brz
- sprečiti race condition
- koristiti transaction/session za kritične operacije

Busy interval kalkulacije:

- moraju biti optimizovane
- ne smeju imati nepotrebne petlje
- ne smeju raditi ogromne query-je

## Frontend Performance

Frontend mora:

- izbegavati nepotrebne rerender-e
- koristiti memoization gde ima smisla
- koristiti lazy loading gde ima smisla

Ne raditi:

- ogromne useEffect blokove
- nepotrebne API pozive
- duplicated fetch logiku

## API Performance

API mora:

- vraćati samo potrebne podatke
- koristiti pagination
- koristiti filtering
- koristiti optimized queries

## File & Image Pravila

Slike:

- optimizovane
- kompresovane
- responsive

Ne uploadovati:

- ogromne fajlove
- neoptimizovane slike

## Scalability Pravila

Kod mora biti:

- modularan
- lako proširiv
- lako održiv

Business logika:

- centralizovana
- reusable

## Zabranjeno

Ne sme:

- duplicated database logika
- ogromni query blokovi u controllerima
- business logika u modelima
- nepotrebni populate svuda
- vraćanje svih podataka bez limita
- hardcoded query logika

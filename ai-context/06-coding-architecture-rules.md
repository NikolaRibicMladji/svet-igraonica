# Coding & Architecture Rules

## Opšta Pravila

Sav kod mora biti:

- production-ready
- čist
- modularan
- skalabilan
- optimizovan
- lako održiv

Koristiti:

- async/await
- try/catch
- semantic naming
- reusable funkcije
- clean architecture

## Backend Arhitektura

Backend koristi:

- controllers
- services
- models
- middleware
- validations
- utils

## Controller Pravila

Controller:

- ne sme sadržati business logiku
- mora biti tanak
- poziva service layer
- vraća response

Controller NE SME:

- imati ogromnu logiku
- imati kompleksne booking provere
- imati direktne Mongo kompleksne operacije

## Service Pravila

Business logika ide u:

- services/

Booking logika:

- mora biti centralizovana
- mora biti u bookingService.js

Service layer:

- radi validacije poslovnih pravila
- radi rezervacije
- radi kalkulacije
- radi booking provere

## Validation Pravila

Validation:

- mora postojati pre controllera
- mora validirati:
  - body
  - params
  - query

Koristiti:

- centralized validation middleware

## Model Pravila

Model:

- ne sme sadržati ogromnu business logiku
- može imati helper metode
- može imati indekse

Koristiti:

- mongoose indexes
- lean queries gde ima smisla

## Utils Pravila

Utils:

- reusable helper funkcije
- bez business state-a
- bez database logike

## Frontend Arhitektura

Frontend koristi:

- pages
- components
- services
- hooks
- context
- utils

## Page Pravila

Page:

- organizuje UI
- ne sme imati ogromnu business logiku

## Component Pravila

Komponente:

- modularne
- reusable
- male gde je moguće

Komponenta NE SME:

- imati ogromne useEffect blokove
- imati booking business logiku
- imati direktan API kod svuda

## Service Pravila Frontend

API pozivi:

- samo kroz services

Koristiti:

- centralizovan axios instance
- interceptor
- auth handling

## Context Pravila

Context:

- samo za global state
- ne koristiti za sve

Izbegavati:

- ogroman context
- previše rerender-a

## Error Handling

Sve mora imati:

- proper error handling
- user-friendly poruke
- centralizovan error format

## Response Pravila

API response mora biti:

- konzistentan
- predvidiv
- jasan

## Performance Pravila

Izbegavati:

- duplicated logic
- duplicated API calls
- unnecessary rerenders
- massive components
- nested callback hell

Koristiti:

- memoization gde ima smisla
- pagination gde ima smisla
- lazy loading gde ima smisla

## Zabranjeno

Ne sme:

- business logika u controllerima
- business logika u React komponentama
- hardcoded vrednosti
- duplirana logika
- inline styles svuda
- direktni DB access van service layer-a
- ogromni fajlovi ako mogu da se podele

## Production Pravila

Production kod:

- mora biti optimizovan
- mora imati validaciju
- mora imati security zaštitu
- mora imati clean structure
- mora biti skalabilan

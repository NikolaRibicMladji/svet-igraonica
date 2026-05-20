# Frontend UI/UX Rules

## Opšta Pravila

Frontend mora biti:

- responsive
- profesionalan
- moderan
- brz
- čist
- production-ready

UI mora dobro raditi na:

- telefonu
- tabletu
- desktopu

## CSS Pravila

CSS:

- ide u posebne fajlove
- ne koristiti inline style osim ako baš mora
- koristiti konzistentan spacing
- ništa ne sme biti zalepljeno uz ivice

## Responsive Pravila

Obavezno:

- mobile-first pristup
- fleksibilni grid/layout
- responsive typography
- responsive buttons
- responsive modali

## Komponente

Komponente moraju:

- biti modularne
- imati jasnu odgovornost
- ne biti ogromne
- biti reusable gde ima smisla

Ne stavljati:

- business logiku u UI komponentu
- ogromne useEffect blokove
- previše state logike u jednoj komponenti

## Stranice

Glavne stranice:

- Home
- Playrooms
- PlayroomDetails
- Book
- MyBookings
- OwnerDashboard
- AdminPanel
- CreatePlayroom
- ManagePlayroom

## Booking UI

Booking UI mora:

- jasno prikazivati slobodne termine
- jasno prikazivati zauzete termine
- prikazivati preparation time efekte
- biti brz i intuitivan

Korisnik mora odmah razumeti:

- šta je slobodno
- šta je zauzeto
- šta može kliknuti
- šta ne može

## Forme

Sve forme moraju imati:

- validaciju
- jasne error poruke
- loading state
- disabled state tokom submit-a

## Toast Sistem

Toast poruke:

- moraju biti jasne
- ne smeju spamovati korisnika
- koristiti centralizovani ToastContext

## Modal Pravila

Modali:

- moraju biti responsive
- zatvaranje na ESC
- zatvaranje klikom van modala
- proper scroll handling

## API Pozivi

Frontend:

- ne sme direktno koristiti fetch svuda
- koristiti centralizovane services
- koristiti axios instance

## Auth UI

Auth flow:

- automatski refresh token
- protected routes
- proper loading state
- proper logout flow

## Performance Pravila

Izbegavati:

- nepotrebne rerender-e
- ogromne komponente
- duplirane API pozive
- previše state-a

Koristiti:

- memoizaciju gde ima smisla
- lazy loading gde ima smisla
- reusable hooks

## Zabranjeno

Ne sme:

- inline CSS svuda
- hardcoded boje svuda po komponentama
- business logika u page komponentama
- direktni API pozivi iz mnogo mesta
- nekonzistentan spacing
- loš mobile UI

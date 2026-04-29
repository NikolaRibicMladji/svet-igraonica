import React from "react";

const BookingPolicy = () => {
  return (
    <div className="container page-content">
      <h1>Pravila rezervacije</h1>

      <h2>Kreiranje rezervacije</h2>
      <p>
        Rezervacija termina se vrši putem platforme i smatra se validnom nakon
        uspešne potvrde.
      </p>

      <h2>Odgovornost za termin</h2>
      <p>
        Korisnik je odgovoran za tačnost unetih podataka i dolazak u
        rezervisanom terminu.
      </p>

      <h2>Otkazivanje</h2>
      <p>Otkazivanje rezervacije zavisi od pravila konkretne igraonice.</p>

      <h2>Kašnjenje</h2>
      <p>
        U slučaju kašnjenja, igraonica zadržava pravo da skrati ili otkaže
        termin.
      </p>

      <h2>Napomena</h2>
      <p>
        Platforma ne garantuje dostupnost termina u realnom vremenu u slučaju
        tehničkih problema.
      </p>
    </div>
  );
};

export default BookingPolicy;

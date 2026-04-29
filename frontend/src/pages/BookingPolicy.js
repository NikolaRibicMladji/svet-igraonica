import React from "react";

const BookingPolicy = () => {
  return (
    <div className="container page-content">
      <h1>Pravila rezervacije</h1>

      <p>Rezervacija termina važi tek nakon potvrde.</p>

      <p>Otkazivanje rezervacije zavisi od pravila konkretne igraonice.</p>

      <p>Platforma ne garantuje dostupnost termina u realnom vremenu.</p>

      <p>
        Korisnik je dužan da se pojavi u zakazano vreme ili otkaže rezervaciju.
      </p>
    </div>
  );
};

export default BookingPolicy;

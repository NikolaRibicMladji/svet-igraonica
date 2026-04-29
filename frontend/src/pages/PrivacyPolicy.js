import React from "react";

const PrivacyPolicy = () => {
  return (
    <div className="container page-content">
      <h1>Politika privatnosti</h1>

      <p>
        Platforma „Svet Igraonica“ prikuplja i obrađuje lične podatke korisnika
        isključivo u svrhu omogućavanja rezervacija termina i komunikacije
        između korisnika i igraonica.
      </p>

      <h2>Koje podatke prikupljamo</h2>
      <p>Prikupljamo sledeće podatke:</p>
      <ul>
        <li>Ime i prezime</li>
        <li>Email adresu</li>
        <li>Broj telefona</li>
        <li>Podatke o rezervacijama</li>
      </ul>

      <h2>Svrha obrade podataka</h2>
      <p>Podaci se koriste isključivo za:</p>
      <ul>
        <li>kreiranje i upravljanje korisničkim nalogom</li>
        <li>rezervaciju termina</li>
        <li>komunikaciju sa igraonicama</li>
        <li>slanje obaveštenja vezanih za rezervaciju</li>
      </ul>

      <h2>Deljenje podataka</h2>
      <p>
        Podaci se ne prodaju niti ustupaju trećim licima. Podaci se dele
        isključivo sa igraonicom kod koje je izvršena rezervacija, u meri
        neophodnoj za realizaciju usluge.
      </p>

      <h2>Čuvanje podataka</h2>
      <p>
        Podaci se čuvaju dok postoji korisnički nalog ili dok je to neophodno za
        izvršenje usluge i zakonske obaveze.
      </p>

      <h2>Vaša prava</h2>
      <p>Korisnik ima pravo da:</p>
      <ul>
        <li>zatraži uvid u svoje podatke</li>
        <li>zatraži ispravku podataka</li>
        <li>zatraži brisanje naloga</li>
      </ul>

      <h2>Kolačići</h2>
      <p>
        Platforma koristi kolačiće isključivo u tehničke svrhe (autentifikacija
        korisnika i rad sistema).
      </p>

      <h2>Kontakt</h2>
      <p>
        Za sva pitanja u vezi sa privatnošću možete nas kontaktirati na:{" "}
        <strong>TVOJ EMAIL</strong>
      </p>
    </div>
  );
};

export default PrivacyPolicy;

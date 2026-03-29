import React from "react";
import { Link } from "react-router-dom";
import "../styles/Home.css";

const Home = () => {
  return (
    <>
      {/* Hero sekcija */}
      <section className="hero">
        <div className="container hero-container">
          <div className="hero-content">
            <h1>
              Najbolja mesta za
              <br />
              igru vašeg deteta
            </h1>
            <p>
              Otkrijte najlepše dečije igraonice u vašem gradu. Rezervišite
              termin za samo nekoliko klikova.
            </p>
            <div className="hero-buttons">
              <Link to="/playrooms" className="btn btn-primary">
                Potraži igraonicu →
              </Link>
              <Link to="/register" className="btn btn-outline">
                Registruj igraonicu
              </Link>
            </div>
          </div>
          <div className="hero-image">
            <div className="hero-emoji">🎈</div>
          </div>
        </div>
      </section>

      {/* Kako radi sekcija */}
      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title">Kako funkcioniše?</h2>
          <div className="steps">
            <div className="step-card">
              <div className="step-number">1</div>
              <div className="step-icon">🔍</div>
              <h3>Pronađi igraonicu</h3>
              <p>Pretraži igraonice po gradu, ceni i pogodnostima</p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-icon">📅</div>
              <h3>Izaberi termin</h3>
              <p>Pogledaj slobodne termine i izaberi onaj koji ti odgovara</p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-icon">✅</div>
              <h3>Rezerviši i plaćaj</h3>
              <p>Rezerviši termin i plati online - bez čekanja i poziva</p>
            </div>
          </div>
        </div>
      </section>

      {/* Zašto mi sekcija */}
      <section className="why-us">
        <div className="container">
          <h2 className="section-title">Zašto roditelji biraju nas?</h2>
          <div className="features">
            <div className="feature">
              <div className="feature-icon">⚡</div>
              <h3>Brzo i jednostavno</h3>
              <p>Rezerviši termin za manje od 2 minuta</p>
            </div>
            <div className="feature">
              <div className="feature-icon">🔒</div>
              <h3>Sigurno plaćanje</h3>
              <p>Sve transakcije su bezbedne i zaštićene</p>
            </div>
            <div className="feature">
              <div className="feature-icon">📱</div>
              <h3>Prilagođeno svim uređajima</h3>
              <p>Radi savršeno na telefonu, tabletu i računaru</p>
            </div>
            <div className="feature">
              <div className="feature-icon">⭐</div>
              <h3>Verifikovane igraonice</h3>
              <p>Sve igraonice prolaze našu proveru kvaliteta</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA sekcija */}
      <section className="cta">
        <div className="container cta-container">
          <h2>Spremni za avanturu?</h2>
          <p>
            Pridružite se hiljadama zadovoljnih roditelja koji koriste Svet
            Igraonica
          </p>
          <Link to="/playrooms" className="btn btn-primary">
            Započni potragu →
          </Link>
        </div>
      </section>
    </>
  );
};

export default Home;

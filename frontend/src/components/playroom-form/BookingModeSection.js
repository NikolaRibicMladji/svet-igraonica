import React from "react";

const BookingModeSection = ({ formData = {}, handleChange }) => {
  const rezimRezervacije = formData.rezimRezervacije || "";
  const trajanjeTermina = formData.trajanjeTermina || 60;
  const vremePripremeTermina = formData.vremePripremeTermina ?? 0;

  const handleModeChange = (value) => {
    handleChange({
      target: {
        name: "rezimRezervacije",
        value,
      },
    });
  };

  return (
    <div className="form-section rezimRezervacije-error" tabIndex={-1}>
      <h3>⏰ Način rezervacije</h3>

      <div className="form-group">
        <div id="booking-mode-label" className="form-label">
          Režim rada igraonice *
        </div>

        <div
          className="booking-mode-options"
          role="radiogroup"
          aria-labelledby="booking-mode-label"
        >
          <label className="booking-mode-card">
            <input
              type="checkbox"
              name="rezimRezervacije"
              checked={formData.rezimRezervacije === "fleksibilno"}
              onChange={() =>
                handleChange({
                  target: {
                    name: "rezimRezervacije",
                    value: "fleksibilno",
                  },
                })
              }
            />

            <div className="booking-mode-text">
              <div className="booking-mode-title">Fleksibilno</div>
              <div className="booking-mode-subtitle">
                (korisnik bira vreme od-do)
              </div>
            </div>
          </label>

          <label className="booking-mode-card">
            <input
              type="checkbox"
              name="rezimRezervacije"
              checked={formData.rezimRezervacije === "fiksno"}
              onChange={() =>
                handleChange({
                  target: {
                    name: "rezimRezervacije",
                    value: "fiksno",
                  },
                })
              }
            />

            <div className="booking-mode-text">
              <div className="booking-mode-title">Fiksni termini</div>
              <div className="booking-mode-subtitle">
                (korisnik bira samo početak termina)
              </div>
            </div>
          </label>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="trajanje-termina">Trajanje jednog termina</label>

        <select
          id="trajanje-termina"
          name="trajanjeTermina"
          value={trajanjeTermina}
          onChange={handleChange}
          disabled={rezimRezervacije !== "fiksno"}
          className={rezimRezervacije !== "fiksno" ? "disabled-select" : ""}
        >
          <option value={60}>60 minuta</option>
          <option value={90}>90 minuta</option>
          <option value={120}>120 minuta</option>
          <option value={150}>150 minuta</option>
          <option value={180}>180 minuta</option>
          <option value={210}>210 minuta</option>
          <option value={240}>240 minuta</option>
          <option value={270}>270 minuta</option>
          <option value={300}>300 minuta</option>
        </select>

        {rezimRezervacije !== "fiksno" && (
          <small className="disabled-hint">
            Dostupno samo za fiksne termine
          </small>
        )}
      </div>
      <div className="form-group">
        <label htmlFor="vreme-pripreme-termina">
          Vremenski interval za sređivanje igraonice
        </label>

        <select
          id="vreme-pripreme-termina"
          name="vremePripremeTermina"
          value={vremePripremeTermina}
          onChange={handleChange}
        >
          <option value={0}>Bez pauze</option>
          <option value={15}>15 minuta</option>
          <option value={30}>30 minuta</option>
          <option value={45}>45 minuta</option>
          <option value={60}>60 minuta</option>
        </select>
      </div>
    </div>
  );
};

export default BookingModeSection;

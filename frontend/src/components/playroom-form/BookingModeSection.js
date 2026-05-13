import React from "react";

const BookingModeSection = ({ formData, handleChange }) => {
  return (
    <div className="form-section rezimRezervacije-error" tabIndex="-1">
      <h3>⏰ Način rezervacije</h3>

      <div className="form-group">
        <label>Režim rada igraonice *</label>

        <div className="booking-mode-options">
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
        <label>Trajanje jednog termina</label>

        <select
          name="trajanjeTermina"
          value={formData.trajanjeTermina}
          onChange={handleChange}
          disabled={formData.rezimRezervacije !== "fiksno"}
          className={
            formData.rezimRezervacije !== "fiksno" ? "disabled-select" : ""
          }
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

        {formData.rezimRezervacije !== "fiksno" && (
          <small className="disabled-hint">
            Dostupno samo za fiksne termine
          </small>
        )}
      </div>
      <div className="form-group">
        <label>Vremenski interval za sređivanje igraonice</label>
        <select
          name="vremePripremeTermina"
          value={formData.vremePripremeTermina}
          onChange={handleChange}
        >
          <option value={0}>Bez pauze</option>
          <option value={5}>5 minuta</option>
          <option value={10}>10 minuta</option>
          <option value={15}>15 minuta</option>
          <option value={20}>20 minuta</option>
          <option value={25}>25 minuta</option>
          <option value={30}>30 minuta</option>
          <option value={35}>35 minuta</option>
          <option value={40}>40 minuta</option>
          <option value={45}>45 minuta</option>
          <option value={50}>50 minuta</option>
          <option value={55}>55 minuta</option>
          <option value={60}>60 minuta</option>
        </select>
      </div>
    </div>
  );
};

export default BookingModeSection;

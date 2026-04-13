import React from "react";

const BookingModeSection = ({ formData, handleChange }) => {
  return (
    <div className="form-section">
      <h3>⏰ Način rezervacije</h3>

      <div className="form-group">
        <label>Režim rada igraonice</label>
        <select
          name="rezimRezervacije"
          value={formData.rezimRezervacije}
          onChange={handleChange}
        >
          <option value="fleksibilno">Fleksibilno (korisnik bira od-do)</option>
          <option value="fiksno">
            Fiksni termini (korisnik bira samo početak)
          </option>
        </select>
      </div>

      {formData.rezimRezervacije === "fiksno" && (
        <div className="form-group">
          <label>Trajanje jednog termina</label>
          <select
            name="trajanjeTermina"
            value={formData.trajanjeTermina}
            onChange={handleChange}
          >
            <option value={15}>15 minuta</option>
            <option value={30}>30 minuta</option>
            <option value={45}>45 minuta</option>
            <option value={60}>60 minuta</option>
            <option value={90}>90 minuta</option>
            <option value={120}>120 minuta</option>
            <option value={150}>150 minuta</option>
            <option value={180}>180 minuta</option>
          </select>
        </div>
      )}
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
        </select>
      </div>
    </div>
  );
};

export default BookingModeSection;

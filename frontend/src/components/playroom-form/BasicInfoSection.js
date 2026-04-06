import React from "react";

const BasicInfoSection = ({ formData, handleChange, errors }) => {
  return (
    <div className="form-section">
      <h3>📋 Osnovni podaci</h3>

      <div className="form-group">
        <label>Naziv igraonice *</label>
        <input
          type="text"
          name="naziv"
          value={formData.naziv}
          onChange={handleChange}
          className={errors.naziv ? "input-error" : ""}
        />
        {errors.naziv && <div className="field-error">{errors.naziv}</div>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Adresa *</label>
          <input
            type="text"
            name="adresa"
            value={formData.adresa}
            onChange={handleChange}
            className={errors.adresa ? "input-error" : ""}
          />
          {errors.adresa && <div className="field-error">{errors.adresa}</div>}
        </div>

        <div className="form-group">
          <label>Grad *</label>
          <input
            type="text"
            name="grad"
            value={formData.grad}
            onChange={handleChange}
            className={errors.grad ? "input-error" : ""}
          />
          {errors.grad && <div className="field-error">{errors.grad}</div>}
        </div>
      </div>

      <div className="form-group">
        <label>Opis *</label>
        <textarea
          name="opis"
          rows="4"
          value={formData.opis}
          onChange={handleChange}
          className={errors.opis ? "input-error" : ""}
        />
        {errors.opis && <div className="field-error">{errors.opis}</div>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Kontakt telefon *</label>
          <input
            type="tel"
            name="kontaktTelefon"
            value={formData.kontaktTelefon}
            onChange={handleChange}
            className={errors.kontaktTelefon ? "input-error" : ""}
          />
          {errors.kontaktTelefon && (
            <div className="field-error">{errors.kontaktTelefon}</div>
          )}
        </div>

        <div className="form-group">
          <label>Kontakt email *</label>
          <input
            type="email"
            name="kontaktEmail"
            value={formData.kontaktEmail}
            onChange={handleChange}
            className={errors.kontaktEmail ? "input-error" : ""}
          />
          {errors.kontaktEmail && (
            <div className="field-error">{errors.kontaktEmail}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BasicInfoSection;

import React from "react";

const BasicInfoSection = ({
  formData = {},
  handleChange,
  errors = {},
  ownerEmail = "",
}) => {
  return (
    <div className="form-section">
      <h3>📋 Osnovni podaci</h3>

      <div className="form-group">
        <label htmlFor="playroom-naziv">Naziv igraonice *</label>
        <input
          id="playroom-naziv"
          type="text"
          name="naziv"
          value={formData.naziv || ""}
          onChange={handleChange}
          className={errors.naziv ? "input-error" : ""}
        />
        {errors.naziv && (
          <div className="field-error" role="alert">
            {errors.naziv}
          </div>
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="playroom-adresa">Adresa *</label>
          <input
            id="playroom-adresa"
            type="text"
            name="adresa"
            value={formData.adresa || ""}
            onChange={handleChange}
            className={errors.adresa ? "input-error" : ""}
          />
          {errors.adresa && (
            <div className="field-error" role="alert">
              {errors.adresa}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="playroom-grad">Grad *</label>
          <input
            id="playroom-grad"
            type="text"
            name="grad"
            value={formData.grad || ""}
            onChange={handleChange}
            className={errors.grad ? "input-error" : ""}
          />
          {errors.grad && (
            <div className="field-error" role="alert">
              {errors.grad}
            </div>
          )}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="playroom-opis">Opis *</label>
        <textarea
          id="playroom-opis"
          name="opis"
          rows="4"
          value={formData.opis || ""}
          onChange={handleChange}
          className={errors.opis ? "input-error" : ""}
        />
        {errors.opis && (
          <div className="field-error" role="alert">
            {errors.opis}
          </div>
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="playroom-kontakt-telefon">Kontakt telefon *</label>
          <input
            id="playroom-kontakt-telefon"
            type="tel"
            name="kontaktTelefon"
            value={formData.kontaktTelefon || ""}
            inputMode="tel"
            autoComplete="tel"
            onChange={handleChange}
            className={errors.kontaktTelefon ? "input-error" : ""}
          />
          {errors.kontaktTelefon && (
            <div className="field-error" role="alert">
              {errors.kontaktTelefon}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="playroom-kontakt-email">Kontakt email *</label>
          <input
            id="playroom-kontakt-email"
            type="email"
            name="kontaktEmail"
            value={ownerEmail || formData.kontaktEmail || ""}
            readOnly
            tabIndex={-1}
            className={`locked-email-input ${
              errors.kontaktEmail ? "input-error" : ""
            }`}
          />
          <small className="field-hint">
            Email je preuzet sa vašeg naloga i ne može se menjati osim ako ne
            promenite na svom nalogu.
          </small>
          {errors.kontaktEmail && (
            <div className="field-error" role="alert">
              {errors.kontaktEmail}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BasicInfoSection;

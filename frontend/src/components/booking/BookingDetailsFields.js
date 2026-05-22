import React from "react";

const BookingDetailsFields = ({
  brojDece = "",
  setBrojDece,
  brojRoditelja = "",
  setBrojRoditelja,
  napomena = "",
  setNapomena,
  hasPerPersonPricing = false,
  setError,
  brojDeceRef,
  brojDeceWrapperRef,
}) => {
  const clearError = () => {
    if (typeof setError === "function") {
      setError("");
    }
  };

  const handleNumberKeyDown = (e) => {
    if (["e", "E", "+", "-"].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleBrojDeceChange = (e) => {
    clearError();

    const value = e.target.value;

    if (value === "" || (Number(value) >= 0 && Number(value) <= 100)) {
      setBrojDece(value);
    }
  };

  const handleBrojRoditeljaChange = (e) => {
    clearError();

    const value = e.target.value;

    if (value === "" || (Number(value) >= 0 && Number(value) <= 100)) {
      setBrojRoditelja(value);
    }
  };

  return (
    <>
      <div className="form-row">
        <div className="form-group" ref={brojDeceWrapperRef}>
          <label>
            Broj dece{" "}
            <span className="inline-bracket-text">
              {hasPerPersonPricing ? "(obavezno)" : "(opciono)"}
            </span>
          </label>

          <input
            ref={brojDeceRef}
            onKeyDown={handleNumberKeyDown}
            type="number"
            inputMode="numeric"
            min={hasPerPersonPricing ? "1" : "0"}
            max="100"
            required={hasPerPersonPricing}
            value={brojDece}
            className={
              hasPerPersonPricing && !Number(brojDece) ? "input-error" : ""
            }
            onChange={handleBrojDeceChange}
          />

          {hasPerPersonPricing && !Number(brojDece) && (
            <p className="field-hint-error">
              Broj dece je obavezan jer je izabrana stavka koja se naplaćuje po
              osobi.
            </p>
          )}
        </div>

        <div className="form-group">
          <label>
            Broj roditelja{" "}
            <span className="inline-bracket-text">(opciono)</span>
          </label>

          <input
            onKeyDown={handleNumberKeyDown}
            type="number"
            inputMode="numeric"
            min="0"
            max="100"
            value={brojRoditelja}
            onChange={handleBrojRoditeljaChange}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="booking-section-title">
          📝 Napomena <span className="inline-bracket-text">(opciono)</span>
        </label>

        <textarea
          rows="3"
          maxLength={500}
          value={napomena}
          onChange={(e) => {
            clearError();
            setNapomena(e.target.value);
          }}
          placeholder="Npr. alergije, posebni zahtevi, dolazak sa kolicima..."
        />
      </div>
    </>
  );
};

export default BookingDetailsFields;

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
    if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
      e.preventDefault();
    }
  };

  const isValidCountValue = (value) => {
    if (value === "") return true;

    if (!/^\d+$/.test(value)) {
      return false;
    }

    const numberValue = Number(value);
    return numberValue >= 0 && numberValue <= 200;
  };

  const handleBrojDeceChange = (e) => {
    clearError();

    const value = e.target.value;

    if (isValidCountValue(value)) {
      setBrojDece(value);
    }
  };

  const handleBrojRoditeljaChange = (e) => {
    clearError();

    const value = e.target.value;

    if (isValidCountValue(value)) {
      setBrojRoditelja(value);
    }
  };

  return (
    <>
      <div className="form-row">
        <div className="form-group" ref={brojDeceWrapperRef}>
          <label htmlFor="booking-broj-dece">
            Broj dece{" "}
            <span className="inline-bracket-text">
              {hasPerPersonPricing ? "(obavezno)" : "(opciono)"}
            </span>
          </label>

          <input
            id="booking-broj-dece"
            ref={brojDeceRef}
            onKeyDown={handleNumberKeyDown}
            type="number"
            inputMode="numeric"
            min={hasPerPersonPricing ? "1" : "0"}
            max="200"
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
          <label htmlFor="booking-broj-roditelja">
            Broj roditelja{" "}
            <span className="inline-bracket-text">(opciono)</span>
          </label>

          <input
            id="booking-broj-roditelja"
            onKeyDown={handleNumberKeyDown}
            type="number"
            inputMode="numeric"
            min="0"
            max="200"
            value={brojRoditelja}
            onChange={handleBrojRoditeljaChange}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="booking-napomena" className="booking-section-title">
          📝 Napomena <span className="inline-bracket-text">(opciono)</span>
        </label>

        <textarea
          id="booking-napomena"
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

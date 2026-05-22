import React from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const BookingUserFields = ({
  isAuthenticated = false,
  korisnikPodaci = {},
  handleKorisnikChange,
  showPassword = false,
  setShowPassword,
  showConfirmPassword = false,
  setShowConfirmPassword,
  acceptedTerms = false,
  setAcceptedTerms,
  setError,
  imeRef,
  prezimeRef,
  emailRef,
  telefonRef,
  passwordRef,
  confirmPasswordRef,
  termsRef,
}) => {
  const clearError = () => {
    if (typeof setError === "function") {
      setError("");
    }
  };

  return (
    <div className="user-data-section">
      <div className="user-data-header">
        <h4>👤 Vaši podaci</h4>

        {!isAuthenticated && (
          <span className="user-info-text">
            ( Nakon potvrde rezervacije bićete automatski registrovani i
            prijavljeni )
          </span>
        )}
      </div>

      <div className="form-row">
        <div className="form-group" ref={imeRef}>
          <label>Ime *</label>
          <input
            type="text"
            autoComplete="given-name"
            name="ime"
            value={korisnikPodaci.ime || ""}
            onChange={handleKorisnikChange}
            required
          />
        </div>

        <div className="form-group" ref={prezimeRef}>
          <label>Prezime *</label>
          <input
            type="text"
            autoComplete="family-name"
            name="prezime"
            value={korisnikPodaci.prezime || ""}
            onChange={handleKorisnikChange}
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group" ref={emailRef}>
          <label>Email *</label>
          <input
            type="email"
            autoComplete="email"
            name="email"
            value={korisnikPodaci.email || ""}
            onChange={handleKorisnikChange}
            required
          />
        </div>

        <div className="form-group" ref={telefonRef}>
          <label>Telefon *</label>
          <input
            type="tel"
            autoComplete="tel"
            name="telefon"
            value={korisnikPodaci.telefon || ""}
            onChange={handleKorisnikChange}
            required
          />
        </div>
      </div>

      {!isAuthenticated && (
        <div className="form-row">
          <div className="form-group" ref={passwordRef}>
            <label>Lozinka *</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                name="password"
                value={korisnikPodaci.password || ""}
                onChange={handleKorisnikChange}
                required
              />

              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Sakrij lozinku" : "Prikaži lozinku"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="form-group" ref={confirmPasswordRef}>
            <label>Potvrda lozinke *</label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                name="confirmPassword"
                value={korisnikPodaci.confirmPassword || ""}
                onChange={handleKorisnikChange}
                required
              />

              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={
                  showConfirmPassword
                    ? "Sakrij potvrdu lozinke"
                    : "Prikaži potvrdu lozinke"
                }
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="form-group terms-checkbox" ref={termsRef}>
        <label className="terms-checkbox-label">
          <span>
            Prihvatam{" "}
            <a href="/terms-of-service" target="_blank" rel="noreferrer">
              Uslove korišćenja
            </a>
            ,{" "}
            <a href="/privacy-policy" target="_blank" rel="noreferrer">
              Politiku privatnosti
            </a>{" "}
            i{" "}
            <a href="/booking-policy" target="_blank" rel="noreferrer">
              Pravila rezervacije
            </a>
            .
          </span>

          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => {
              setAcceptedTerms(e.target.checked);
              clearError();
            }}
          />
        </label>
      </div>
    </div>
  );
};

export default BookingUserFields;

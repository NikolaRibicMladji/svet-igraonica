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
  title = "👤 Vaši podaci",
}) => {
  const clearError = () => {
    if (typeof setError === "function") {
      setError("");
    }
  };

  const handleTermsChange = (e) => {
    setAcceptedTerms?.(e.target.checked);
    clearError();
  };

  return (
    <div className="user-data-section">
      <div className="user-data-header">
        <h4>{title}</h4>

        {!isAuthenticated && (
          <span className="user-info-text">
            ( Nakon potvrde rezervacije bićete automatski registrovani i
            prijavljeni )
          </span>
        )}
      </div>

      <div className="form-row">
        <div className="form-group" ref={imeRef}>
          <label htmlFor="booking-ime">Ime *</label>
          <input
            id="booking-ime"
            type="text"
            autoComplete="given-name"
            name="ime"
            value={korisnikPodaci.ime || ""}
            onChange={handleKorisnikChange}
            required
          />
        </div>

        <div className="form-group" ref={prezimeRef}>
          <label htmlFor="booking-prezime">Prezime *</label>
          <input
            id="booking-prezime"
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
          <label htmlFor="booking-email">Email *</label>
          <input
            id="booking-email"
            type="email"
            autoComplete="email"
            name="email"
            value={korisnikPodaci.email || ""}
            onChange={handleKorisnikChange}
            required
          />
        </div>

        <div className="form-group" ref={telefonRef}>
          <label htmlFor="booking-telefon">Telefon *</label>
          <input
            id="booking-telefon"
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
            <label htmlFor="booking-password">Lozinka *</label>
            <div className="password-input-wrapper">
              <input
                id="booking-password"
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
                onClick={() => setShowPassword?.((prev) => !prev)}
                aria-label={showPassword ? "Sakrij lozinku" : "Prikaži lozinku"}
                aria-pressed={showPassword}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="form-group" ref={confirmPasswordRef}>
            <label htmlFor="booking-confirm-password">Potvrda lozinke *</label>
            <div className="password-input-wrapper">
              <input
                id="booking-confirm-password"
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
                onClick={() => setShowConfirmPassword?.((prev) => !prev)}
                aria-label={
                  showConfirmPassword
                    ? "Sakrij potvrdu lozinke"
                    : "Prikaži potvrdu lozinke"
                }
                aria-pressed={showConfirmPassword}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
        </div>
      )}

      {!isAuthenticated && (
        <div className="form-group terms-checkbox" ref={termsRef}>
          <label className="terms-checkbox-label">
            <span>
              Prihvatam{" "}
              <a
                href="/terms-of-service"
                target="_blank"
                rel="noopener noreferrer"
              >
                Uslove korišćenja
              </a>
              ,{" "}
              <a
                href="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
              >
                Politiku privatnosti
              </a>{" "}
              i{" "}
              <a
                href="/booking-policy"
                target="_blank"
                rel="noopener noreferrer"
              >
                Pravila rezervacije
              </a>
              .
            </span>

            <input
              id="booking-accepted-terms"
              type="checkbox"
              checked={acceptedTerms}
              onChange={handleTermsChange}
              aria-label="Prihvatam uslove korišćenja, politiku privatnosti i pravila rezervacije"
            />
          </label>
        </div>
      )}
    </div>
  );
};

export default BookingUserFields;

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../services/authService";
import "../styles/global.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [serverMessage, setServerMessage] = useState("");
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const validateEmail = (value) => /^\S+@\S+\.\S+$/.test(value);

  const getFieldErrorId = (field) => `forgot-${field}-error`;

  const renderFieldError = (field) =>
    errors[field] ? (
      <div id={getFieldErrorId(field)} className="field-error" role="alert">
        {errors[field]}
      </div>
    ) : null;

  const validateForm = () => {
    const newErrors = {};
    const safeEmail = email.trim().toLowerCase();

    if (!safeEmail) {
      newErrors.email = "Email adresa je obavezna.";
    } else if (!validateEmail(safeEmail)) {
      newErrors.email = "Unesite ispravnu email adresu.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    setEmail(e.target.value);
    setServerMessage("");
    setServerError("");

    setErrors((prev) => {
      if (!prev.email) return prev;

      const next = { ...prev };
      delete next.email;
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return;

    setServerMessage("");
    setServerError("");

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const result = await forgotPassword(email);

      if (result?.success) {
        setServerMessage(
          result.message ||
            "Ako nalog postoji, poslali smo link za reset lozinke.",
        );
        setEmail("");
        return;
      }

      setServerError(result?.error || "Greška pri slanju reset linka.");
    } catch (err) {
      setServerError(
        err?.response?.data?.message ||
          err?.message ||
          "Greška pri slanju reset linka.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container auth-page">
      <div className="auth-card">
        <h1>Zaboravljena lozinka</h1>

        {serverMessage && (
          <div className="success-message" role="status" aria-live="polite">
            {serverMessage}
          </div>
        )}

        {serverError && (
          <div className="error-message" role="alert">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="forgot-email">Email</label>

            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={handleChange}
              autoComplete="email"
              className={errors.email ? "input-error" : ""}
              required
              aria-invalid={Boolean(errors.email)}
              aria-describedby={
                errors.email ? getFieldErrorId("email") : undefined
              }
            />

            {renderFieldError("email")}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? "Šaljem..." : "Pošalji link"}
          </button>
        </form>

        <p className="auth-switch-text">
          Setili ste se lozinke? <Link to="/login">Prijavite se</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;

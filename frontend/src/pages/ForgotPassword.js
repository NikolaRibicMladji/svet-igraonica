import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import "../styles/global.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [serverMessage, setServerMessage] = useState("");
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const validateEmail = (value) => /^\S+@\S+\.\S+$/.test(value);

  const validateForm = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = "Email adresa je obavezna.";
    } else if (!validateEmail(email.trim())) {
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
    setServerMessage("");
    setServerError("");

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const response = await api.post("/auth/forgot-password", {
        email: email.trim(),
      });

      if (response.data?.success) {
        setServerMessage(
          response.data.message ||
            "Ako nalog postoji, poslali smo link za reset lozinke.",
        );
        setEmail("");
      } else {
        setServerError("Greška pri slanju reset linka.");
      }
    } catch (err) {
      setServerError(
        err?.response?.data?.message || "Greška pri slanju reset linka.",
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
          <div className="success-message">{serverMessage}</div>
        )}
        {serverError && <div className="error-message">{serverError}</div>}

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
            />
            {errors.email && <div className="field-error">{errors.email}</div>}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
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

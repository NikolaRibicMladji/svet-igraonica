import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/global.css";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate("/");
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (location.state?.resetSuccess) {
      setSuccessMessage(location.state.resetSuccess);

      // očisti state da se ne prikazuje opet
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const validateEmail = (value) => /^\S+@\S+\.\S+$/.test(value);

  const validateForm = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = "Email adresa je obavezna.";
    } else if (!validateEmail(email.trim())) {
      newErrors.email = "Unesite ispravnu email adresu.";
    }

    if (!password.trim()) {
      newErrors.password = "Lozinka je obavezna.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setServerError("");

    setErrors((prev) => {
      if (!prev.email) return prev;
      const next = { ...prev };
      delete next.email;
      return next;
    });
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    setServerError("");

    setErrors((prev) => {
      if (!prev.password) return prev;
      const next = { ...prev };
      delete next.password;
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    if (!validateForm()) return;

    setSubmitting(true);

    const result = await login(email.trim(), password);

    if (result?.success) {
      navigate("/");
    } else {
      setServerError(result?.error || "Greška pri prijavi.");
    }

    setSubmitting(false);
  };

  return (
    <div className="container auth-page">
      <div className="auth-card">
        <h1>Prijava</h1>

        {successMessage && (
          <div className="success-message">{successMessage}</div>
        )}
        {serverError && <div className="error-message">{serverError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              autoComplete="email"
              className={errors.email ? "input-error" : ""}
            />
            {errors.email && <div className="field-error">{errors.email}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Lozinka</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              autoComplete="current-password"
              className={errors.password ? "input-error" : ""}
            />
            {errors.password && (
              <div className="field-error">{errors.password}</div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? "Prijavljujem..." : "Prijavi se"}
          </button>
        </form>

        <p className="auth-switch-text">
          <Link to="/forgot-password">Zaboravili ste lozinku?</Link>
        </p>

        <p className="auth-switch-text">
          Nemate nalog? <Link to="/register">Registrujte se</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

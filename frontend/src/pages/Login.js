import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/global.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const AUTH_REDIRECT_BLOCKLIST = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

const getDefaultRedirectPath = (user) => {
  if (user?.role === "vlasnik") {
    return user?.hasPlayroom ? "/owner/dashboard" : "/create-playroom";
  }

  if (user?.role === "admin") {
    return "/admin";
  }

  return "/";
};

const getPostLoginRedirectPath = (user, from) => {
  const safeFrom = typeof from === "string" ? from : "";

  const canUseFrom =
    safeFrom.startsWith("/") &&
    !safeFrom.startsWith("//") &&
    !AUTH_REDIRECT_BLOCKLIST.some((path) => safeFrom.startsWith(path));

  if (canUseFrom) {
    return safeFrom;
  }

  return getDefaultRedirectPath(user);
};

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resending, setResending] = useState(false);

  const {
    login,
    resendVerificationEmail,
    isAuthenticated,
    loading: authLoading,
    user,
  } = useAuth();

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      navigate(getPostLoginRedirectPath(user, from), { replace: true });
    }
  }, [authLoading, isAuthenticated, user, from, navigate]);

  useEffect(() => {
    if (location.state?.resetSuccess) {
      setSuccessMessage(location.state.resetSuccess);
    }

    if (location.state?.registrationSuccess) {
      setSuccessMessage(location.state.registrationSuccess);

      const pendingEmail = sessionStorage.getItem("pendingVerificationEmail");

      if (pendingEmail) {
        setEmail(pendingEmail);
      }
    }

    window.history.replaceState({}, document.title);
  }, [location.state]);

  const validateEmail = (value) => /^\S+@\S+\.\S+$/.test(value);

  const getFieldErrorId = (field) => `login-${field}-error`;

  const renderFieldError = (field) =>
    errors[field] ? (
      <div id={getFieldErrorId(field)} className="field-error" role="alert">
        {errors[field]}
      </div>
    ) : null;

  const validateForm = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = "Email adresa je obavezna.";
    } else if (!validateEmail(email.trim().toLowerCase())) {
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
    setShowResendVerification(false);

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

    if (submitting) return;

    setServerError("");
    setShowResendVerification(false);

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const result = await login(email.trim().toLowerCase(), password);

      if (result?.success) {
        navigate(getPostLoginRedirectPath(result.user, from), {
          replace: true,
        });
        return;
      }

      const errorMessage = result?.error || "Greška pri prijavi.";

      setServerError(errorMessage);

      if (errorMessage.includes("Morate potvrditi email adresu")) {
        setShowResendVerification(true);

        const pendingEmail = email.trim().toLowerCase();

        if (pendingEmail) {
          sessionStorage.setItem("pendingVerificationEmail", pendingEmail);
        }
      }
    } catch (err) {
      setServerError(
        err?.response?.data?.message || err?.message || "Greška pri prijavi.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (resending) return;

    const normalizedEmail =
      email.trim().toLowerCase() ||
      sessionStorage.getItem("pendingVerificationEmail");

    if (!normalizedEmail || !validateEmail(normalizedEmail)) {
      setServerError("Unesite validnu email adresu.");
      return;
    }

    setResending(true);
    setServerError("");
    setSuccessMessage("");
    setShowResendVerification(false);

    try {
      const result = await resendVerificationEmail(normalizedEmail);

      if (result?.success) {
        setSuccessMessage(
          result.message ||
            "Ako nalog postoji i nije potvrđen, poslali smo novi email.",
        );
      } else {
        setServerError(
          result?.error || "Greška pri slanju verifikacionog emaila.",
        );
      }
    } catch (err) {
      setServerError(
        err?.response?.data?.message ||
          err?.message ||
          "Greška pri slanju verifikacionog emaila.",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="container auth-page">
      <div className="auth-card">
        <h1>Prijava</h1>

        {successMessage && (
          <div className="success-message" role="status" aria-live="polite">
            {successMessage}
          </div>
        )}

        {serverError && (
          <div className="error-message" role="alert">
            {serverError}
          </div>
        )}

        {showResendVerification && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleResendVerification}
            disabled={resending}
            aria-busy={resending}
          >
            {resending ? "Šaljem..." : "Pošalji ponovo verifikacioni email"}
          </button>
        )}

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
              required
              aria-invalid={Boolean(errors.email)}
              aria-describedby={
                errors.email ? getFieldErrorId("email") : undefined
              }
            />
            {renderFieldError("email")}
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Lozinka</label>
            <div className="password-input-wrapper">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={handlePasswordChange}
                autoComplete="current-password"
                className={errors.password ? "input-error" : ""}
                required
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? getFieldErrorId("password") : undefined
                }
              />

              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Sakrij lozinku" : "Prikaži lozinku"}
                aria-pressed={showPassword}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {renderFieldError("password")}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            aria-busy={submitting}
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

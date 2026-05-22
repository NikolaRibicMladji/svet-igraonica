import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/global.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
      if (user.role === "vlasnik") {
        if (user.hasPlayroom) {
          navigate("/owner/dashboard", { replace: true });
        } else {
          navigate("/create-playroom", { replace: true });
        }
      } else if (user.role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  useEffect(() => {
    if (location.state?.resetSuccess) {
      setSuccessMessage(location.state.resetSuccess);
    }

    if (location.state?.registrationSuccess) {
      setSuccessMessage(location.state.registrationSuccess);

      const pendingEmail = localStorage.getItem("pendingVerificationEmail");

      if (pendingEmail) {
        setEmail(pendingEmail);
      }
    }

    window.history.replaceState({}, document.title);
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
    setServerError("");
    setShowResendVerification(false);

    if (!validateForm()) return;

    setSubmitting(true);

    const result = await login(email.trim(), password);

    if (result?.success) {
      const role = result?.user?.role;

      if (role === "vlasnik") {
        if (result?.user?.hasPlayroom) {
          navigate("/owner/dashboard", { replace: true });
        } else {
          navigate("/create-playroom", { replace: true });
        }
      } else if (role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } else {
      const errorMessage = result?.error || "Greška pri prijavi.";

      setServerError(errorMessage);

      if (errorMessage.includes("Morate potvrditi email adresu")) {
        setShowResendVerification(true);

        const pendingEmail = email.trim().toLowerCase();

        if (pendingEmail) {
          localStorage.setItem("pendingVerificationEmail", pendingEmail);
        }
      }
    }

    setSubmitting(false);
  };

  const handleResendVerification = async () => {
    const normalizedEmail =
      email.trim().toLowerCase() ||
      localStorage.getItem("pendingVerificationEmail");

    if (!normalizedEmail || !validateEmail(normalizedEmail)) {
      setServerError("Unesite validnu email adresu.");
      return;
    }

    setResending(true);
    setServerError("");
    setSuccessMessage("");
    setShowResendVerification(false);

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

    setResending(false);
  };

  return (
    <div className="container auth-page">
      <div className="auth-card">
        <h1>Prijava</h1>

        {successMessage && (
          <div className="success-message">{successMessage}</div>
        )}
        {serverError && <div className="error-message">{serverError}</div>}

        {showResendVerification && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleResendVerification}
            disabled={resending}
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
            />
            {errors.email && <div className="field-error">{errors.email}</div>}
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

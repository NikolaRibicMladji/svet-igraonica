import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { resetPassword } from "../services/authService";
import "../styles/global.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const getFieldErrorId = (field) => `reset-${field}-error`;

  const renderFieldError = (field) =>
    errors[field] ? (
      <div id={getFieldErrorId(field)} className="field-error" role="alert">
        {errors[field]}
      </div>
    ) : null;

  const validateForm = () => {
    const newErrors = {};

    if (!formData.password) {
      newErrors.password = "Lozinka je obavezna.";
    } else if (formData.password.length < 8) {
      newErrors.password = "Lozinka mora imati najmanje 8 karaktera.";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Potvrda lozinke je obavezna.";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Lozinke se ne podudaraju.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setServerError("");

    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return;

    setServerError("");

    if (!token) {
      setServerError("Nedostaje token za reset lozinke.");
      return;
    }

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const result = await resetPassword(
        token,
        formData.password,
        formData.confirmPassword,
      );

      if (result?.success) {
        navigate("/login", {
          replace: true,
          state: {
            resetSuccess: result.message || "Lozinka je uspešno promenjena.",
          },
        });

        return;
      }

      setServerError(result?.error || "Greška pri promeni lozinke.");
    } catch (err) {
      setServerError(
        err?.response?.data?.message ||
          err?.message ||
          "Greška pri promeni lozinke.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="container auth-page">
      <div className="auth-card">
        <h1>Nova lozinka</h1>

        {serverError && (
          <div className="error-message" role="alert">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="reset-password">Nova lozinka</label>
            <div className="password-input-wrapper">
              <input
                id="reset-password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                className={errors.password ? "input-error" : ""}
                required
                minLength={8}
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

          <div className="form-group">
            <label htmlFor="reset-confirm-password">Potvrdite lozinku</label>
            <div className="password-input-wrapper">
              <input
                id="reset-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                className={errors.confirmPassword ? "input-error" : ""}
                required
                minLength={8}
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={
                  errors.confirmPassword
                    ? getFieldErrorId("confirmPassword")
                    : undefined
                }
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
                aria-pressed={showConfirmPassword}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {renderFieldError("confirmPassword")}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? "Menjam..." : "Promeni lozinku"}
          </button>
        </form>

        <p className="auth-switch-text">
          Nazad na <Link to="/login">prijavu</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;

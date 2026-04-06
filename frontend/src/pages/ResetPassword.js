import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import "../styles/global.css";

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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.password) {
      newErrors.password = "Lozinka je obavezna.";
    } else if (formData.password.length < 6) {
      newErrors.password = "Lozinka mora imati najmanje 6 karaktera.";
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
    setServerError("");

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const response = await api.put(`/auth/reset-password/${token}`, {
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      if (response.data?.success) {
        navigate("/login", {
          replace: true,
          state: { resetSuccess: response.data.message },
        });
      } else {
        setServerError("Greška pri promeni lozinke.");
      }
    } catch (err) {
      setServerError(
        err?.response?.data?.message || "Greška pri promeni lozinke.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container auth-page">
      <div className="auth-card">
        <h1>Nova lozinka</h1>

        {serverError && <div className="error-message">{serverError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="reset-password">Nova lozinka</label>
            <input
              id="reset-password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="new-password"
              className={errors.password ? "input-error" : ""}
            />
            {errors.password && (
              <div className="field-error">{errors.password}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="reset-confirm-password">Potvrdite lozinku</label>
            <input
              id="reset-confirm-password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              className={errors.confirmPassword ? "input-error" : ""}
            />
            {errors.confirmPassword && (
              <div className="field-error">{errors.confirmPassword}</div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
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

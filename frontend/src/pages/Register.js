import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/global.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const Register = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated, user, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState({
    ime: "",
    prezime: "",
    email: "",
    password: "",
    telefon: "",
    role: "",
  });

  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (user?.role === "vlasnik") {
        navigate("/create-playroom", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  const validateEmail = (email) => {
    return /^\S+@\S+\.\S+$/.test(email);
  };

  const validateTelefon = (telefon) => {
    const normalizedTelefon = telefon.trim();

    if (!/^\+?[0-9]+$/.test(normalizedTelefon)) {
      return "Telefon može sadržati samo brojeve i opcioni + na početku.";
    }

    const digitsOnly = normalizedTelefon.replace("+", "");

    if (digitsOnly.length < 8) {
      return "Telefon mora imati najmanje 8 cifara.";
    }

    return "";
  };

  const getFieldErrorId = (field) => `register-${field}-error`;

  const renderFieldError = (field) =>
    errors[field] ? (
      <div id={getFieldErrorId(field)} className="field-error" role="alert">
        {errors[field]}
      </div>
    ) : null;

  const validateForm = () => {
    const newErrors = {};

    if (!formData.ime.trim()) {
      newErrors.ime = "Ime je obavezno.";
    } else if (formData.ime.trim().length < 2) {
      newErrors.ime = "Ime mora imati najmanje 2 karaktera.";
    }

    if (!formData.prezime.trim()) {
      newErrors.prezime = "Prezime je obavezno.";
    } else if (formData.prezime.trim().length < 2) {
      newErrors.prezime = "Prezime mora imati najmanje 2 karaktera.";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email adresa je obavezna.";
    } else if (!validateEmail(formData.email.trim())) {
      newErrors.email = "Unesite ispravnu email adresu.";
    }

    if (!formData.password) {
      newErrors.password = "Lozinka je obavezna.";
    } else if (formData.password.length < 8) {
      newErrors.password = "Lozinka mora imati najmanje 8 karaktera.";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Potvrda lozinke je obavezna.";
    } else if (formData.password !== confirmPassword) {
      newErrors.confirmPassword = "Lozinke se ne podudaraju.";
    }

    if (!formData.telefon.trim()) {
      newErrors.telefon = "Telefon je obavezan.";
    } else {
      const telefonError = validateTelefon(formData.telefon.trim());
      if (telefonError) {
        newErrors.telefon = telefonError;
      }
    }

    if (!formData.role) {
      newErrors.role = "Izaberite tip korisnika.";
    } else if (!["roditelj", "vlasnik"].includes(formData.role)) {
      newErrors.role = "Izabran tip korisnika nije dozvoljen.";
    }

    if (!acceptedTerms) {
      newErrors.acceptedTerms =
        "Morate prihvatiti uslove korišćenja i politiku privatnosti.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "telefon") {
      const sanitizedValue = value.replace(/(?!^\+)[^0-9]/g, "");

      setFormData((prev) => ({
        ...prev,
        [name]: sanitizedValue,
      }));

      setServerError("");

      setErrors((prev) => {
        if (!prev.telefon) return prev;
        const next = { ...prev };
        delete next.telefon;
        return next;
      });

      return;
    }

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

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    setServerError("");

    setErrors((prev) => {
      if (!prev.confirmPassword) return prev;
      const next = { ...prev };
      delete next.confirmPassword;
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return;

    setServerError("");

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const result = await register({
        ...formData,
        acceptedTerms,
        ime: formData.ime.trim(),
        prezime: formData.prezime.trim(),
        email: formData.email.trim(),
        telefon: formData.telefon.trim(),
      });

      if (result?.success) {
        setSuccessMessage(
          result?.message || "Proverite email adresu radi potvrde naloga.",
        );

        setFormData({
          ime: "",
          prezime: "",
          email: "",
          password: "",
          telefon: "",
          role: "",
        });

        setConfirmPassword("");
        setAcceptedTerms(false);

        setTimeout(() => {
          navigate("/login", {
            replace: true,
            state: {
              registrationSuccess:
                "Uspešno ste se registrovali. Proverite email adresu radi potvrde naloga.",
            },
          });
        }, 3500);

        return;
      }

      setServerError(result?.error || "Greška pri registraciji.");
    } catch (err) {
      setServerError(
        err?.response?.data?.message ||
          err?.message ||
          "Greška pri registraciji.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container auth-page">
      <div className="auth-card">
        <h1>Registracija</h1>

        {serverError && (
          <div className="error-message" role="alert">
            {serverError}
          </div>
        )}

        {successMessage && (
          <div className="success-message" role="status" aria-live="polite">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="register-ime">Ime</label>
            <input
              id="register-ime"
              required
              minLength={2}
              type="text"
              name="ime"
              value={formData.ime}
              onChange={handleChange}
              autoComplete="given-name"
              className={errors.ime ? "input-error" : ""}
              aria-invalid={Boolean(errors.ime)}
              aria-describedby={errors.ime ? getFieldErrorId("ime") : undefined}
            />
            {renderFieldError("ime")}
          </div>

          <div className="form-group">
            <label htmlFor="register-prezime">Prezime</label>
            <input
              id="register-prezime"
              required
              minLength={2}
              type="text"
              name="prezime"
              value={formData.prezime}
              onChange={handleChange}
              autoComplete="family-name"
              className={errors.prezime ? "input-error" : ""}
              aria-invalid={Boolean(errors.prezime)}
              aria-describedby={
                errors.prezime ? getFieldErrorId("prezime") : undefined
              }
            />
            {renderFieldError("prezime")}
          </div>

          <div className="form-group">
            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
              required
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              className={errors.email ? "input-error" : ""}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={
                errors.email ? getFieldErrorId("email") : undefined
              }
            />
            {renderFieldError("email")}
          </div>

          <div className="form-group">
            <label htmlFor="register-password">Lozinka</label>
            <div className="password-input-wrapper">
              <input
                id="register-password"
                required
                minLength={8}
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                className={errors.password ? "input-error" : ""}
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
            <label htmlFor="register-confirm-password">Potvrdite lozinku</label>
            <div className="password-input-wrapper">
              <input
                id="register-confirm-password"
                required
                minLength={8}
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                autoComplete="new-password"
                className={errors.confirmPassword ? "input-error" : ""}
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

          <div className="form-group">
            <label htmlFor="register-telefon">Telefon</label>
            <input
              id="register-telefon"
              required
              type="tel"
              name="telefon"
              value={formData.telefon}
              onChange={handleChange}
              autoComplete="tel"
              inputMode="numeric"
              className={errors.telefon ? "input-error" : ""}
              aria-invalid={Boolean(errors.telefon)}
              aria-describedby={
                errors.telefon ? getFieldErrorId("telefon") : undefined
              }
            />
            {renderFieldError("telefon")}
          </div>

          <div className="form-group">
            <label htmlFor="register-role">Tip korisnika</label>
            <select
              id="register-role"
              required
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={errors.role ? "input-error" : ""}
              aria-invalid={Boolean(errors.role)}
              aria-describedby={
                errors.role ? getFieldErrorId("role") : undefined
              }
            >
              <option value="">-- Izaberite tip korisnika --</option>
              <option value="roditelj">Roditelj</option>
              <option value="vlasnik">Vlasnik igraonice</option>
            </select>
            {renderFieldError("role")}
          </div>
          <div className="form-group terms-checkbox">
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
                id="register-accepted-terms"
                name="acceptedTerms"
                type="checkbox"
                required
                checked={acceptedTerms}
                aria-invalid={Boolean(errors.acceptedTerms)}
                aria-describedby={
                  errors.acceptedTerms
                    ? getFieldErrorId("acceptedTerms")
                    : undefined
                }
                onChange={(e) => {
                  setAcceptedTerms(e.target.checked);
                  setServerError("");

                  setErrors((prev) => {
                    if (!prev.acceptedTerms) return prev;
                    const next = { ...prev };
                    delete next.acceptedTerms;
                    return next;
                  });
                }}
              />
            </label>

            {renderFieldError("acceptedTerms")}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || !acceptedTerms}
            aria-busy={submitting}
          >
            {submitting ? "Registrujem..." : "Registruj se"}
          </button>
        </form>

        <p className="auth-switch-text">
          Već imate nalog? <Link to="/login">Prijavite se</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

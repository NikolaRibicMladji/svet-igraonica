import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/global.css";

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
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
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
    if (!/^[0-9]+$/.test(telefon)) {
      return "Telefon može sadržati samo brojeve.";
    }

    if (telefon.length < 8) {
      return "Telefon mora imati najmanje 8 cifara.";
    }

    return "";
  };

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
    } else if (formData.password.length < 6) {
      newErrors.password = "Lozinka mora imati najmanje 6 karaktera.";
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
    setServerError("");

    if (!validateForm()) return;

    setSubmitting(true);

    const result = await register({
      ...formData,
      acceptedTerms,
      ime: formData.ime.trim(),
      prezime: formData.prezime.trim(),
      email: formData.email.trim(),
      telefon: formData.telefon.trim(),
    });

    if (result?.success) {
      if (formData.role === "vlasnik") {
        navigate("/manage-playroom");
      } else {
        navigate("/");
      }
    } else {
      setServerError(result?.error || "Greška pri registraciji.");
    }

    setSubmitting(false);
  };

  return (
    <div className="container auth-page">
      <div className="auth-card">
        <h1>Registracija</h1>

        {serverError && <div className="error-message">{serverError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="register-ime">Ime</label>
            <input
              id="register-ime"
              type="text"
              name="ime"
              value={formData.ime}
              onChange={handleChange}
              autoComplete="given-name"
              className={errors.ime ? "input-error" : ""}
            />
            {errors.ime && <div className="field-error">{errors.ime}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="register-prezime">Prezime</label>
            <input
              id="register-prezime"
              type="text"
              name="prezime"
              value={formData.prezime}
              onChange={handleChange}
              autoComplete="family-name"
              className={errors.prezime ? "input-error" : ""}
            />
            {errors.prezime && (
              <div className="field-error">{errors.prezime}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              className={errors.email ? "input-error" : ""}
            />
            {errors.email && <div className="field-error">{errors.email}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="register-password">Lozinka</label>
            <input
              id="register-password"
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
            <label htmlFor="register-confirm-password">Potvrdite lozinku</label>
            <input
              id="register-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              autoComplete="new-password"
              className={errors.confirmPassword ? "input-error" : ""}
            />
            {errors.confirmPassword && (
              <div className="field-error">{errors.confirmPassword}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="register-telefon">Telefon</label>
            <input
              id="register-telefon"
              type="tel"
              name="telefon"
              value={formData.telefon}
              onChange={handleChange}
              autoComplete="tel"
              inputMode="numeric"
              className={errors.telefon ? "input-error" : ""}
            />
            {errors.telefon && (
              <div className="field-error">{errors.telefon}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="register-role">Tip korisnika</label>
            <select
              id="register-role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={errors.role ? "input-error" : ""}
            >
              <option value="">-- Izaberite tip korisnika --</option>
              <option value="roditelj">Roditelj</option>
              <option value="vlasnik">Vlasnik igraonice</option>
            </select>
            {errors.role && <div className="field-error">{errors.role}</div>}
          </div>
          <div className="form-group terms-checkbox">
            <label className="terms-checkbox-label">
              <input
                type="checkbox"
                checked={acceptedTerms}
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
            </label>

            {errors.acceptedTerms && (
              <div className="field-error">{errors.acceptedTerms}</div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
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

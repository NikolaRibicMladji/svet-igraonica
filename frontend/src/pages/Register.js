import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/global.css";

const Register = () => {
  const [formData, setFormData] = useState({
    ime: "",
    prezime: "",
    email: "",
    password: "",
    telefon: "",
    role: "roditelj",
  });
  const [error, setError] = useState("");
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const result = await register(formData);

    if (result.success) {
      navigate("/");
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="container">
      <h1>Registracija</h1>
      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Ime</label>
          <input
            type="text"
            name="ime"
            value={formData.ime}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Prezime</label>
          <input
            type="text"
            name="prezime"
            value={formData.prezime}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Lozinka</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength="6"
          />
        </div>

        <div className="form-group">
          <label>Telefon</label>
          <input
            type="tel"
            name="telefon"
            value={formData.telefon}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Tip korisnika</label>
          <select name="role" value={formData.role} onChange={handleChange}>
            <option value="roditelj">Roditelj</option>
            <option value="vlasnik">Vlasnik igraonice</option>
          </select>
        </div>

        <button type="submit" className="btn btn-primary">
          Registruj se
        </button>
      </form>

      <p>
        Već imate nalog? <Link to="/login">Prijavite se</Link>
      </p>
    </div>
  );
};

export default Register;

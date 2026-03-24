import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPlayroom } from "../services/playroomService";
import { useAuth } from "../context/AuthContext";
import "../styles/Playrooms.css";

const CreatePlayroom = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    naziv: "",
    adresa: "",
    grad: "",
    opis: "",
    kontaktTelefon: "",
    kontaktEmail: "",
    kapacitet: "",
    cenovnik: {
      osnovni: "",
      produzeno: "",
      vikend: "",
    },
    radnoVreme: {
      ponedeljak: { od: "09:00", do: "20:00" },
      utorak: { od: "09:00", do: "20:00" },
      sreda: { od: "09:00", do: "20:00" },
      cetvrtak: { od: "09:00", do: "20:00" },
      petak: { od: "09:00", do: "20:00" },
      subota: { od: "10:00", do: "22:00" },
      nedelja: { od: "10:00", do: "21:00" },
    },
    pogodnosti: [],
  });

  const pogodnostiList = [
    { value: "animatori", label: "🎭 Animatori" },
    { value: "kafic", label: "☕ Kafić" },
    { value: "parking", label: "🅿️ Parking" },
    { value: "rođendani", label: "🎂 Rođendani" },
    { value: "wifi", label: "📶 WiFi" },
    { value: "trampoline", label: "🤸 Trampoline" },
    { value: "kliziste", label: "⛸️ Klizalište" },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleRadnoVremeChange = (dan, tip, value) => {
    setFormData({
      ...formData,
      radnoVreme: {
        ...formData.radnoVreme,
        [dan]: {
          ...formData.radnoVreme[dan],
          [tip]: value,
        },
      },
    });
  };

  const handlePogodnostChange = (value) => {
    if (formData.pogodnosti.includes(value)) {
      setFormData({
        ...formData,
        pogodnosti: formData.pogodnosti.filter((p) => p !== value),
      });
    } else {
      setFormData({
        ...formData,
        pogodnosti: [...formData.pogodnosti, value],
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await createPlayroom(formData);

    if (result.success) {
      navigate("/my-playrooms");
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  if (user?.role !== "vlasnik" && user?.role !== "admin") {
    return (
      <div className="container">
        <h1>Pristup zabranjen</h1>
        <p>Samo vlasnici igraonica mogu da kreiraju nove igraonice.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="form-container">
        <h2>Dodaj novu igraonicu</h2>
        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Naziv igraonice *</label>
            <input
              type="text"
              name="naziv"
              value={formData.naziv}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Adresa *</label>
              <input
                type="text"
                name="adresa"
                value={formData.adresa}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Grad *</label>
              <input
                type="text"
                name="grad"
                value={formData.grad}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Opis *</label>
            <textarea
              name="opis"
              rows="4"
              value={formData.opis}
              onChange={handleChange}
              required
            ></textarea>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Kontakt telefon *</label>
              <input
                type="tel"
                name="kontaktTelefon"
                value={formData.kontaktTelefon}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Kontakt email *</label>
              <input
                type="email"
                name="kontaktEmail"
                value={formData.kontaktEmail}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Kapacitet (broj dece) *</label>
            <input
              type="number"
              name="kapacitet"
              value={formData.kapacitet}
              onChange={handleChange}
              required
            />
          </div>

          <h3>Cenovnik</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Osnovna cena (RSD) *</label>
              <input
                type="number"
                name="cenovnik.osnovni"
                value={formData.cenovnik.osnovni}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Produženo (RSD)</label>
              <input
                type="number"
                name="cenovnik.produzeno"
                value={formData.cenovnik.produzeno}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Vikend cena (RSD)</label>
              <input
                type="number"
                name="cenovnik.vikend"
                value={formData.cenovnik.vikend}
                onChange={handleChange}
              />
            </div>
          </div>

          <h3>Pogodnosti</h3>
          <div className="checkbox-group">
            {pogodnostiList.map((pog) => (
              <label key={pog.value} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.pogodnosti.includes(pog.value)}
                  onChange={() => handlePogodnostChange(pog.value)}
                />
                {pog.label}
              </label>
            ))}
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Kreiranje..." : "Kreiraj igraonicu"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreatePlayroom;

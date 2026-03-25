import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMyPlayrooms, updatePlayroom } from "../services/playroomService";
import { useAuth } from "../context/AuthContext";
import "../styles/ManagePlayroom.css";

const ManagePlayroom = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [playroom, setPlayroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPlayroom();
  }, []);

  const loadPlayroom = async () => {
    setLoading(true);
    const result = await getMyPlayrooms();
    if (result.success && result.data.length > 0) {
      const myPlayroom = result.data[0];
      setPlayroom(myPlayroom);
      setFormData({
        naziv: myPlayroom.naziv,
        adresa: myPlayroom.adresa,
        grad: myPlayroom.grad,
        opis: myPlayroom.opis,
        kontaktTelefon: myPlayroom.kontaktTelefon,
        kontaktEmail: myPlayroom.kontaktEmail,
        kapacitet: myPlayroom.kapacitet,
        cenovnik: {
          osnovni: myPlayroom.cenovnik?.osnovni || "",
        },
      });
    } else {
      // Nema igraonice - vodi na kreiranje
      navigate("/create-playroom");
    }
    setLoading(false);
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await updatePlayroom(playroom._id, formData);
    if (result.success) {
      setMessage("Podaci su uspešno ažurirani");
      setEditing(false);
      loadPlayroom();
      setTimeout(() => setMessage(""), 3000);
    } else {
      alert(result.error);
    }
  };

  if (loading) {
    return <div className="container loading">Učitavanje...</div>;
  }

  if (!playroom) {
    return null; // Redirect će se desiti
  }

  return (
    <div className="container manage-playroom-page">
      <h1>🏢 Moja igraonica</h1>

      {message && <div className="success-message">{message}</div>}

      <div className="playroom-status">
        <div
          className={`status-badge ${playroom.verifikovan ? "verified" : "pending"}`}
        >
          {playroom.verifikovan ? "✅ Verifikovano" : "⏳ Čeka verifikaciju"}
        </div>
      </div>

      {!editing ? (
        <div className="playroom-details-card">
          <div className="playroom-details-header">
            <h2>{playroom.naziv}</h2>
            <button className="btn-edit" onClick={() => setEditing(true)}>
              ✏️ Uredi podatke
            </button>
          </div>

          <div className="details-grid">
            <div className="detail-item">
              <label>📍 Adresa</label>
              <p>
                {playroom.adresa}, {playroom.grad}
              </p>
            </div>
            <div className="detail-item">
              <label>📞 Telefon</label>
              <p>{playroom.kontaktTelefon}</p>
            </div>
            <div className="detail-item">
              <label>📧 Email</label>
              <p>{playroom.kontaktEmail}</p>
            </div>
            <div className="detail-item">
              <label>👥 Kapacitet</label>
              <p>{playroom.kapacitet} dece</p>
            </div>
            <div className="detail-item">
              <label>💰 Cena po detetu</label>
              <p>{playroom.cenovnik?.osnovni} RSD</p>
            </div>
            <div className="detail-item full-width">
              <label>📝 Opis</label>
              <p>{playroom.opis}</p>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="edit-form">
          <h2>Uredi podatke</h2>

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
            />
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

          <div className="form-row">
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
            <div className="form-group">
              <label>Cena po detetu (RSD) *</label>
              <input
                type="number"
                name="cenovnik.osnovni"
                value={formData.cenovnik.osnovni}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-buttons">
            <button
              type="button"
              className="btn-cancel"
              onClick={() => setEditing(false)}
            >
              Otkaži
            </button>
            <button type="submit" className="btn-save">
              Sačuvaj izmene
            </button>
          </div>
        </form>
      )}

      <div className="playroom-actions">
        <button
          className="btn-secondary"
          onClick={() => navigate("/manage-slots")}
        >
          📅 Upravljanje terminima
        </button>
      </div>
    </div>
  );
};

export default ManagePlayroom;

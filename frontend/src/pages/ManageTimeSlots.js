import React, { useState, useEffect } from "react";
import {
  getMyTimeSlots,
  createTimeSlot,
  deleteTimeSlot,
  generateTimeSlots,
} from "../services/bookingService";
import { getMyPlayrooms } from "../services/playroomService";
import { useAuth } from "../context/AuthContext";
import "../styles/ManageTimeSlots.css";

const ManageTimeSlots = () => {
  const { user } = useAuth();
  const [timeSlots, setTimeSlots] = useState([]);
  const [playrooms, setPlayrooms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedPlayroom, setSelectedPlayroom] = useState("");
  const [formData, setFormData] = useState({
    playroomId: "",
    datum: "",
    vremeOd: "10:00",
    vremeDo: "12:00",
    maxDece: 20,
    cena: 800,
  });

  useEffect(() => {
    if (user?.role === "vlasnik" || user?.role === "admin") {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const playroomsResult = await getMyPlayrooms();
    if (playroomsResult.success) {
      setPlayrooms(playroomsResult.data);
      if (playroomsResult.data.length > 0) {
        const firstPlayroom = playroomsResult.data[0];
        setSelectedPlayroom(firstPlayroom._id);
        setFormData((prev) => ({
          ...prev,
          playroomId: firstPlayroom._id,
        }));
      }
    }

    const slotsResult = await getMyTimeSlots();
    if (slotsResult.success) {
      setTimeSlots(slotsResult.data);
    }
    setLoading(false);
  };

  // Funkcija za generisanje termina
  const handleGenerateSlots = async () => {
    if (!selectedPlayroom) {
      alert("Izaberite igraonicu");
      return;
    }

    const result = await generateTimeSlots(selectedPlayroom);
    if (result.success) {
      alert(result.message);
      loadData();
    } else {
      alert(result.error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await createTimeSlot(formData);
    if (result.success) {
      setShowForm(false);
      loadData();
    } else {
      alert(result.error);
    }
  };

  const handleDelete = async (id) => {
    if (
      window.confirm("Da li ste sigurni da želite da obrišete ovaj termin?")
    ) {
      const result = await deleteTimeSlot(id);
      if (result.success) {
        loadData();
      } else {
        alert(result.error);
      }
    }
  };

  const filteredSlots = selectedDate
    ? timeSlots.filter(
        (slot) =>
          new Date(slot.datum).toISOString().split("T")[0] === selectedDate,
      )
    : timeSlots;

  const getStatusBadge = (slot) => {
    if (slot.slobodno === 0) return { text: "POPUNJEN", class: "badge-full" };
    if (slot.slobodno <= slot.maxDece * 0.2)
      return { text: "POSLEDNJA MESTA", class: "badge-last" };
    return { text: "SLOBODAN", class: "badge-free" };
  };

  if (loading) {
    return <div className="container loading">Učitavanje...</div>;
  }

  if (user?.role !== "vlasnik" && user?.role !== "admin") {
    return (
      <div className="container">
        <div
          className="glass-card"
          style={{ textAlign: "center", padding: "60px" }}
        >
          <h2>🔒 Pristup zabranjen</h2>
          <p>Samo vlasnici igraonica mogu upravljati terminima.</p>
        </div>
      </div>
    );
  }

  if (playrooms.length === 0) {
    return (
      <div className="container">
        <div
          className="glass-card"
          style={{ textAlign: "center", padding: "60px" }}
        >
          <h2>🏢 Nemate igraonicu</h2>
          <p>
            Prvo morate dodati igraonicu da biste mogli da upravljate terminima.
          </p>
          <button
            className="btn-primary"
            style={{ marginTop: "20px" }}
            onClick={() => (window.location.href = "/create-playroom")}
          >
            ✨ Dodaj igraonicu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container manage-slots-page">
      <div className="manage-header">
        <div>
          <h1>📅 Upravljanje terminima</h1>
          <p className="subtitle">
            Dodajte termine za vašu igraonicu i omogućite roditeljima da
            rezervišu
          </p>
        </div>
        <div className="header-buttons">
          <button
            className="btn-secondary"
            onClick={handleGenerateSlots}
            style={{ marginRight: "12px" }}
          >
            🔄 Generiši termine (30 dana)
          </button>
          <button
            className={`btn ${showForm ? "btn-outline" : "btn-primary"}`}
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "✖ Zatvori" : "+ Dodaj termin"}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="glass-card slot-form">
          <h2>✨ Kreiraj novi termin</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>🏢 Igraonica</label>
              <select
                name="playroomId"
                value={formData.playroomId}
                onChange={handleChange}
                required
              >
                {playrooms.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.naziv}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>📅 Datum</label>
                <input
                  type="date"
                  name="datum"
                  value={formData.datum}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>⏰ Od</label>
                <input
                  type="time"
                  name="vremeOd"
                  value={formData.vremeOd}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>⏰ Do</label>
                <input
                  type="time"
                  name="vremeDo"
                  value={formData.vremeDo}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>👥 Kapacitet (maks. dece)</label>
                <input
                  type="number"
                  name="maxDece"
                  value={formData.maxDece}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>💰 Cena po detetu (RSD)</label>
                <input
                  type="number"
                  name="cena"
                  value={formData.cena}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: "100%" }}
            >
              ✅ Kreiraj termin
            </button>
          </form>
        </div>
      )}

      <div className="slots-filter">
        <div className="filter-group">
          <label>🔍 Filtriraj po datumu</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            placeholder="Izaberi datum"
          />
          {selectedDate && (
            <button className="btn-outline" onClick={() => setSelectedDate("")}>
              ✖ Ukloni filter
            </button>
          )}
        </div>
      </div>

      <h2>📋 Tvoji termini</h2>
      {filteredSlots.length === 0 ? (
        <div className="glass-card empty-state">
          <p>📭 Još nemate nijedan termin.</p>
          <p>Kliknite na dugme "Dodaj termin" da kreirate prvi termin.</p>
          <button
            className="btn-secondary"
            onClick={handleGenerateSlots}
            style={{ marginTop: "16px" }}
          >
            🔄 Ili generišite termine za narednih 30 dana
          </button>
        </div>
      ) : (
        <div className="slots-list">
          {filteredSlots.map((slot) => {
            const status = getStatusBadge(slot);
            return (
              <div key={slot._id} className="glass-card slot-card">
                <div className="slot-status">
                  <span className={status.class}>{status.text}</span>
                </div>
                <div className="slot-info">
                  <h3>{slot.playroomId?.naziv}</h3>
                  <div className="slot-datetime">
                    <span className="slot-date">
                      📅{" "}
                      {new Date(slot.datum).toLocaleDateString("sr-RS", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                    <span className="slot-time">
                      ⏰ {slot.vremeOd} - {slot.vremeDo}
                    </span>
                  </div>
                  <div className="slot-stats">
                    <span>
                      👥 Slobodno:{" "}
                      <strong>
                        {slot.slobodno}/{slot.maxDece}
                      </strong>
                    </span>
                    <span>💰 {slot.cena} RSD/dete</span>
                  </div>
                </div>
                <button
                  className="btn-danger"
                  onClick={() => handleDelete(slot._id)}
                >
                  🗑 Obriši
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ManageTimeSlots;

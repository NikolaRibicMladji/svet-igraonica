import React, { useState, useEffect } from "react";
import {
  getUnverifiedPlayrooms,
  verifyPlayroom,
} from "../services/adminService";
import { useAuth } from "../context/AuthContext";
import "../styles/AdminPanel.css";

const AdminPanel = () => {
  const { user } = useAuth();
  const [playrooms, setPlayrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (user?.role === "admin") {
      loadUnverifiedPlayrooms();
    }
  }, [user]);

  const loadUnverifiedPlayrooms = async () => {
    setLoading(true);
    const result = await getUnverifiedPlayrooms();
    if (result.success) {
      setPlayrooms(result.data);
    }
    setLoading(false);
  };

  const handleVerify = async (id) => {
    const result = await verifyPlayroom(id);
    if (result.success) {
      setMessage("Igraonica je uspešno verifikovana!");
      loadUnverifiedPlayrooms();
      setTimeout(() => setMessage(""), 3000);
    } else {
      alert(result.error);
    }
  };

  if (user?.role !== "admin") {
    return (
      <div className="container">
        <h1>Pristup zabranjen</h1>
        <p>Samo administratori imaju pristup ovoj stranici.</p>
      </div>
    );
  }

  return (
    <div className="container admin-panel">
      <h1>Admin Panel</h1>

      {message && <div className="success-message">{message}</div>}

      <h2>Igraonice koje čekaju verifikaciju</h2>

      {loading ? (
        <p>Učitavanje...</p>
      ) : playrooms.length === 0 ? (
        <div className="empty-state">
          <p>🎉 Nema igraonica koje čekaju verifikaciju!</p>
        </div>
      ) : (
        <div className="admin-playrooms-list">
          {playrooms.map((playroom) => (
            <div key={playroom._id} className="admin-playroom-card">
              <div className="admin-playroom-info">
                <h3>{playroom.naziv}</h3>
                <p>
                  <strong>Vlasnik:</strong> {playroom.vlasnikId?.ime}{" "}
                  {playroom.vlasnikId?.prezime}
                </p>
                <p>
                  <strong>Email:</strong> {playroom.vlasnikId?.email}
                </p>
                <p>
                  <strong>Telefon:</strong> {playroom.vlasnikId?.telefon}
                </p>
                <p>
                  <strong>Adresa:</strong> {playroom.adresa}, {playroom.grad}
                </p>
                <p>
                  <strong>Kapacitet:</strong> {playroom.kapacitet} dece
                </p>
                <p>
                  <strong>Cena:</strong> {playroom.cenovnik?.osnovni} RSD
                </p>
                <p>
                  <strong>Opis:</strong> {playroom.opis}
                </p>
              </div>
              <button
                className="btn-verify"
                onClick={() => handleVerify(playroom._id)}
              >
                ✅ Verifikuj igraonicu
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;

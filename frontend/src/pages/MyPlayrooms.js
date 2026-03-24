import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getMyPlayrooms, deletePlayroom } from "../services/playroomService";
import { useAuth } from "../context/AuthContext";
import "../styles/Playrooms.css";

const MyPlayrooms = () => {
  const { user } = useAuth();
  const [playrooms, setPlayrooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMyPlayrooms();
  }, []);

  const loadMyPlayrooms = async () => {
    setLoading(true);
    const result = await getMyPlayrooms();
    if (result.success) {
      setPlayrooms(result.data);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (
      window.confirm("Da li ste sigurni da želite da obrišete ovu igraonicu?")
    ) {
      const result = await deletePlayroom(id);
      if (result.success) {
        loadMyPlayrooms();
      } else {
        alert(result.error);
      }
    }
  };

  if (loading) {
    return <div className="container loading">Učitavanje...</div>;
  }

  return (
    <div className="container playrooms-page">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>Moje igraonice</h1>
        <Link to="/create-playroom" className="btn btn-primary">
          + Dodaj novu igraonicu
        </Link>
      </div>

      {playrooms.length === 0 ? (
        <div className="empty-state">
          <h3>Još niste dodali nijednu igraonicu</h3>
          <p>Kliknite na dugme iznad da dodate vašu prvu igraonicu!</p>
        </div>
      ) : (
        <div className="playrooms-grid">
          {playrooms.map((playroom) => (
            <div key={playroom._id} className="playroom-card">
              <div className="playroom-image">🎪</div>
              <div className="playroom-info">
                <h2>{playroom.naziv}</h2>
                <div className="playroom-location">📍 {playroom.grad}</div>
                <div className="playroom-price">
                  {playroom.cenovnik?.osnovni} RSD
                </div>
                <div className="playroom-features">
                  <span className="feature-tag">
                    {playroom.verifikovan
                      ? "✅ Verifikovano"
                      : "⏳ Čeka verifikaciju"}
                  </span>
                  <span className="feature-tag">
                    👥 {playroom.kapacitet} dece
                  </span>
                </div>
                <div
                  style={{ display: "flex", gap: "10px", marginTop: "15px" }}
                >
                  <button
                    className="btn-view"
                    onClick={() =>
                      (window.location.href = `/playrooms/${playroom._id}`)
                    }
                  >
                    Pregled
                  </button>
                  <button
                    className="btn-danger"
                    style={{
                      padding: "10px",
                      borderRadius: "5px",
                      cursor: "pointer",
                    }}
                    onClick={() => handleDelete(playroom._id)}
                  >
                    Obriši
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPlayrooms;

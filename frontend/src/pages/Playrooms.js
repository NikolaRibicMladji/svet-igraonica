import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAllPlayrooms } from "../services/playroomService";
import "../styles/Playrooms.css";

const Playrooms = () => {
  const [playrooms, setPlayrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadPlayrooms();
  }, []);

  const loadPlayrooms = async () => {
    setLoading(true);
    const result = await getAllPlayrooms();
    if (result.success) {
      setPlayrooms(result.data);
    }
    setLoading(false);
  };

  const filteredPlayrooms = playrooms.filter(
    (playroom) =>
      playroom.naziv.toLowerCase().includes(filter.toLowerCase()) ||
      playroom.grad.toLowerCase().includes(filter.toLowerCase()),
  );

  const handleViewDetails = (id) => {
    navigate(`/playrooms/${id}`);
  };

  const handleBook = (id) => {
    navigate(`/book/${id}`);
  };

  if (loading) {
    return <div className="container loading">Učitavanje igraonica...</div>;
  }

  return (
    <div className="container playrooms-page">
      <h1>Sve igraonice</h1>
      <p>Pronađite savršeno mesto za igru vašeg deteta</p>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Pretraži po nazivu ili gradu..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="search-input"
        />
      </div>

      {filteredPlayrooms.length === 0 ? (
        <div className="empty-state">
          <h3>Nema pronađenih igraonica</h3>
          <p>Pokušajte sa drugim terminom za pretragu.</p>
        </div>
      ) : (
        <div className="playrooms-grid">
          {filteredPlayrooms.map((playroom) => (
            <div key={playroom._id} className="playroom-card">
              <div className="playroom-image">🎪</div>
              <div className="playroom-info">
                <h2>{playroom.naziv}</h2>
                <div className="playroom-location">
                  📍 {playroom.adresa}, {playroom.grad}
                </div>
                <div className="playroom-price">
                  {playroom.cenovnik?.osnovni} RSD <span>/ po detetu</span>
                </div>
                <div className="playroom-features">
                  {playroom.pogodnosti?.slice(0, 3).map((feature, index) => {
                    const featureNames = {
                      animatori: "🎭 Animatori",
                      kafic: "☕ Kafić",
                      parking: "🅿️ Parking",
                      rođendani: "🎂 Rođendani",
                      wifi: "📶 WiFi",
                      trampoline: "🤸 Trampoline",
                      kliziste: "⛸️ Klizalište",
                    };
                    return (
                      <span key={index} className="feature-tag">
                        {featureNames[feature] || feature}
                      </span>
                    );
                  })}
                  {playroom.pogodnosti?.length > 3 && (
                    <span className="feature-tag">
                      +{playroom.pogodnosti.length - 3}
                    </span>
                  )}
                </div>
                <div className="card-buttons">
                  <button
                    className="btn-view"
                    onClick={() => handleViewDetails(playroom._id)}
                  >
                    Detalji
                  </button>
                  <button
                    className="btn-book"
                    onClick={() => handleBook(playroom._id)}
                  >
                    Rezerviši
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

export default Playrooms;

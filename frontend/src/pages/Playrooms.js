import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import PlayroomFilters from "../components/PlayroomFilters";
import "../styles/Playrooms.css";

const Playrooms = () => {
  const [playrooms, setPlayrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(""); // Samo za pretragu po nazivu
  const [filters, setFilters] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    loadPlayrooms();
  }, [filters]);

  const loadPlayrooms = async () => {
    setLoading(true);

    const queryParams = new URLSearchParams();
    if (filters.grad && filters.grad !== "svi")
      queryParams.append("grad", filters.grad);
    if (filters.minCena) queryParams.append("minCena", filters.minCena);
    if (filters.maxCena) queryParams.append("maxCena", filters.maxCena);
    if (filters.minRating && filters.minRating !== "sve")
      queryParams.append("minRating", filters.minRating);
    if (filters.sortBy && filters.sortBy !== "newest")
      queryParams.append("sortBy", filters.sortBy);
    if (filters.pogodnosti && filters.pogodnosti.length > 0) {
      queryParams.append("pogodnosti", filters.pogodnosti.join(","));
    }

    try {
      // UMESTO fetch-a sa localhost-om, sada koristimo 'api'
      // On automatski dodaje "https://svet-igraonica.onrender.com/api" ispred
      const response = await api.get(`/playrooms?${queryParams.toString()}`);

      if (response.data.success) {
        setPlayrooms(response.data.data);
      }
    } catch (error) {
      console.error("Greška pri komunikaciji sa serverom:", error);
    }

    setLoading(false);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  // Pretraga po nazivu i gradu (lokalna pretraga)
  const filteredPlayrooms = playrooms.filter(
    (playroom) =>
      playroom.naziv?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      playroom.grad?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleViewDetails = (id) => {
    navigate(`/playrooms/${id}`);
  };

  // const handleBook = (id) => {
  // navigate(`/book/${id}`);
  //};

  if (loading) {
    return <div className="container loading">Učitavanje igraonica...</div>;
  }

  return (
    <div className="container playrooms-page">
      <h1>Sve igraonice</h1>
      <p>Pronađite savršeno mesto za igru vašeg deteta</p>

      {/* Filteri komponenta */}
      <PlayroomFilters
        onFilterChange={handleFilterChange}
        initialFilters={filters}
      />

      {/* Pretraga po nazivu - samo ovo je ostalo od starog filtera */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="🔍 Pretraži po nazivu igraonice ili gradu..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {filteredPlayrooms.length === 0 ? (
        <div className="empty-state">
          <h3>Nema pronađenih igraonica</h3>
          <p>Pokušajte sa drugim terminom za pretragu ili promenite filtere.</p>
        </div>
      ) : (
        <>
          <div className="results-count">
            Pronađeno <strong>{filteredPlayrooms.length}</strong> igraonica
          </div>

          <div className="playrooms-grid">
            {filteredPlayrooms.map((playroom) => {
              const mainImage =
                playroom.slike && playroom.slike.length > 0
                  ? playroom.slike.find((img) => img.isMain) ||
                    playroom.slike[0]
                  : null;

              return (
                <div key={playroom._id} className="playroom-card">
                  <div className="playroom-image">
                    {playroom.profilnaSlika?.url ? (
                      <img
                        src={playroom.profilnaSlika.url}
                        alt={playroom.naziv}
                      />
                    ) : playroom.slike && playroom.slike.length > 0 ? (
                      <img src={playroom.slike[0].url} alt={playroom.naziv} />
                    ) : (
                      <div className="no-image">🎪</div>
                    )}
                  </div>
                  <div className="playroom-info">
                    <h2>{playroom.naziv}</h2>
                    <div className="playroom-location">
                      📍 {playroom.adresa}, {playroom.grad}
                    </div>
                    <div className="playroom-free-features">
                      {playroom.besplatnePogodnosti &&
                      playroom.besplatnePogodnosti.length > 0 ? (
                        <div className="free-features-preview">
                          {playroom.besplatnePogodnosti
                            .slice(0, 3)
                            .map((feat, idx) => (
                              <span key={idx} className="free-feature-tag">
                                ✓ {feat}
                              </span>
                            ))}
                          {playroom.besplatnePogodnosti.length > 3 && (
                            <span className="free-feature-tag">
                              +{playroom.besplatnePogodnosti.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="no-free-features">
                          Nema navedenih pogodnosti
                        </span>
                      )}
                    </div>
                    <div className="playroom-rating">
                      <span className="stars">
                        {"★".repeat(Math.floor(playroom.rating || 0))}
                        {"☆".repeat(5 - Math.floor(playroom.rating || 0))}
                      </span>
                      <span className="rating-number">
                        {playroom.rating?.toFixed(1) || 0}
                      </span>
                      <span
                        className="review-count-link"
                        onClick={() =>
                          navigate(`/playrooms/${playroom._id}#reviews`)
                        }
                      >
                        ({playroom.reviewCount || 0})
                      </span>
                    </div>
                    <div className="card-buttons">
                      <button
                        className="btn-view"
                        onClick={() => handleViewDetails(playroom._id)}
                      >
                        Detalji
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default Playrooms;

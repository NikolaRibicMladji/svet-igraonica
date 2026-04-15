import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import PlayroomFilters from "../components/PlayroomFilters";
import PlayroomCoverFallback from "../components/PlayroomCoverFallback";
import "../styles/Playrooms.css";
import { normalizeText } from "../utils/normalizeText";

const Playrooms = () => {
  const [playrooms, setPlayrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    grad: "svi",
    minCena: "",
    maxCena: "",
    minRating: "sve",
    sortBy: "newest",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const loadPlayrooms = useCallback(async () => {
    setLoading(true);
    setError("");

    const queryParams = new URLSearchParams();

    if (filters.grad && filters.grad !== "svi") {
      queryParams.append("grad", normalizeText(filters.grad));
    }

    if (filters.minCena !== "" && filters.minCena !== null) {
      queryParams.append("minCena", String(filters.minCena));
    }

    if (filters.maxCena !== "" && filters.maxCena !== null) {
      queryParams.append("maxCena", String(filters.maxCena));
    }

    if (filters.minRating && filters.minRating !== "sve") {
      queryParams.append("minRating", String(filters.minRating));
    }

    if (filters.sortBy) {
      queryParams.append("sortBy", filters.sortBy);
    }

    try {
      const url = queryParams.toString()
        ? `/playrooms?${queryParams.toString()}`
        : "/playrooms";

      const response = await api.get(url);

      if (response.data?.success) {
        setPlayrooms(
          Array.isArray(response.data.data) ? response.data.data : [],
        );
      } else {
        setPlayrooms([]);
        setError("Greška pri učitavanju igraonica.");
      }
    } catch (err) {
      console.error("Greška pri komunikaciji sa serverom:", err);
      setPlayrooms([]);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Greška pri učitavanju igraonica.",
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadPlayrooms();
  }, [loadPlayrooms]);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
  }, []);

  const filteredPlayrooms = useMemo(() => {
    const term = normalizeText(searchTerm);

    if (!term) return playrooms;

    return playrooms.filter((playroom) => {
      const naziv = normalizeText(playroom.naziv);
      const grad = normalizeText(playroom.grad);

      return naziv.includes(term) || grad.includes(term);
    });
  }, [playrooms, searchTerm]);

  const handleViewDetails = (id) => {
    navigate(`/playrooms/${id}`);
  };

  if (loading) {
    return <div className="container loading">Učitavanje igraonica...</div>;
  }

  return (
    <div className="container playrooms-page">
      <h1>Sve igraonice</h1>
      <p>Pronađite savršeno mesto za igru vašeg deteta</p>

      <PlayroomFilters
        onFilterChange={handleFilterChange}
        initialFilters={filters}
      />

      <div className="search-bar">
        <input
          type="text"
          placeholder="🔍 Pretraži po nazivu igraonice ili gradu..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {error && <div className="error-message">{error}</div>}

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
              const imageUrl = playroom.profilnaSlika?.url || "";

              const ratingValue = Number(playroom.rating || 0);
              const filledStars = Math.max(
                0,
                Math.min(5, Math.floor(ratingValue)),
              );

              return (
                <div key={playroom._id} className="playroom-card">
                  <div className="playroom-image">
                    {imageUrl ? (
                      <img src={imageUrl} alt={playroom.naziv} />
                    ) : (
                      <PlayroomCoverFallback naziv={playroom.naziv} />
                    )}
                  </div>

                  <div className="playroom-info">
                    <h2>{playroom.naziv}</h2>

                    <div className="playroom-location">
                      📍 {playroom.adresa}, {playroom.grad}
                    </div>

                    <div className="playroom-contact-preview">
                      {/* TELEFON + EMAIL */}
                      <div className="contact-row">
                        {playroom.kontaktTelefon && (
                          <div className="contact-item">
                            {playroom.kontaktTelefon}
                          </div>
                        )}

                        {playroom.kontaktEmail && (
                          <a
                            href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(playroom.kontaktEmail)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="contact-item"
                          >
                            {playroom.kontaktEmail}
                          </a>
                        )}
                      </div>

                      {/* DRUŠTVENE MREŽE */}
                      <div className="social-row">
                        {playroom.drustveneMreze?.instagram && (
                          <a
                            href={playroom.drustveneMreze.instagram}
                            target="_blank"
                            rel="noreferrer"
                            className="social-item"
                          >
                            Instagram
                          </a>
                        )}

                        {playroom.drustveneMreze?.tiktok && (
                          <a
                            href={playroom.drustveneMreze.tiktok}
                            target="_blank"
                            rel="noreferrer"
                            className="social-item"
                          >
                            TikTok
                          </a>
                        )}

                        {playroom.drustveneMreze?.facebook && (
                          <a
                            href={playroom.drustveneMreze.facebook}
                            target="_blank"
                            rel="noreferrer"
                            className="social-item"
                          >
                            Facebook
                          </a>
                        )}

                        {playroom.drustveneMreze?.website && (
                          <a
                            href={playroom.drustveneMreze.website}
                            target="_blank"
                            rel="noreferrer"
                            className="social-item website-link"
                          >
                            Veb sajt
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="playroom-rating">
                      <span className="stars">
                        {"★".repeat(filledStars)}
                        {"☆".repeat(5 - filledStars)}
                      </span>

                      <span className="rating-number">
                        {ratingValue.toFixed(1)}
                      </span>

                      <span
                        className="review-count-link"
                        onClick={() =>
                          navigate(`/playrooms/${playroom._id}#reviews-section`)
                        }
                      >
                        ({playroom.reviewCount || 0})
                      </span>
                    </div>

                    <div className="card-buttons">
                      <button
                        type="button"
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

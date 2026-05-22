import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllPlayrooms } from "../services/playroomService";
import PlayroomFilters from "../components/PlayroomFilters";
import PlayroomCoverFallback from "../components/PlayroomCoverFallback";
import "../styles/Playrooms.css";
import { normalizeText } from "../utils/normalizeText";
import { getSafeExternalUrl } from "../utils/urlUtils";

const Playrooms = () => {
  const [playrooms, setPlayrooms] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filters, setFilters] = useState({
    grad: "svi",
    minRating: "sve",
    sortBy: "newest",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const observer = useRef(null);

  const loadPlayrooms = useCallback(async () => {
    if (page === 1) setLoading(true);
    setError("");

    try {
      const result = await getAllPlayrooms({
        page,
        limit: 12,
        grad:
          filters.grad && filters.grad !== "svi"
            ? normalizeText(filters.grad)
            : filters.grad,
        minRating: filters.minRating,
        sortBy: filters.sortBy,
        search: debouncedSearch,
      });

      if (result?.success) {
        const incoming = Array.isArray(result.data) ? result.data : [];

        setPlayrooms((prev) => {
          if (page === 1) return incoming;

          const existingIds = new Set(prev.map((item) => item._id));
          const merged = [...prev];

          incoming.forEach((item) => {
            if (!existingIds.has(item._id)) {
              merged.push(item);
            }
          });

          return merged;
        });

        const totalValue = result.total || 0;
        const pagesValue = result.pages || 1;

        setTotal(totalValue);
        setTotalPages(pagesValue);
        setHasMore(page < pagesValue);
      } else {
        setPlayrooms([]);
        setTotal(0);
        setTotalPages(1);
        setHasMore(false);
        setError(result?.error || "Greška pri učitavanju igraonica.");
      }
    } catch (err) {
      console.error("Greška pri komunikaciji sa serverom:", err);
      setPlayrooms([]);
      setTotal(0);
      setTotalPages(1);
      setHasMore(false);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Greška pri učitavanju igraonica.",
      );
    } finally {
      setLoading(false);
    }
  }, [filters, page, debouncedSearch]);

  useEffect(() => {
    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, []);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages || 1);
    }
  }, [page, totalPages]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchTerm]);

  useEffect(() => {
    loadPlayrooms();
  }, [loadPlayrooms]);

  useEffect(() => {
    if (!loading) {
      setLoadingMore(false);
    }
  }, [loading]);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));

    setPlayrooms([]);
    setPage(1);
    setHasMore(true);
  }, []);

  const handleViewDetails = (id) => {
    navigate(`/playrooms/${id}`);
  };
  const lastPlayroomRef = useCallback(
    (node) => {
      if (loading || loadingMore) return;

      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          setLoadingMore(true);
          setPage((prev) => prev + 1);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, loadingMore, hasMore],
  );

  return (
    <div className="container playrooms-page">
      {loading && <div className="loading-overlay">Učitavanje...</div>}
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
          onChange={(e) => {
            const value = e.target.value;

            setSearchTerm(value);
            setPlayrooms([]);
            setPage(1);
            setHasMore(true);
            setLoading(true);
          }}
          className="search-input"
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      {playrooms.length === 0 && !loading ? (
        <div className="empty-state">
          <h3>Nema pronađenih igraonica</h3>
          <p>Pokušajte sa drugim terminom za pretragu ili promenite filtere.</p>
        </div>
      ) : (
        <>
          <div className="results-count">
            Prikazano <strong>{playrooms.length}</strong> od{" "}
            <strong>{total}</strong> igraonica
          </div>

          <div className="playrooms-grid">
            {playrooms.map((playroom, index) => {
              const imageUrl = playroom.profilnaSlika?.url || "";
              const instagramUrl = getSafeExternalUrl(
                playroom.drustveneMreze?.instagram,
              );
              const tiktokUrl = getSafeExternalUrl(
                playroom.drustveneMreze?.tiktok,
              );
              const facebookUrl = getSafeExternalUrl(
                playroom.drustveneMreze?.facebook,
              );
              const websiteUrl = getSafeExternalUrl(
                playroom.drustveneMreze?.website,
              );
              const ratingValue = Number(playroom.rating || 0);
              const filledStars = Math.max(
                0,
                Math.min(5, Math.floor(ratingValue)),
              );

              return (
                <div
                  key={playroom._id}
                  className="playroom-card"
                  ref={index === playrooms.length - 1 ? lastPlayroomRef : null}
                >
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
                        {instagramUrl && (
                          <a
                            href={instagramUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="social-item"
                          >
                            Instagram
                          </a>
                        )}

                        {tiktokUrl && (
                          <a
                            href={tiktokUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="social-item"
                          >
                            TikTok
                          </a>
                        )}

                        {facebookUrl && (
                          <a
                            href={facebookUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="social-item"
                          >
                            Facebook
                          </a>
                        )}

                        {websiteUrl && (
                          <a
                            href={websiteUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="social-item website-link"
                          >
                            Web sajt
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
          {loadingMore && (
            <div className="loading-more">Učitavanje još igraonica...</div>
          )}

          {!hasMore && playrooms.length > 0 && (
            <div className="no-more-results">Nema više igraonica.</div>
          )}
        </>
      )}
    </div>
  );
};

export default Playrooms;

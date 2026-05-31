import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { getAllPlayrooms } from "../services/playroomService";
import PlayroomFilters from "../components/PlayroomFilters";
import PlayroomCoverFallback from "../components/PlayroomCoverFallback";
import "../styles/Playrooms.css";
import { normalizeText } from "../utils/normalizeText";
import { getSafeExternalUrl } from "../utils/urlUtils";

const getPhoneHref = (phone = "") => {
  const safePhone = String(phone || "")
    .trim()
    .replace(/(?!^\+)[^\d]/g, "");

  return safePhone ? `tel:${safePhone}` : "";
};

const getEmailHref = (email = "", playroomName = "") => {
  const safeEmail = String(email || "")
    .trim()
    .replace(/[\r\n]/g, "");

  if (!/^\S+@\S+\.\S+$/.test(safeEmail)) {
    return "";
  }

  const subject = encodeURIComponent(
    `Upit za igraonicu ${playroomName || ""}`.trim(),
  );

  const body = encodeURIComponent(
    "Poštovani,\n\nŽelim da pošaljem upit za vašu igraonicu.\n\n",
  );

  return `mailto:${safeEmail}?subject=${subject}&body=${body}`;
};

const isMobileDevice = () =>
  /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);

const copyToClipboard = async (text) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const input = document.createElement("input");
  input.value = text;
  input.setAttribute("readonly", "");
  input.style.position = "absolute";
  input.style.left = "-9999px";

  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  document.body.removeChild(input);
};

const PLAYROOMS_SCROLL_KEY = "svet_igraonica_playrooms_scroll_y";

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
    sortBy: "",
  });
  const [error, setError] = useState("");
  const [copiedPhoneId, setCopiedPhoneId] = useState("");
  const navigate = useNavigate();
  const observer = useRef(null);
  const searchInputRef = useRef(null);
  const hasLoadedOnce = useRef(false);

  const loadPlayrooms = useCallback(async () => {
    const shouldShowFullLoading = page === 1 && !hasLoadedOnce.current;

    if (shouldShowFullLoading) {
      setLoading(true);
    }
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
      if (shouldShowFullLoading) {
        setLoading(false);
      }

      hasLoadedOnce.current = true;
      setLoadingMore(false);
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
    const previousScrollRestoration = window.history.scrollRestoration;

    window.history.scrollRestoration = "manual";

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  useLayoutEffect(() => {
    const savedScrollY = sessionStorage.getItem(PLAYROOMS_SCROLL_KEY);

    if (!savedScrollY || loading || playrooms.length === 0) {
      return;
    }

    const scrollY = Number(savedScrollY);

    if (!Number.isFinite(scrollY)) {
      sessionStorage.removeItem(PLAYROOMS_SCROLL_KEY);
      return;
    }

    requestAnimationFrame(() => {
      window.scrollTo({
        top: scrollY,
        behavior: "auto",
      });

      sessionStorage.removeItem(PLAYROOMS_SCROLL_KEY);
    });
  }, [loading, playrooms.length]);

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
    if (!id) return;

    sessionStorage.setItem(PLAYROOMS_SCROLL_KEY, String(window.scrollY));

    navigate(`/playrooms/${encodeURIComponent(id)}`, {
      state: {
        fromPlayrooms: true,
      },
    });
  };

  const handleClearSearch = useCallback(() => {
    if (!searchTerm) return;

    setSearchTerm("");
    setDebouncedSearch("");
    setPlayrooms([]);
    setPage(1);
    setHasMore(true);
    searchInputRef.current?.focus();
  }, [searchTerm]);

  const handlePhoneClick = async (phone, playroomId) => {
    const href = getPhoneHref(phone);

    if (!phone || !href) return;

    if (isMobileDevice()) {
      window.location.href = href;
      return;
    }

    try {
      await copyToClipboard(phone);
      setCopiedPhoneId(playroomId);

      setTimeout(() => {
        setCopiedPhoneId("");
      }, 2000);
    } catch {
      setCopiedPhoneId("");
    }
  };

  const handleEmailClick = (emailHref) => {
    if (!emailHref) return;

    window.location.href = emailHref;
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
      {loading && (
        <div className="loading-overlay" role="status" aria-live="polite">
          Učitavanje...
        </div>
      )}
      <h1>Sve igraonice</h1>
      <p>Pronađite savršeno mesto za igru vašeg deteta</p>

      <PlayroomFilters
        onFilterChange={handleFilterChange}
        initialFilters={filters}
      />

      <div className="search-bar">
        <div className="search-input-wrap">
          <input
            ref={searchInputRef}
            id="playroom-search"
            type="text"
            aria-label="Pretraži igraonice"
            placeholder="🔍 Pretraži po nazivu igraonice ili gradu..."
            value={searchTerm}
            onChange={(e) => {
              const value = e.target.value;

              setSearchTerm(value);
              setPage(1);
              setHasMore(true);
            }}
            className="search-input"
          />

          {searchTerm && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={handleClearSearch}
              aria-label="Obriši pretragu"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

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
              const imageUrl = getSafeExternalUrl(playroom.profilnaSlika?.url);
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
              const phoneHref = getPhoneHref(playroom.kontaktTelefon);
              const emailHref = getEmailHref(
                playroom.kontaktEmail,
                playroom.naziv,
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
                  data-playroom-id={playroom._id}
                  ref={index === playrooms.length - 1 ? lastPlayroomRef : null}
                >
                  <div className="playroom-image">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={playroom.naziv}
                        loading="lazy"
                        decoding="async"
                      />
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
                        {playroom.kontaktTelefon && phoneHref && (
                          <span className="contact-phone-wrap">
                            <button
                              type="button"
                              className="contact-item contact-phone-button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handlePhoneClick(
                                  playroom.kontaktTelefon,
                                  playroom._id,
                                );
                              }}
                              aria-label={`Telefon ${playroom.kontaktTelefon}`}
                            >
                              {playroom.kontaktTelefon}
                            </button>

                            {copiedPhoneId === playroom._id && (
                              <span className="contact-copy-message">
                                Kopirano
                              </span>
                            )}
                          </span>
                        )}

                        {playroom.kontaktEmail && emailHref && (
                          <button
                            type="button"
                            className="contact-item contact-email-button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleEmailClick(emailHref);
                            }}
                            aria-label={`Pošalji email na ${playroom.kontaktEmail}`}
                          >
                            {playroom.kontaktEmail}
                          </button>
                        )}
                      </div>

                      {/* DRUŠTVENE MREŽE */}
                      <div className="social-row">
                        {instagramUrl && (
                          <a
                            href={instagramUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="social-item"
                          >
                            Instagram
                          </a>
                        )}

                        {tiktokUrl && (
                          <a
                            href={tiktokUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="social-item"
                          >
                            TikTok
                          </a>
                        )}

                        {facebookUrl && (
                          <a
                            href={facebookUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="social-item"
                          >
                            Facebook
                          </a>
                        )}

                        {websiteUrl && (
                          <a
                            href={websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
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

                      <button
                        type="button"
                        className="review-count-link"
                        aria-label={`Prikaži recenzije za ${playroom.naziv}`}
                        onClick={() =>
                          navigate(
                            `/playrooms/${encodeURIComponent(playroom._id)}#reviews-section`,
                            {
                              state: {
                                fromPlayrooms: true,
                              },
                            },
                          )
                        }
                      >
                        ({playroom.reviewCount || 0})
                      </button>
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

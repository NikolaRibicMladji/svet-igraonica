import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getPlayroomById } from "../services/playroomService";
import { normalizeText } from "../utils/textUtils";
import "../styles/PlayroomDetails.css";
import ImageModal from "../components/ImageModal";
import Reviews from "../components/Reviews";
import VideoPlayer from "../components/VideoPlayer";

const DAY_LABELS = {
  ponedeljak: "Ponedeljak",
  utorak: "Utorak",
  sreda: "Sreda",
  cetvrtak: "Četvrtak",
  petak: "Petak",
  subota: "Subota",
  nedelja: "Nedelja",
};

const PlayroomDetails = () => {
  const { id } = useParams();

  const navigate = useNavigate();

  const [playroom, setPlayroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        const result = await getPlayroomById(id);

        if (result?.success) {
          setPlayroom(result.data);
        } else {
          setPlayroom(null);
          setError(result?.error || "Greška pri učitavanju igraonice.");
        }
      } catch (err) {
        setPlayroom(null);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Greška pri učitavanju igraonice.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    if (
      (window.location.hash === "#reviews" ||
        window.location.hash === "#reviews-section") &&
      playroom
    ) {
      setTimeout(() => {
        const element = document.getElementById("reviews-section");
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 300);
    }
  }, [playroom]);

  const handleBook = () => {
    navigate(`/book/${id}`);
  };

  const openGalleryModal = (index) => {
    setSelectedImageIndex(index);
    setModalOpen(true);
  };

  const scrollToReviews = () => {
    document
      .getElementById("reviews-section")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  if (loading) {
    return <div className="container loading">Učitavanje...</div>;
  }

  if (error) {
    return (
      <div className="container">
        <h1>Greška</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!playroom) {
    return (
      <div className="container">
        <h1>Igraonica nije pronađena</h1>
      </div>
    );
  }

  const galleryImages = Array.isArray(playroom.slike) ? playroom.slike : [];

  const modalImages = galleryImages;

  const ratingValue = Number(playroom.rating || 0);
  const filledStars = Math.max(0, Math.min(5, Math.floor(ratingValue)));

  const cene = Array.isArray(playroom.cene) ? playroom.cene : [];

  const cenaDete = cene.find((c) => normalizeText(c.naziv) === "dete");

  const cenaRoditelj = cene.find((c) => normalizeText(c.naziv) === "roditelj");

  const ostaleCene = cene.filter((c) => {
    const naziv = normalizeText(c.naziv);
    return naziv !== "dete" && naziv !== "roditelj";
  });

  const getCenaTipLabel = (tip) => {
    if (tip === "po_osobi") return "po osobi";
    if (tip === "po_satu") return "po satu";
    if (tip === "fiksno") return "fiksno";
    return "";
  };

  return (
    <div className="container playroom-details">
      <button
        type="button"
        className="btn-back"
        onClick={() => navigate("/playrooms")}
      >
        ← Nazad na igraonice
      </button>

      <div className="details-card">
        {playroom.profilnaSlika?.url && (
          <div className="profile-image-container">
            <div className="profile-image-wrapper">
              <img
                src={playroom.profilnaSlika.url}
                alt={playroom.naziv}
                className="profile-image-detail"
              />
            </div>
          </div>
        )}

        <div className="details-header">
          <h1>{playroom.naziv}</h1>

          <div className="playroom-rating-large">
            <div className="stars-large">
              {"★".repeat(filledStars)}
              {"☆".repeat(5 - filledStars)}
            </div>

            <span className="rating-number-large">
              {ratingValue.toFixed(1)}
            </span>

            <span
              className="review-count-link-large"
              onClick={scrollToReviews}
              style={{
                cursor: "pointer",
                color: "#2196f3",
                textDecoration: "underline",
              }}
            >
              ({playroom.reviewCount || 0} recenzija)
            </span>
          </div>
        </div>

        <div className="details-location">
          📍 {playroom.adresa}, {playroom.grad}
        </div>

        <div className="details-grid">
          <div className="detail-item">
            <label>📞 Telefon</label>
            <p>{playroom.kontaktTelefon || "-"}</p>
          </div>

          <div className="detail-item">
            <label>📧 Email</label>
            {playroom.kontaktEmail ? (
              <a
                href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(playroom.kontaktEmail)}`}
                target="_blank"
                rel="noreferrer"
              >
                {playroom.kontaktEmail}
              </a>
            ) : (
              <p>-</p>
            )}
          </div>

          <div className="detail-item">
            <label>👶 Kapacitet dece</label>
            <p>{playroom.kapacitet?.deca || 0} dece</p>
          </div>

          <div className="detail-item">
            <label>👨‍👩‍👧 Kapacitet roditelja</label>
            <p>
              {playroom.kapacitet?.roditelji
                ? `${playroom.kapacitet.roditelji} roditelja`
                : "Neograničeno"}
            </p>
          </div>
          <div className="detail-item">
            <label>⏰ Režim rezervacije</label>
            <p>
              {playroom.rezimRezervacije === "fiksno"
                ? `Fiksni termini (${playroom.trajanjeTermina || 60} min)`
                : "Fleksibilno od-do"}
            </p>
          </div>
        </div>
        <div className="detail-item full-width">
          <label>📝 Opis</label>
          <p className="description-text">{playroom.opis || "-"}</p>
        </div>
        <div className="details-price">
          <div className="price-buttons">
            <button
              type="button"
              className="btn-price"
              onClick={() => setShowPriceModal(true)}
            >
              💰 Cenovnik
            </button>

            <button type="button" className="btn-book" onClick={handleBook}>
              📅 Rezerviši
            </button>
          </div>
        </div>

        <div className="details-working-hours">
          <h3>Radno vreme</h3>
          <div className="hours-list">
            {Object.entries(playroom.radnoVreme || {}).map(([dan, vreme]) => {
              const isZatvoreno =
                vreme?.radi === false || (!vreme?.od && !vreme?.do);

              return (
                <div key={dan} className="hour-item">
                  <span className="day">{DAY_LABELS[dan] || dan}:</span>
                  {isZatvoreno ? (
                    <span className="closed">Zatvoreno</span>
                  ) : (
                    <span>
                      {vreme?.od || "09:00"} - {vreme?.do || "20:00"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {playroom.drustveneMreze && (
          <div className="detail-item full-width">
            <label>🌐 Društvene mreže</label>
            <div className="social-links-manage">
              {playroom.drustveneMreze.instagram && (
                <a
                  href={playroom.drustveneMreze.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="social-link-small instagram"
                >
                  Instagram
                </a>
              )}

              {playroom.drustveneMreze.facebook && (
                <a
                  href={playroom.drustveneMreze.facebook}
                  target="_blank"
                  rel="noreferrer"
                  className="social-link-small facebook"
                >
                  Facebook
                </a>
              )}

              {playroom.drustveneMreze.tiktok && (
                <a
                  href={playroom.drustveneMreze.tiktok}
                  target="_blank"
                  rel="noreferrer"
                  className="social-link-small tiktok"
                >
                  TikTok
                </a>
              )}

              {playroom.drustveneMreze.website && (
                <a
                  href={playroom.drustveneMreze.website}
                  target="_blank"
                  rel="noreferrer"
                  className="social-link-small website"
                >
                  Veb sajt
                </a>
              )}
            </div>
          </div>
        )}

        {galleryImages.length > 0 && (
          <div className="details-gallery">
            <h3>📸 Galerija slika</h3>
            <div className="gallery-grid">
              {galleryImages.map((img, idx) => (
                <div
                  key={img.publicId || img.public_id || img.url || idx}
                  className="gallery-item"
                  onClick={() => openGalleryModal(idx)}
                >
                  <img src={img.url} alt={`Slika ${idx + 1}`} />
                </div>
              ))}
            </div>
          </div>
        )}

        {modalOpen && modalImages.length > 0 && (
          <ImageModal
            images={modalImages}
            currentIndex={selectedImageIndex}
            onClose={() => setModalOpen(false)}
          />
        )}

        {Array.isArray(playroom.videoGalerija) &&
        playroom.videoGalerija.length > 0 ? (
          <div className="details-video-gallery">
            <h3>🎥 Video galerija</h3>
            <div className="video-gallery-grid">
              {playroom.videoGalerija.map((video, idx) => (
                <VideoPlayer
                  key={video.publicId || video.public_id || video.url || idx}
                  video={video}
                />
              ))}
            </div>
          </div>
        ) : (
          <div
            style={{
              margin: "20px 0",
              padding: "20px",
              background: "#fff3e0",
              borderRadius: "12px",
              textAlign: "center",
            }}
          >
            <p>📹 Još nema dodatih video snimaka za ovu igraonicu.</p>
          </div>
        )}
        <Reviews playroomId={playroom._id} />
      </div>

      {showPriceModal && (
        <div className="price-modal" onClick={() => setShowPriceModal(false)}>
          <div
            className="price-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="price-modal-header">
              <h2>Cenovnik - {playroom.naziv}</h2>
              <button
                type="button"
                className="price-modal-close"
                onClick={() => setShowPriceModal(false)}
              >
                ✖
              </button>
            </div>

            <div className="price-modal-body">
              <div className="price-group">
                <h3>💰 Cene</h3>

                {cenaDete ? (
                  <div className="price-item">
                    <span>Deca:</span>
                    <strong>{cenaDete.cena} RSD</strong>
                    {getCenaTipLabel(cenaDete.tip) && (
                      <span className="price-type">
                        ({getCenaTipLabel(cenaDete.tip)})
                      </span>
                    )}
                    {cenaDete.opis && (
                      <span className="price-desc">({cenaDete.opis})</span>
                    )}
                  </div>
                ) : (
                  <div className="price-item">
                    <span>Deca:</span>
                    <strong>besplatno</strong>
                  </div>
                )}

                {cenaRoditelj ? (
                  <div className="price-item">
                    <span>Roditelji:</span>
                    <strong>{cenaRoditelj.cena} RSD</strong>
                    {getCenaTipLabel(cenaRoditelj.tip) && (
                      <span className="price-type">
                        ({getCenaTipLabel(cenaRoditelj.tip)})
                      </span>
                    )}
                    {cenaRoditelj.opis && (
                      <span className="price-desc">({cenaRoditelj.opis})</span>
                    )}
                  </div>
                ) : (
                  <div className="price-item">
                    <span>Roditelji:</span>
                    <strong>besplatno</strong>
                  </div>
                )}

                {ostaleCene.map((cena, idx) => (
                  <div key={`${cena.naziv}-${idx}`} className="price-item">
                    <span>{cena.naziv}:</span>
                    <strong>{cena.cena} RSD</strong>
                    {getCenaTipLabel(cena.tip) && (
                      <span className="price-type">
                        ({getCenaTipLabel(cena.tip)})
                      </span>
                    )}
                    {cena.opis && (
                      <span className="price-desc">({cena.opis})</span>
                    )}
                  </div>
                ))}
              </div>

              {Array.isArray(playroom.paketi) && playroom.paketi.length > 0 && (
                <div className="price-group">
                  <h3>🎁 Paketi</h3>
                  {playroom.paketi.map((paket, idx) => (
                    <div key={`${paket.naziv}-${idx}`} className="price-item">
                      <span>{paket.naziv}:</span>
                      <strong>{paket.cena} RSD</strong>
                      {paket.tip === "po_osobi" && (
                        <span className="price-type">(po osobi)</span>
                      )}
                      {paket.tip === "po_satu" && (
                        <span className="price-type">(po satu)</span>
                      )}
                      {paket.tip === "fiksno" && (
                        <span className="price-type">(fiksno)</span>
                      )}
                      {paket.opis && (
                        <span className="price-desc">({paket.opis})</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {Array.isArray(playroom.dodatneUsluge) &&
                playroom.dodatneUsluge.length > 0 && (
                  <div className="price-group">
                    <h3>🎪 Dodatne pogodnosti</h3>
                    {playroom.dodatneUsluge.map((usluga, idx) => (
                      <div
                        key={`${usluga.naziv}-${idx}`}
                        className="price-item"
                      >
                        <span>{usluga.naziv}:</span>
                        <strong>{usluga.cena} RSD</strong>
                        {usluga.tip === "po_osobi" && (
                          <span className="price-type">(po osobi)</span>
                        )}
                        {usluga.tip === "po_satu" && (
                          <span className="price-type">(po satu)</span>
                        )}
                        {usluga.opis && (
                          <span className="price-desc">({usluga.opis})</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

              {Array.isArray(playroom.besplatnePogodnosti) &&
                playroom.besplatnePogodnosti.length > 0 && (
                  <div className="price-group">
                    <h3>✨ Besplatne pogodnosti</h3>
                    <div className="free-features">
                      {playroom.besplatnePogodnosti.map((feat, idx) => (
                        <span key={`${feat}-${idx}`} className="free-feature">
                          ✓ {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayroomDetails;

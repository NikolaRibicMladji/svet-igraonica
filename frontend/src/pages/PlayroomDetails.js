import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPlayroomById } from "../services/playroomService";
import { useAuth } from "../context/AuthContext";
import "../styles/PlayroomDetails.css";
import ImageModal from "../components/ImageModal";
import Reviews from "../components/Reviews";
import VideoPlayer from "../components/VideoPlayer";

const PlayroomDetails = () => {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [playroom, setPlayroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const reviewsRef = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    loadPlayroom();
  }, [id]);

  useEffect(() => {
    // Proveri da li URL ima #reviews hash
    if (window.location.hash === "#reviews" && playroom) {
      setTimeout(() => {
        const element = document.getElementById("reviews-section");
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 500);
    }
  }, [playroom]);

  const loadPlayroom = async () => {
    setLoading(true);
    const result = await getPlayroomById(id);
    if (result.success) {
      setPlayroom(result.data);
    }
    setLoading(false);
  };

  const handleBook = () => {
    navigate(`/book/${id}`);
  };

  if (loading) {
    return <div className="container loading">Učitavanje...</div>;
  }

  if (!playroom) {
    return (
      <div className="container">
        <h1>Igraonica nije pronađena</h1>
      </div>
    );
  }

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
    <div className="container playroom-details">
      <button className="btn-back" onClick={() => navigate("/playrooms")}>
        ← Nazad na igraonice
      </button>

      <div className="details-card">
        {/* Profilna slika - manja */}
        {playroom.profilnaSlika?.url && (
          <div className="profile-image-container">
            <img
              src={playroom.profilnaSlika.url}
              alt={playroom.naziv}
              className="profile-image-detail"
            />
          </div>
        )}

        <div className="details-header">
          <h1>{playroom.naziv}</h1>
          <div className="playroom-rating-large">
            <div className="stars-large">
              {"★".repeat(Math.floor(playroom.rating || 0))}
              {"☆".repeat(5 - Math.floor(playroom.rating || 0))}
            </div>
            <span className="rating-number-large">
              {playroom.rating?.toFixed(1) || 0}
            </span>
            <span
              className="review-count-link-large"
              onClick={() =>
                document
                  .getElementById("reviews-section")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
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

        <div className="details-info-three-columns">
          {/* Leva kolona - Kontakt */}
          <div className="info-column">
            <div className="info-item">
              <strong>📞 Telefon:</strong> {playroom.kontaktTelefon}
            </div>
            <div className="info-item">
              <strong>📧 Email:</strong> {playroom.kontaktEmail}
            </div>
          </div>

          {/* Srednja kolona - Društvene mreže */}
          <div className="info-column">
            <div className="social-links">
              <h4>🌐 Posetite nas</h4>
              <div className="social-buttons">
                {playroom.drustveneMreze?.instagram && (
                  <a
                    href={playroom.drustveneMreze.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-btn instagram"
                  >
                    📸 Instagram
                  </a>
                )}
                {playroom.drustveneMreze?.facebook && (
                  <a
                    href={playroom.drustveneMreze.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-btn facebook"
                  >
                    📘 Facebook
                  </a>
                )}
                {playroom.drustveneMreze?.tiktok && (
                  <a
                    href={playroom.drustveneMreze.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-btn tiktok"
                  >
                    🎵 TikTok
                  </a>
                )}
                {playroom.drustveneMreze?.website && (
                  <a
                    href={playroom.drustveneMreze.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-btn website"
                  >
                    🌐 Veb sajt
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Desna kolona - Kapacitet */}
          <div className="info-column">
            <div className="info-item">
              <strong>👶 Kapacitet dece:</strong>{" "}
              {playroom.kapacitet?.deca || 0}
            </div>
            <div className="info-item">
              <strong>👨‍👩‍👧 Kapacitet roditelja:</strong>{" "}
              {playroom.kapacitet?.roditelji
                ? `${playroom.kapacitet.roditelji} roditelja`
                : "Neograničeno"}
            </div>
          </div>
        </div>

        {/* Dugme za cenovnik i rezervaciju */}
        <div className="details-price">
          <div className="price-buttons">
            <button
              className="btn-price"
              onClick={() => setShowPriceModal(true)}
            >
              💰 Cenovnik
            </button>
            <button className="btn-book" onClick={handleBook}>
              📅 Rezerviši
            </button>
          </div>
        </div>

        <div className="details-features">
          <h3>✨ Besplatne pogodnosti</h3>
          {playroom.besplatnePogodnosti &&
          playroom.besplatnePogodnosti.length > 0 ? (
            <div className="features-list">
              {playroom.besplatnePogodnosti.map((feature, index) => (
                <span key={index} className="feature-badge free-feature">
                  ✓ {feature}
                </span>
              ))}
            </div>
          ) : (
            <p className="no-features">Nema navedenih besplatnih pogodnosti.</p>
          )}
        </div>

        <div className="details-working-hours">
          <h3>Radno vreme</h3>
          <div className="hours-list">
            {Object.entries(playroom.radnoVreme || {}).map(([dan, vreme]) => {
              const dani = {
                ponedeljak: "Ponedeljak",
                utorak: "Utorak",
                sreda: "Sreda",
                cetvrtak: "Četvrtak",
                petak: "Petak",
                subota: "Subota",
                nedelja: "Nedelja",
              };

              // Proveri da li je dan zatvoren
              const isZatvoreno =
                vreme?.radi === false || (!vreme?.od && !vreme?.do);

              return (
                <div key={dan} className="hour-item">
                  <span className="day">{dani[dan]}:</span>
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
        {/* Galerija slika */}
        {playroom.slike && playroom.slike.length > 0 && (
          <div className="details-gallery">
            <h3>📸 Galerija slika</h3>
            <div className="gallery-grid">
              {playroom.slike.map((img, idx) => (
                <div
                  key={idx}
                  className="gallery-item"
                  onClick={() => {
                    setSelectedImageIndex(idx);
                    setModalOpen(true);
                  }}
                >
                  <img src={img.url} alt={`Slika ${idx + 1}`} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal za listanje slika */}
        {modalOpen && (
          <ImageModal
            images={playroom.slike}
            currentIndex={selectedImageIndex}
            onClose={() => setModalOpen(false)}
          />
        )}
      </div>

      {/* Video galerija */}
      {playroom.videoGalerija && playroom.videoGalerija.length > 0 ? (
        <div className="details-video-gallery">
          <h3>🎥 Video galerija</h3>
          <div className="video-gallery-grid">
            {playroom.videoGalerija.map((video, idx) => (
              <div key={idx} className="video-gallery-item">
                <video
                  controls
                  className="video-player-inline"
                  src={video.url}
                  style={{
                    width: "100%",
                    borderRadius: "12px",
                    background: "#000",
                  }}
                >
                  Vaš browser ne podržava video.
                </video>
                <div className="video-title">{video.naziv}</div>
              </div>
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

      {/* Modal za cenovnik */}
      {showPriceModal && (
        <div className="price-modal" onClick={() => setShowPriceModal(false)}>
          <div
            className="price-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="price-modal-header">
              <h2>Cenovnik - {playroom.naziv}</h2>
              <button
                className="price-modal-close"
                onClick={() => setShowPriceModal(false)}
              >
                ✖
              </button>
            </div>
            <div className="price-modal-body">
              {/* Osnovne cene */}
              <div className="price-group">
                <h3>🎟️ Ulaznice</h3>
                <div className="price-item">
                  <span>Cena po detetu:</span>
                  <strong>
                    {playroom.osnovnaCena || playroom.cenovnik?.osnovni} RSD
                  </strong>
                </div>
                {playroom.cene &&
                  playroom.cene.map((cena, idx) => (
                    <div key={idx} className="price-item">
                      <span>{cena.naziv}:</span>
                      <strong>{cena.cena} RSD</strong>
                      {cena.opis && (
                        <span className="price-desc">({cena.opis})</span>
                      )}
                    </div>
                  ))}
              </div>

              {/* Fiksni paketi */}
              {playroom.paketi && playroom.paketi.length > 0 && (
                <div className="price-group">
                  <h3>🎁 Fiksni paketi</h3>
                  {playroom.paketi.map((paket, idx) => (
                    <div key={idx} className="price-item">
                      <span>{paket.naziv}:</span>
                      <strong>{paket.cena} RSD</strong>
                      {paket.opis && (
                        <span className="price-desc">({paket.opis})</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Opcione pogodnosti */}
              {playroom.dodatneUsluge && playroom.dodatneUsluge.length > 0 && (
                <div className="price-group">
                  <h3>🎪 Dodatne pogodnosti (opciono)</h3>
                  {playroom.dodatneUsluge.map((usluga, idx) => (
                    <div key={idx} className="price-item">
                      <span>{usluga.naziv}:</span>
                      <strong>{usluga.cena} RSD</strong>
                      {usluga.tip === "po_osobi" && (
                        <span className="price-type">(po osobi)</span>
                      )}
                      {usluga.opis && (
                        <span className="price-desc">({usluga.opis})</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Besplatne pogodnosti */}
              {playroom.besplatnePogodnosti &&
                playroom.besplatnePogodnosti.length > 0 && (
                  <div className="price-group">
                    <h3>✨ Besplatne pogodnosti</h3>
                    <div className="free-features">
                      {playroom.besplatnePogodnosti.map((feat, idx) => (
                        <span key={idx} className="free-feature">
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

      <Reviews playroomId={playroom._id} />
    </div>
  );
};

export default PlayroomDetails;

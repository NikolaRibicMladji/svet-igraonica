import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPlayroomById } from "../services/playroomService";
import { useAuth } from "../context/AuthContext";
import "../styles/PlayroomDetails.css";
import ImageGallery from "../components/ImageGallery";

const PlayroomDetails = () => {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [playroom, setPlayroom] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlayroom();
  }, [id]);

  const loadPlayroom = async () => {
    setLoading(true);
    const result = await getPlayroomById(id);
    if (result.success) {
      setPlayroom(result.data);
    }
    setLoading(false);
  };

  const handleBook = () => {
    if (!isAuthenticated) {
      navigate("/login");
    } else {
      navigate(`/book/${id}`);
    }
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
        {/* Galerija slika */}
        <ImageGallery
          images={playroom.slike || []}
          playroomName={playroom.naziv}
        />
        <div className="details-header">
          <h1>{playroom.naziv}</h1>
          <div className="rating">⭐ 5.0</div>
        </div>

        <div className="details-location">
          📍 {playroom.adresa}, {playroom.grad}
        </div>

        <div className="details-info-grid">
          <div className="info-item">
            <strong>📞 Telefon:</strong> {playroom.kontaktTelefon}
          </div>
          <div className="info-item">
            <strong>📧 Email:</strong> {playroom.kontaktEmail}
          </div>
          <div className="info-item">
            <strong>👥 Kapacitet:</strong> {playroom.kapacitet} dece
          </div>
        </div>

        <div className="details-description">
          <h3>Opis</h3>
          <p>{playroom.opis}</p>
        </div>

        <div className="details-price">
          <h3>Cenovnik</h3>
          <div className="price-list">
            <div className="price-item">
              <span>Osnovna cena:</span>
              <strong>{playroom.cenovnik?.osnovni} RSD</strong>
              <span>/ po detetu</span>
            </div>
            {playroom.cenovnik?.produzeno && (
              <div className="price-item">
                <span>Produženo:</span>
                <strong>{playroom.cenovnik.produzeno} RSD</strong>
              </div>
            )}
            {playroom.cenovnik?.vikend && (
              <div className="price-item">
                <span>Vikend:</span>
                <strong>{playroom.cenovnik.vikend} RSD</strong>
              </div>
            )}
          </div>
        </div>

        <div className="details-features">
          <h3>Pogodnosti</h3>
          <div className="features-list">
            {playroom.pogodnosti?.map((feature, index) => (
              <span key={index} className="feature-badge">
                {featureNames[feature] || feature}
              </span>
            ))}
          </div>
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
              return (
                <div key={dan} className="hour-item">
                  <span className="day">{dani[dan]}:</span>
                  <span>
                    {vreme?.od} - {vreme?.do}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <button className="btn-book-large" onClick={handleBook}>
          Rezerviši termin
        </button>
      </div>
    </div>
  );
};

export default PlayroomDetails;

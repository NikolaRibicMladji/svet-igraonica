import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMyPlayrooms, updatePlayroom } from "../services/playroomService";
import { useAuth } from "../context/AuthContext";
import PlayroomForm from "../components/PlayroomForm";
import "../styles/ManagePlayroom.css";

const ManagePlayroom = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [playroom, setPlayroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadPlayroom();
  }, []);

  const loadPlayroom = async () => {
    setLoading(true);
    setError("");
    const result = await getMyPlayrooms();
    if (result.success && result.data.length > 0) {
      setPlayroom(result.data[0]);
    } else {
      navigate("/create-playroom");
    }
    setLoading(false);
  };

  const handleUpdate = async (formData) => {
    setError("");
    const result = await updatePlayroom(playroom._id, formData);
    if (result.success) {
      setMessage("Podaci su uspešno ažurirani");
      setEditing(false);
      loadPlayroom();
      setTimeout(() => setMessage(""), 3000);
    } else {
      setError(result.error || "Greška pri ažuriranju");
      setTimeout(() => setError(""), 3000);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Učitavanje podataka...</p>
        </div>
      </div>
    );
  }

  if (!playroom) {
    return null;
  }

  return (
    <div className="manage-playroom-page">
      <div className="page-header">
        <h1>🏢 Moja igraonica</h1>
        <p className="page-subtitle">
          Pregledajte i upravljajte podacima vaše igraonice
        </p>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="playroom-status">
        <div
          className={`status-badge ${playroom.verifikovan ? "verified" : "pending"}`}
        >
          {playroom.verifikovan ? (
            <>
              <span className="status-icon">✅</span>
              <span>Verifikovano</span>
            </>
          ) : (
            <>
              <span className="status-icon">⏳</span>
              <span>Čeka verifikaciju</span>
            </>
          )}
        </div>
      </div>

      {!editing ? (
        <div className="playroom-details-card">
          <div className="playroom-details-header">
            <div className="header-title">
              <h2>{playroom.naziv}</h2>
            </div>
            <button className="btn-edit" onClick={() => setEditing(true)}>
              <span>✏️</span> Uredi podatke
            </button>
          </div>

          <div className="details-grid">
            <div className="detail-item">
              <label>📍 Adresa</label>
              <p>
                {playroom.adresa}, {playroom.grad}
              </p>
            </div>
            <div className="detail-item">
              <label>📞 Telefon</label>
              <p>{playroom.kontaktTelefon}</p>
            </div>
            <div className="detail-item">
              <label>📧 Email</label>
              <p>{playroom.kontaktEmail}</p>
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
              <label>💰 Osnovna cena</label>
              <p>{playroom.osnovnaCena} RSD / dete</p>
            </div>

            {/* Profilna slika */}
            {playroom.profilnaSlika?.url && (
              <div className="detail-item full-width">
                <label>🖼️ Profilna slika</label>
                <div className="profile-image">
                  <img src={playroom.profilnaSlika.url} alt="Profilna" />
                </div>
              </div>
            )}

            {/* Video galerija */}
            {playroom.videoGalerija && playroom.videoGalerija.length > 0 && (
              <div className="detail-item full-width">
                <label>
                  🎥 Video galerija ({playroom.videoGalerija.length})
                </label>
                <div className="videos-list-manage">
                  {playroom.videoGalerija.map((video, idx) => (
                    <div key={idx} className="video-manage-item">
                      <video
                        controls
                        className="video-manage-player"
                        src={video.url}
                        style={{
                          width: "200px",
                          borderRadius: "8px",
                          background: "#000",
                        }}
                      />
                      <div className="video-manage-info">
                        <span className="video-manage-name">{video.naziv}</span>
                        {video.trajanje > 0 && (
                          <span className="video-manage-duration">
                            {Math.floor(video.trajanje / 60)}:
                            {(video.trajanje % 60).toString().padStart(2, "0")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ostale slike */}
            {playroom.slike && playroom.slike.length > 0 && (
              <div className="detail-item full-width">
                <label>📸 Galerija slika ({playroom.slike.length})</label>
                <div className="gallery-images">
                  {playroom.slike.map((img, idx) => (
                    <div key={idx} className="gallery-image">
                      <img src={img.url} alt={`Slika ${idx + 1}`} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ostale cene */}
            {playroom.cene && playroom.cene.length > 0 && (
              <div className="detail-item full-width">
                <label>💰 Ostale cene</label>
                <div className="items-list">
                  {playroom.cene.map((item, idx) => (
                    <div key={idx} className="item-display">
                      <span className="item-name">{item.naziv}</span>
                      <span className="item-price">{item.cena} RSD</span>
                      {item.opis && (
                        <span className="item-opis">{item.opis}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Paketi */}
            {playroom.paketi && playroom.paketi.length > 0 && (
              <div className="detail-item full-width">
                <label>🎁 Paketi</label>
                <div className="items-list">
                  {playroom.paketi.map((item, idx) => (
                    <div key={idx} className="item-display">
                      <span className="item-name">{item.naziv}</span>
                      <span className="item-price">{item.cena} RSD</span>
                      {item.opis && (
                        <span className="item-opis">{item.opis}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dodatne usluge */}
            {playroom.dodatneUsluge && playroom.dodatneUsluge.length > 0 && (
              <div className="detail-item full-width">
                <label>🎪 Dodatne usluge</label>
                <div className="items-list">
                  {playroom.dodatneUsluge.map((item, idx) => (
                    <div key={idx} className="item-display">
                      <span className="item-name">{item.naziv}</span>
                      <span className="item-price">{item.cena} RSD</span>
                      <span className="item-type">
                        {item.tip === "po_osobi" ? "po osobi" : "fiksno"}
                      </span>
                      {item.opis && (
                        <span className="item-opis">{item.opis}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Besplatne pogodnosti */}
            {playroom.besplatnePogodnosti &&
              playroom.besplatnePogodnosti.length > 0 && (
                <div className="detail-item full-width">
                  <label>✨ Besplatne pogodnosti</label>
                  <div className="free-features-list">
                    {playroom.besplatnePogodnosti.map((item, idx) => (
                      <span key={idx} className="free-badge">
                        ✓ {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {/* Radno vreme */}
            <div className="detail-item full-width">
              <label>⏰ Radno vreme</label>
              <div className="working-hours">
                {Object.entries(playroom.radnoVreme || {}).map(
                  ([dan, vreme]) => {
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
                      <div key={dan} className="hour-row">
                        <span className="day-name">{dani[dan]}:</span>
                        {vreme?.radi === false ? (
                          <span className="closed">Zatvoreno</span>
                        ) : (
                          <span className="hours">
                            {vreme?.od || "09:00"} - {vreme?.do || "20:00"}
                          </span>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            </div>

            <div className="detail-item full-width">
              <label>📝 Opis</label>
              <p className="description-text">{playroom.opis}</p>
            </div>
          </div>
        </div>
      ) : (
        <PlayroomForm
          initialData={playroom}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
          isEditing={true}
        />
      )}
    </div>
  );
};

export default ManagePlayroom;

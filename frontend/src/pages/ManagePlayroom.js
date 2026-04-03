import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyPlayrooms, updatePlayroom } from "../services/playroomService";
import { useAuth } from "../context/AuthContext";
import PlayroomForm from "../components/PlayroomForm";
import "../styles/ManagePlayroom.css";
import PlayroomCoverFallback from "../components/PlayroomCoverFallback";

const DAY_LABELS = {
  ponedeljak: "Ponedeljak",
  utorak: "Utorak",
  sreda: "Sreda",
  cetvrtak: "Četvrtak",
  petak: "Petak",
  subota: "Subota",
  nedelja: "Nedelja",
};

const ManagePlayroom = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [playroom, setPlayroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading) {
      loadPlayroom();
    }
  }, [authLoading]);

  const loadPlayroom = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getMyPlayrooms();

      if (
        result?.success &&
        Array.isArray(result.data) &&
        result.data.length > 0
      ) {
        setPlayroom(result.data[0]);
      } else if (user?.role === "vlasnik" || user?.role === "admin") {
        navigate("/create-playroom");
      } else {
        setPlayroom(null);
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Greška pri učitavanju igraonice.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (formData) => {
    if (!playroom?._id) return;

    setError("");
    setMessage("");

    try {
      const result = await updatePlayroom(playroom._id, formData);

      if (result?.success) {
        setMessage(result?.message || "Podaci su uspešno ažurirani.");
        setEditing(false);
        await loadPlayroom();

        setTimeout(() => {
          setMessage("");
        }, 3000);
      } else {
        setError(result?.error || "Greška pri ažuriranju.");
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Greška pri ažuriranju.",
      );
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Učitavanje podataka...</p>
        </div>
      </div>
    );
  }

  if (user?.role !== "vlasnik" && user?.role !== "admin") {
    return (
      <div className="container">
        <h1>Pristup zabranjen</h1>
        <p>Samo vlasnici igraonica mogu da upravljaju ovom stranicom.</p>
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
          className={`status-badge ${
            playroom.verifikovan ? "verified" : "pending"
          }`}
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

            <button
              type="button"
              className="btn-edit"
              onClick={() => setEditing(true)}
            >
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
              <p>{playroom.kontaktTelefon || "-"}</p>
            </div>

            <div className="detail-item">
              <label>📧 Email</label>
              <p>{playroom.kontaktEmail || "-"}</p>
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
              <p>{playroom.osnovnaCena || 0} RSD / dete</p>
            </div>

            <div className="detail-item">
              <label>👨‍👩‍👧 Cena za roditelje</label>
              <p>
                {!playroom.cenaRoditelja ||
                playroom.cenaRoditelja.tip === "ne_naplacuje"
                  ? "Ne naplaćuje se"
                  : playroom.cenaRoditelja.tip === "fiksno"
                    ? `${playroom.cenaRoditelja.iznos} RSD fiksno`
                    : `${playroom.cenaRoditelja.iznos} RSD po roditelju`}
              </p>
            </div>

            <div className="detail-item full-width">
              <label>🖼️ Profilna slika</label>
              <div className="profile-image">
                {playroom.profilnaSlika?.url ? (
                  <img src={playroom.profilnaSlika.url} alt="Profilna slika" />
                ) : (
                  <PlayroomCoverFallback naziv={playroom.naziv} />
                )}
              </div>
            </div>

            {Array.isArray(playroom.videoGalerija) &&
              playroom.videoGalerija.length > 0 && (
                <div className="detail-item full-width">
                  <label>
                    🎥 Video galerija ({playroom.videoGalerija.length})
                  </label>

                  <div className="videos-list-manage">
                    {playroom.videoGalerija.map((video, idx) => (
                      <div
                        key={
                          video.publicId || video.public_id || video.url || idx
                        }
                        className="video-manage-item"
                      >
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
                          <span className="video-manage-name">
                            {video.naziv || `Video ${idx + 1}`}
                          </span>
                          {Number(video.trajanje) > 0 && (
                            <span className="video-manage-duration">
                              {Math.floor(Number(video.trajanje) / 60)}:
                              {(Number(video.trajanje) % 60)
                                .toString()
                                .padStart(2, "0")}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {Array.isArray(playroom.slike) && playroom.slike.length > 0 && (
              <div className="detail-item full-width">
                <label>📸 Galerija slika ({playroom.slike.length})</label>
                <div className="gallery-images">
                  {playroom.slike.map((img, idx) => (
                    <div
                      key={img.publicId || img.public_id || img.url || idx}
                      className="gallery-image"
                    >
                      <img src={img.url} alt={`Slika ${idx + 1}`} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(playroom.cene) && playroom.cene.length > 0 && (
              <div className="detail-item full-width">
                <label>💰 Ostale cene</label>
                <div className="items-list">
                  {playroom.cene.map((item, idx) => (
                    <div key={`${item.naziv}-${idx}`} className="item-display">
                      <span className="item-name">{item.naziv}</span>
                      <span className="item-price">{item.cena} RSD</span>
                      {item.tip && (
                        <span className="item-type">
                          {item.tip === "po_osobi" ? "po osobi" : "fiksno"}
                        </span>
                      )}
                      {item.opis && (
                        <span className="item-opis">{item.opis}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(playroom.paketi) && playroom.paketi.length > 0 && (
              <div className="detail-item full-width">
                <label>🎁 Paketi</label>
                <div className="items-list">
                  {playroom.paketi.map((item, idx) => (
                    <div key={`${item.naziv}-${idx}`} className="item-display">
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

            {Array.isArray(playroom.dodatneUsluge) &&
              playroom.dodatneUsluge.length > 0 && (
                <div className="detail-item full-width">
                  <label>🎪 Dodatne usluge</label>
                  <div className="items-list">
                    {playroom.dodatneUsluge.map((item, idx) => (
                      <div
                        key={`${item.naziv}-${idx}`}
                        className="item-display"
                      >
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

            {Array.isArray(playroom.besplatnePogodnosti) &&
              playroom.besplatnePogodnosti.length > 0 && (
                <div className="detail-item full-width">
                  <label>✨ Besplatne pogodnosti</label>
                  <div className="free-features-list">
                    {playroom.besplatnePogodnosti.map((item, idx) => (
                      <span key={`${item}-${idx}`} className="free-badge">
                        ✓ {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

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
                      📸 Instagram
                    </a>
                  )}

                  {playroom.drustveneMreze.facebook && (
                    <a
                      href={playroom.drustveneMreze.facebook}
                      target="_blank"
                      rel="noreferrer"
                      className="social-link-small facebook"
                    >
                      📘 Facebook
                    </a>
                  )}

                  {playroom.drustveneMreze.tiktok && (
                    <a
                      href={playroom.drustveneMreze.tiktok}
                      target="_blank"
                      rel="noreferrer"
                      className="social-link-small tiktok"
                    >
                      🎵 TikTok
                    </a>
                  )}

                  {playroom.drustveneMreze.website && (
                    <a
                      href={playroom.drustveneMreze.website}
                      target="_blank"
                      rel="noreferrer"
                      className="social-link-small website"
                    >
                      🌐 Veb sajt
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="detail-item full-width">
              <label>⏰ Radno vreme</label>
              <div className="working-hours">
                {Object.entries(playroom.radnoVreme || {}).map(
                  ([dan, vreme]) => (
                    <div key={dan} className="hour-row">
                      <span className="day-name">
                        {DAY_LABELS[dan] || dan}:
                      </span>
                      {vreme?.radi === false ? (
                        <span className="closed">Zatvoreno</span>
                      ) : (
                        <span className="hours">
                          {vreme?.od || "09:00"} - {vreme?.do || "20:00"}
                        </span>
                      )}
                    </div>
                  ),
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

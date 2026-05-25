import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getMyPlayrooms,
  updatePlayroom,
  deletePlayroom,
  deactivatePlayroom,
} from "../services/playroomService";
import { useAuth } from "../context/AuthContext";
import PlayroomForm from "../components/PlayroomForm";
import "../styles/ManagePlayroom.css";
import PlayroomCoverFallback from "../components/PlayroomCoverFallback";
import { getSafeExternalUrl } from "../utils/urlUtils";

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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivatePassword, setDeactivatePassword] = useState("");
  const [updating, setUpdating] = useState(false);

  const loadPlayroom = useCallback(async () => {
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
  }, [navigate, user?.role]);

  useEffect(() => {
    if (!authLoading) {
      loadPlayroom();
    }
  }, [authLoading, loadPlayroom]);

  const handleUpdate = async (formData) => {
    if (updating) return;
    if (!playroom?._id) return;

    setUpdating(true);
    setError("");
    setMessage("");

    try {
      const { _pendingMedia, ...playroomPayload } = formData;

      const result = await updatePlayroom(playroom._id, playroomPayload);

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
    } finally {
      setUpdating(false);
    }
  };

  const handleDeactivatePlayroom = async () => {
    if (deactivating) return;

    if (!playroom?._id) return;

    setDeactivating(true);
    setError("");
    setMessage("");

    const result = await deactivatePlayroom(playroom._id, deactivatePassword);

    setDeactivating(false);

    if (result.success) {
      setDeactivatePassword("");
      setDeactivateModalOpen(false);
      setMessage(
        result.message ||
          "Igraonica je deaktivirana i više nije javno dostupna.",
      );

      await loadPlayroom();

      setTimeout(() => {
        setMessage("");
      }, 4000);
    } else {
      setError(result.error || "Greška pri deaktivaciji igraonice.");
    }
  };

  const handleDeletePlayroom = async (e) => {
    e.preventDefault();

    if (deleting) return;

    if (!playroom?._id) return;

    if (deleteConfirmText !== "OBRISI") {
      setError("Morate uneti OBRISI da biste potvrdili brisanje.");
      return;
    }

    setDeleting(true);
    setError("");
    setMessage("");

    const result = await deletePlayroom(playroom._id);

    setDeleting(false);

    if (result.success) {
      setMessage(result.message || "Igraonica je obrisana.");
      setDeleteModalOpen(false);
      setDeleteConfirmText("");

      setTimeout(() => {
        navigate("/create-playroom");
      }, 1200);
    } else {
      setError(result.error || "Greška pri brisanju igraonice.");
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

  const profileImageUrl = getSafeExternalUrl(playroom.profilnaSlika?.url);

  const instagramUrl = getSafeExternalUrl(playroom.drustveneMreze?.instagram);
  const facebookUrl = getSafeExternalUrl(playroom.drustveneMreze?.facebook);
  const tiktokUrl = getSafeExternalUrl(playroom.drustveneMreze?.tiktok);
  const websiteUrl = getSafeExternalUrl(playroom.drustveneMreze?.website);

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
          {playroom.status === "deaktiviran" ? (
            <>
              <span className="status-icon">⛔</span>
              <span>Deaktivirano</span>
            </>
          ) : playroom.verifikovan ? (
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

            <div className="playroom-actions">
              <button
                type="button"
                className="btn-edit"
                onClick={() => setEditing(true)}
              >
                <span>✏️</span> Uredi podatke
              </button>

              {playroom.status !== "deaktiviran" && (
                <button
                  type="button"
                  className="btn-delete-playroom"
                  onClick={() => {
                    setDeactivateModalOpen(true);
                    setError("");
                    setMessage("");
                  }}
                  disabled={deactivating}
                >
                  <span>⛔</span>

                  {deactivating ? "Deaktivacija..." : "Deaktiviraj igraonicu"}
                </button>
              )}

              {playroom.status === "deaktiviran" && (
                <button
                  type="button"
                  className="btn-delete-playroom"
                  onClick={() => {
                    setDeleteModalOpen(true);
                    setError("");
                    setMessage("");
                  }}
                >
                  <span>🗑️</span> Obriši igraonicu
                </button>
              )}
            </div>
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
            <div className="detail-item full-width">
              <label>📝 Opis</label>
              <p className="description-text">{playroom.opis}</p>
            </div>
            <div className="detail-item full-width">
              <label>🖼️ Profilna slika</label>
              <div className="profile-image">
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt="Profilna slika" />
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
                    {playroom.videoGalerija.map((video, idx) => {
                      const videoUrl = getSafeExternalUrl(video.url);

                      if (!videoUrl) return null;

                      return (
                        <div
                          key={
                            video.publicId ||
                            video.public_id ||
                            video.url ||
                            idx
                          }
                          className="video-manage-item"
                        >
                          <video
                            controls
                            className="video-manage-player"
                            src={videoUrl}
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
                      );
                    })}
                  </div>
                </div>
              )}

            {Array.isArray(playroom.slike) && playroom.slike.length > 0 && (
              <div className="detail-item full-width">
                <label>📸 Galerija slika ({playroom.slike.length})</label>
                <div className="gallery-images">
                  {playroom.slike.map((img, idx) => {
                    const imageUrl = getSafeExternalUrl(img.url);

                    if (!imageUrl) return null;

                    return (
                      <div
                        key={img.publicId || img.public_id || img.url || idx}
                        className="gallery-image"
                      >
                        <img src={imageUrl} alt={`Slika ${idx + 1}`} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {Array.isArray(playroom.cene) && playroom.cene.length > 0 && (
              <div className="detail-item full-width">
                <label>💰 Cene</label>
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
                  {instagramUrl && (
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="social-link-small instagram"
                    >
                      📸 Instagram
                    </a>
                  )}

                  {facebookUrl && (
                    <a
                      href={facebookUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="social-link-small facebook"
                    >
                      📘 Facebook
                    </a>
                  )}

                  {tiktokUrl && (
                    <a
                      href={tiktokUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="social-link-small tiktok"
                    >
                      🎵 TikTok
                    </a>
                  )}

                  {websiteUrl && (
                    <a
                      href={websiteUrl}
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
          </div>
        </div>
      ) : (
        <PlayroomForm
          initialData={playroom}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
          isEditing={true}
          submitting={updating}
        />
      )}
      {deactivateModalOpen && (
        <div
          className="delete-playroom-overlay"
          onClick={() => {
            if (!deactivating) setDeactivateModalOpen(false);
          }}
        >
          <div
            className="delete-playroom-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="delete-playroom-close"
              onClick={() => {
                if (!deactivating) setDeactivateModalOpen(false);
              }}
              disabled={deactivating}
            >
              ✖
            </button>

            <h2>Deaktivacija igraonice</h2>

            <p>
              Igraonica više neće biti javno dostupna i neće primati nove
              rezervacije.
            </p>

            <p>Postojeće rezervacije ostaju aktivne dok se ne završe.</p>

            <label>Unesite lozinku za potvrdu</label>

            <input
              type="password"
              value={deactivatePassword}
              onChange={(e) => setDeactivatePassword(e.target.value)}
              placeholder="Lozinka"
              required
            />
            <button
              type="button"
              className="confirm-delete-playroom-btn"
              onClick={handleDeactivatePlayroom}
              disabled={deactivating || !deactivatePassword.trim()}
            >
              {deactivating ? "Deaktivacija..." : "Potvrdi deaktivaciju"}
            </button>
          </div>
        </div>
      )}
      {deleteModalOpen && (
        <div
          className="delete-playroom-overlay"
          onClick={() => {
            if (!deleting) setDeleteModalOpen(false);
          }}
        >
          <div
            className="delete-playroom-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="delete-playroom-close"
              onClick={() => {
                if (!deleting) setDeleteModalOpen(false);
              }}
              disabled={deleting}
            >
              ✖
            </button>

            <h2>Brisanje igraonice</h2>

            <p>
              Ova akcija je trajna. Brisanjem igraonice brišu se i svi njeni
              termini. Ako postoje aktivne rezervacije, sistem neće dozvoliti
              brisanje.
            </p>

            <form onSubmit={handleDeletePlayroom}>
              <label>
                Za potvrdu unesite <strong>OBRISI</strong>
              </label>

              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="OBRISI"
                required
              />

              <button
                type="submit"
                className="confirm-delete-playroom-btn"
                disabled={deleting}
              >
                {deleting ? "Brisanje..." : "Trajno obriši igraonicu"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagePlayroom;

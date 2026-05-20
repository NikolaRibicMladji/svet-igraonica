==================================================
FILE: CreatePlayroom.js
==================================================
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PlayroomForm from "../components/PlayroomForm";
import { createPlayroom } from "../services/playroomService";
import { useAuth } from "../context/AuthContext";

const CreatePlayroom = () => {
const { user, loading, loadUser } = useAuth();
const [syncingUser, setSyncingUser] = useState(false);
const navigate = useNavigate();

useEffect(() => {
const syncUserEmail = async () => {
if (!loading && user && !user.email) {
setSyncingUser(true);
await loadUser();
setSyncingUser(false);
}
};

    syncUserEmail();

}, [loading, user, loadUser]);
if (loading || syncingUser) {
return <div className="container loading">Učitavanje...</div>;
}

const handleSubmit = async (data) => {
const result = await createPlayroom(data);

    if (result?.success) {
      navigate("/manage-playroom");
    } else {
      throw new Error(result?.error || "Greška pri kreiranju igraonice");
    }

};

const handleCancel = () => {
navigate("/");
};

// 🔒 Zaštita rute
if (user?.role !== "vlasnik" && user?.role !== "admin") {
return (

<div className="container">
<h1>Pristup zabranjen</h1>
<p>Samo vlasnici mogu da kreiraju igraonice.</p>
</div>
);
}

const ownerEmail = (
user?.email ||
localStorage.getItem("pendingOwnerEmail") ||
""
)
.trim()
.toLowerCase();

return (

<div className="container">
<PlayroomForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isEditing={false}
        ownerEmail={ownerEmail}
      />
</div>
);
};

export default CreatePlayroom;

==================================================
FILE: ManagePlayroom.js
==================================================
import React, { useEffect, useState } from "react";
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
if (!playroom?.\_id) return;

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

const handleDeactivatePlayroom = async () => {
if (!playroom?.\_id) return;

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
      {deactivateModalOpen && (
        <div
          className="delete-playroom-overlay"
          onClick={() => setDeactivateModalOpen(false)}
        >
          <div
            className="delete-playroom-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="delete-playroom-close"
              onClick={() => setDeactivateModalOpen(false)}
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
          onClick={() => setDeleteModalOpen(false)}
        >
          <div
            className="delete-playroom-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="delete-playroom-close"
              onClick={() => setDeleteModalOpen(false)}
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

==================================================
FILE: PlayroomForm.js
==================================================
import React from "react";
import "../styles/CreatePlayroom.css";
import BasicInfoSection from "./playroom-form/BasicInfoSection";
import CapacitySection from "./playroom-form/CapacitySection";
import SocialLinksSection from "./playroom-form/SocialLinksSection";
import WorkingHoursSection from "./playroom-form/WorkingHoursSection";
import ImagesSection from "./playroom-form/ImagesSection";
import VideosSection from "./playroom-form/VideosSection";
import BookingModeSection from "./playroom-form/BookingModeSection";
import AdditionalPricesSection from "./playroom-form/AdditionalPricesSection";
import PackagesSection from "./playroom-form/PackagesSection";
import AdditionalServicesSection from "./playroom-form/AdditionalServicesSection";
import BenefitsSection from "./playroom-form/BenefitsSection";
import { DEFAULT_DANI, usePlayroomForm } from "../hooks/usePlayroomForm";
import { useAuth } from "../context/AuthContext";

const PlayroomForm = ({
initialData,
onSubmit,
onCancel,
isEditing = false,
ownerEmail = "",
}) => {
const { user } = useAuth();
const {
formData,
error,
errors,
uploading,
uploadingVideo,
slike,
profilnaSlika,
videoGalerija,
noviVideo,
videoNaziv,
cene,
novaCena,
paketi,
noviPaket,
submitting,
dodatneUsluge,
novaUsluga,
besplatnePogodnosti,
novaPogodnost,
drustveneMreze,
radnoVreme,
setVideoNaziv,
setNovaCena,
setNoviPaket,
setNovaUsluga,
setNovaPogodnost,
handleChange,

    handleDrustveneMrezeChange,
    handleVideoChange,
    handleAddVideo,
    handleRemoveVideo,
    handleRadnoVremeChange,
    toggleDan,
    handleAddCena,
    handleRemoveCena,
    handleAddPaket,
    handleRemovePaket,
    handleAddUsluga,
    handleRemoveUsluga,
    handleAddPogodnost,
    handleRemovePogodnost,
    handleFileChange,
    removeImage,
    removeProfilna,
    handleSubmit,

} = usePlayroomForm({
initialData,
onSubmit,
ownerEmail: ownerEmail || user?.email || "",
});

return (
<>
{submitting && (

<div className="global-loading">
<div className="global-spinner"></div>
</div>
)}
<form onSubmit={handleSubmit} className="edit-form full-form">
<h2>{isEditing ? "✏️ Uredi igraonicu" : "✨ Dodaj novu igraonicu"}</h2>

        {error && <div className="error-message">{error}</div>}

        {Object.keys(errors).length > 0 && (
          <div className="top-form-error">{Object.values(errors)[0]}</div>
        )}

        <BasicInfoSection
          formData={formData}
          handleChange={handleChange}
          errors={errors}
          ownerEmail={ownerEmail || user?.email || ""}
        />

        <CapacitySection
          formData={formData}
          handleChange={handleChange}
          errors={errors}
        />

        <BookingModeSection formData={formData} handleChange={handleChange} />

        <ImagesSection
          uploading={uploading}
          slike={slike}
          profilnaSlika={profilnaSlika}
          handleFileChange={handleFileChange}
          removeProfilna={removeProfilna}
          removeImage={removeImage}
        />

        <VideosSection
          uploadingVideo={uploadingVideo}
          videoGalerija={videoGalerija}
          noviVideo={noviVideo}
          videoNaziv={videoNaziv}
          setVideoNaziv={setVideoNaziv}
          handleVideoChange={handleVideoChange}
          handleAddVideo={handleAddVideo}
          handleRemoveVideo={handleRemoveVideo}
        />

        <AdditionalPricesSection
          novaCena={novaCena}
          setNovaCena={setNovaCena}
          cene={cene}
          handleAddCena={handleAddCena}
          handleRemoveCena={handleRemoveCena}
        />
        {errors.cenePaketi && (
          <div className="field-error cenePaketi-error" tabIndex="-1">
            {errors.cenePaketi}
          </div>
        )}

        <PackagesSection
          noviPaket={noviPaket}
          setNoviPaket={setNoviPaket}
          paketi={paketi}
          handleAddPaket={handleAddPaket}
          handleRemovePaket={handleRemovePaket}
        />

        <AdditionalServicesSection
          novaUsluga={novaUsluga}
          setNovaUsluga={setNovaUsluga}
          dodatneUsluge={dodatneUsluge}
          handleAddUsluga={handleAddUsluga}
          handleRemoveUsluga={handleRemoveUsluga}
        />

        <BenefitsSection
          novaPogodnost={novaPogodnost}
          setNovaPogodnost={setNovaPogodnost}
          besplatnePogodnosti={besplatnePogodnosti}
          handleAddPogodnost={handleAddPogodnost}
          handleRemovePogodnost={handleRemovePogodnost}
        />

        <SocialLinksSection
          drustveneMreze={drustveneMreze}
          handleDrustveneMrezeChange={handleDrustveneMrezeChange}
        />

        <WorkingHoursSection
          dani={DEFAULT_DANI}
          radnoVreme={radnoVreme}
          toggleDan={toggleDan}
          handleRadnoVremeChange={handleRadnoVremeChange}
        />

        <div className="form-actions">
          <button type="button" className="btn-cancel" onClick={onCancel}>
            Otkaži
          </button>
          <button
            type="submit"
            className="btn-submit"
            disabled={uploading || uploadingVideo || submitting}
          >
            {submitting ? (
              <>
                <span className="btn-spinner"></span>
                {isEditing ? "Čuvam promene..." : "Kreiram igraonicu..."}
              </>
            ) : uploading ? (
              "Uploadujem slike..."
            ) : uploadingVideo ? (
              "Uploadujem video..."
            ) : isEditing ? (
              "💾 Sačuvaj promene"
            ) : (
              "✨ Kreiraj igraonicu"
            )}
          </button>
        </div>
      </form>
    </>

);
};

export default PlayroomForm;

==================================================
FILE: playroomController.js
==================================================
const Playroom = require("../models/Playroom");
const Booking = require("../models/Booking");
const TimeSlot = require("../models/TimeSlot");
const bcrypt = require("bcryptjs");
const PLAYROOM_STATUS = require("../constants/playroomStatus");
const BOOKING_STATUS = require("../constants/bookingStatus");
const {
createPlayroomWithSlots,
verifyPlayroomAndGenerateSlots,
regenerateSlotsForPlayroom,
} = require("../services/playroomService");
const User = require("../models/User");
const {
sendPlayroomVerificationNotification,
} = require("../utils/emailService");
const { syncTimeSlotsWithWorkingHours } = require("../utils/generateTimeSlots");
const isEqual = require("lodash.isequal");
const {
normalizeText,
normalizeDisplayText,
} = require("../utils/normalizeText");
const normalizeRadnoVreme = (radnoVreme = {}) => {
const days = [
"ponedeljak",
"utorak",
"sreda",
"cetvrtak",
"petak",
"subota",
"nedelja",
];

const normalized = {};

for (const day of days) {
const value = radnoVreme?.[day] ?? null;
if (!value) {
normalized[day] = { radi: false };
continue;
}
const radi = value.radi === true;

    if (!radi) {
      normalized[day] = { radi: false };
    } else {
      normalized[day] = {
        od: value.od || "",
        do: value.do || "",
        radi: true,
      };
    }

}

return normalized;
};

// @desc Kreiraj novu igraonicu (samo vlasnici)
// @route POST /api/playrooms
// @access Private (vlasnik ili admin)
exports.createPlayroom = async (req, res, next) => {
try {
const body = req.validated.body;
body.vlasnikId = req.user.id;

    const ownerUser = await User.findById(req.user.id).select("email");

    const existingOwnerPlayroom = await Playroom.findOne({
      vlasnikId: req.user.id,
    });

    if (existingOwnerPlayroom) {
      return res.status(400).json({
        success: false,
        message: "Već imate registrovanu igraonicu.",
      });
    }

    if (!ownerUser?.email) {
      return res.status(401).json({
        success: false,
        message: "Korisnik nije pronađen ili nema email.",
      });
    }

    const normalizedNaziv = normalizeText(body.naziv?.trim());
    const normalizedGrad = normalizeText(body.grad?.trim());
    const normalizedAdresa = normalizeText(body.adresa?.trim());

    const postojiNaziv = await Playroom.findOne({
      nazivNormalized: normalizedNaziv,
      gradNormalized: normalizedGrad,
    });

    if (postojiNaziv) {
      return res.status(400).json({
        success: false,
        message: "Igraonica sa ovim nazivom već postoji u ovom gradu.",
      });
    }

    const postojiAdresa = await Playroom.findOne({
      adresaNormalized: normalizedAdresa,
      gradNormalized: normalizedGrad,
    });

    if (postojiAdresa) {
      return res.status(400).json({
        success: false,
        message: "Igraonica sa ovom adresom već postoji u ovom gradu.",
      });
    }

    const trimmedNaziv = body.naziv?.trim() || "";
    const trimmedGrad = body.grad?.trim() || "";

    const result = await createPlayroomWithSlots({
      ...body,
      naziv: trimmedNaziv,
      nazivNormalized: normalizedNaziv,
      grad: trimmedGrad,
      gradNormalized: normalizedGrad,
      adresa: body.adresa?.trim(),
      adresaNormalized: normalizedAdresa,
      kontaktEmail: ownerUser.email.trim().toLowerCase(),
    });
    const owner = await User.findById(req.user.id).select("ime prezime email");

    sendPlayroomVerificationNotification(result.playroom, owner).catch(
      (err) => {
        console.error(
          "Greška pri slanju emaila za verifikaciju igraonice:",
          err,
        );
      },
    );

    res.status(201).json({
      success: true,
      data: result.playroom,
      message: `Igraonica je kreirana. ${
        result.slotResult?.createdCount || 0
      } termina je automatski generisano.`,
      slotWarning: result.slotError || null,
    });

} catch (error) {
next(error);
}
};

// @desc Dohvati sve verifikovane igraonice (sa filtriranjem)
// @route GET /api/playrooms
// @access Public
exports.getAllPlayrooms = async (req, res, next) => {
try {
const { grad, minRating, sortBy, search } = req.query;
const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
const limit = Math.max(parseInt(req.query.limit, 10) || 12, 1);
const skip = (page - 1) \* limit;

    const query = {
      verifikovan: true,
      status: PLAYROOM_STATUS.AKTIVAN,
    };

    if (grad && grad !== "svi") {
      query.gradNormalized = normalizeText(grad);
    }
    if (search && search.trim()) {
      const normalizedSearch = normalizeText(search.trim());

      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { nazivNormalized: { $regex: `^${normalizedSearch}` } },
          { gradNormalized: { $regex: `^${normalizedSearch}` } },
        ],
      });
    }

    if (minRating && minRating !== "sve") {
      query.rating = { $gte: parseInt(minRating, 10) };
    }

    let sort = { createdAt: -1 };

    if (sortBy === "rating") {
      sort = { rating: -1, createdAt: -1 };
    }

    const [playrooms, total] = await Promise.all([
      Playroom.find(query).select("-__v").sort(sort).skip(skip).limit(limit),
      Playroom.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: playrooms.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: playrooms,
    });

} catch (error) {
next(error);
}
};

// @desc Dohvati jednu igraonicu po ID
// @route GET /api/playrooms/:id
// @access Public
exports.getPlayroomById = async (req, res, next) => {
try {
const playroom = await Playroom.findById(req.params.id);

    if (!playroom) {
      return res.status(404).json({
        success: false,
        message: "Igraonica nije pronađena",
      });
    }

    const isAdmin = req.user?.role === "admin";
    const isOwner = playroom.vlasnikId?.toString() === req.user?.id;

    if (
      (!playroom.verifikovan || playroom.status !== PLAYROOM_STATUS.AKTIVAN) &&
      !isAdmin &&
      !isOwner
    ) {
      return res.status(403).json({
        success: false,
        message: "Ova igraonica nije javno dostupna",
      });
    }

    const data = playroom.toObject();

    // ❌ ukloni privatno
    delete data.vlasnikId;
    delete data.__v;
    delete data.createdAt;
    delete data.updatedAt;

    // ❌ ukloni email ako NE želiš javno
    // delete data.kontaktEmail;

    res.status(200).json({
      success: true,
      data,
    });

} catch (error) {
next(error);
}
};

// @desc Dohvati svoje igraonice (za vlasnika)
// @route GET /api/playrooms/mine/my-playrooms
// @access Private (vlasnik)
exports.getMyPlayrooms = async (req, res, next) => {
try {
const playrooms = await Playroom.find({ vlasnikId: req.user.id }).sort({
createdAt: -1,
});

    res.status(200).json({
      success: true,
      count: playrooms.length,
      data: playrooms,
    });

} catch (error) {
next(error);
}
};

// @desc Ažuriraj igraonicu
// @route PUT /api/playrooms/:id
// @access Private (vlasnik te igraonice ili admin)
exports.updatePlayroom = async (req, res, next) => {
try {
const body = req.validated.body;
let playroom = await Playroom.findById(req.params.id);

    if (!playroom) {
      return res.status(404).json({
        success: false,
        message: "Igraonica nije pronađena",
      });
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Nemate pravo da menjate ovu igraonicu",
      });
    }

    const oldRadnoVreme = normalizeRadnoVreme(playroom.radnoVreme);
    const hasRadnoVremeUpdate = Object.prototype.hasOwnProperty.call(
      body,
      "radnoVreme",
    );
    const newRadnoVreme = hasRadnoVremeUpdate
      ? normalizeRadnoVreme(body.radnoVreme)
      : oldRadnoVreme;

    const oldRezimRezervacije = playroom.rezimRezervacije || "fleksibilno";
    const oldTrajanjeTermina = Number(playroom.trajanjeTermina) || 60;
    const oldVremePripremeTermina = Number(playroom.vremePripremeTermina) || 0;

    const hasRezimRezervacijeUpdate = Object.prototype.hasOwnProperty.call(
      body,
      "rezimRezervacije",
    );

    const hasTrajanjeTerminaUpdate = Object.prototype.hasOwnProperty.call(
      body,
      "trajanjeTermina",
    );

    const hasVremePripremeTerminaUpdate = Object.prototype.hasOwnProperty.call(
      body,
      "vremePripremeTermina",
    );

    const newRezimRezervacije = hasRezimRezervacijeUpdate
      ? body.rezimRezervacije
      : oldRezimRezervacije;

    const newTrajanjeTermina = hasTrajanjeTerminaUpdate
      ? Number(body.trajanjeTermina)
      : oldTrajanjeTermina;

    const newVremePripremeTermina = hasVremePripremeTerminaUpdate
      ? Number(body.vremePripremeTermina)
      : oldVremePripremeTermina;

    const updateData = {
      ...body,
      ...(hasRadnoVremeUpdate ? { radnoVreme: newRadnoVreme } : {}),
      ...(body.naziv ? { naziv: body.naziv.trim() } : {}),
      ...(body.grad ? { grad: body.grad.trim() } : {}),
      ...(body.adresa ? { adresa: body.adresa.trim() } : {}),
      ...(body.kontaktEmail
        ? { kontaktEmail: body.kontaktEmail.trim().toLowerCase() }
        : {}),
    };

    if (updateData.naziv) {
      updateData.nazivNormalized = normalizeText(updateData.naziv);
    }

    if (updateData.grad) {
      updateData.gradNormalized = normalizeText(updateData.grad);
    }

    if (updateData.adresa) {
      updateData.adresaNormalized = normalizeText(updateData.adresa);
    }

    if (updateData.nazivNormalized) {
      const existingPlayroom = await Playroom.findOne({
        _id: { $ne: playroom._id },
        nazivNormalized: updateData.nazivNormalized,
        gradNormalized: updateData.gradNormalized || playroom.gradNormalized,
      });

      if (existingPlayroom) {
        return res.status(400).json({
          success: false,
          message: "Igraonica sa ovim imenom već postoji",
        });
      }
    }

    if (updateData.adresaNormalized || updateData.gradNormalized) {
      const existingAddress = await Playroom.findOne({
        _id: { $ne: playroom._id },
        adresaNormalized:
          updateData.adresaNormalized || playroom.adresaNormalized,
        gradNormalized: updateData.gradNormalized || playroom.gradNormalized,
      });

      if (existingAddress) {
        return res.status(400).json({
          success: false,
          message: "Igraonica sa ovom adresom već postoji u ovom gradu.",
        });
      }
    }

    playroom = await Playroom.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    let syncResult = null;

    const shouldSyncSlots =
      (hasRadnoVremeUpdate && !isEqual(oldRadnoVreme, newRadnoVreme)) ||
      (hasRezimRezervacijeUpdate &&
        oldRezimRezervacije !== newRezimRezervacije) ||
      (hasTrajanjeTerminaUpdate && oldTrajanjeTermina !== newTrajanjeTermina) ||
      (hasVremePripremeTerminaUpdate &&
        oldVremePripremeTermina !== newVremePripremeTermina);

    if (shouldSyncSlots) {
      syncResult = await syncTimeSlotsWithWorkingHours(playroom._id);

      if (!syncResult.success) {
        return res.status(400).json({
          success: false,
          message: syncResult.message || "Greška pri sinhronizaciji termina",
        });
      }
    }

    res.status(200).json({
      success: true,
      data: playroom,
      message: "Igraonica je uspešno ažurirana",
      slotSync: syncResult,
    });

} catch (error) {
next(error);
}
};

// @desc Obriši igraonicu
// @route DELETE /api/playrooms/:id
// @access Private (vlasnik ili admin)
exports.deletePlayroom = async (req, res, next) => {
try {
const playroom = await Playroom.findById(req.params.id);

    if (!playroom) {
      return res.status(404).json({
        success: false,
        message: "Igraonica nije pronađena",
      });
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Nemate pravo da obrišete ovu igraonicu",
      });
    }

    if (playroom.status !== PLAYROOM_STATUS.DEAKTIVIRAN) {
      return res.status(400).json({
        success: false,
        message: "Prvo morate deaktivirati igraonicu pre brisanja.",
      });
    }

    const activeBookings = await Booking.countDocuments({
      playroomId: playroom._id,
      status: {
        $in: [BOOKING_STATUS.CEKANJE, BOOKING_STATUS.POTVRDJENO],
      },
      datum: { $gte: new Date() },
    });

    if (activeBookings > 0) {
      return res.status(400).json({
        success: false,
        message: "Ne možeš obrisati igraonicu dok postoje aktivne rezervacije",
      });
    }

    await TimeSlot.deleteMany({ playroomId: playroom._id });
    await playroom.deleteOne();

    res.status(200).json({
      success: true,
      message: "Igraonica i svi njeni termini su obrisani",
    });

} catch (error) {
next(error);
}
};

// @desc Deaktiviraj igraonicu
// @route PUT /api/playrooms/:id/deactivate
// @access Private (vlasnik)
exports.deactivatePlayroom = async (req, res, next) => {
try {
const playroom = await Playroom.findById(req.params.id);

    if (!playroom) {
      return res.status(404).json({
        success: false,
        message: "Igraonica nije pronađena",
      });
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Nemate pravo za ovu akciju",
      });
    }

    const user = await User.findById(req.user.id).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Korisnik nije pronađen",
      });
    }

    const passwordMatch = await bcrypt.compare(
      req.validated.body.password,
      user.password,
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Lozinka nije tačna",
      });
    }

    if (playroom.status === PLAYROOM_STATUS.DEAKTIVIRAN) {
      return res.status(400).json({
        success: false,
        message: "Igraonica je već deaktivirana.",
      });
    }

    playroom.status = PLAYROOM_STATUS.DEAKTIVIRAN;
    playroom.verifikovan = false;
    playroom.deactivatedAt = new Date();

    await playroom.save();

    // deaktiviraj buduće slobodne slotove
    await TimeSlot.updateMany(
      {
        playroomId: playroom._id,
        datum: { $gte: new Date() },
        zauzeto: false,
      },
      {
        $set: {
          aktivno: false,
        },
      },
    );

    return res.status(200).json({
      success: true,
      message: "Igraonica je deaktivirana i više nije javno dostupna.",
    });

} catch (error) {
next(error);
}
};

// @desc Verifikuj igraonicu (samo admin)
// @route PUT /api/playrooms/:id/verify
// @access Private (admin)
exports.verifyPlayroom = async (req, res, next) => {
try {
const result = await verifyPlayroomAndGenerateSlots(req.params.id);

    res.status(200).json({
      success: true,
      data: result.playroom,
      message: `Igraonica je verifikovana. ${
        result.slotResult?.createdCount || 0
      } termina je automatski generisano.`,
    });

} catch (error) {
next(error);
}
};

// @desc Regeneriši termine za igraonicu (ručno)
// @route POST /api/playrooms/:id/regenerate-slots
// @access Private (vlasnik ili admin)
exports.regenerateTimeSlots = async (req, res, next) => {
try {
const playroom = await Playroom.findById(req.params.id);

    if (!playroom) {
      return res.status(404).json({
        success: false,
        message: "Igraonica nije pronađena",
      });
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Nemate pravo da regenerišete termine za ovu igraonicu",
      });
    }

    const result = await regenerateSlotsForPlayroom(req.params.id);

    res.status(200).json({
      success: true,
      message: `Termini su sinhronizovani. Novo: ${
        result.createdCount || 0
      }, deaktivirano: ${result.deactivatedCount || 0}, konflikti: ${
        result.conflictCount || 0
      }.`,
      data: result,
    });

} catch (error) {
next(error);
}
};

// @desc Dohvati statistiku za vlasnika igraonice
// @route GET /api/playrooms/:id/stats
// @access Private (Vlasnik)
exports.getOwnerStats = async (req, res, next) => {
try {
const playroomId = req.params.id;

    const playroom = await Playroom.findById(playroomId);
    if (!playroom) {
      return res.status(404).json({
        success: false,
        message: "Igraonica nije pronađena",
      });
    }

    if (
      playroom.vlasnikId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Nemate dozvolu za ovaj pristup",
      });
    }

    const stats = await Booking.aggregate([
      { $match: { playroomId: playroom._id } },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          confirmedBookings: {
            $sum: {
              $cond: [{ $eq: ["$status", BOOKING_STATUS.POTVRDJENO] }, 1, 0],
            },
          },
          waitingBookings: {
            $sum: {
              $cond: [{ $eq: ["$status", BOOKING_STATUS.CEKANJE] }, 1, 0],
            },
          },
          canceledBookings: {
            $sum: {
              $cond: [{ $eq: ["$status", BOOKING_STATUS.OTKAZANO] }, 1, 0],
            },
          },
          completedBookings: {
            $sum: {
              $cond: [{ $eq: ["$status", BOOKING_STATUS.ZAVRSENO] }, 1, 0],
            },
          },
          totalRevenue: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    [BOOKING_STATUS.POTVRDJENO, BOOKING_STATUS.ZAVRSENO],
                  ],
                },
                "$ukupnaCena",
                0,
              ],
            },
          },
        },
      },
    ]);

    const result =
      stats.length > 0
        ? stats[0]
        : {
            totalBookings: 0,
            confirmedBookings: 0,
            waitingBookings: 0,
            canceledBookings: 0,
            completedBookings: 0,
            totalRevenue: 0,
          };

    res.status(200).json({
      success: true,
      data: {
        playroomName: playroom.naziv,
        ...result,
      },
    });

} catch (error) {
next(error);
}
};
// @desc Dohvati gradove za filter
// @route GET /api/playrooms/filter-cities
// @access Public
exports.getFilterCities = async (req, res, next) => {
try {
const defaultCities = [
"Beograd",
"Novi Sad",
"Niš",
"Kragujevac",
"Subotica",
"Zrenjanin",
"Pančevo",
"Čačak",
"Novi Pazar",
"Kraljevo",
"Smederevo",
"Leskovac",
"Užice",
"Valjevo",
"Kruševac",
];

    const dbCities = await Playroom.distinct("grad", {
      verifikovan: true,
      status: PLAYROOM_STATUS.AKTIVAN,
      grad: { $exists: true, $ne: "" },
    });

    const cityMap = new Map();

    [...defaultCities, ...dbCities].forEach((city) => {
      const normalizedKey = normalizeText(city);

      if (!normalizedKey) return;

      if (!cityMap.has(normalizedKey)) {
        cityMap.set(normalizedKey, normalizeDisplayText(city));
      }
    });

    const uniqueCities = Array.from(cityMap.values()).sort((a, b) =>
      a.localeCompare(b, "sr", { sensitivity: "base" }),
    );

    res.status(200).json({
      success: true,
      data: uniqueCities,
    });

} catch (error) {
next(error);
}
};

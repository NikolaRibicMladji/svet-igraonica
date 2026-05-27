import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  getUnverifiedPlayrooms,
  verifyPlayroom,
  getAllUsers,
  rejectPlayroom,
} from "../services/adminService";
import { useAuth } from "../context/AuthContext";
import { getSafeExternalUrl } from "../utils/urlUtils";
import "../styles/AdminPanel.css";

const AdminPanel = () => {
  const { user, loading: authLoading } = useAuth();

  const [playrooms, setPlayrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState("");
  const [selectedPlayroom, setSelectedPlayroom] = useState(null);
  const detailsPanelRef = useRef(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState("");
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);

  useEffect(() => {
    if (selectedPlayroom && detailsPanelRef.current) {
      detailsPanelRef.current.scrollTop = 0;
    }
  }, [selectedPlayroom]);

  const loadUnverifiedPlayrooms = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getUnverifiedPlayrooms();

      if (result?.success) {
        const loadedPlayrooms = Array.isArray(result.data) ? result.data : [];
        setPlayrooms(loadedPlayrooms);
        setSelectedPlayroom(null);
      } else {
        setPlayrooms([]);
        setError(
          result?.error || "Greška pri učitavanju neverifikovanih igraonica.",
        );
      }
    } catch (err) {
      setPlayrooms([]);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Greška pri učitavanju neverifikovanih igraonica.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async (page = 1) => {
    setUsersLoading(true);
    setError("");

    try {
      const result = await getAllUsers(page, 10);

      if (result?.success) {
        setUsers(Array.isArray(result.data) ? result.data : []);
        setUsersPage(result.page || 1);
        setUsersTotalPages(result.pages || 1);
        setUsersTotal(result.total || 0);
      } else {
        setUsers([]);
        setError(result?.error || "Greška pri učitavanju korisnika.");
      }
    } catch (err) {
      setUsers([]);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Greška pri učitavanju korisnika.",
      );
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user?.role === "admin") {
      loadUnverifiedPlayrooms();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, user?.role, loadUnverifiedPlayrooms]);

  useEffect(() => {
    if (!authLoading && user?.role === "admin") {
      loadUsers(usersPage);
    }
  }, [authLoading, user?.role, usersPage, loadUsers]);

  const handleVerify = async (id) => {
    if (!id) {
      setError("Nedostaje ID igraonice za verifikaciju.");
      return;
    }

    if (verifyingId) return;

    setVerifyingId(id);
    setMessage("");
    setError("");

    try {
      const result = await verifyPlayroom(id);

      if (result?.success) {
        setMessage(result?.message || "Igraonica je uspešno verifikovana.");
        await loadUnverifiedPlayrooms();

        setTimeout(() => {
          setMessage("");
        }, 3000);
      } else {
        setError(result?.error || "Verifikacija igraonice nije uspela.");
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Verifikacija igraonice nije uspela.",
      );
    } finally {
      setVerifyingId("");
    }
  };

  const handleReject = async (id) => {
    if (!id) {
      setError("Nedostaje ID igraonice za odbijanje.");
      return;
    }

    if (rejectingId) return;

    const safeRejectReason = rejectReason.trim();

    if (safeRejectReason.length < 5) {
      setError("Razlog odbijanja mora imati najmanje 5 karaktera.");
      return;
    }

    setRejectingId(id);
    setError("");
    setMessage("");

    try {
      const result = await rejectPlayroom(id, safeRejectReason);

      if (result?.success) {
        setMessage(result.message || "Igraonica je odbijena.");

        setRejectReason("");
        setSelectedPlayroom(null);

        await loadUnverifiedPlayrooms();

        setTimeout(() => {
          setMessage("");
        }, 3000);
      } else {
        setError(result?.error || "Greška pri odbijanju.");
      }
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "Greška pri odbijanju.",
      );
    } finally {
      setRejectingId("");
    }
  };

  if (authLoading) {
    return (
      <div className="container admin-panel">
        <p role="status" aria-live="polite">
          Učitavanje...
        </p>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="container admin-panel" role="alert">
        <h1>Pristup zabranjen</h1>
        <p>Samo administratori imaju pristup ovoj stranici.</p>
      </div>
    );
  }

  const selectedProfileImageUrl = getSafeExternalUrl(
    selectedPlayroom?.profilnaSlika?.url,
  );

  return (
    <div className="container admin-panel">
      <h1>Admin panel</h1>

      {message && (
        <div className="success-message" role="status" aria-live="polite">
          {message}
        </div>
      )}

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      <h2>Igraonice koje čekaju verifikaciju</h2>

      {loading ? (
        <p role="status" aria-live="polite">
          Učitavanje...
        </p>
      ) : playrooms.length === 0 ? (
        <div className="empty-state" role="status" aria-live="polite">
          <p>🎉 Nema igraonica koje čekaju verifikaciju.</p>
        </div>
      ) : (
        <div className="admin-verification-grid">
          <div className="admin-playrooms-list">
            {playrooms.map((playroom) => {
              const vlasnik = playroom?.vlasnikId || {};
              const isActive = selectedPlayroom?._id === playroom._id;

              return (
                <button
                  key={playroom._id}
                  type="button"
                  className={`admin-playroom-preview-card ${isActive ? "active" : ""}`}
                  aria-pressed={isActive}
                  aria-expanded={isActive}
                  aria-controls={`admin-playroom-details-${playroom._id}`}
                  onClick={() => {
                    setRejectReason("");

                    setSelectedPlayroom((prev) =>
                      prev?._id === playroom._id ? null : playroom,
                    );
                  }}
                >
                  <h3>{playroom.naziv}</h3>

                  <p>
                    {playroom.grad || "-"} · {playroom.adresa || "-"}
                  </p>

                  <p>
                    Vlasnik: {vlasnik?.ime || "-"} {vlasnik?.prezime || ""}
                  </p>

                  <span>
                    {isActive ? "Zatvori detalje ↑" : "Otvori detalje →"}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="admin-details-panel" ref={detailsPanelRef}>
            {selectedPlayroom && (
              <div
                id={`admin-playroom-details-${selectedPlayroom._id}`}
                className="admin-playroom-card admin-playroom-details-card"
              >
                <div className="admin-playroom-info">
                  <h3>{selectedPlayroom.naziv}</h3>
                  {selectedProfileImageUrl && (
                    <div className="admin-profile-image-box">
                      <img
                        src={selectedProfileImageUrl}
                        alt={selectedPlayroom.naziv}
                        className="admin-profile-image"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <p>
                    <strong>Opis:</strong> {selectedPlayroom?.opis || "-"}
                  </p>
                  <p>
                    <strong>Grad:</strong> {selectedPlayroom?.grad || "-"}
                  </p>
                  <p>
                    <strong>Adresa:</strong> {selectedPlayroom?.adresa || "-"}
                  </p>
                  <p>
                    <strong>Kontakt telefon:</strong>{" "}
                    {selectedPlayroom?.kontaktTelefon || "-"}
                  </p>
                  <p>
                    <strong>Kontakt email:</strong>{" "}
                    {selectedPlayroom?.kontaktEmail || "-"}
                  </p>
                  <p>
                    <strong>Režim rezervacije:</strong>{" "}
                    {selectedPlayroom?.rezimRezervacije || "-"}
                  </p>
                  <p>
                    <strong>Trajanje termina:</strong>{" "}
                    {selectedPlayroom?.trajanjeTermina || 0} min
                  </p>
                  <p>
                    <strong>Vreme pripreme:</strong>{" "}
                    {selectedPlayroom?.vremePripremeTermina || 0} min
                  </p>
                  <p>
                    <strong>Kapacitet dece:</strong>{" "}
                    {selectedPlayroom?.kapacitet?.deca || 0}
                  </p>
                  <p>
                    <strong>Kapacitet roditelja:</strong>{" "}
                    {selectedPlayroom?.kapacitet?.roditelji || 0}
                  </p>

                  <div className="admin-section">
                    <h4>Radno vreme</h4>
                    {Object.entries(selectedPlayroom?.radnoVreme || {}).map(
                      ([dan, vreme]) => (
                        <div key={dan} className="admin-row">
                          <span>{dan}</span>
                          <span>
                            {vreme?.radi
                              ? `${vreme?.od || "-"} - ${vreme?.do || "-"}`
                              : "Ne radi"}
                          </span>
                        </div>
                      ),
                    )}
                  </div>

                  <div className="admin-section">
                    <h4>Cenovnik</h4>
                    {selectedPlayroom?.cene?.length ? (
                      selectedPlayroom.cene.map((item, index) => (
                        <div key={index} className="admin-box">
                          <p>
                            <strong>{item.naziv}</strong>
                          </p>
                          <p>
                            {item.cena} RSD · {item.tip}
                          </p>
                          <p>{item.opis || "-"}</p>
                        </div>
                      ))
                    ) : (
                      <p>Nema cenovnika.</p>
                    )}
                  </div>

                  <div className="admin-section">
                    <h4>Paketi</h4>
                    {selectedPlayroom?.paketi?.length ? (
                      selectedPlayroom.paketi.map((item, index) => (
                        <div key={index} className="admin-box">
                          <p>
                            <strong>{item.naziv}</strong>
                          </p>
                          <p>
                            {item.cena} RSD · {item.tip}
                          </p>
                          <p>{item.opis || "-"}</p>
                        </div>
                      ))
                    ) : (
                      <p>Nema paketa.</p>
                    )}
                  </div>

                  <div className="admin-section">
                    <h4>Dodatne usluge</h4>
                    {selectedPlayroom?.dodatneUsluge?.length ? (
                      selectedPlayroom.dodatneUsluge.map((item, index) => (
                        <div key={index} className="admin-box">
                          <p>
                            <strong>{item.naziv}</strong>
                          </p>
                          <p>
                            {item.cena} RSD · {item.tip}
                          </p>
                          <p>{item.opis || "-"}</p>
                        </div>
                      ))
                    ) : (
                      <p>Nema dodatnih usluga.</p>
                    )}
                  </div>

                  <div className="admin-section">
                    <h4>Galerija slika</h4>
                    {selectedPlayroom?.slike?.length ? (
                      <div className="admin-gallery">
                        {selectedPlayroom.slike.map((slika, index) => {
                          const imageUrl = getSafeExternalUrl(
                            slika.url || slika.secure_url || slika.path,
                          );

                          if (!imageUrl) return null;

                          return (
                            <img
                              key={
                                slika.publicId ||
                                slika.public_id ||
                                imageUrl ||
                                index
                              }
                              src={imageUrl}
                              alt={selectedPlayroom.naziv}
                              className="admin-gallery-image"
                              loading="lazy"
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <p>Nema slika.</p>
                    )}
                  </div>
                  <div className="admin-section">
                    <h4>Galerija video zapisa</h4>

                    {selectedPlayroom?.videoGalerija?.length ? (
                      <div className="admin-video-gallery">
                        {selectedPlayroom.videoGalerija.map((video, index) => {
                          const videoUrl = getSafeExternalUrl(
                            video.url || video.secure_url || video.path,
                          );

                          if (!videoUrl) return null;

                          return (
                            <div
                              key={
                                video.publicId ||
                                video.public_id ||
                                videoUrl ||
                                index
                              }
                              className="admin-video-card"
                            >
                              <video
                                src={videoUrl}
                                controls
                                preload="metadata"
                                className="admin-video"
                                aria-label={video.naziv || `Video ${index + 1}`}
                              />

                              <p>{video.naziv || `Video ${index + 1}`}</p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p>Nema video zapisa.</p>
                    )}
                  </div>
                </div>

                <div className="admin-actions">
                  <button
                    type="button"
                    className="btn-verify"
                    onClick={() => handleVerify(selectedPlayroom._id)}
                    disabled={Boolean(verifyingId) || Boolean(rejectingId)}
                    aria-busy={verifyingId === selectedPlayroom._id}
                  >
                    {verifyingId === selectedPlayroom._id
                      ? "Verifikujem..."
                      : "✅ Verifikuj"}
                  </button>
                </div>

                <div className="admin-reject-section">
                  <div className="admin-reject-box">
                    <label htmlFor="rejectReason">Razlog odbijanja</label>

                    <textarea
                      id="rejectReason"
                      value={rejectReason}
                      minLength={5}
                      maxLength={500}
                      disabled={rejectingId === selectedPlayroom._id}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Unesi razlog odbijanja..."
                      className="admin-reject-textarea"
                      aria-describedby="rejectReasonHint"
                      aria-invalid={
                        rejectReason.trim().length > 0 &&
                        rejectReason.trim().length < 5
                      }
                    />

                    <p id="rejectReasonHint" className="admin-field-hint">
                      Razlog mora imati najmanje 5, a najviše 500 karaktera.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn-reject"
                    onClick={() => handleReject(selectedPlayroom._id)}
                    disabled={
                      Boolean(verifyingId) ||
                      Boolean(rejectingId) ||
                      rejectReason.trim().length < 5
                    }
                    aria-busy={rejectingId === selectedPlayroom._id}
                  >
                    {rejectingId === selectedPlayroom._id
                      ? "Odbijam..."
                      : "✖ Odbij"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <h2>Korisnici</h2>

      {usersLoading ? (
        <p role="status" aria-live="polite">
          Učitavanje korisnika...
        </p>
      ) : users.length === 0 ? (
        <div className="empty-state" role="status" aria-live="polite">
          <p>Nema korisnika za prikaz.</p>
        </div>
      ) : (
        <>
          <div className="results-count">
            Prikazano <strong>{users.length}</strong> od{" "}
            <strong>{usersTotal}</strong> korisnika
          </div>

          <div className="admin-playrooms-list">
            {users.map((u) => (
              <div key={u._id} className="admin-playroom-card">
                <div className="admin-playroom-info">
                  <h3>
                    {u.ime} {u.prezime}
                  </h3>

                  <p>
                    <strong>Email:</strong> {u.email || "-"}
                  </p>

                  <p>
                    <strong>Telefon:</strong> {u.telefon || "-"}
                  </p>

                  <p>
                    <strong>Uloga:</strong> {u.role || "-"}
                  </p>

                  <p>
                    <strong>Registrovan:</strong>{" "}
                    {u.createdAt
                      ? new Date(u.createdAt).toLocaleDateString("sr-RS")
                      : "-"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {usersTotalPages > 1 && (
            <div className="pagination">
              <button
                type="button"
                className="btn-page"
                onClick={() => setUsersPage((prev) => Math.max(1, prev - 1))}
                disabled={usersPage === 1}
                aria-label="Prethodna strana korisnika"
              >
                ← Prethodna
              </button>

              <span className="page-info">
                Strana {usersPage} od {usersTotalPages} ({usersTotal} ukupno)
              </span>

              <button
                type="button"
                className="btn-page"
                onClick={() =>
                  setUsersPage((prev) => Math.min(usersTotalPages, prev + 1))
                }
                disabled={usersPage >= usersTotalPages}
                aria-label="Sledeća strana korisnika"
              >
                Sledeća →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminPanel;

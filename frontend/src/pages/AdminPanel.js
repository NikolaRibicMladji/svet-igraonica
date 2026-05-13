import React, { useEffect, useRef, useState } from "react";
import {
  getUnverifiedPlayrooms,
  verifyPlayroom,
  getAllUsers,
  rejectPlayroom,
} from "../services/adminService";
import { useAuth } from "../context/AuthContext";
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
    if (!authLoading && user?.role === "admin") {
      loadUnverifiedPlayrooms();
      loadUsers(usersPage);
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading, usersPage]);

  useEffect(() => {
    if (selectedPlayroom && detailsPanelRef.current) {
      detailsPanelRef.current.scrollTop = 0;
    }
  }, [selectedPlayroom?._id]);

  const loadUnverifiedPlayrooms = async () => {
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
  };

  const loadUsers = async (page = 1) => {
    setUsersLoading(true);

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
  };

  const handleVerify = async (id) => {
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
    if (!rejectReason.trim()) {
      setError("Unesi razlog odbijanja.");
      return;
    }

    setRejectingId(id);
    setError("");
    setMessage("");

    try {
      const result = await rejectPlayroom(id, rejectReason);

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
        <p>Učitavanje...</p>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="container admin-panel">
        <h1>Pristup zabranjen</h1>
        <p>Samo administratori imaju pristup ovoj stranici.</p>
      </div>
    );
  }

  return (
    <div className="container admin-panel">
      <h1>Admin panel</h1>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      <h2>Igraonice koje čekaju verifikaciju</h2>

      {loading ? (
        <p>Učitavanje...</p>
      ) : playrooms.length === 0 ? (
        <div className="empty-state">
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
              <div className="admin-playroom-card admin-playroom-details-card">
                <div className="admin-playroom-info">
                  <h3>{selectedPlayroom.naziv}</h3>
                  {selectedPlayroom?.profilnaSlika?.url && (
                    <div className="admin-profile-image-box">
                      <img
                        src={selectedPlayroom.profilnaSlika.url}
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
                        {selectedPlayroom.slike.map((slika, index) => (
                          <img
                            key={index}
                            src={slika.url}
                            alt={selectedPlayroom.naziv}
                            className="admin-gallery-image"
                            loading="lazy"
                          />
                        ))}
                      </div>
                    ) : (
                      <p>Nema slika.</p>
                    )}
                  </div>
                  <div className="admin-section">
                    <h4>Galerija video zapisa</h4>

                    {selectedPlayroom?.videoGalerija?.length ? (
                      <div className="admin-video-gallery">
                        {selectedPlayroom.videoGalerija.map((video, index) => (
                          <div
                            key={video.publicId || index}
                            className="admin-video-card"
                          >
                            <video
                              src={video.url}
                              controls
                              preload="metadata"
                              className="admin-video"
                            />

                            <p>{video.naziv || `Video ${index + 1}`}</p>
                          </div>
                        ))}
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
                    disabled={verifyingId === selectedPlayroom._id}
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
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Unesi razlog odbijanja..."
                      className="admin-reject-textarea"
                    />
                  </div>

                  <button
                    type="button"
                    className="btn-reject"
                    onClick={() => handleReject(selectedPlayroom._id)}
                    disabled={
                      rejectingId === selectedPlayroom._id ||
                      !rejectReason.trim()
                    }
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
        <p>Učitavanje korisnika...</p>
      ) : users.length === 0 ? (
        <div className="empty-state">
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

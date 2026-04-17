import React, { useEffect, useState } from "react";
import {
  getUnverifiedPlayrooms,
  verifyPlayroom,
  getAllUsers,
} from "../services/adminService";
import { useAuth } from "../context/AuthContext";
import "../styles/AdminPanel.css";

const AdminPanel = () => {
  const { user, loading: authLoading } = useAuth();

  const [playrooms, setPlayrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

  const loadUnverifiedPlayrooms = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getUnverifiedPlayrooms();

      if (result?.success) {
        setPlayrooms(Array.isArray(result.data) ? result.data : []);
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
        <div className="admin-playrooms-list">
          {playrooms.map((playroom) => {
            const vlasnik = playroom?.vlasnikId || {};

            return (
              <div key={playroom._id} className="admin-playroom-card">
                <div className="admin-playroom-info">
                  <h3>{playroom.naziv}</h3>

                  <p>
                    <strong>Vlasnik:</strong> {vlasnik?.ime || "-"}{" "}
                    {vlasnik?.prezime || ""}
                  </p>

                  <p>
                    <strong>Email:</strong> {vlasnik?.email || "-"}
                  </p>

                  <p>
                    <strong>Telefon:</strong> {vlasnik?.telefon || "-"}
                  </p>

                  <p>
                    <strong>Adresa:</strong> {playroom?.adresa || "-"}
                    {playroom?.grad ? `, ${playroom.grad}` : ""}
                  </p>

                  <p>
                    <strong>Kapacitet dece:</strong>{" "}
                    {playroom?.kapacitet?.deca || 0}
                  </p>

                  <p>
                    <strong>Kapacitet roditelja:</strong>{" "}
                    {playroom?.kapacitet?.roditelji
                      ? `${playroom.kapacitet.roditelji} roditelja`
                      : "Neograničeno"}
                  </p>

                  <p>
                    <strong>Opis:</strong> {playroom?.opis || "-"}
                  </p>
                </div>

                <button
                  type="button"
                  className="btn-verify"
                  onClick={() => handleVerify(playroom._id)}
                  disabled={verifyingId === playroom._id}
                >
                  {verifyingId === playroom._id
                    ? "Verifikujem..."
                    : "✅ Verifikuj igraonicu"}
                </button>
              </div>
            );
          })}
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

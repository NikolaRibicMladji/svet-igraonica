import React, { useEffect, useState } from "react";
import {
  getUnverifiedPlayrooms,
  verifyPlayroom,
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

  useEffect(() => {
    if (!authLoading && user?.role === "admin") {
      loadUnverifiedPlayrooms();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

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
    </div>
  );
};

export default AdminPanel;

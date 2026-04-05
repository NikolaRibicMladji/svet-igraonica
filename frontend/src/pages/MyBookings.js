import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cancelBooking, getMyBookings } from "../services/bookingService";
import "../styles/MyBookings.css";

const MyBookings = () => {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState("");

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getMyBookings();

      if (result?.success) {
        setBookings(Array.isArray(result.data) ? result.data : []);
      } else {
        setBookings([]);
        setError(result?.error || "Greška pri učitavanju rezervacija.");
      }
    } catch (err) {
      setBookings([]);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Greška pri učitavanju rezervacija.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (cancellingId) return;
    const confirmed = window.confirm(
      "Da li ste sigurni da želite da otkažete ovu rezervaciju?",
    );

    if (!confirmed) return;

    setError("");
    setCancellingId(id);

    try {
      const result = await cancelBooking(id);

      if (result?.success) {
        await loadBookings();
      } else {
        setError(result?.error || "Greška pri otkazivanju rezervacije.");
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Greška pri otkazivanju rezervacije.",
      );
    } finally {
      setCancellingId("");
    }
  };

  const handleWriteReview = (playroomId) => {
    if (!playroomId) return;
    navigate(`/playrooms/${playroomId}#reviews-section`);
  };

  const getStatusText = (status) => {
    const statusMap = {
      cekanje: {
        text: "⏳ Čeka potvrdu",
        class: "status-pending",
        clickable: false,
      },
      potvrdjeno: {
        text: "✅ Potvrđeno",
        class: "status-confirmed",
        clickable: false,
      },
      otkazano: {
        text: "❌ Otkazano",
        class: "status-cancelled",
        clickable: false,
      },
      zavrseno: {
        text: "🎉 Završeno - ostavi recenziju",
        class: "status-completed",
        clickable: true,
      },
    };

    return (
      statusMap[status] || {
        text: status || "Nepoznato",
        class: "",
        clickable: false,
      }
    );
  };

  const canCancelBooking = (status) =>
    status === "cekanje" || status === "potvrdjeno";

  if (loading) {
    return <div className="container loading">Učitavanje...</div>;
  }

  return (
    <div className="container my-bookings-page">
      <h1>📋 Moje rezervacije</h1>

      {error && <div className="error-message">{error}</div>}

      {bookings.length === 0 ? (
        <div className="empty-state">
          <p>Još nemate nijednu rezervaciju.</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate("/playrooms")}
          >
            Pogledaj igraonice
          </button>
        </div>
      ) : (
        <div className="bookings-list">
          {bookings.map((booking) => {
            const status = getStatusText(booking.status);
            const playroom =
              typeof booking.playroomId === "object"
                ? booking.playroomId
                : null;
            const playroomId = playroom?._id || booking.playroomId;

            return (
              <div key={booking._id} className="booking-card">
                <div className="booking-header">
                  <h3>{playroom?.naziv || "Igraonica"}</h3>

                  <span
                    className={`status-badge ${status.class} ${
                      status.clickable ? "clickable" : ""
                    }`}
                    onClick={() => {
                      if (status.clickable && playroomId) {
                        handleWriteReview(playroomId);
                      }
                    }}
                    style={
                      status.clickable
                        ? { cursor: "pointer", textDecoration: "underline" }
                        : undefined
                    }
                  >
                    {status.text}
                  </span>
                </div>

                <div className="booking-details">
                  <p>
                    📍 {playroom?.adresa || "-"}
                    {playroom?.grad ? `, ${playroom.grad}` : ""}
                  </p>

                  <p>
                    📅 Datum:{" "}
                    {booking.datum
                      ? new Date(booking.datum).toLocaleDateString("sr-RS")
                      : "-"}
                  </p>

                  <p>
                    ⏰ Vreme: {booking.vremeOd || "-"} -{" "}
                    {booking.vremeDo || "-"}
                  </p>

                  <p>👶 Broj dece: {booking.brojDece || 1}</p>

                  <p>👨‍👩‍👧 Broj roditelja: {booking.brojRoditelja || 0}</p>

                  <p>💰 Ukupno: {booking.ukupnaCena || 0} RSD</p>

                  {booking.napomena && <p>📝 Napomena: {booking.napomena}</p>}
                </div>

                {canCancelBooking(booking.status) && (
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => handleCancel(booking._id)}
                    disabled={
                      cancellingId === booking._id ||
                      booking.status === "otkazano" ||
                      booking.status === "zavrseno"
                    }
                  >
                    {cancellingId === booking._id
                      ? "Otkazujem..."
                      : "Otkaži rezervaciju"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyBookings;

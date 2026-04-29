import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cancelBooking, getMyBookings } from "../services/bookingService";
import "../styles/MyBookings.css";
import { useToast } from "../context/ToastContext";

const MyBookings = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState("");
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [expandedBookingId, setExpandedBookingId] = useState(null);

  useEffect(() => {
    loadBookings();
  }, []);

  const calculateDuration = (od, doVreme) => {
    if (!od || !doVreme) return "-";

    const [h1, m1] = od.split(":").map(Number);
    const [h2, m2] = doVreme.split(":").map(Number);

    const start = h1 * 60 + m1;
    const end = h2 * 60 + m2;

    const diff = end - start;

    const sati = Math.floor(diff / 60);
    const minuti = diff % 60;

    if (sati > 0 && minuti > 0) return `${sati}h ${minuti}min`;
    if (sati > 0) return `${sati}h`;
    return `${minuti}min`;
  };

  const toggleBookingDetails = (bookingId) => {
    setExpandedBookingId((prev) => (prev === bookingId ? null : bookingId));
  };

  const getDurationHours = (od, doVreme) => {
    if (!od || !doVreme) return 1;

    const [h1, m1] = od.split(":").map(Number);
    const [h2, m2] = doVreme.split(":").map(Number);

    const start = h1 * 60 + m1;
    const end = h2 * 60 + m2;

    const diff = end - start;

    if (!Number.isFinite(diff) || diff <= 0) return 1;

    return diff / 60;
  };

  const getItemCalculationText = (item, booking) => {
    if (!item) return "";

    const cena = Number(item.cena) || 0;
    const tip = item.tip || "fiksno";
    const brojDece = Number(booking?.brojDece) || 0;
    const sati = getDurationHours(booking?.vremeOd, booking?.vremeDo);

    if (tip === "po_satu") {
      const total = cena * sati;
      return `${cena} RSD × ${sati}h = ${total} RSD`;
    }

    if (tip === "po_osobi") {
      const total = cena * brojDece;
      return `${cena} RSD × ${brojDece} = ${total} RSD`;
    }

    return `${cena} RSD`;
  };

  const loadBookings = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getMyBookings();

      if (result?.success) {
        setBookings(
          Array.isArray(result.data)
            ? result.data.sort((a, b) => new Date(b.datum) - new Date(a.datum))
            : [],
        );
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

  const openCancelModal = (booking) => {
    if (cancellingId) return;
    setBookingToCancel(booking);
  };

  const handleCancel = async () => {
    if (cancellingId || !bookingToCancel?._id) return;

    setError("");
    setCancellingId(bookingToCancel._id);

    try {
      const result = await cancelBooking(bookingToCancel._id);

      if (result?.success) {
        toast.success(result.message || "Rezervacija je uspešno otkazana.");
        setBookingToCancel(null);
        await loadBookings();
      } else {
        toast.error(result?.error || "Greška pri otkazivanju rezervacije.");
      }
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Greška pri otkazivanju rezervacije.";
      toast.error(message);
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
        text: (
          <>
            🎉 Završeno
            <br />
            Ostavi recenziju
          </>
        ),
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
    String(status).toLowerCase() === "potvrdjeno";

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
                <div
                  className="booking-header clickable-header"
                  onClick={() => toggleBookingDetails(booking._id)}
                >
                  <div>
                    <h3>{playroom?.naziv || "Igraonica"}</h3>
                    <p className="booking-short-info">
                      📅{" "}
                      {booking.datum
                        ? new Date(booking.datum).toLocaleDateString("sr-RS")
                        : "-"}{" "}
                      | ⏰ {booking.vremeOd} - {booking.vremeDo}
                    </p>
                  </div>

                  <div className="booking-header-right">
                    <span
                      className={`status-badge ${status.class} ${
                        status.clickable ? "clickable" : ""
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (status.clickable && playroomId) {
                          handleWriteReview(playroomId);
                        }
                      }}
                    >
                      {status.text}
                    </span>

                    <span
                      className={`arrow ${expandedBookingId === booking._id ? "open" : ""}`}
                    >
                      ▼
                    </span>
                  </div>
                </div>

                {expandedBookingId === booking._id && (
                  <>
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

                      <p>
                        ⏳ Trajanje:{" "}
                        {calculateDuration(booking.vremeOd, booking.vremeDo)}
                      </p>

                      {booking.brojDece > 0 && (
                        <p>👶 Broj dece: {booking.brojDece}</p>
                      )}

                      {booking.brojRoditelja > 0 && (
                        <p>👨‍👩‍👧 Broj roditelja: {booking.brojRoditelja}</p>
                      )}

                      <p>💰 Ukupno: {booking.ukupnaCena || 0} RSD</p>

                      {Array.isArray(booking.izabraneCene) &&
                        booking.izabraneCene.length > 0 && (
                          <div className="booking-selected-items">
                            <p>
                              <strong>Izabrane stavke:</strong>
                            </p>
                            {booking.izabraneCene.map((item, idx) => (
                              <p key={`cena-${idx}`}>
                                • {item.naziv} ({item.tip || "fiksno"}) -{" "}
                                {getItemCalculationText(item, booking)}
                                {item.opis && <span> - {item.opis}</span>}
                              </p>
                            ))}
                          </div>
                        )}

                      {booking.izabraniPaket?.naziv && (
                        <div className="booking-selected-items">
                          <p>
                            <strong>Paket:</strong>{" "}
                            {booking.izabraniPaket.naziv} (
                            {booking.izabraniPaket.tip || "fiksno"}) -{" "}
                            {getItemCalculationText(
                              booking.izabraniPaket,
                              booking,
                            )}
                          </p>

                          {booking.izabraniPaket.opis && (
                            <p>- {booking.izabraniPaket.opis}</p>
                          )}
                        </div>
                      )}

                      {Array.isArray(booking.izabraneUsluge) &&
                        booking.izabraneUsluge.length > 0 && (
                          <div className="booking-selected-items">
                            <p>
                              <strong>Dodatne usluge:</strong>
                            </p>
                            {booking.izabraneUsluge.map((item, idx) => (
                              <p key={`usluga-${idx}`}>
                                • {item.naziv} ({item.tip || "fiksno"}) -{" "}
                                {getItemCalculationText(item, booking)}
                                {item.opis && <span> - {item.opis}</span>}
                              </p>
                            ))}
                          </div>
                        )}

                      {Array.isArray(booking.besplatnePogodnosti) &&
                        booking.besplatnePogodnosti.length > 0 && (
                          <div className="booking-selected-items">
                            <p>
                              <strong>Besplatne pogodnosti:</strong>
                            </p>
                            {booking.besplatnePogodnosti.map((item, idx) => (
                              <p key={`pog-${idx}`}>• {item}</p>
                            ))}
                          </div>
                        )}

                      {booking.napomena && (
                        <p>📝 Napomena: {booking.napomena}</p>
                      )}
                    </div>

                    {canCancelBooking(booking.status) && (
                      <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => openCancelModal(booking)}
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
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
      {bookingToCancel && (
        <div
          className="cancel-modal-overlay"
          onClick={() => {
            if (!cancellingId) setBookingToCancel(null);
          }}
        >
          <div className="cancel-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cancel-modal-header">
              <h3>Otkaži rezervaciju</h3>
              <button
                type="button"
                className="cancel-modal-close"
                onClick={() => {
                  if (!cancellingId) setBookingToCancel(null);
                }}
                disabled={Boolean(cancellingId)}
              >
                ✕
              </button>
            </div>

            <div className="cancel-modal-body">
              <p>Da li ste sigurni da želite da otkažete ovu rezervaciju?</p>

              <div className="cancel-booking-summary">
                <p>
                  <strong>Igraonica:</strong>{" "}
                  {typeof bookingToCancel.playroomId === "object"
                    ? bookingToCancel.playroomId?.naziv || "Igraonica"
                    : "Igraonica"}
                </p>
                <p>
                  <strong>Datum:</strong>{" "}
                  {bookingToCancel.datum
                    ? new Date(bookingToCancel.datum).toLocaleDateString(
                        "sr-RS",
                      )
                    : "-"}
                </p>
                <p>
                  <strong>Vreme:</strong> {bookingToCancel.vremeOd || "-"} -{" "}
                  {bookingToCancel.vremeDo || "-"}
                </p>
              </div>
            </div>

            <div className="cancel-modal-footer">
              <button
                type="button"
                className="cancel-modal-secondary"
                onClick={() => setBookingToCancel(null)}
                disabled={Boolean(cancellingId)}
              >
                Ne, odustani
              </button>

              <button
                type="button"
                className="cancel-modal-danger"
                onClick={handleCancel}
                disabled={Boolean(cancellingId)}
              >
                {cancellingId ? "Otkazujem..." : "Da, otkaži rezervaciju"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookings;

import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyPlayrooms } from "../services/playroomService";
import { getAllTimeSlotsForOwner } from "../services/bookingService";
import { useAuth } from "../context/AuthContext";

import "../styles/OwnerTimeSlots.css";
import { useToast } from "../context/ToastContext";

const OwnerTimeSlots = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [playrooms, setPlayrooms] = useState([]);
  const [selectedPlayroom, setSelectedPlayroom] = useState("");
  const [timeSlots, setTimeSlots] = useState([]);
  const [loadingPlayrooms, setLoadingPlayrooms] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [message, setMessage] = useState("");

  const [error, setError] = useState("");

  const [expandedBookingId, setExpandedBookingId] = useState(null);

  useEffect(() => {
    if (!authLoading) {
      loadPlayrooms();
    }
  }, [authLoading]);

  const loadTimeSlots = useCallback(async () => {
    if (!selectedPlayroom) return;

    setLoadingSlots(true);
    setError("");
    setMessage("");

    try {
      const result = await getAllTimeSlotsForOwner(
        selectedPlayroom,
        selectedDate,
      );

      if (result?.success) {
        setTimeSlots(
          Array.isArray(result.data)
            ? result.data.sort((a, b) => a.vremeOd.localeCompare(b.vremeOd))
            : [],
        );
      } else {
        setTimeSlots([]);
        setError(result?.error || "Greška pri učitavanju termina.");
      }
    } catch (err) {
      setTimeSlots([]);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Greška pri učitavanju termina.",
      );
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedPlayroom, selectedDate]);

  useEffect(() => {
    if (selectedPlayroom) {
      loadTimeSlots();
    }
  }, [selectedPlayroom, selectedDate, loadTimeSlots]);

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

  const loadPlayrooms = async () => {
    setLoadingPlayrooms(true);
    setError("");
    setMessage("");

    try {
      const result = await getMyPlayrooms();

      if (
        result?.success &&
        Array.isArray(result.data) &&
        result.data.length > 0
      ) {
        setPlayrooms(result.data);
        setSelectedPlayroom((prev) => prev || result.data[0]._id);
      } else {
        setPlayrooms([]);
        setSelectedPlayroom("");
        setError("Nemate nijednu igraonicu. Prvo dodajte igraonicu.");
      }
    } catch (err) {
      setPlayrooms([]);
      setSelectedPlayroom("");
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Greška pri učitavanju igraonica.",
      );
    } finally {
      setLoadingPlayrooms(false);
    }
  };

  const goToReservationPage = () => {
    if (!selectedPlayroom || !selectedDate) {
      setError("Izaberi igraonicu i datum.");
      return;
    }

    const params = new URLSearchParams({
      datum: selectedDate,
      mode: "owner",
    });

    navigate(`/book/${selectedPlayroom}?${params.toString()}`);
  };

  const getBookingId = (booking) => {
    return booking?._id || booking?.id || null;
  };

  const handleSlotClick = (segment) => {
    const bookingId = getBookingId(segment.booking);

    if (!bookingId) return;

    setExpandedBookingId((prev) => (prev === bookingId ? null : bookingId));
  };

  const selectedPlayroomData = playrooms.find(
    (p) => p._id === selectedPlayroom,
  );

  const occupiedSlots = timeSlots.filter(
    (segment) => segment.tip === "zauzeto",
  );

  const formatBookingName = (booking) => {
    if (!booking) return "-";

    const ime =
      booking.ime || booking.imeRoditelja || booking.parentFirstName || "";
    const prezime =
      booking.prezime ||
      booking.prezimeRoditelja ||
      booking.parentLastName ||
      "";

    const fullName = `${ime} ${prezime}`.trim();
    return fullName || booking.userName || "-";
  };

  const formatBookingEmail = (booking) => {
    return (
      booking?.email || booking?.emailRoditelja || booking?.parentEmail || "-"
    );
  };

  const formatBookingPhone = (booking) => {
    return (
      booking?.telefon ||
      booking?.telefonRoditelja ||
      booking?.parentPhone ||
      "-"
    );
  };

  if (authLoading || loadingPlayrooms) {
    return <div className="container loading">Učitavanje...</div>;
  }

  if (user?.role !== "vlasnik" && user?.role !== "admin") {
    return (
      <div className="container">
        <h1>Pristup zabranjen</h1>
        <p>Samo vlasnici igraonica mogu upravljati terminima.</p>
      </div>
    );
  }

  return (
    <div className="container owner-slots-page">
      <div className="page-header">
        <h1>📅 Termini igraonice</h1>
      </div>

      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      {playrooms.length === 0 ? (
        <div className="empty-state">
          <p>Nemate nijednu igraonicu.</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate("/create-playroom")}
          >
            Dodaj igraonicu
          </button>
        </div>
      ) : (
        <>
          <div className="owner-reservation-toolbar">
            <div className="filter-group owner-date-filter">
              <label htmlFor="owner-date-select">Izaberite datum</label>
              <input
                id="owner-date-select"
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setMessage("");
                  setError("");
                  setExpandedBookingId(null);
                }}
              />
            </div>

            <button
              type="button"
              className="owner-reserve-btn"
              onClick={goToReservationPage}
              disabled={!selectedPlayroom || !selectedDate}
            >
              ➕ Rezerviši termin
            </button>
          </div>

          {loadingSlots ? (
            <div className="loading-slots">Učitavanje termina...</div>
          ) : occupiedSlots.length === 0 ? (
            <div className="empty-state">
              <p>Nema zauzetih termina za izabrani datum.</p>
            </div>
          ) : (
            <div className="slots-grid">
              {occupiedSlots.map((segment, index) => (
                <div
                  key={`${segment.vremeOd}-${segment.vremeDo}-${index}`}
                  className={`slot-card clickable-slot ${
                    segment.tip === "zauzeto" ? "zauzeto" : "slobodno"
                  }`}
                >
                  <div
                    className="owner-booking-card-header"
                    onClick={() => handleSlotClick(segment)}
                  >
                    <div>
                      <h3>{formatBookingName(segment.booking)}</h3>

                      <p className="owner-booking-short-info">
                        🗓{" "}
                        {segment.booking?.datum
                          ? new Date(segment.booking.datum).toLocaleDateString(
                              "sr-RS",
                            )
                          : selectedDate
                            ? new Date(selectedDate).toLocaleDateString("sr-RS")
                            : "-"}{" "}
                        | ⏰ {segment.vremeOd || "-"} - {segment.vremeDo || "-"}
                      </p>
                    </div>

                    <div className="owner-booking-card-right">
                      <span className="owner-booking-status-badge">
                        Potvrđeno
                      </span>
                      <span
                        className={`owner-booking-arrow ${
                          expandedBookingId === getBookingId(segment.booking)
                            ? "open"
                            : ""
                        }`}
                      >
                        ▼
                      </span>
                    </div>
                  </div>

                  {expandedBookingId === getBookingId(segment.booking) && (
                    <div
                      className="owner-booking-card-details"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p>✉️ {formatBookingEmail(segment.booking)}</p>
                      <p>📞 {formatBookingPhone(segment.booking)}</p>

                      <p>
                        🗓{" "}
                        {segment.booking?.datum
                          ? new Date(segment.booking.datum).toLocaleDateString(
                              "sr-RS",
                            )
                          : selectedDate
                            ? new Date(selectedDate).toLocaleDateString("sr-RS")
                            : "-"}
                      </p>

                      <p>
                        ⏰ {segment.vremeOd || "-"} - {segment.vremeDo || "-"}
                      </p>

                      <p>👶 Broj dece: {segment.booking?.brojDece ?? 0}</p>
                      <p>
                        👨‍👩‍👧 Broj roditelja: {segment.booking?.brojRoditelja ?? 0}
                      </p>
                      <p>
                        💰 Ukupna cena: {segment.booking?.ukupnaCena ?? 0} RSD
                      </p>
                      {Array.isArray(segment.booking?.izabraneCene) &&
                        segment.booking.izabraneCene.length > 0 && (
                          <div className="owner-booking-extra-block">
                            <p>
                              <strong>Izabrane stavke:</strong>
                            </p>

                            {segment.booking.izabraneCene.map((item, idx) => (
                              <p key={`cena-${idx}`}>
                                • {item.naziv} ({item.tip || "fiksno"}) -{" "}
                                {item.cena} RSD
                                {item.tip === "po_satu" && (
                                  <>
                                    {" "}
                                    ×{" "}
                                    {calculateDuration(
                                      segment.vremeOd,
                                      segment.vremeDo,
                                    )}{" "}
                                    ={" "}
                                    {(Number(item.cena) || 0) *
                                      ((Number(segment.vremeDo?.slice(0, 2)) *
                                        60 +
                                        Number(segment.vremeDo?.slice(3, 5)) -
                                        (Number(segment.vremeOd?.slice(0, 2)) *
                                          60 +
                                          Number(
                                            segment.vremeOd?.slice(3, 5),
                                          ))) /
                                        60)}{" "}
                                    RSD
                                  </>
                                )}
                                {item.opis && <span> - {item.opis}</span>}
                              </p>
                            ))}
                          </div>
                        )}

                      {segment.booking?.izabraniPaket?.naziv && (
                        <div className="owner-booking-extra-block">
                          <p>
                            <strong>Paket:</strong>{" "}
                            {segment.booking.izabraniPaket.naziv} (
                            {segment.booking.izabraniPaket.tip || "fiksno"}) -{" "}
                            {segment.booking.izabraniPaket.cena} RSD
                          </p>

                          {segment.booking.izabraniPaket.opis && (
                            <p>- {segment.booking.izabraniPaket.opis}</p>
                          )}
                        </div>
                      )}

                      {Array.isArray(segment.booking?.izabraneUsluge) &&
                        segment.booking.izabraneUsluge.length > 0 && (
                          <div className="owner-booking-extra-block">
                            <p>
                              <strong>Dodatne usluge:</strong>
                            </p>

                            {segment.booking.izabraneUsluge.map((item, idx) => (
                              <p key={`usluga-${idx}`}>
                                • {item.naziv} ({item.tip || "fiksno"}) -{" "}
                                {item.cena} RSD
                                {item.opis && <span> - {item.opis}</span>}
                              </p>
                            ))}
                          </div>
                        )}

                      {segment.booking?.napomena && (
                        <p>📝 Napomena: {segment.booking.napomena}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OwnerTimeSlots;

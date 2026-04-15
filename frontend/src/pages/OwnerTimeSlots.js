import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyPlayrooms } from "../services/playroomService";
import {
  getAllTimeSlotsForOwner,
  manualBookInterval,
} from "../services/bookingService";
import { useAuth } from "../context/AuthContext";
import ManualBookingModal from "../components/ManualBookingModal";
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
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [error, setError] = useState("");

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

  const openManualBooking = (slot) => {
    setSelectedSlot(slot);
    setMessage("");
    setError("");
    setModalOpen(true);
  };

  const closeManualBooking = () => {
    setModalOpen(false);
    setSelectedSlot(null);
  };

  const handleManualBooking = async (bookingData) => {
    if (loadingSlots) return;
    if (!selectedSlot) {
      setError("Termin nije izabran.");
      return;
    }

    setError("");
    setMessage("");

    try {
      const result = await manualBookInterval({
        playroomId: selectedPlayroom,
        datum: selectedDate,
        vremeOd: bookingData.vremeOd,
        vremeDo: bookingData.vremeDo,

        cenaIds: bookingData.cenaIds,
        brojDece: Number(bookingData.brojDece) || 0,
        brojRoditelja: Number(bookingData.brojRoditelja) || 0,
        imeRoditelja: bookingData.imeRoditelja,
        prezimeRoditelja: bookingData.prezimeRoditelja,
        emailRoditelja: bookingData.emailRoditelja,
        telefonRoditelja: bookingData.telefonRoditelja,
        napomena: bookingData.napomena || "",
      });

      if (result?.success) {
        const successMessage = result.message || "Termin je uspešno zauzet.";
        setMessage(successMessage);
        toast.success(successMessage);
        closeManualBooking();

        await new Promise((resolve) => setTimeout(resolve, 200));
        await loadTimeSlots();

        setTimeout(() => {
          setMessage("");
        }, 3000);
      } else {
        toast.error(result?.error || "Greška pri ručnom zauzimanju termina.");
      }
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Greška pri ručnom zauzimanju termina.";
      toast.error(message);
      throw err;
    }
  };

  const selectedPlayroomData = playrooms.find(
    (p) => p._id === selectedPlayroom,
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
        <p>
          Upravljanje terminima po pravilu: jedan termin = jedna rezervacija
        </p>
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
          <div className="filters-card">
            <div className="filter-group">
              <label htmlFor="owner-playroom-select">Izaberite igraonicu</label>
              <select
                id="owner-playroom-select"
                value={selectedPlayroom}
                onChange={(e) => {
                  setSelectedPlayroom(e.target.value);
                  setMessage("");
                  setError("");
                }}
              >
                {playrooms.map((playroom) => (
                  <option key={playroom._id} value={playroom._id}>
                    {playroom.naziv}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
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
                }}
              />
            </div>
          </div>

          {selectedPlayroomData && (
            <div className="playroom-summary">
              <h2>{selectedPlayroomData.naziv}</h2>
              <p>
                📍 {selectedPlayroomData.adresa}, {selectedPlayroomData.grad}
              </p>
            </div>
          )}

          {loadingSlots ? (
            <div className="loading-slots">Učitavanje termina...</div>
          ) : timeSlots.length === 0 ? (
            <div className="empty-state">
              <p>Nema termina za izabrani datum.</p>
            </div>
          ) : (
            <div className="slots-grid">
              {timeSlots.map((segment, index) => (
                <div
                  key={`${segment.vremeOd}-${segment.vremeDo}-${index}`}
                  className={`slot-card ${segment.tip === "zauzeto" ? "zauzeto" : "slobodno"}`}
                >
                  <div className="slot-header">
                    <h3>
                      {segment.vremeOd} - {segment.vremeDo}
                    </h3>
                    <p>
                      ⏳ {calculateDuration(segment.vremeOd, segment.vremeDo)}
                    </p>
                    <span
                      className={`slot-status ${
                        segment.tip === "zauzeto" ? "zauzeto" : "slobodno"
                      }`}
                    >
                      {segment.tip === "zauzeto" ? "ZAUZETO" : "SLOBODNO"}
                    </span>
                  </div>

                  <div className="slot-body">
                    {segment.booking ? (
                      <div className="booking-info">
                        <h4>Rezervacija</h4>
                        <p>
                          ⏳ Trajanje:{" "}
                          {calculateDuration(segment.vremeOd, segment.vremeDo)}
                        </p>
                        <p>👤 {formatBookingName(segment.booking)}</p>
                        <p>📧 {formatBookingEmail(segment.booking)}</p>
                        <p>📞 {formatBookingPhone(segment.booking)}</p>
                        <p>
                          💰 Ukupna cena: {segment.booking.ukupnaCena || 0} RSD
                        </p>
                        {Number(segment.booking.brojDece) > 0 && (
                          <p>👶 Broj dece: {segment.booking.brojDece}</p>
                        )}

                        {Number(segment.booking.brojRoditelja) > 0 && (
                          <p>
                            👨‍👩‍👧 Broj roditelja: {segment.booking.brojRoditelja}
                          </p>
                        )}

                        {Array.isArray(segment.booking.izabraneCene) &&
                          segment.booking.izabraneCene.length > 0 && (
                            <div className="booking-extra-block">
                              <h5>Stavke iz cenovnika</h5>
                              {segment.booking.izabraneCene.map((item, idx) => (
                                <p key={`cena-${idx}`}>
                                  • {item.naziv} (
                                  {item.tip === "po_osobi"
                                    ? "po osobi"
                                    : item.tip === "po_satu"
                                      ? "po satu"
                                      : "fiksno"}
                                  ) - {item.cena} RSD
                                  {item.opis && <span> - {item.opis}</span>}
                                </p>
                              ))}
                            </div>
                          )}

                        {segment.booking.izabraniPaket?.naziv && (
                          <div className="booking-extra-block">
                            <h5>Paket</h5>
                            <p>
                              • {segment.booking.izabraniPaket.naziv} (
                              {segment.booking.izabraniPaket.tip === "po_osobi"
                                ? "po osobi"
                                : segment.booking.izabraniPaket.tip ===
                                    "po_satu"
                                  ? "po satu"
                                  : "fiksno"}
                              ) - {segment.booking.izabraniPaket.cena} RSD
                            </p>
                          </div>
                        )}

                        {Array.isArray(segment.booking.izabraneUsluge) &&
                          segment.booking.izabraneUsluge.length > 0 && (
                            <div className="booking-extra-block">
                              <h5>Dodatne usluge</h5>
                              {segment.booking.izabraneUsluge.map(
                                (item, idx) => (
                                  <p key={`usluga-${idx}`}>
                                    • {item.naziv} (
                                    {item.tip === "po_osobi"
                                      ? "po osobi"
                                      : item.tip === "po_satu"
                                        ? "po satu"
                                        : "fiksno"}
                                    ) - {item.cena} RSD
                                    {item.opis && <span> - {item.opis}</span>}
                                  </p>
                                ),
                              )}
                            </div>
                          )}
                        {segment.booking.napomena && (
                          <p>📝 Napomena: {segment.booking.napomena}</p>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => openManualBooking(segment)}
                        disabled={segment.tip === "zauzeto"}
                      >
                        Ručno zauzmi termin
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {modalOpen && selectedSlot && (
        <ManualBookingModal
          slot={selectedSlot}
          onClose={closeManualBooking}
          onSubmit={handleManualBooking}
        />
      )}
    </div>
  );
};

export default OwnerTimeSlots;

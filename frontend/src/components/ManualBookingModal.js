import React, { useEffect, useState } from "react";
import "../styles/ManualBookingModal.css";

const formatDate = (datum) => {
  if (!datum) return "-";

  const parsedDate = new Date(datum);
  if (Number.isNaN(parsedDate.getTime())) return "-";

  return parsedDate.toLocaleDateString("sr-RS");
};

const ManualBookingModal = ({ onClose, slot, onSubmit }) => {
  const [napomena, setNapomena] = useState("");
  const [ime, setIme] = useState("");
  const [prezime, setPrezime] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [vremeOd, setVremeOd] = useState("");
  const [vremeDo, setVremeDo] = useState("");
  const [selectedCenaIds, setSelectedCenaIds] = useState([]);

  useEffect(() => {
    if (!slot) return;

    setNapomena("");
    setError("");
    setLoading(false);
    setSelectedCenaIds([]);
  }, [slot]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loading) {
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [loading, onClose]);

  const playroomCene = slot?.playroom?.cene || [];

  const toggleCena = (id) => {
    setSelectedCenaIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  if (!slot) return null;

  const toMinutes = (time) => {
    const [h, m] = String(time || "00:00")
      .split(":")
      .map(Number);
    return h * 60 + m;
  };

  const generateQuarterHourOptions = (startTime, endTime) => {
    if (!startTime || !endTime) return [];

    const startMinutes = toMinutes(startTime);
    const endMinutes = toMinutes(endTime);

    const options = [];

    for (let current = startMinutes; current <= endMinutes; current += 15) {
      const hours = String(Math.floor(current / 60)).padStart(2, "0");
      const minutes = String(current % 60).padStart(2, "0");
      options.push(`${hours}:${minutes}`);
    }

    return options;
  };

  const isQuarterHour = (time) => {
    const [_, m] = String(time || "00:00")
      .split(":")
      .map(Number);
    return [0, 15, 30, 45].includes(m);
  };

  const availableStartTimes =
    slot?.vremeOd && slot?.vremeDo
      ? generateQuarterHourOptions(slot.vremeOd, slot.vremeDo).slice(0, -1)
      : [];

  const availableEndTimes =
    slot?.vremeDo && vremeOd
      ? generateQuarterHourOptions(vremeOd, slot.vremeDo).filter(
          (time) => toMinutes(time) > toMinutes(vremeOd),
        )
      : [];

  const getSlotDurationInHours = () => {
    if (!vremeOd || !vremeDo) return 0;

    const startMinutes = toMinutes(vremeOd);
    const endMinutes = toMinutes(vremeDo);
    const diff = endMinutes - startMinutes;

    if (!Number.isFinite(diff) || diff <= 0) return 0;

    return diff / 60;
  };

  const ukupno = playroomCene
    .filter((cena) => selectedCenaIds.includes(cena._id))
    .reduce((sum, cena) => {
      const cenaVrednost = Number(cena.cena) || 0;

      if (cena.tip === "po_satu") {
        return sum + cenaVrednost * getSlotDurationInHours();
      }

      if (cena.tip === "po_osobi") {
        return sum + cenaVrednost;
      }

      return sum + cenaVrednost;
    }, 0);

  const getSlotDurationLabel = () => {
    if (!vremeOd || !vremeDo) return "";

    const startMinutes = toMinutes(vremeOd);
    const endMinutes = toMinutes(vremeDo);
    const diff = endMinutes - startMinutes;

    if (!Number.isFinite(diff) || diff <= 0) return "";

    const sati = Math.floor(diff / 60);
    const minuti = diff % 60;

    if (sati > 0 && minuti > 0) {
      return `${sati}h ${minuti}min`;
    }

    if (sati > 0) {
      return `${sati}h`;
    }

    return `${minuti}min`;
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError("");

    try {
      if (selectedCenaIds.length === 0) {
        setError("Izaberi bar jednu stavku iz cenovnika.");
        setLoading(false);
        return;
      }
      if (!ime || !prezime || !email || !telefon) {
        setError("Sva polja su obavezna.");
        setLoading(false);
        return;
      }

      if (!/^[0-9]+$/.test(telefon)) {
        setError("Telefon može sadržati samo brojeve.");
        setLoading(false);
        return;
      }
      if (!vremeOd || !vremeDo) {
        setError("Vreme od i vreme do su obavezni.");
        setLoading(false);
        return;
      }

      if (!isQuarterHour(vremeOd) || !isQuarterHour(vremeDo)) {
        setError("Vreme mora biti u koracima od 15 minuta.");
        setLoading(false);
        return;
      }

      if (toMinutes(vremeDo) <= toMinutes(vremeOd)) {
        setError("Vreme završetka mora biti posle vremena početka.");
        setLoading(false);
        return;
      }

      if (slot?.tip === "slobodno") {
        if (
          toMinutes(vremeOd) < toMinutes(slot.vremeOd) ||
          toMinutes(vremeDo) > toMinutes(slot.vremeDo)
        ) {
          setError("Ručna rezervacija mora biti unutar slobodnog intervala.");
          setLoading(false);
          return;
        }
      }

      await onSubmit?.({
        playroomId: slot.playroomId || slot.playroom?._id,
        datum: slot.datum,
        vremeOd,
        vremeDo,

        cenaIds: selectedCenaIds, // 🔥 KLJUČNO

        imeRoditelja: ime.trim(),
        prezimeRoditelja: prezime.trim(),
        emailRoditelja: email.trim(),
        telefonRoditelja: telefon.trim(),
        napomena: napomena.trim(),
      });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Došlo je do greške prilikom ručne rezervacije.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={!loading ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-label="Ručna rezervacija"
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📝 Ručna rezervacija</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={loading}
            aria-label="Zatvori prozor"
          >
            ✖
          </button>
        </div>

        <div className="modal-body">
          <div className="booking-summary">
            <div className="form-group">
              <label>💰 Stavke iz cenovnika</label>

              <div className="extras-list">
                {playroomCene.length === 0 ? (
                  <div className="empty-state">
                    Nema definisanih cena za ovu igraonicu.
                  </div>
                ) : (
                  playroomCene.map((cena) => (
                    <label key={cena._id} className="extra-item-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedCenaIds.includes(cena._id)}
                        onChange={() => toggleCena(cena._id)}
                      />

                      <span>
                        <strong>{cena.naziv}</strong> - {cena.cena} RSD (
                        {cena.tip})
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <p>
              <strong>Datum:</strong> {formatDate(slot.datum)}
            </p>
            <p>
              <strong>Termin:</strong> {vremeOd || slot.vremeOd || "-"} -{" "}
              {vremeDo || slot.vremeDo || "-"}
              {vremeOd && vremeDo ? ` (${getSlotDurationLabel()})` : ""}
            </p>

            <p>
              <strong>Model rezervacije:</strong> Jedan termin = jedna
              rezervacija
            </p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>👤 Ime roditelja</label>
            <input
              type="text"
              value={ime}
              onChange={(e) => setIme(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>👤 Prezime roditelja</label>
            <input
              type="text"
              value={prezime}
              onChange={(e) => setPrezime(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>📧 Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>📱 Telefon</label>
            <input
              type="text"
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>⏰ Vreme od</label>
            <select
              value={vremeOd}
              onChange={(e) => {
                setVremeOd(e.target.value);
                setVremeDo("");
              }}
              disabled={loading}
            >
              <option value="">Izaberi vreme</option>
              {availableStartTimes.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>⏰ Vreme do</label>
            <select
              value={vremeDo}
              onChange={(e) => setVremeDo(e.target.value)}
              disabled={loading || !vremeOd}
            >
              <option value="">
                {vremeOd ? "Izaberi vreme" : "Prvo izaberi vreme od"}
              </option>
              {availableEndTimes.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="manual-booking-napomena">
              📝 Napomena (opciono)
            </label>
            <textarea
              id="manual-booking-napomena"
              rows="3"
              value={napomena}
              onChange={(e) => setNapomena(e.target.value)}
              placeholder="Npr. alergije, posebni zahtevi ili kontakt telefon roditelja."
              className="form-textarea"
              disabled={loading}
            />
          </div>
        </div>
        <div className="total-price">
          <span>Ukupno:</span>
          <strong>{ukupno} RSD</strong>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Otkaži
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "Rezervišem..." : "✅ Potvrdi rezervaciju"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualBookingModal;

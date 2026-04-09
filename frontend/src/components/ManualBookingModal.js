import React, { useEffect, useMemo, useState } from "react";
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

  const cenaPoDetetu = useMemo(() => {
    const cena = Number(slot?.cena);
    return Number.isFinite(cena) ? cena : 0;
  }, [slot]);

  useEffect(() => {
    if (!slot) return;

    setNapomena("");
    setError("");
    setLoading(false);
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

  if (!slot) return null;

  const handleConfirm = async () => {
    setLoading(true);
    setError("");

    try {
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

      await onSubmit?.({
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
            <p>
              <strong>Datum:</strong> {formatDate(slot.datum)}
            </p>
            <p>
              <strong>Termin:</strong> {slot.vremeOd || "-"} -{" "}
              {slot.vremeDo || "-"}
            </p>
            <p>
              <strong>Cena termina:</strong> {cenaPoDetetu} RSD
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

          <div className="total-price">
            <span>Ukupno:</span>
            <strong>{cenaPoDetetu} RSD</strong>
          </div>
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

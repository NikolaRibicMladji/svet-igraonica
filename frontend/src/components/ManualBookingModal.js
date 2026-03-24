import React, { useState } from "react";
import "../styles/ManualBookingModal.css";

const ManualBookingModal = ({ isOpen, onClose, slot, playroom, onConfirm }) => {
  const [brojDece, setBrojDece] = useState(1);
  const [napomena, setNapomena] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !slot) return null;

  const ukupnaCena = slot.cena * brojDece;

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm(slot, brojDece, napomena);
    setLoading(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📝 Ručna rezervacija</h2>
          <button className="modal-close" onClick={onClose}>
            ✖
          </button>
        </div>

        <div className="modal-body">
          <div className="booking-summary">
            <p>
              <strong>Igraonica:</strong> {playroom?.naziv}
            </p>
            <p>
              <strong>Datum:</strong>{" "}
              {new Date(slot.datum).toLocaleDateString("sr-RS")}
            </p>
            <p>
              <strong>Termin:</strong> {slot.vremeOd} - {slot.vremeDo}
            </p>
            <p>
              <strong>Cena po detetu:</strong> {slot.cena} RSD
            </p>
          </div>

          <div className="form-group">
            <label>👶 Broj dece</label>
            <input
              type="number"
              min="1"
              max="20"
              value={brojDece}
              onChange={(e) =>
                setBrojDece(Math.max(1, parseInt(e.target.value) || 1))
              }
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>📝 Napomena (opciono)</label>
            <textarea
              rows="3"
              value={napomena}
              onChange={(e) => setNapomena(e.target.value)}
              placeholder="Npr. alergije, posebni zahtevi, kontakt telefon roditelja..."
              className="form-textarea"
            />
          </div>

          <div className="price-summary-modal">
            <div className="price-row">
              <span>Broj dece:</span>
              <strong>{brojDece}</strong>
            </div>
            <div className="price-row">
              <span>Cena po detetu:</span>
              <strong>{slot.cena} RSD</strong>
            </div>
            <div className="price-total">
              <span>Ukupno za naplatu:</span>
              <strong className="total-amount">{ukupnaCena} RSD</strong>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Otkaži
          </button>
          <button
            className="btn-confirm"
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
